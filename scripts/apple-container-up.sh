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

PULL_PROD_DATA="${BABY_TRACKER_PULL_PROD_DATA:-0}"
PROD_SSH_TARGET="${BABY_TRACKER_PROD_SSH_TARGET:-josh@homelab.tail458584.ts.net}"
PROD_DATA_DIR="${BABY_TRACKER_PROD_DATA_DIR:-/home/josh/baby-tracker/data}"
PROD_DB_FILE="${BABY_TRACKER_PROD_DB_FILE:-baby-tracker.sqlite}"
PROD_FIREBASE_FILE="${BABY_TRACKER_PROD_FIREBASE_FILE:-firebase-service-account.json}"
PROD_REMOTE_SNAPSHOT="${BABY_TRACKER_PROD_REMOTE_SNAPSHOT:-/tmp/baby-tracker-prod-sync.sqlite}"

resolve_pull_prod_data_mode() {
  if [[ -n "${BABY_TRACKER_PULL_PROD_DATA+x}" ]]; then
    return
  fi
  if [[ ! -t 0 ]]; then
    return
  fi

  local answer
  read -r -p "Pull latest prod data from ${PROD_SSH_TARGET}:${PROD_DATA_DIR}? [y/N] " answer
  case "${answer}" in
    y|Y|yes|YES|Yes)
      PULL_PROD_DATA="1"
      ;;
    *)
      PULL_PROD_DATA="0"
      ;;
  esac
}

pull_prod_data_if_enabled() {
  if [[ "${PULL_PROD_DATA}" != "1" ]]; then
    echo "Prod data pull disabled (set BABY_TRACKER_PULL_PROD_DATA=1 to enable)."
    return
  fi

  local remote_db_path="${PROD_DATA_DIR%/}/${PROD_DB_FILE}"
  local remote_firebase_path="${PROD_DATA_DIR%/}/${PROD_FIREBASE_FILE}"
  local local_db_tmp="${DATA_DIR}/.baby-tracker.sqlite.tmp"
  local local_firebase_tmp="${DATA_DIR}/.firebase-service-account.json.tmp"

  command -v ssh >/dev/null 2>&1 || {
    echo "Missing required command: ssh"
    exit 1
  }
  command -v scp >/dev/null 2>&1 || {
    echo "Missing required command: scp"
    exit 1
  }

  echo "Pulling prod data from ${PROD_SSH_TARGET}:${PROD_DATA_DIR}"

  ssh "${PROD_SSH_TARGET}" "command -v sqlite3 >/dev/null 2>&1" || {
    echo "Remote host missing sqlite3; cannot create consistent snapshot."
    exit 1
  }

  ssh "${PROD_SSH_TARGET}" "sqlite3 '${remote_db_path}' \".backup '${PROD_REMOTE_SNAPSHOT}'\"" || {
    echo "Failed to create remote SQLite snapshot from ${remote_db_path}"
    exit 1
  }

  scp "${PROD_SSH_TARGET}:${PROD_REMOTE_SNAPSHOT}" "${local_db_tmp}" || {
    echo "Failed to copy remote snapshot ${PROD_REMOTE_SNAPSHOT}"
    exit 1
  }
  mv "${local_db_tmp}" "${DATA_DIR}/baby-tracker.sqlite"

  scp "${PROD_SSH_TARGET}:${remote_firebase_path}" "${local_firebase_tmp}" || {
    echo "Failed to copy remote Firebase credentials ${remote_firebase_path}"
    exit 1
  }
  mv "${local_firebase_tmp}" "${FIREBASE_JSON_IN_DATA}"

  ssh "${PROD_SSH_TARGET}" "rm -f '${PROD_REMOTE_SNAPSHOT}'" >/dev/null 2>&1 || true
  echo "Prod data pull complete: ${DATA_DIR}/baby-tracker.sqlite and ${FIREBASE_JSON_IN_DATA}"
}

resolve_pull_prod_data_mode
pull_prod_data_if_enabled

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
