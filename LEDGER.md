# TODO

## Fixes


## TO DO
- add a baby weight (kg) to goal ml function. *needs planning
- add a more in depth feeding plan. *needs planning
- align the milk express ledger page format (menu + general look and feel) to the rest of the app.

## DONE
- [x] Switch local runtime to SQLite-only on 2026-03-02 by setting `BABY_TRACKER_STORAGE_BACKEND=sqlite` in `.env`.
- [x] Remove sqlite startup blocker by clearing `BABY_TRACKER_FIREBASE_CREDENTIALS_PATH` in `.env` (non-empty invalid path raises `FileNotFoundError` during config load even in sqlite mode).
- [x] Verify sqlite startup and load path after config change: `load_config()` resolves `storage_backend=sqlite`, `db_path=data/baby-tracker.sqlite`, and `create_app()` initializes successfully.
- [x] Diagnose and fix March 2, 2026 homelab partial-load outage: rebuilt/redeployed Apple container image, restored `GET /baby/api/home-kpis` to `200`, and aligned runtime `BABY_TRACKER_BASE_PATH=/baby`.
- [x] Update `scripts/apple-container-up.sh` to propagate `BABY_TRACKER_BASE_PATH` into both web and scheduler containers.
- [x] Exempt all read-only API routes (`GET`/`HEAD` on `/api/*`) from API shared-secret enforcement in `dual`/`firestore`, while continuing to require `X-App-Secret` for write routes.
- [x] Expand API secret integration coverage to verify multiple read-only routes succeed without `X-App-Secret`.
- [x] Exempt `GET /api/home-kpis` from API shared-secret enforcement while keeping write APIs protected in `dual`/`firestore`.
- [x] Add integration test coverage for API secret behavior (`home-kpis` read exemption + write-route `401` without secret).
- [x] Verify `home-kpis` API auth behavior and document required header/troubleshooting in README (`X-App-Secret`; not `x-aop-secret`).
- [x] Make `scripts/apple-container-up.sh` interactive in terminal sessions: prompt to pull prod data when `BABY_TRACKER_PULL_PROD_DATA` is unset.
- [x] Add env-controlled prod data pull to `scripts/apple-container-up.sh` using remote SQLite `.backup` + `scp` (default target `josh@homelab.tail458584.ts.net`) with fail-fast behavior on sync errors.
- [x] Update Apple container startup script to use firebase service account from `data/` (fallback to legacy root path).
- [x] Tidy up, remove "All events" in header on all pages.
- [x] Make it clearer the total intake is midnight - midnight on the home page.
- [x] make editing the sleep duration easier (hours + minutes) as inputting only minutes is hard to parse.
- [x] in dark mode and starting the sleep event, the font colour is not readable.
- [x] Add staged Firebase/Firestore backend support with env toggle: `sqlite` / `dual` / `firestore`.
- [x] Add API shared-secret enforcement for `/api/*` in `dual`/`firestore` modes (`X-App-Secret`).
- [x] Add Firestore-backed storage implementations for entries, settings, bottles, feeding goals, calendar events, and reminders.
- [x] Add dual-write behavior (SQLite primary + Firestore mirror) for write paths.
- [x] Add SQLite -> Firestore backfill script: `scripts/migrate_sqlite_to_firestore.py`.
- [x] Update README with Firebase configuration and staged migration steps.
- [x] Run test suite after migration changes (`80 passed, 1 skipped`).
- [x] Wire Firestore env settings into `docker-compose.yml` for web + scheduler (including mounted service account path).
- [x] Add `.env.firebase.example` template for Firestore runtime variables.
- [x] Wire Firestore env examples into systemd service example files.
- [x] Update Apple container startup script to pass Firestore env and mount credentials.
- [x] Add `firebase-service-account.json` and `.env.firebase` to `.gitignore` to reduce secret-leak risk.
- [x] Populate real local `.env` with Firestore runtime variables for Apple container deployment.
- [x] Restart Apple containers (`baby-tracker`, `baby-tracker-scheduler`) with Firestore env loaded from `.env`.
- [x] Fix Apple container Firestore credential mount path by copying service account JSON into `/data` and using `/data/firebase-service-account.json`.
- [x] Verify dual-write in live runtime by creating a test entry and confirming presence in both SQLite and Firestore.
- [x] Fix browser API auth in dual/firestore mode by auto-attaching `X-App-Secret` in frontend fetch calls.
- [x] Expose `api_shared_secret` to templates and include as `data-api-secret` on page bodies.
- [x] Add static version pass-through to Apple container startup and bump cache version to force new JS in PWA clients.
- [x] Enable dual-write Firebase env vars in live `systemd` service via drop-in (`30-firebase.conf`) and verify API-created entries land in both SQLite + Firestore.
- [x] Add Firebase systemd drop-in template: `docs/systemd/baby-tracker.service.d/20-firebase.conf.example`.
- [x] Reset Firestore to SQLite source of truth on `2026-02-27`: deleted Firestore collections, re-ran `scripts/migrate_sqlite_to_firestore.py`, and re-verified entry parity by `client_event_id` (`missing=0`, `extra=0`).
- [x] Keep home page loading scoped to last 24 hours only (including latest-entry display source) to improve perceived responsiveness.
- [x] Add progressive summary all-time loading: fast initial slice, background history pagination, and visible partial-coverage status text.
- [x] Re-run tests after progressive loading changes (`80 passed, 1 skipped` via `uv run pytest -q`).
- [x] Update `scripts/apple-container-up.sh` to auto-load `.env` and fail fast with a clear message if `BABY_TRACKER_APP_SHARED_SECRET` is missing for `dual`/`firestore`.
- [x] Migrate Tailscale service endpoint from `joshs-mac-mini` to `homelab` on `2026-03-02`: renamed current `homelab` node to `rpi`, renamed `joshs-mac-mini` to `homelab`, and configured `tailscale serve --set-path /baby/ 8000`.
- [x] Verify `https://homelab.tail458584.ts.net/baby/` returns app homepage (`HTTP/2 200`) on `2026-03-02`.

## NOTES
- Sync caveat (2026-03-02): an entry that exists only on phone and not in browser/server is still client-local and has not reached server SQLite yet; switching backend to sqlite cannot recover unsynced phone-local outbox items by itself.
- Config caveat: `BABY_TRACKER_FIREBASE_CREDENTIALS_PATH` is validated whenever set (regardless of backend), so an invalid non-empty path can block app startup in sqlite mode.
- Root cause (2026-03-02 incident): running `baby-tracker` container image was stale (pre-read-only auth change) and runtime lacked `BABY_TRACKER_BASE_PATH`, causing stale auth behavior and wrong absolute asset/API paths when accessed at `/baby/`.
- Verified post-fix from this workspace: `https://homelab.tail458584.ts.net/baby/` and `https://homelab.tail458584.ts.net/baby/api/home-kpis` both return `200`, and rendered HTML now uses `/baby/static/...` with `data-base-path="/baby"`.
- Read-only `/api/*` routes (`GET`/`HEAD`) are intentionally unauthenticated in `dual`/`firestore`; write APIs remain protected by `X-App-Secret`.
- Auth behavior changed: all read-only `/api/*` fetches are exempt; write `/api/*` routes still return `401` when `X-App-Secret` is missing/wrong in `dual`/`firestore`.
- Prod pull in `scripts/apple-container-up.sh` refreshes local SQLite + Firebase credentials only; it intentionally does not auto-run SQLite -> Firestore backfill.
- Warning discovered: `src/app/routes/reminders.py` imports functions (`get_reminders`, `update_reminder`, `dispatch_threshold_reminders`) that do not exist in `src/app/services/reminders.py`. This appears to be pre-existing and is currently not active because reminders routes are not registered in `src/app/main.py`.
- In `firestore` mode, collection query indexes may be required in Firebase Console for compound filters/sorts (expected on first production queries).
- `ruff` command could not be run in this environment because `ruff` is not installed in the current toolchain.
- Local `.env` now contains a generated `BABY_TRACKER_APP_SHARED_SECRET`; clients must send this value in `X-App-Secret` for `/api/*` in `dual`/`firestore` modes.
- Verified running container env includes: `BABY_TRACKER_STORAGE_BACKEND=dual`, Firebase project id, credentials path, and shared secret.
- Debug note: `/run/secrets/firebase-service-account.json` mount path caused `PermissionError` in Apple container runtime; switched to `/data/firebase-service-account.json`.
- Root cause for missing Firestore data on `2026-02-27`: active `baby-tracker.service` had no Firebase/dual env vars, so runtime fell back to default `sqlite`.
- Root cause for intermittent `sync failed` + Summary API errors on `2026-02-27`: clients without `X-App-Secret` hit `/api/*` and received `401`; this was observed with stale cached assets in some PWA sessions. Mitigation applied by bumping `BABY_TRACKER_STATIC_VERSION` to `2026-02-27-authfix-1` and restarting `baby-tracker.service`.
- Tailscale serve currently has a legacy `/stt -> http://127.0.0.1:8190` handler bound to `joshs-mac-mini.tail458584.ts.net:443`; `/baby/` is correctly bound to `homelab.tail458584.ts.net:443`.
