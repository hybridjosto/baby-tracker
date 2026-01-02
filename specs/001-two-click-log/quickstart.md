# Quickstart: Two-Click Baby Logging

## Prerequisites

- Raspberry Pi on the home network with Tailscale installed
- Python 3.11 available on the Pi

## Setup

1. Clone the repository to the Raspberry Pi.
2. Create a virtual environment and install dependencies:
   - `python -m venv .venv`
   - `source .venv/bin/activate`
   - `pip install -e .`
3. Set environment variables:
- `BABY_TRACKER_DB_PATH` (default: `./data/baby-tracker.sqlite`)
   - `BABY_TRACKER_PORT` (default: `8000`)

## Run

1. Start the web server: `python -m src.app.main`
2. Visit `http://<rpi-tailscale-ip>:8000` from the phone.
3. Add the site to the phone home screen for one-tap access.

## Backup

- Copy the SQLite file to another device periodically.
- Export entries to CSV/JSON via the export endpoint (to be implemented).
