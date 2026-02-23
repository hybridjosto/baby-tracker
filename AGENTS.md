# baby Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-02

## Active Technologies
- Python 3.12 + Flask (002-user-homepages)
- SQLite (local file) (002-user-homepages)

- Python 3.11 + Flask (web), SQLite (embedded DB) (001-two-click-log)

## Project Structure

```text
src/
tests/
```

## Commands

cd src [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] pytest [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] ruff check .

## Code Style

Python 3.11: Follow standard conventions

## Recent Changes
- 002-user-homepages: Added Python 3.12 + Flask

- 001-two-click-log: Added Python 3.11 + Flask (web), SQLite (embedded DB)

<!-- MANUAL ADDITIONS START -->
- Run app commands from repo root when using module path `src.app.main`.
- If your shell is in `src/`, use module path `app.main` instead.
<!-- MANUAL ADDITIONS END -->
