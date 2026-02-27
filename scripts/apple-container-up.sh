#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${ROOT_DIR}/data"
IMAGE="${1:-baby-tracker:apple}"
FIREBASE_JSON="${ROOT_DIR}/firebase-service-account.json"
FIREBASE_JSON_IN_DATA="${DATA_DIR}/firebase-service-account.json"

mkdir -p "${DATA_DIR}"
cp "${FIREBASE_JSON}" "${FIREBASE_JSON_IN_DATA}"

container rm --force baby-tracker baby-tracker-scheduler >/dev/null 2>&1 || true

container run --detach \
  --name baby-tracker \
  --publish 0.0.0.0:8000:8000 \
  --volume "${DATA_DIR}:/data" \
  --env BABY_TRACKER_DB_PATH=/data/baby-tracker.sqlite \
  --env BABY_TRACKER_ENABLE_SCHEDULERS=0 \
  --env BABY_TRACKER_STATIC_VERSION="${BABY_TRACKER_STATIC_VERSION:-dev}" \
  --env BABY_TRACKER_STORAGE_BACKEND="${BABY_TRACKER_STORAGE_BACKEND:-dual}" \
  --env BABY_TRACKER_FIREBASE_PROJECT_ID="${BABY_TRACKER_FIREBASE_PROJECT_ID:-baby-tracker-2d288}" \
  --env BABY_TRACKER_FIREBASE_CREDENTIALS_PATH=/data/firebase-service-account.json \
  --env BABY_TRACKER_APP_SHARED_SECRET="${BABY_TRACKER_APP_SHARED_SECRET:-}" \
  --env BABY_TRACKER_FIRESTORE_APP_NAMESPACE="${BABY_TRACKER_FIRESTORE_APP_NAMESPACE:-}" \
  "${IMAGE}" >/dev/null

container run --detach \
  --name baby-tracker-scheduler \
  --volume "${DATA_DIR}:/data" \
  --env BABY_TRACKER_DB_PATH=/data/baby-tracker.sqlite \
  --env BABY_TRACKER_ENABLE_SCHEDULERS=1 \
  --env BABY_TRACKER_STORAGE_BACKEND="${BABY_TRACKER_STORAGE_BACKEND:-dual}" \
  --env BABY_TRACKER_FIREBASE_PROJECT_ID="${BABY_TRACKER_FIREBASE_PROJECT_ID:-baby-tracker-2d288}" \
  --env BABY_TRACKER_FIREBASE_CREDENTIALS_PATH=/data/firebase-service-account.json \
  --env BABY_TRACKER_APP_SHARED_SECRET="${BABY_TRACKER_APP_SHARED_SECRET:-}" \
  --env BABY_TRACKER_FIRESTORE_APP_NAMESPACE="${BABY_TRACKER_FIRESTORE_APP_NAMESPACE:-}" \
  "${IMAGE}" \
  uv run python -m src.app.scheduler >/dev/null

echo "Started baby-tracker and baby-tracker-scheduler using ${DATA_DIR}/baby-tracker.sqlite"
