#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${ROOT_DIR}/data"
IMAGE="${1:-baby-tracker:apple}"
FIREBASE_JSON_IN_DATA="${DATA_DIR}/firebase-service-account.json"
FIREBASE_JSON_LEGACY="${ROOT_DIR}/firebase-service-account.json"
ENV_FILE="${ROOT_DIR}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

mkdir -p "${DATA_DIR}"

if [[ -f "${FIREBASE_JSON_IN_DATA}" ]]; then
  : # Already in the expected location.
elif [[ -f "${FIREBASE_JSON_LEGACY}" ]]; then
  cp "${FIREBASE_JSON_LEGACY}" "${FIREBASE_JSON_IN_DATA}"
else
  echo "Missing firebase-service-account.json in ${DATA_DIR}"
  echo "Place it at ${FIREBASE_JSON_IN_DATA} and retry."
  exit 1
fi

STORAGE_BACKEND="${BABY_TRACKER_STORAGE_BACKEND:-dual}"
APP_SHARED_SECRET="${BABY_TRACKER_APP_SHARED_SECRET:-}"
if [[ "${STORAGE_BACKEND}" != "sqlite" && -z "${APP_SHARED_SECRET}" ]]; then
  echo "BABY_TRACKER_APP_SHARED_SECRET is required when BABY_TRACKER_STORAGE_BACKEND=${STORAGE_BACKEND}"
  echo "Set it in ${ENV_FILE} or export it in your shell."
  exit 1
fi

container rm --force baby-tracker baby-tracker-scheduler >/dev/null 2>&1 || true

container run --detach \
  --name baby-tracker \
  --publish 0.0.0.0:8000:8000 \
  --volume "${DATA_DIR}:/data" \
  --env BABY_TRACKER_DB_PATH=/data/baby-tracker.sqlite \
  --env BABY_TRACKER_ENABLE_SCHEDULERS=0 \
  --env BABY_TRACKER_STATIC_VERSION="${BABY_TRACKER_STATIC_VERSION:-dev}" \
  --env BABY_TRACKER_STORAGE_BACKEND="${STORAGE_BACKEND}" \
  --env BABY_TRACKER_FIREBASE_PROJECT_ID="${BABY_TRACKER_FIREBASE_PROJECT_ID:-baby-tracker-2d288}" \
  --env BABY_TRACKER_FIREBASE_CREDENTIALS_PATH=/data/firebase-service-account.json \
  --env BABY_TRACKER_APP_SHARED_SECRET="${APP_SHARED_SECRET}" \
  --env BABY_TRACKER_FIRESTORE_APP_NAMESPACE="${BABY_TRACKER_FIRESTORE_APP_NAMESPACE:-}" \
  "${IMAGE}" >/dev/null

container run --detach \
  --name baby-tracker-scheduler \
  --volume "${DATA_DIR}:/data" \
  --env BABY_TRACKER_DB_PATH=/data/baby-tracker.sqlite \
  --env BABY_TRACKER_ENABLE_SCHEDULERS=1 \
  --env BABY_TRACKER_STORAGE_BACKEND="${STORAGE_BACKEND}" \
  --env BABY_TRACKER_FIREBASE_PROJECT_ID="${BABY_TRACKER_FIREBASE_PROJECT_ID:-baby-tracker-2d288}" \
  --env BABY_TRACKER_FIREBASE_CREDENTIALS_PATH=/data/firebase-service-account.json \
  --env BABY_TRACKER_APP_SHARED_SECRET="${APP_SHARED_SECRET}" \
  --env BABY_TRACKER_FIRESTORE_APP_NAMESPACE="${BABY_TRACKER_FIRESTORE_APP_NAMESPACE:-}" \
  "${IMAGE}" \
  uv run python -m src.app.scheduler >/dev/null

echo "Started baby-tracker and baby-tracker-scheduler using ${DATA_DIR}/baby-tracker.sqlite"
