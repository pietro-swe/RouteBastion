#!/usr/bin/env bash

# Exit on error and undefined variables
set -euo pipefail

# Default values
USERS=75
SPAWN_RATE=1
RUN_TIME="5m"
RUNS=1
PROCESSES=8
HOST="http://localhost:8000"
INSTANCES=3

# Function to show help
usage() {
  echo "Usage: $0 [-u users] [-r spawn_rate] [-t run_time] [-n runs] [-p processes] [-h host] [-i instances]"
  echo
  echo "  -u  Number of users (default: 75)"
  echo "  -r  Spawn rate (default: 1)"
  echo "  -t  Run time (default: 5m)"
  echo "  -n  Number of test repetitions (default: 1)"
  echo "  -p  Number of processes (default: 8)"
  echo "  -i  Number of API instances (default: 3)"
  echo "  -h  Target host (default: http://localhost:8000)"
  exit 1
}

# Parse arguments
while getopts ":u:r:t:n:p:h:i:" opt; do
  case ${opt} in
    u) USERS="$OPTARG" ;;
    r) SPAWN_RATE="$OPTARG" ;;
    t) RUN_TIME="$OPTARG" ;;
    n) RUNS="$OPTARG" ;;
    p) PROCESSES="$OPTARG" ;;
    h) HOST="$OPTARG" ;;
    i) INSTANCES="$OPTARG" ;;
    *) usage ;;
  esac
done

echo "Starting Locust tests..."
echo "Users: $USERS | Spawn Rate: $SPAWN_RATE | Run Time: $RUN_TIME | Runs: $RUNS | Processes: $PROCESSES"
echo "Host: $HOST"
echo

# Run the tests the specified number of times
for i in $(seq 1 "$RUNS"); do
  TIMESTAMP=$(date +%Y-%m-%d-%Hh%M)
  CSV_NAME="${TIMESTAMP}_run${i}_${USERS}users_${SPAWN_RATE}rate_${RUN_TIME}min_${INSTANCES}instances"

  echo "[$(date '+%H:%M:%S')] Running test $i/$RUNS..."
  locust -f locustfile.py \
    --headless \
    --skip-log-setup \
    -u "$USERS" \
    -r "$SPAWN_RATE" \
    --run-time "$RUN_TIME" \
    --processes "$PROCESSES" \
    --host="$HOST" \
    --csv="$CSV_NAME" \
    --csv-full-history

  echo "[$(date '+%H:%M:%S')] Test $i completed."
  echo

  echo "Deleting unnecessary CSV files..."
  rm -f "${CSV_NAME}_exceptions.csv" "${CSV_NAME}_failures.csv" "${CSV_NAME}_stats_history.csv"
  echo "Cleanup completed."
  echo
done

echo "✅ All $RUNS Locust test(s) completed."
