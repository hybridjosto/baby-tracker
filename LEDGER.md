# TODO

## Fixes


## TO DO
- add a baby weight (kg) to goal ml function. *needs planning
- add a more in depth feeding plan. *needs planning
- align the milk express ledger page format (menu + general look and feel) to the rest of the app.

## DONE
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

## NOTES
- Warning discovered: `src/app/routes/reminders.py` imports functions (`get_reminders`, `update_reminder`, `dispatch_threshold_reminders`) that do not exist in `src/app/services/reminders.py`. This appears to be pre-existing and is currently not active because reminders routes are not registered in `src/app/main.py`.
- In `firestore` mode, collection query indexes may be required in Firebase Console for compound filters/sorts (expected on first production queries).
- `ruff` command could not be run in this environment because `ruff` is not installed in the current toolchain.
- Local `.env` now contains a generated `BABY_TRACKER_APP_SHARED_SECRET`; clients must send this value in `X-App-Secret` for `/api/*` in `dual`/`firestore` modes.
- Verified running container env includes: `BABY_TRACKER_STORAGE_BACKEND=dual`, Firebase project id, credentials path, and shared secret.
- Debug note: `/run/secrets/firebase-service-account.json` mount path caused `PermissionError` in Apple container runtime; switched to `/data/firebase-service-account.json`.
- Root cause for missing Firestore data on `2026-02-27`: active `baby-tracker.service` had no Firebase/dual env vars, so runtime fell back to default `sqlite`.
- Root cause for intermittent `sync failed` + Summary API errors on `2026-02-27`: clients without `X-App-Secret` hit `/api/*` and received `401`; this was observed with stale cached assets in some PWA sessions. Mitigation applied by bumping `BABY_TRACKER_STATIC_VERSION` to `2026-02-27-authfix-1` and restarting `baby-tracker.service`.
