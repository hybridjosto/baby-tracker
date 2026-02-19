# Quickstart: 24h History Visualization & Log

## Goal

Validate the 24-hour chart on the homepage and the separate scrollable event log
page for a user.

## Steps

1. Start the app: `uv run -m src.app.main`
2. Open `http://<pi-or-dev-ip>:8000/suz` on a phone.
3. Add at least 3 feed/poo entries across a 10-15 minute window.
4. Confirm the homepage chart renders and reflects those entries.
5. Open `http://<pi-or-dev-ip>:8000/suz/log` and confirm the log list is
   scrollable and ordered newest to oldest.
6. Add another entry and confirm both the chart and log update.
7. Temporarily adjust one entry timestamp to older than 24 hours and confirm it
   drops off the chart but remains in the log list.

## Expected Results

- The homepage chart shows only the last 24 hours of entries for the user.
- Feed and poo events are visually distinct in the chart.
- The log page is reachable from the homepage and scrolls smoothly.
- The log shows each entry type and timestamp in reverse chronological order.
