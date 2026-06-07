# Baby Tracker via Tailscale

The preferred live setup is Tailscale Serve:

```text
https://homelab.tail458584.ts.net/baby -> http://127.0.0.1:8000/baby
```

Baby Tracker should own port `8000`. Other local apps, including the Reel
Transcriber, should use a different host port.

## Prereqs
- Tailscale installed on the host running the app and Caddy
- Caddy installed on the same host

## 1) Run the app on `/baby`

```sh
BABY_TRACKER_BASE_PATH=/baby BABY_TRACKER_HOST=127.0.0.1 BABY_TRACKER_PORT=8000 uv run python -m src.app.main
```

## 2) Publish with Tailscale Serve

```sh
tailscale serve --bg --set-path /baby http://127.0.0.1:8000/baby
tailscale serve status
```

The app and health probe should then be reachable at:

```text
https://homelab.tail458584.ts.net/baby
https://homelab.tail458584.ts.net/baby/healthz
```

## 3) Optional Caddy fallback

If Caddy is used instead of Tailscale Serve, use the provided
`Caddyfile.tailscale` as a fallback. It proxies `/baby*` to the local app and
returns 404 for anything else.

## Notes
- If `https://homelab.tail458584.ts.net/baby` returns `{"detail":"Not Found"}`,
  something else is likely bound to `127.0.0.1:8000`.
- If direct `http://<tailscale-ip>:8000/` returns 404, retry
  `http://<tailscale-ip>:8000/baby/`; this deployment is intentionally mounted
  under `/baby`.
