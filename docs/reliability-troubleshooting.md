# Reliability Troubleshooting

Use these checks when baby-tracker is slow or unreliable over Tailscale. They
separate server responsiveness, SQLite latency, and the network path.

## Health Probe

The app exposes a lightweight health endpoint:

```sh
curl -s http://127.0.0.1:8000/healthz
```

If `BABY_TRACKER_BASE_PATH` is set, include it:

```sh
curl -s http://127.0.0.1:8000/baby/healthz
```

Expected healthy response shape:

```json
{
  "ok": true,
  "timestamp_utc": "2026-05-17T12:00:00+00:00",
  "uptime_seconds": 123.45,
  "db": {
    "ok": true,
    "latency_ms": 1.23
  }
}
```

A `503` response with `"db": {"ok": false}` means the app process is reachable
but SQLite is not responding correctly.

## Timing Checks

Run this on the server first:

```sh
curl -o /dev/null -s -w 'local total=%{time_total}s connect=%{time_connect}s ttfb=%{time_starttransfer}s code=%{http_code}\n' http://127.0.0.1:8000/healthz
```

Run this from another Tailscale device:

```sh
tailscale ping <baby-tracker-hostname-or-ip>
curl -o /dev/null -s -w 'tailnet total=%{time_total}s connect=%{time_connect}s ttfb=%{time_starttransfer}s code=%{http_code}\n' http://<tailscale-ip>:8000/healthz
```

Interpretation:

- Fast local, slow tailnet: Tailscale, DNS, WiFi, or client path.
- Slow local: app process, host load, container pressure, or SQLite.
- High `time_connect`: network path problem.
- High `time_starttransfer` after a fast connect: app or database problem.

## Host Checks

While reproducing the issue:

```sh
top
df -h
```

If running under Apple Container:

```sh
container list
container logs baby-tracker
```
