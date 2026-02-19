# Quickstart: Time Since Last Feed/Poo

## Goal

Validate that the homepage displays correct elapsed time since the latest feed
and poo entries.

## Steps

1. Start the app: `uv run -m src.app.main`
2. Open `http://<pi-or-dev-ip>:8000/suz` on a phone.
3. Log one feed entry and confirm the "last feed" timer updates.
4. Log one poo entry and confirm the "last poo" timer updates.
5. Refresh the page and confirm both timers remain accurate.
6. Visit a user with no entries and confirm placeholders explain the missing
   values.

## Expected Results

- The homepage shows elapsed time since the most recent feed and poo.
- Placeholders appear when no feed or poo entries exist.
- Timers update when new entries are added.
