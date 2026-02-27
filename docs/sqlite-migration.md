# SQLite Migration Runbook

This runbook migrates Baby Tracker data from one server to another using a safe
SQLite backup and cutover.

## Preconditions

- You know the current database path on the source server.
- You know the target database path on the destination server.
- You can stop/start the Baby Tracker web and scheduler processes.

## 1) Prepare source server

Set paths (example):

```bash
export SRC_DB="/path/to/current/baby-tracker.sqlite"
export SNAPSHOT="/tmp/baby-tracker-migrate.sqlite"
```

Stop all writers before backup (recommended):

- web service/process
- scheduler service/process

If using systemd:

```bash
sudo systemctl stop baby-tracker.service
sudo systemctl stop baby-tracker-scheduler.service
```

Create a consistent SQLite snapshot:

```bash
sqlite3 "$SRC_DB" ".backup '$SNAPSHOT'"
```

Optional quick check:

```bash
sqlite3 "$SNAPSHOT" "PRAGMA integrity_check;"
```

## 2) Transfer snapshot to destination server

Example:

```bash
scp "$SNAPSHOT" user@new-server:/tmp/baby-tracker.sqlite
```

## 3) Install DB file on destination server

```bash
sudo mkdir -p /opt/baby-tracker/data
sudo mv /tmp/baby-tracker.sqlite /opt/baby-tracker/data/baby-tracker.sqlite
sudo chown -R <app-user>:<app-group> /opt/baby-tracker/data
chmod 640 /opt/baby-tracker/data/baby-tracker.sqlite
```

## 4) Point app to migrated DB

Baby Tracker reads `BABY_TRACKER_DB_PATH` at startup.

Set:

```bash
BABY_TRACKER_DB_PATH=/opt/baby-tracker/data/baby-tracker.sqlite
```

Where to set it:

- systemd: add/update `Environment=BABY_TRACKER_DB_PATH=...` in service unit or drop-in
- docker-compose: set env var for both web and scheduler services
- manual shell start: export before `uv run ...`

## 5) Start destination services

If using systemd:

```bash
sudo systemctl daemon-reload
sudo systemctl start baby-tracker.service
sudo systemctl start baby-tracker-scheduler.service
```

## 6) Verify cutover

Database checks:

```bash
sqlite3 /opt/baby-tracker/data/baby-tracker.sqlite "PRAGMA integrity_check;"
sqlite3 /opt/baby-tracker/data/baby-tracker.sqlite "SELECT COUNT(*) AS entries_count FROM entries;"
```

App checks:

- Open app UI and confirm recent entries appear.
- Create one new test entry and confirm it is visible.
- Confirm scheduler-driven behavior (if enabled) is functioning.

## 7) Rollback plan

- Keep the source server/data unchanged until validation is complete.
- If destination fails, stop destination writers and point traffic back to source.

## Notes

- Do not raw-copy only `*.sqlite` while the app is live. This project uses WAL mode,
  so use `.backup` for a safe snapshot.
- On startup, Baby Tracker runs DB initialization/migrations automatically, so older
  schema versions are upgraded in-place.
