from __future__ import annotations

from datetime import datetime, timedelta, timezone
import math

from src.app.storage.db import get_connection
from src.app.storage.entries import list_entries as repo_list_entries
from src.app.storage.feeding_goals import list_goals as repo_list_goals
from src.app.storage.settings import get_settings as repo_get_settings


_WINDOW_HOURS = 24


def _entry_total_ml(entry: dict) -> float:
    total = 0.0
    for key in ("amount_ml", "expressed_ml", "formula_ml"):
        value = entry.get(key)
        if isinstance(value, (int, float)) and math.isfinite(value):
            total += float(value)
    return total


def get_feed_coach(db_path: str) -> dict:
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=_WINDOW_HOURS)

    with get_connection(db_path) as conn:
        settings = repo_get_settings(conn)
        goals = repo_list_goals(conn, limit=1)
        entries = repo_list_entries(
            conn,
            200,
            since_utc=since.isoformat(),
            until_utc=now.isoformat(),
            entry_type="feed",
        )

    goal_ml = goals[0]["goal_ml"] if goals else None
    feed_count = len(entries)
    total_ml = round(sum(_entry_total_ml(entry) for entry in entries), 3)

    remaining_ml = None
    if isinstance(goal_ml, (int, float)):
        remaining_ml = max(0.0, float(goal_ml) - total_ml)

    feed_goal_min = settings.get("feed_goal_min")
    feed_goal_max = settings.get("feed_goal_max")
    behind_target_mode = settings.get("behind_target_mode")

    feeds_remaining_min = (
        max(0, feed_goal_min - feed_count) if isinstance(feed_goal_min, int) else None
    )
    feeds_remaining_max = (
        max(0, feed_goal_max - feed_count) if isinstance(feed_goal_max, int) else None
    )

    effective_remaining_max = feeds_remaining_max
    if remaining_ml is not None and remaining_ml > 0 and behind_target_mode == "add_feed":
        if effective_remaining_max == 0:
            effective_remaining_max = 1

    suggested_next_min_ml = None
    suggested_next_max_ml = None
    if remaining_ml is not None and remaining_ml > 0 and effective_remaining_max:
        min_per = math.ceil(remaining_ml / effective_remaining_max)
        max_per = min_per
        if feeds_remaining_min:
            max_per = math.ceil(remaining_ml / feeds_remaining_min)
        suggested_next_min_ml = min(min_per, max_per)
        suggested_next_max_ml = max(min_per, max_per)

    return {
        "window_hours": _WINDOW_HOURS,
        "since_utc": since.isoformat(),
        "until_utc": now.isoformat(),
        "goal_ml": goal_ml,
        "total_ml": total_ml,
        "feed_count": feed_count,
        "remaining_ml": remaining_ml,
        "feeds_remaining_min": feeds_remaining_min,
        "feeds_remaining_max": effective_remaining_max,
        "suggested_next_min_ml": suggested_next_min_ml,
        "suggested_next_max_ml": suggested_next_max_ml,
        "overnight_gap_min_hours": settings.get("overnight_gap_min_hours"),
        "overnight_gap_max_hours": settings.get("overnight_gap_max_hours"),
        "behind_target_mode": behind_target_mode,
    }
