#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${ROOT_DIR}/data"
IMAGE="${1:-baby-tracker:apple}"

mkdir -p "${DATA_DIR}"

container rm --force baby-tracker baby-tracker-scheduler >/dev/null 2>&1 || true

container run --detach \
  --name baby-tracker \
  --publish 0.0.0.0:8000:8000 \
  --volume "${DATA_DIR}:/data" \
  --env BABY_TRACKER_DB_PATH=/data/baby-tracker.sqlite \
  --env BABY_TRACKER_ENABLE_SCHEDULERS=0 \
  "${IMAGE}" >/dev/null

container run --detach \
  --name baby-tracker-scheduler \
  --volume "${DATA_DIR}:/data" \
  --env BABY_TRACKER_DB_PATH=/data/baby-tracker.sqlite \
  --env BABY_TRACKER_ENABLE_SCHEDULERS=1 \
  "${IMAGE}" \
  uv run python -m src.app.scheduler >/dev/null

echo "Started baby-tracker and baby-tracker-scheduler using ${DATA_DIR}/baby-tracker.sqlite"
