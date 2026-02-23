# Podman Persistent Deployment

This setup runs Baby Tracker as a rootless Podman container.
- Linux: managed by user `systemd` for automatic startup and reboot persistence.
- macOS: runs under Podman machine with container restart policy.

## Prerequisites

- Podman installed
- User-level systemd available (`systemctl --user`)

## One-command install

From the repository root:

```sh
./scripts/podman-install.sh
```

The script will:
- build image `localhost/baby-tracker:latest`
- create/replace container `baby-tracker`
- mount `./data` to `/data` in the container
- publish `127.0.0.1:8000 -> 8000`
- auto-start (and initialize, if needed) Podman machine on macOS
- on Linux, generate and enable `~/.config/systemd/user/container-baby-tracker.service`
- on Linux, enable linger for your user (so the service runs after reboot/log out)

## Useful commands

```sh
systemctl --user status container-baby-tracker.service
systemctl --user restart container-baby-tracker.service
podman logs -f baby-tracker
podman ps
```

On macOS, use:

```sh
podman machine list
podman machine start
podman logs -f baby-tracker
podman ps
```

## Configuration

Edit `scripts/podman-install.sh` if you want to change:
- host port mapping
- env vars (base path, db path, host, port, static version)
- image/tag and container name

You can also override settings at runtime:

```sh
BASE_PATH= ./scripts/podman-install.sh
```

That sets `BABY_TRACKER_BASE_PATH` to empty so the app is served at `/` instead of `/baby/`.
