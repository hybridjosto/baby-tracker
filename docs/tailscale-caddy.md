# Local-only API via Caddy + Tailscale

This setup keeps the Flask app bound to localhost while Caddy serves only the `/api`
endpoints over your tailnet.

## Prereqs
- Tailscale installed on the host running the app and Caddy
- Caddy installed on the same host

## 1) Run the app on localhost

Set the host to loopback so only Caddy can reach it.

```sh
BABY_TRACKER_HOST=127.0.0.1 BABY_TRACKER_PORT=8000 uv run python -m src.app.main
```

## 2) Run Caddy on the Tailscale interface

Use the provided `Caddyfile.tailscale` and set `TAILSCALE_IP` to the host's tailnet IP.

```sh
TAILSCALE_IP=$(tailscale ip -4)
export TAILSCALE_IP

caddy run --config Caddyfile.tailscale
```

The API will be reachable from your tailnet at:

```text
http://<TAILSCALE_IP>:8443/api/entries
```

## 3) Optional: expose the full UI

If you want the UI too, change the Caddyfile to proxy all paths:

```text
:8443 {
  bind {$TAILSCALE_IP}
  reverse_proxy 127.0.0.1:8000
}
```

## Notes
- This config intentionally returns 404 for non-`/api` paths.
- If you already use a different port, update `reverse_proxy` and the app's port.
