#!/usr/bin/env bash
set -euo pipefail

USERS_LIST=(50 75 100 200 300)
INSTANCES_LIST=(1 2 3)
SPAWN_RATE=10
RUN_TIME="5m"
RUNS=10
PROCESSES=8
HOST="http://localhost:8000"

# Generate Kong upstream targets for N replicas
generate_kong_targets() {
  count=$1
  out=""
  for i in $(seq 1 "$count"); do
    out+="      - target: route-bastion-broker-api-broker-${i}:8090\n        weight: 100\n"
  done
  echo -e "$out"
}

echo "=== Starting orchestrated load tests ==="

for INSTANCES in "${INSTANCES_LIST[@]}"; do
  echo
  echo "=== Preparing environment for $INSTANCES instance(s) ==="

  export KONG_TARGETS="$(generate_kong_targets "$INSTANCES")"
  envsubst < kong/config.tpl.yaml > ../../docker/kong/config.yaml

  echo "Restarting Docker environment..."
  docker compose -f ../../docker-compose.yml down -v
  docker compose -f ../../docker-compose.yml up -d --scale api-broker="$INSTANCES"

  for USERS in "${USERS_LIST[@]}"; do
    for i in $(seq 1 "$RUNS"); do
      TIMESTAMP=$(date +%Y-%m-%d-%Hh%M)
      CSV_NAME="${TIMESTAMP}_run${i}_${USERS}users_${SPAWN_RATE}rate_${RUN_TIME}min_${INSTANCES}instances"

      echo
      echo "[$(date '+%H:%M:%S')] Running test $i/$RUNS with $USERS users against $INSTANCES instance(s)..."
      locust -f locustfile.py \
        --headless \
        --skip-log-setup \
        -u "$USERS" \
        -r "$SPAWN_RATE" \
        --run-time "$RUN_TIME" \
        --processes "$PROCESSES" \
        --host "$HOST" \
        --csv "results/$CSV_NAME"

      echo "[$(date '+%H:%M:%S')] Test $i/$RUNS completed."
    done
  done

  echo "[$(date '+%H:%M:%S')] Done with $INSTANCES instance(s)."
done

echo
echo "🎉 All load tests completed successfully!"
