# Baby Tracker

Private baby feed and poo tracker for a Raspberry Pi, accessible over Tailscale
from iPhones. The UI is optimized for two-tap logging.

## Run

1. Create a virtual environment and install dependencies:
   - `python -m venv .venv`
   - `source .venv/bin/activate`
   - `pip install -e .`
2. Start the server: `python -m src.app.main`
3. Open `http://<rpi-tailscale-ip>:8000` on the phone and add it to the home
   screen for one-tap access.

## Configuration

- `BABY_TRACKER_DB_PATH`: SQLite file path (default: `./data/baby-tracker.sqlite`)
- `BABY_TRACKER_PORT`: HTTP port (default: `8000`)
