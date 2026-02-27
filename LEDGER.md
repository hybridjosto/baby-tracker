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

## NOTES
- Warning discovered: `src/app/routes/reminders.py` imports functions (`get_reminders`, `update_reminder`, `dispatch_threshold_reminders`) that do not exist in `src/app/services/reminders.py`. This appears to be pre-existing and is currently not active because reminders routes are not registered in `src/app/main.py`.
- In `firestore` mode, collection query indexes may be required in Firebase Console for compound filters/sorts (expected on first production queries).
- `ruff` command could not be run in this environment because `ruff` is not installed in the current toolchain.
