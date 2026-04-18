#!/usr/bin/env bash
set -euo pipefail

INSTANCES_LIST=(1 2 3)
RUNS=10
HOST="http://localhost:8000"
FOLDER="results"

trap cleanup_and_exit INT

cleanup_and_exit() {
  echo
  echo "Caught interrupt signal. Cleaning up..."
  docker compose -f ../../docker-compose.yml --profile prod down -v
  echo "Cleanup done. Exiting."
  exit 0
}

generate_kong_targets() {
  count=$1
  out=""
  for i in $(seq 1 "$count"); do
    out+="      - target: route-bastion-broker-api-${i}:8090\n        weight: 100\n"
  done
  echo -e "$out"
}

check_if_node_installed() {
  if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js to proceed."
    exit 1
  fi
}

install_k6_lib_if_missing() {
  if ! command -v k6 &> /dev/null; then
    echo "k6 js lib not found, installing..."
    npm install -g k6
  fi
}

wait_for_api_to_be_available() {
  echo "Waiting for API to be available at GET $HOST/health..."
  until curl -s -o /dev/null -w "%{http_code}" "$HOST/health" | grep -q "200"; do
    echo "Health-check failed. Retrying in 5 seconds..."
    sleep 5
  done
  echo "API is now available. Proceeding with load tests."
}

check_if_node_installed

install_k6_lib_if_missing

while getopts "hf:" opt; do
  case ${opt} in
    h )
      echo "Usage: ./auto_k6_test_load.sh [-f folder]"
      echo
      echo "This script automates load testing using k6 against a Kong API Gateway setup."
      echo "It scales the number of API broker instances and runs multiple test iterations."
      echo "Options:"
      echo "  -h          Show this help message and exit"
      echo "  -f folder   Specify the folder to save results (default: results)"
      exit 0
      ;;
    f )
      FOLDER=$OPTARG
      ;;
    \? )
      echo "Invalid option: -$OPTARG" 1>&2
      exit 1
      ;;
  esac
done

echo "=== Starting load tests ==="

for INSTANCES in "${INSTANCES_LIST[@]}"; do
  echo
  echo "=== Preparing environment for $INSTANCES instance(s) ==="

  export KONG_TARGETS="$(generate_kong_targets "$INSTANCES")"
  envsubst < kong/config.tpl.yaml > ../../docker/kong/config.yaml

  echo "Restarting Docker environment..."
  docker compose -f ../../docker-compose.yml --profile prod down -v
  docker compose -f ../../docker-compose.yml --profile prod up -d --scale api="$INSTANCES"

  wait_for_api_to_be_available

  for i in $(seq 1 "$RUNS"); do
      TIMESTAMP=$(date +%Y-%m-%d-%Hh%M)
      CSV_NAME="${TIMESTAMP}_run${i}_${INSTANCES}instances"

      echo
      echo "[$(date '+%H:%M:%S')] Running test $i/$RUNS against $INSTANCES instance(s)..."

      k6 run test_vus.js \
        --env HOST="$HOST" \
        --env FILE_NAME="${FOLDER}/${CSV_NAME}.csv"

      echo "[$(date '+%H:%M:%S')] Test $i/$RUNS completed."
    done

  echo "[$(date '+%H:%M:%S')] Done with $INSTANCES instance(s)."
done

echo
echo "🎉 All load tests completed successfully!"
echo
echo "Performing final cleanup..."

cleanup_and_exit
