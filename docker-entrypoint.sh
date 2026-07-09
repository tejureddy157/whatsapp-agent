#!/bin/sh
# Runs both the Fastify server and the BullMQ worker in one container.
# Needed because the Railway trial plan caps total provisioned resources
# below what a separate server + worker service would require; this repo's
# modular-monolith design (server.ts / worker.ts sharing src/modules) makes
# co-locating them straightforward.
set -e

node packages/api/dist/worker.js &
WORKER_PID=$!
node packages/api/dist/server.js &
SERVER_PID=$!

term_handler() {
  kill -TERM "$SERVER_PID" "$WORKER_PID" 2>/dev/null
  wait
  exit 0
}
trap term_handler TERM INT

while kill -0 "$SERVER_PID" 2>/dev/null && kill -0 "$WORKER_PID" 2>/dev/null; do
  sleep 2
done

# One of the two died on its own — bring the whole container down so
# Railway's restart policy restarts both together.
kill -TERM "$SERVER_PID" "$WORKER_PID" 2>/dev/null
wait
exit 1
