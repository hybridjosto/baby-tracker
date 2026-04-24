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

## Running Locally

```sh
just restart
```

Or manually:

```sh
BABY_TRACKER_ENABLE_SCHEDULERS=0 \
uv run gunicorn "src.app.main:application" --bind 0.0.0.0:8000 --workers 2 --threads 2 \
  --access-logfile - --error-logfile -
```

Run the background schedulers in a separate process:

```sh
BABY_TRACKER_ENABLE_SCHEDULERS=1 uv run python -m src.app.scheduler
```

## Configuration

Environment variables:
- `BABY_TRACKER_DB_PATH`: SQLite path (default: `./data/baby-tracker.sqlite`)
- `BABY_TRACKER_STORAGE_BACKEND`: optional legacy setting; must be `sqlite` if set
- `BABY_TRACKER_HOST`: bind host (default: `0.0.0.0`)
- `BABY_TRACKER_PORT`: bind port (default: `8000`)
- `BABY_TRACKER_BASE_PATH`: serve under a subpath (default: empty)
- `BABY_TRACKER_STATIC_VERSION`: cache-busting version for static assets (default: `dev`). Bump this on
  each deploy so installed PWAs pick up the latest assets.
- `BABY_TRACKER_FEED_DUE_POLL_SECONDS`: feed-due scheduler interval (default: `60`, set `0` to disable)
- `BABY_TRACKER_HOME_KPIS_POLL_SECONDS`: home KPI scheduler interval (default: `900`, set `0` to disable)
- `BABY_TRACKER_ENABLE_SCHEDULERS`: enable in-process schedulers (`0`/`1`, default: `0`)
- `BABY_TRACKER_VAPID_PUBLIC_KEY`, `BABY_TRACKER_VAPID_PRIVATE_KEY`, `BABY_TRACKER_VAPID_SUBJECT`: Web Push VAPID settings for native browser feed reminders
- `BABY_TRACKER_OPENAI_API_KEY` or `OPENAI_API_KEY`: API key for on-demand AI handover summaries
- `BABY_TRACKER_LLM_SUMMARY_PROMPT_PATH`: optional file override for the AI handover prompt template
- `BABY_TRACKER_TLS_CERT_PATH`, `BABY_TRACKER_TLS_KEY_PATH`: TLS files (only used by the Flask dev
  server entrypoint, not gunicorn)
- `BABY_TRACKER_DISCORD_WEBHOOK_URL`: webhook for reminders (see reminders API)

SQLite server migration runbook: `docs/sqlite-migration.md`



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

## Feed Logging
Configure these settings in the UI (Settings page) or via `/api/settings`:
- `default_user_slug`: used when `user_slug` is not provided to `/api/feed/log`
- `feed_interval_min`: minutes between feeds (drives next-feed calculation)

Endpoints:
- `POST /api/feed/log` logs a feed with `formula_ml` set to the amount
  - Query params: `amount` (required), `user_slug` (optional)
  - JSON body (optional): `{"amount": 90, "user_slug": "suz"}`
  - Examples:
    - `https://<host>:<port>/api/feed/log?amount=70`
    - `https://<host>:<port>/api/feed/log?amount=90`
    - `https://<host>:<port>/api/feed/log?amount=110`

## Feed-Due Timer
The server can automatically send a native browser push notification when the
next-feed time is reached. Reminders are tied to the subscribed `user_slug`,
with one active browser/device per user.

Controls:
- `BABY_TRACKER_FEED_DUE_POLL_SECONDS` (default: 60). Set to `0` to disable.

Native push setup:
- Generate VAPID keys and set `BABY_TRACKER_VAPID_PUBLIC_KEY`, `BABY_TRACKER_VAPID_PRIVATE_KEY`, and `BABY_TRACKER_VAPID_SUBJECT`.
- Open the app over HTTPS, choose a user, then enable `Feed reminders on this device` in Settings.
- The newest enabled device replaces the previous device for that user.

Push APIs:
- `GET /api/push/vapid-public-key` returns the browser subscription key.
- `GET /api/push/subscription?user_slug=suz` returns current subscription status.
- `POST /api/push/subscription` saves the current browser subscription for a user.
- `DELETE /api/push/subscription` removes the current user's active subscription.
- `POST /api/push/feed-due` sends a test notification to the current user's active device.

Notes:
- Web Push requires HTTPS outside localhost.
- For production, keep schedulers in the dedicated scheduler process instead of web workers to avoid duplicate sends.

## Home KPIs Webhook
Configure `home_kpis_webhook_url` in Settings to POST a KPI payload whenever
a new entry is created and on a schedule.

Controls:
- `BABY_TRACKER_HOME_KPIS_POLL_SECONDS` (default: 900). Set to `0` to disable.

Home KPIs API:
- `GET /api/home-kpis` returns the current KPI payload.
- No API shared-secret header is required.

Troubleshooting:
- If you recently deployed frontend auth changes, bump `BABY_TRACKER_STATIC_VERSION` and hard-refresh/clear PWA cache to avoid stale assets.

## AI Handover Summary
- Configure `openai_model` and `openai_timeout_seconds` in Settings.
- The server reads the OpenAI API key from `BABY_TRACKER_OPENAI_API_KEY` or `OPENAI_API_KEY`.
- The default prompt template lives at `src/app/prompts/llm_summary_prompt.txt`.
- Set `BABY_TRACKER_LLM_SUMMARY_PROMPT_PATH` to use a different prompt file at runtime.
- The Summary page sends the selected day plus the prior 7 comparable day windows so the model can compare the chosen day against recent patterns.
- After adding the key, restart the running web process or container. A `.env` file only helps if your launcher passes it through to the process environment.

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
