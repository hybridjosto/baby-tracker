# TODO

## Fixes


## TO DO
- add a baby weight (kg) to goal ml function. *needs planning
- add a more in depth feeding plan. *needs planning
- align the milk express ledger page format (menu + general look and feel) to the rest of the app.

## DONE
- fixed homepage next-feed suggestion day bucketing to use the actual next local midnight on DST transition days, preserving the documented local-midnight reset behavior, on 2026-03-14.
- extended the homepage next-feed modal on 2026-03-14 to show a suggestion-based rolling feed total for each upcoming row, with the running total resetting automatically at each local midnight.
- added a Playwright-based frontend test harness for the homepage next-feed modal using a live Flask test server fixture and browser-time freezing, with clean skips when Playwright/browser binaries are unavailable, on 2026-03-14.
- added configurable future-feed suggestion sizes (`feed_size_small_ml`, `feed_size_big_ml`) with defaults 120/150 ml in settings storage/API/UI, and used them on the homepage next-feed modal to suggest `Small`/`Big` feeds that keep the remaining pre-midnight schedule on track for the daily goal on 2026-03-14.
- added `last_feed_time_utc` to `GET /api/entries/summary` as a backward-compatible top-level field while keeping existing `items` and `summary` unchanged on 2026-03-14.
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
- added new timed-event start APIs `POST /api/sleep/start` and `POST /api/cry/start` in `src/app/routes/feed.py` (default/override user slug support, optional notes/timestamp passthrough, and `feed_duration_min=null` on creation) on 2026-03-08.
- added integration coverage for timed-event start APIs in `tests/integration/test_feed_log_api.py` (default user slug, user override, and payload fields) on 2026-03-08.

## NOTES
- review follow-up on 2026-03-14: the original rolling-total planner used `dayStart + 24h`, which can drift from local midnight on DST transition days; `src/web/static/app.js` now uses `getNextLocalMidnightTs(...)` for day splits.
- tests run on 2026-03-14 after rolling future-feed totals: `./.venv/bin/pytest tests/integration/test_settings_api.py tests/unit/test_settings_storage.py tests/frontend/test_next_feed_modal.py` -> `7 passed, 3 skipped`.
- frontend tests added on 2026-03-14 require Python package `playwright` plus an installed Chromium binary; in this environment they currently skip because Playwright is not installed.
- tests run on 2026-03-14 for frontend harness: `./.venv/bin/pytest tests/frontend/test_next_feed_modal.py` -> `3 skipped` (sandbox cannot bind a localhost test server here).
- tests run on 2026-03-14 for combined coverage: `./.venv/bin/pytest tests/integration/test_settings_api.py tests/unit/test_settings_storage.py tests/frontend/test_next_feed_modal.py` -> `7 passed, 3 skipped`.
- tests run on 2026-03-14 after future-feed suggestion sizing: `./.venv/bin/pytest tests/integration/test_settings_api.py tests/unit/test_settings_storage.py` -> `7 passed`.
- lint attempted on 2026-03-14 after future-feed suggestion sizing: `./.venv/bin/python -m ruff check src tests/integration/test_settings_api.py tests/unit/test_settings_storage.py` could not run because `ruff` is not installed in `.venv`.
- tests run on 2026-03-14 after summary API addition: `./.venv/bin/pytest tests/integration/test_entries_api.py` -> `29 passed`.
- lint attempted on 2026-03-14 after summary API addition: `./.venv/bin/python -m ruff check src` could not run because `ruff` is not installed in `.venv`.
- tests after SQLite-only security refactor: `87 passed, 1 skipped` on 2026-03-05.
- `uv.lock` changed as part of dependency surface changes (Firestore dependency removed from `pyproject.toml`).
- removed `docs/systemd/baby-tracker.service.d/20-firebase.conf.example`; if needed later, replace with a SQLite-focused drop-in instead of Firebase env vars.
- `container list` also shows `buildkit` running; this is expected after `container build`.
- tailscale serve status verified on 2026-03-04 for this app path: `/baby` is active on `homelab.tail458584.ts.net`.
- debug finding (2026-03-04): `/baby/` currently renders `data-base-path=""` and root asset URLs (`/static/...`), while tailscale only proxies `/baby/*`; result is page HTML loads but JS/CSS/API at root can fail and UI appears unresponsive.
- debug finding (2026-03-04): if app is configured with `BASE_PATH=/baby`, proxy target must include `/baby` too (e.g. `tailscale serve --set-path /baby http://127.0.0.1:8000/baby`) to avoid 404s.
- tests run on 2026-03-07 after footer change: `../.venv/bin/pytest ../tests/integration/test_feed_log_api.py ../tests/integration/test_diaper_log_api.py` -> `7 passed`.
- tests run on 2026-03-08 after timed-event start API addition: `../.venv/bin/pytest ../tests/integration/test_feed_log_api.py ../tests/integration/test_diaper_log_api.py` -> `10 passed`.
- lint run on 2026-03-08 after timed-event start API addition: `cd src && ruff check .` -> `All checks passed!`.
- tests attempted on 2026-03-14: `python3 -m pytest tests/integration/test_feed_log_api.py` could not run because `pytest` is not installed and this environment cannot reach PyPI.
