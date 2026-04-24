#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
IMAGE="${1:-baby-tracker:apple}"
CONTAINER_NAME="${BABY_TRACKER_CONTAINER_NAME:-baby-tracker}"
SCHEDULER_CONTAINER_NAME="${BABY_TRACKER_SCHEDULER_CONTAINER_NAME:-baby-tracker-scheduler}"
HOST_PORT="${BABY_TRACKER_HOST_PORT:-8000}"
CONTAINER_PORT="${BABY_TRACKER_CONTAINER_PORT:-8000}"
DATA_DIR="${ROOT_DIR}/data"
ENABLE_TAILSCALE_SERVE="${BABY_TRACKER_CONFIGURE_TAILSCALE_SERVE:-1}"
TAILSCALE_BABY_PATH="${BABY_TRACKER_TAILSCALE_BABY_PATH:-/baby}"
BASE_PATH="${BABY_TRACKER_BASE_PATH:-/baby}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

if ! command -v container >/dev/null 2>&1; then
  echo "Missing required command: container"
  exit 1
fi

if ! container system status >/dev/null 2>&1; then
  echo "Starting Apple container runtime..."
  container system start >/dev/null
fi

mkdir -p "${DATA_DIR}"

echo "Building image ${IMAGE}..."
container build --tag "${IMAGE}" "${ROOT_DIR}" >/dev/null

echo "Restarting container ${CONTAINER_NAME}..."
container rm --force "${CONTAINER_NAME}" >/dev/null 2>&1 || true
container rm --force "${SCHEDULER_CONTAINER_NAME}" >/dev/null 2>&1 || true

container run --detach \
  --name "${CONTAINER_NAME}" \
  --publish "0.0.0.0:${HOST_PORT}:${CONTAINER_PORT}" \
  --volume "${DATA_DIR}:/data" \
  --env BABY_TRACKER_DB_PATH=/data/baby-tracker.sqlite \
  --env BABY_TRACKER_STORAGE_BACKEND=sqlite \
  --env BABY_TRACKER_ENABLE_SCHEDULERS=0 \
  --env BABY_TRACKER_HOST=0.0.0.0 \
  --env BABY_TRACKER_PORT="${CONTAINER_PORT}" \
  --env BABY_TRACKER_BASE_PATH="${BASE_PATH}" \
  --env BABY_TRACKER_STATIC_VERSION="${BABY_TRACKER_STATIC_VERSION:-dev}" \
  --env BABY_TRACKER_VAPID_PUBLIC_KEY="${BABY_TRACKER_VAPID_PUBLIC_KEY:-}" \
  --env BABY_TRACKER_VAPID_PRIVATE_KEY="${BABY_TRACKER_VAPID_PRIVATE_KEY:-}" \
  --env BABY_TRACKER_VAPID_SUBJECT="${BABY_TRACKER_VAPID_SUBJECT:-}" \
  --env BABY_TRACKER_OPENAI_API_KEY="${BABY_TRACKER_OPENAI_API_KEY:-}" \
  --env OPENAI_API_KEY="${OPENAI_API_KEY:-}" \
  "${IMAGE}" >/dev/null

echo "Starting scheduler container ${SCHEDULER_CONTAINER_NAME}..."
container run --detach \
  --name "${SCHEDULER_CONTAINER_NAME}" \
  --volume "${DATA_DIR}:/data" \
  --env BABY_TRACKER_DB_PATH=/data/baby-tracker.sqlite \
  --env BABY_TRACKER_STORAGE_BACKEND=sqlite \
  --env BABY_TRACKER_ENABLE_SCHEDULERS=1 \
  --env BABY_TRACKER_BASE_PATH="${BASE_PATH}" \
  --env BABY_TRACKER_FEED_DUE_POLL_SECONDS="${BABY_TRACKER_FEED_DUE_POLL_SECONDS:-60}" \
  --env BABY_TRACKER_HOME_KPIS_POLL_SECONDS="${BABY_TRACKER_HOME_KPIS_POLL_SECONDS:-900}" \
  --env BABY_TRACKER_VAPID_PUBLIC_KEY="${BABY_TRACKER_VAPID_PUBLIC_KEY:-}" \
  --env BABY_TRACKER_VAPID_PRIVATE_KEY="${BABY_TRACKER_VAPID_PRIVATE_KEY:-}" \
  --env BABY_TRACKER_VAPID_SUBJECT="${BABY_TRACKER_VAPID_SUBJECT:-}" \
  --env BABY_TRACKER_OPENAI_API_KEY="${BABY_TRACKER_OPENAI_API_KEY:-}" \
  --env OPENAI_API_KEY="${OPENAI_API_KEY:-}" \
  "${IMAGE}" \
  uv run python -m src.app.scheduler >/dev/null

if [[ -n "${BASE_PATH}" ]]; then
  echo "Container started: ${CONTAINER_NAME} (http://127.0.0.1:${HOST_PORT}${BASE_PATH}/)"
else
  echo "Container started: ${CONTAINER_NAME} (http://127.0.0.1:${HOST_PORT}/)"
fi

if [[ "${ENABLE_TAILSCALE_SERVE}" == "1" ]]; then
  if command -v tailscale >/dev/null 2>&1 && tailscale status >/dev/null 2>&1; then
    serve_target="http://127.0.0.1:${HOST_PORT}${BASE_PATH}"
    tailscale serve --bg --set-path "${TAILSCALE_BABY_PATH}" "${serve_target}" >/dev/null
    echo "Tailscale serve updated: ${TAILSCALE_BABY_PATH} -> ${serve_target}"
  else
    echo "Skipping tailscale serve update (tailscale CLI unavailable or not connected)."
  fi
fi
