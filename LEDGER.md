# TODO

## Fixes


## TO DO
- add a baby weight (kg) to goal ml function. *needs planning
- add a more in depth feeding plan. *needs planning
- align the milk express ledger page format (menu + general look and feel) to the rest of the app.

## DONE
- created GitButler branch `security/sqlite-only-hardening` and attached existing unassigned local files (`.gitignore`, `scripts/apple-container-restart.sh`, `skills-lock.json`) before code edits.
- removed Firebase/Firestore runtime paths and secret-based API gating from the app.
- removed frontend secret exposure path (`data-api-secret` + JS `X-App-Secret` header injection).
- simplified storage layer to SQLite-only and deleted Firestore modules/scripts (`src/app/storage/firestore_client.py`, `scripts/migrate_sqlite_to_firestore.py`).
- updated `scripts/apple-container-up.sh` to SQLite-only startup (removed Firebase credential copy/env wiring and shared-secret requirement).
- tightened entry timestamp validation for create/update/sync write paths (`timestamp_utc` now validated as ISO-8601).
- changed sync cursor query from inclusive (`>=`) to strict (`>`) to avoid replaying already-synced rows.
- updated docs and systemd examples to SQLite-only configuration.
- added/updated tests for no-secret behavior, timestamp validation, and non-replaying sync cursor semantics.
- added `scripts/apple-container-restart.sh` to build and restart the Apple container runtime workload (`container rm --force` + `container run`).
- started container successfully on 2026-03-04 via the new script (`baby-tracker` listening on port 8000).
- updated `scripts/apple-container-restart.sh` to enforce tailscale serve route for this app: `/baby -> 127.0.0.1:8000`.
- fixed `/baby` unresponsive deployment on 2026-03-04 by aligning app + proxy path handling:
  - default app base path in restart script is now `BABY_TRACKER_BASE_PATH=/baby`
  - tailscale serve target now forwards to `http://127.0.0.1:8000/baby` for the `/baby` path
  - verified rendered HTML now uses `/baby/static/...` and `data-base-path="/baby"`
- fixed edit-entry duration prefill to show formatted `h/m` value instead of raw minutes in prompt fallback (`src/web/static/app.js`) on 2026-03-07.
- fixed timeline/log edit modal duration field to accept/display `minutes or h/m` (label + text input + example placeholder) in `src/web/templates/timeline.html` and `src/web/templates/log.html` on 2026-03-07.
- added a Summary-page sleep-focused 24h Gantt timeline with sleep duration bars and optional overlay markers for other event types (`feed`, `cry`, `wee`, `poo`, timed/custom events) in `src/web/templates/summary.html` and `src/web/static/app.js` on 2026-03-07.
- fixed Summary sleep Gantt overlap handling so sleep entries that start on the previous day still render on the selected day when they overlap past midnight (24h lookback window for chart data) in `src/web/static/app.js` on 2026-03-07.
- made the quick logging footer accessible from every page by extracting a shared template partial (`src/web/templates/logging_footer.html`), including it across all page templates, moving shared footer/menu styles into `src/web/static/styles.css`, and initializing quick-log handlers globally in `src/web/static/app.js` on 2026-03-07.

## NOTES
- tests after SQLite-only security refactor: `87 passed, 1 skipped` on 2026-03-05.
- `uv.lock` changed as part of dependency surface changes (Firestore dependency removed from `pyproject.toml`).
- removed `docs/systemd/baby-tracker.service.d/20-firebase.conf.example`; if needed later, replace with a SQLite-focused drop-in instead of Firebase env vars.
- `container list` also shows `buildkit` running; this is expected after `container build`.
- tailscale serve status verified on 2026-03-04 for this app path: `/baby` is active on `homelab.tail458584.ts.net`.
- debug finding (2026-03-04): `/baby/` currently renders `data-base-path=""` and root asset URLs (`/static/...`), while tailscale only proxies `/baby/*`; result is page HTML loads but JS/CSS/API at root can fail and UI appears unresponsive.
- debug finding (2026-03-04): if app is configured with `BASE_PATH=/baby`, proxy target must include `/baby` too (e.g. `tailscale serve --set-path /baby http://127.0.0.1:8000/baby`) to avoid 404s.
- tests run on 2026-03-07 after footer change: `../.venv/bin/pytest ../tests/integration/test_feed_log_api.py ../tests/integration/test_diaper_log_api.py` -> `7 passed`.
