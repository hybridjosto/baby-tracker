# Quickstart: Wee Event Logging

## Goal

Validate that wee events can be logged and appear correctly in history and log
views.

## Steps

1. Start the app: `uv run -m src.app.main`
2. Open `http://<pi-or-dev-ip>:8000/suz` on a phone.
3. Tap the Wee button and confirm the entry appears in the homepage history.
4. Open `http://<pi-or-dev-ip>:8000/suz/log` and confirm the wee entry appears
   with the correct label.
5. Log a feed and poo entry and confirm the wee entry remains distinct.

## Expected Results

- Wee entries are created in one tap.
- Wee entries appear in both the homepage history and the log list.
- Wee entries are clearly labeled and visually distinct from feed/poo.
