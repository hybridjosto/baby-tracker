# Baby Tracker

A simple, local-first tracker for baby care events like feeds and diaper changes.

## Features
- Fast logging for common events
- Local SQLite storage
- Flask-based web UI
- Offline-first PWA with background sync

## Getting Started
```sh
cd src
pytest
ruff check .
```

## HTTPS with Tailscale

If you want HTTPS on your Tailscale domain, generate a cert on the host:

```sh
sudo tailscale cert rpi.tail458584.ts.net
```

That command writes `.crt` and `.key` files. Start the app with the TLS paths:

```sh
uv run gunicorn "src.app.main:application" --bind 0.0.0.0:8000 --workers 1 --threads 1
```

Terminate TLS with Tailscale serve and forward HTTPS to the Gunicorn HTTP listener
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
