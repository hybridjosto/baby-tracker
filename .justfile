restart:
  ./scripts/apple-container-restart.sh

export-events:
  sqlite3 data/baby-tracker.sqlite < export_events.sql
