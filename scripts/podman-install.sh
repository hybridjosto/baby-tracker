#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OS_NAME="$(uname -s)"

IMAGE_NAME="${IMAGE_NAME:-localhost/baby-tracker:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-baby-tracker}"
HOST_PORT="${HOST_PORT:-8000}"
CONTAINER_PORT="${CONTAINER_PORT:-8000}"
BASE_PATH="${BASE_PATH:-/baby}"
DATA_DIR="${DATA_DIR:-${REPO_ROOT}/data}"
SYSTEMD_USER_DIR="${SYSTEMD_USER_DIR:-${HOME}/.config/systemd/user}"
UNIT_NAME="container-${CONTAINER_NAME}.service"
VOLUME_SPEC="${DATA_DIR}:/data"

if [[ "${OS_NAME}" == "Linux" ]]; then
  VOLUME_SPEC="${VOLUME_SPEC}:Z"
fi

mkdir -p "${DATA_DIR}" "${SYSTEMD_USER_DIR}"

ensure_podman() {
  if podman info >/dev/null 2>&1; then
    return
  fi

  if [[ "${OS_NAME}" == "Darwin" ]]; then
    echo "Podman machine is not running. Attempting to start it..."
    if ! podman machine list --format "{{.Name}}" 2>/dev/null | grep -q .; then
      podman machine init
    fi
    podman machine start
    podman info >/dev/null
    return
  fi

  echo "Podman is not reachable."
  echo "Check: podman system connection list"
  exit 1
}

ensure_podman

echo "Building image ${IMAGE_NAME}..."
podman build -t "${IMAGE_NAME}" "${REPO_ROOT}"

if podman container exists "${CONTAINER_NAME}"; then
  echo "Removing existing container ${CONTAINER_NAME}..."
  podman rm -f "${CONTAINER_NAME}"
fi

echo "Creating container ${CONTAINER_NAME}..."
podman create \
  --name "${CONTAINER_NAME}" \
  --restart always \
  -p "127.0.0.1:${HOST_PORT}:${CONTAINER_PORT}" \
  -e BABY_TRACKER_BASE_PATH="${BASE_PATH}" \
  -e BABY_TRACKER_DB_PATH=/data/baby-tracker.sqlite \
  -e BABY_TRACKER_HOST=0.0.0.0 \
  -e BABY_TRACKER_PORT="${CONTAINER_PORT}" \
  -e BABY_TRACKER_STATIC_VERSION=dev \
  -v "${VOLUME_SPEC}" \
  "${IMAGE_NAME}" >/dev/null

if [[ "${OS_NAME}" == "Linux" ]] && command -v systemctl >/dev/null 2>&1; then
  echo "Generating user systemd unit..."
  (
    cd "${SYSTEMD_USER_DIR}"
    podman generate systemd --name "${CONTAINER_NAME}" --files --new
  )

  echo "Enabling and starting ${UNIT_NAME}..."
  systemctl --user daemon-reload
  systemctl --user enable --now "${UNIT_NAME}"

  if command -v loginctl >/dev/null 2>&1; then
    echo "Enabling linger for ${USER}..."
    loginctl enable-linger "${USER}" || {
      echo "Warning: failed to enable linger. You may need to run:"
      echo "  sudo loginctl enable-linger ${USER}"
    }
  fi
else
  echo "Starting container ${CONTAINER_NAME}..."
  podman start "${CONTAINER_NAME}" >/dev/null
fi

echo
echo "Done."
if [[ "${OS_NAME}" == "Linux" ]] && command -v systemctl >/dev/null 2>&1; then
  echo "Status: systemctl --user status ${UNIT_NAME}"
else
  echo "Status: podman ps --filter name=${CONTAINER_NAME}"
  if [[ "${OS_NAME}" == "Darwin" ]]; then
    echo "Note: on macOS, container restart depends on Podman machine running."
  fi
fi
echo "Logs:   podman logs -f ${CONTAINER_NAME}"
