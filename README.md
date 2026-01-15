# Baby Tracker

A simple, local-first tracker for baby care events like feeds and diaper changes.

## Features
- Fast logging for common events
- Local SQLite storage
- Flask-based web UI

## Getting Started
```sh
cd src
pytest
ruff check .
```

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
