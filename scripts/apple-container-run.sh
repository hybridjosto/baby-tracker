#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

IMAGE_NAME="${IMAGE_NAME:-baby-tracker:apple}"
CONTAINER_NAME="${CONTAINER_NAME:-baby-tracker}"
HOST_PORT="${HOST_PORT:-8000}"
CONTAINER_PORT="${CONTAINER_PORT:-8000}"
BASE_PATH="${BASE_PATH:-}"
DATA_DIR="${DATA_DIR:-${REPO_ROOT}/data}"

if ! command -v container >/dev/null 2>&1; then
  echo "Error: 'container' CLI is not installed."
  echo "Install with: brew install container"
  exit 1
fi

mkdir -p "${DATA_DIR}"

echo "Starting Apple container runtime..."
container system start

echo "Starting builder..."
container builder start >/dev/null

echo "Building image ${IMAGE_NAME}..."
container build -t "${IMAGE_NAME}" "${REPO_ROOT}"

if container inspect "${CONTAINER_NAME}" >/dev/null 2>&1; then
  echo "Replacing existing container ${CONTAINER_NAME}..."
  container stop "${CONTAINER_NAME}" >/dev/null || true
  container rm "${CONTAINER_NAME}" >/dev/null
fi

echo "Starting ${CONTAINER_NAME} on 127.0.0.1:${HOST_PORT}..."
container run \
  --name "${CONTAINER_NAME}" \
  --detach \
  --publish "127.0.0.1:${HOST_PORT}:${CONTAINER_PORT}" \
  --env "BABY_TRACKER_BASE_PATH=${BASE_PATH}" \
  --env BABY_TRACKER_DB_PATH=/data/baby-tracker.sqlite \
  --env BABY_TRACKER_HOST=0.0.0.0 \
  --env "BABY_TRACKER_PORT=${CONTAINER_PORT}" \
  --env BABY_TRACKER_STATIC_VERSION=dev \
  --volume "${DATA_DIR}:/data" \
  "${IMAGE_NAME}" >/dev/null

echo "Running containers:"
container ls
echo
echo "App URL: http://localhost:${HOST_PORT}/"
if [[ -n "${BASE_PATH}" ]]; then
  echo "Base path URL: http://localhost:${HOST_PORT}${BASE_PATH}/"
fi
