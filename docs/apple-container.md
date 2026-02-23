# Apple Container Setup (macOS)

This project can run with Apple's `container` CLI instead of Podman.

## Requirements

- macOS 26+
- Apple Silicon (arm64)
- Homebrew

Install:

```sh
brew install container
```

On first start, `container system start` prompts to download the default kernel.
Accept the prompt.

## Run Baby Tracker

From repo root:

```sh
./scripts/apple-container-run.sh
```

This script:
- starts the Apple container runtime
- starts the builder
- builds `baby-tracker:apple`
- replaces and runs container `baby-tracker`
- binds `127.0.0.1:8000 -> 8000`
- mounts `./data` to `/data`

Open:

```text
http://localhost:8000/
```

## Useful commands

```sh
container ls
container logs -f baby-tracker
container stop baby-tracker
container start baby-tracker
container rm baby-tracker
```

## Optional settings

Override defaults at runtime:

```sh
BASE_PATH=/baby HOST_PORT=8001 ./scripts/apple-container-run.sh
```

Variables:
- `BASE_PATH` (default empty)
- `HOST_PORT` (default `8000`)
- `CONTAINER_PORT` (default `8000`)
- `IMAGE_NAME` (default `baby-tracker:apple`)
- `CONTAINER_NAME` (default `baby-tracker`)
- `DATA_DIR` (default `./data`)
