# Baby Tracker

A simple, local-first tracker for baby care events like feeds and diaper changes.

## Features
- Fast logging for common events
- Local SQLite storage
- Flask-based web UI
- Offline-first PWA with background sync

## Getting Started
```sh
uv sync --dev
uv run pytest
uv run ruff check .
```

## Running Locally (HTTP)

```sh
BABY_TRACKER_ENABLE_SCHEDULERS=0 \
uv run gunicorn "src.app.main:application" --bind 0.0.0.0:8000 --workers 2 --threads 2 \
  --access-logfile - --error-logfile -
```

Run the background schedulers in a separate process:

```sh
BABY_TRACKER_ENABLE_SCHEDULERS=1 uv run python -m src.app.scheduler
```

Open `http://localhost:8000/` (or `http://localhost:8000/<base-path>/` if you set
`BABY_TRACKER_BASE_PATH`).

## Configuration

Environment variables:
- `BABY_TRACKER_DB_PATH`: SQLite path (default: `./data/baby-tracker.sqlite`)
- `BABY_TRACKER_HOST`: bind host (default: `0.0.0.0`)
- `BABY_TRACKER_PORT`: bind port (default: `8000`)
- `BABY_TRACKER_BASE_PATH`: serve under a subpath (default: empty)
- `BABY_TRACKER_STATIC_VERSION`: cache-busting version for static assets (default: `dev`). Bump this on
  each deploy so installed PWAs pick up the latest assets.
- `BABY_TRACKER_FEED_DUE_POLL_SECONDS`: feed-due scheduler interval (default: `60`, set `0` to disable)
- `BABY_TRACKER_HOME_KPIS_POLL_SECONDS`: home KPI scheduler interval (default: `900`, set `0` to disable)
- `BABY_TRACKER_ENABLE_SCHEDULERS`: enable in-process schedulers (`0`/`1`, default: `0`)
- `BABY_TRACKER_TLS_CERT_PATH`, `BABY_TRACKER_TLS_KEY_PATH`: TLS files (only used by the Flask dev
  server entrypoint, not gunicorn)
- `BABY_TRACKER_DISCORD_WEBHOOK_URL`: webhook for reminders (see reminders API)

## Docker / docker-compose

```sh
docker compose up --build
```

By default compose runs two services:
- `baby-tracker`: web app on `http://localhost:8000/baby/`
- `baby-tracker-scheduler`: feed-due and home-kpis background loops

The database is stored in `./data`.
Edit `docker-compose.yml` to change ports, base path, or DB location.

## Apple Container (`container` CLI)

Build image:
```sh
container build -t baby-tracker:apple .
```

Start web + scheduler with persistent SQLite storage:
```sh
./scripts/apple-container-up.sh
```

Important: when running containers manually, always set both:
- `--volume "$PWD/data:/data"`
- `--env BABY_TRACKER_DB_PATH=/data/baby-tracker.sqlite`

If `BABY_TRACKER_DB_PATH` is omitted, the app defaults to `./data` inside the
container filesystem, which is ephemeral across container replacement.

## Systemd (example)

Copy `docs/systemd/baby-tracker.service.example` to `/etc/systemd/system/baby-tracker.service`,
adjust paths, then:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now baby-tracker.service
```

## HTTPS with Tailscale

If you want HTTPS on your Tailscale domain, generate a cert on the host:

```sh
sudo tailscale cert rpi.tail458584.ts.net
```

That command writes `.crt` and `.key` files. If you run the Flask dev server
directly (not gunicorn), it will honor the TLS env vars:

```sh
BABY_TRACKER_TLS_CERT_PATH=/path/to.crt BABY_TRACKER_TLS_KEY_PATH=/path/to.key \
uv run python -m src.app.main
```

For gunicorn (recommended), terminate TLS with Tailscale serve (or another reverse
proxy) and forward HTTPS to the HTTP listener
(`http://127.0.0.1:8000`, or whatever you set for `BABY_TRACKER_PORT`).

If you run via systemd, update the service and restart. A ready-to-use
drop-in for TLS env vars lives at `docs/systemd/baby-tracker.service.d/10-tls.conf`. Copy it to:

```sh
sudo mkdir -p /etc/systemd/system/baby-tracker.service.d
sudo cp /home/josh/baby-tracker/docs/systemd/baby-tracker.service.d/10-tls.conf \\
  /etc/systemd/system/baby-tracker.service.d/10-tls.conf
sudo systemctl daemon-reload
sudo systemctl restart baby-tracker.service
```

## Offline Mode
- The PWA caches the app shell for offline access.
- Entries are stored locally for the last 30 days and sync automatically when online.
- Conflict resolution uses last-write-wins (latest sync wins).
- If something looks stuck, clear site data in your browser to reset the cache.
- Sync API: `POST /api/sync/entries` with `{ device_id, cursor, changes }`.

Example sync payload:
```json
{
  "device_id": "ios-6c3f5c",
  "cursor": "2026-01-31T18:30:00+00:00",
  "changes": [
    {
      "action": "upsert",
      "entry": {
        "client_event_id": "local-abc123",
        "user_slug": "josh",
        "type": "feed",
        "timestamp_utc": "2026-01-31T18:45:00+00:00",
        "formula_ml": 90
      }
    },
    {
      "action": "delete",
      "client_event_id": "local-def456"
    }
  ]
}
```

Example sync response:
```json
{
  "cursor": "2026-01-31T19:00:00+00:00",
  "entries": []
}
```

## Local-only API via Caddy + Tailscale
Use Caddy to expose just the `/api` endpoints over your tailnet while keeping the
Flask app bound to localhost. See `docs/tailscale-caddy.md`.

## Pushcut Feed Logging
Configure these settings in the UI (Settings page) or via `/api/settings`:
- `default_user_slug`: used when `user_slug` is not provided to `/api/feed/log`
- `pushcut_feed_due_url`: Pushcut URL to receive feed-due notifications
 - `feed_interval_min`: minutes between feeds (drives next-feed calculation)

Endpoints:
- `POST /api/feed/log` logs a feed with `formula_ml` set to the amount
  - Query params: `amount` (required), `user_slug` (optional)
  - JSON body (optional): `{"amount": 90, "user_slug": "suz"}`
  - Examples:
    - `https://<host>:<port>/api/feed/log?amount=70`
    - `https://<host>:<port>/api/feed/log?amount=90`
    - `https://<host>:<port>/api/feed/log?amount=110`
- `POST /api/push/feed-due` forwards a Pushcut notification payload
  - JSON body: `{"title":"Feed due","body":"Time for a feed."}`
  - If empty, defaults to the payload above.

## Feed-Due Timer
The server can automatically send a feed-due Pushcut notification when the
next-feed time is reached. It uses `feed_interval_min`, the latest feed entry,
and `default_user_slug` (if set).

Controls:
- `BABY_TRACKER_FEED_DUE_POLL_SECONDS` (default: 60). Set to `0` to disable.

Manual smoke test:
Use this to send a one-off Pushcut notification via pytest. It creates a due
feed entry and calls the feed-due dispatcher.
```sh
RUN_PUSHCUT_SMOKE=1 PUSHCUT_URL="https://api.pushcut.io/..." \
uv run pytest tests/manual/test_feed_due_timer_smoke.py
```

## Home KPIs Webhook
Configure `home_kpis_webhook_url` in Settings to POST a KPI payload whenever
a new entry is created and on a schedule.

Controls:
- `BABY_TRACKER_HOME_KPIS_POLL_SECONDS` (default: 900). Set to `0` to disable.

## Backfill expressed/formula amounts
If you previously logged expressed/formula amounts in notes, run the one-off script to
populate `expressed_ml`/`formula_ml` columns (notes are left unchanged).

```sh
uv run python scripts/backfill_feed_amounts.py
```

Optional custom DB path:
```sh
BABY_TRACKER_DB_PATH=/path/to/db.sqlite uv run python scripts/backfill_feed_amounts.py
```
