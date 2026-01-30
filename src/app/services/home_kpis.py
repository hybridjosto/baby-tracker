from __future__ import annotations

from datetime import datetime, timedelta, timezone
import math

from src.app.services.entries import get_next_feed_time, list_entries
from src.app.services.feeding_goals import get_current_goal
from src.app.services.settings import get_settings

BREASTFEED_IN_PROGRESS_NOTE = "Breastfeeding (started)"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _parse_utc(value: str | None) -> datetime | None:
    if not value:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    parsed = datetime.fromisoformat(cleaned)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _format_time_until(target: datetime | None, now: datetime) -> str:
    if not target:
        return "--"
    diff_seconds = (target - now).total_seconds()
    if diff_seconds <= 0:
        return "due now"
    diff_minutes = round(diff_seconds / 60)
    if diff_minutes < 60:
        return f"in {diff_minutes}m"
    hours = diff_minutes // 60
    minutes = diff_minutes % 60
    if minutes == 0:
        return f"in {hours}h"
    return f"in {hours}h {minutes}m"


def _format_ml(value: float | int | None) -> str:
    if value is None or not math.isfinite(value) or value <= 0:
        return "0 ml"
    rounded = round(value * 10) / 10
    if float(rounded).is_integer():
        return f"{int(rounded)} ml"
    return f"{rounded:.1f} ml"


def _compute_feed_total(entries: list[dict]) -> float:
    total = 0.0
    for entry in entries:
        if entry.get("notes") == BREASTFEED_IN_PROGRESS_NOTE:
            continue
        for key in ("amount_ml", "expressed_ml", "formula_ml"):
            value = entry.get(key)
            if isinstance(value, (int, float)) and math.isfinite(value):
                total += float(value)
    return total


def build_home_kpis(db_path: str, user_slug: str | None = None) -> dict:
    settings = get_settings(db_path)
    resolved_user = user_slug or settings.get("default_user_slug")

    now = _now_utc()
    window_start = now - timedelta(hours=24)
    feeds = list_entries(
        db_path,
        limit=200,
        user_slug=resolved_user,
        since_utc=window_start.isoformat(),
        until_utc=now.isoformat(),
        entry_type="feed",
    )
    feed_total_ml = _compute_feed_total(feeds)

    next_feed = get_next_feed_time(db_path, user_slug=resolved_user)
    next_timestamp = _parse_utc(next_feed.get("timestamp_utc"))
    next_feed_text = _format_time_until(next_timestamp, now)

    current_goal = get_current_goal(db_path)
    goal_ml = current_goal.get("goal_ml") if current_goal else None
    goal_text = "--" if goal_ml is None else _format_ml(float(goal_ml))

    return {
        "content": "Homepage KPIs",
        "inputs": {
            "input0": f"Next feed due: {next_feed_text}",
            "input1": f"Feed total (24h): {_format_ml(feed_total_ml)}",
            "input2": f"Goal (24h): {goal_text}",
        },
    }
