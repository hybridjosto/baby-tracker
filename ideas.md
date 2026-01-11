# Ideas

## Notification + timer service
- Pluggable notifier interface with Discord webhook as the initial backend.
- Future notifier options: email, SMS, push, Slack, or local device notifications.
- Use a simple scheduler entrypoint (cron/systemd) to run dispatch ticks.
- Defaults: nappy reminder every 180 minutes, food reminder every 180 minutes.

## Future features
- Daily summary dashboard with totals and last-event highlights.
- Export/import for backups (CSV/JSON).
- Growth tracking with percentile charts.
- Medication and supplements log with safe interval checks.
- Photo + notes timeline for context-rich history.
