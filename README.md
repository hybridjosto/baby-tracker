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
uv run gunicorn "src.app.main:application" --bind 0.0.0.0:8000 --workers 1 --threads 1 \
  --access-logfile - --error-logfile -
```

Open `http://localhost:8000/` (or `http://localhost:8000/<base-path>/` if you set
`BABY_TRACKER_BASE_PATH`).

## Configuration

Environment variables:
- `BABY_TRACKER_DB_PATH`: SQLite path (default: `./data/baby-tracker.sqlite`)
- `BABY_TRACKER_HOST`: bind host (default: `0.0.0.0`)
- `BABY_TRACKER_PORT`: bind port (default: `8000`)
- `BABY_TRACKER_BASE_PATH`: serve under a subpath (default: empty)
- `BABY_TRACKER_FEED_DUE_POLL_SECONDS`: feed-due scheduler interval (default: `60`, set `0` to disable)
- `BABY_TRACKER_HOME_KPIS_POLL_SECONDS`: home KPI scheduler interval (default: `900`, set `0` to disable)
- `BABY_TRACKER_TLS_CERT_PATH`, `BABY_TRACKER_TLS_KEY_PATH`: TLS files (only used by the Flask dev
  server entrypoint, not gunicorn)
- `BABY_TRACKER_DISCORD_WEBHOOK_URL`: webhook for reminders (see reminders API)

Note: the background schedulers run inside the web process. Keep gunicorn workers at `1`
unless you intentionally want duplicate scheduler threads.

## Docker / docker-compose

```sh
docker compose up --build
```

By default it serves on `http://localhost:8000/baby/` with the database stored in `./data`.
Edit `docker-compose.yml` to change ports, base path, or DB location.

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
