from __future__ import annotations

from datetime import datetime, timedelta, timezone
import math

from src.app.storage.db import get_connection
from src.app.storage.entries import list_entries as repo_list_entries
from src.app.storage.feeding_goals import list_goals as repo_list_goals
from src.app.storage.settings import get_settings as repo_get_settings


_WINDOW_HOURS = 24
_SCHEDULE_HORIZON_HOURS = 12
_SCHEDULE_COUNT = 4


def _entry_total_ml(entry: dict) -> float:
    total = 0.0
    for key in ("amount_ml", "expressed_ml", "formula_ml"):
        value = entry.get(key)
        if isinstance(value, (int, float)) and math.isfinite(value):
            total += float(value)
    return total


def _parse_timestamp(value: str) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _parse_anchor_time(value: str | None) -> tuple[int, int] | None:
    if not value:
        return None
    parts = value.split(":")
    if len(parts) != 2:
        return None
    try:
        hour = int(parts[0])
        minute = int(parts[1])
    except ValueError:
        return None
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        return None
    return hour, minute


def _select_overnight_gap(settings: dict) -> float:
    gap_max = settings.get("overnight_gap_max_hours")
    gap_min = settings.get("overnight_gap_min_hours")
    if isinstance(gap_max, (int, float)) and math.isfinite(gap_max) and gap_max > 0:
        return float(gap_max)
    if isinstance(gap_min, (int, float)) and math.isfinite(gap_min) and gap_min > 0:
        return float(gap_min)
    return 0.0


def _build_schedule_times(
    now_local: datetime,
    anchor_time: tuple[int, int],
    feeds_per_day: int,
    overnight_gap_hours: float,
) -> list[datetime]:
    if feeds_per_day < 2:
        return []
    gap_hours = max(0.0, overnight_gap_hours)
    interval_hours = (24.0 - gap_hours) / (feeds_per_day - 1)
    if interval_hours <= 0:
        return []

    anchor_today = now_local.replace(
        hour=anchor_time[0],
        minute=anchor_time[1],
        second=0,
        microsecond=0,
    )
    base = anchor_today if now_local >= anchor_today else anchor_today - timedelta(days=1)

    schedule: list[datetime] = []
    for day_offset in (0, 1):
        day_start = base + timedelta(days=day_offset)
        for idx in range(feeds_per_day):
            schedule.append(day_start + timedelta(hours=interval_hours * idx))
    horizon_end = now_local + timedelta(hours=_SCHEDULE_HORIZON_HOURS)
    upcoming = [item for item in schedule if now_local < item <= horizon_end]
    return upcoming[:_SCHEDULE_COUNT]


def get_feed_coach(db_path: str) -> dict:
    now_utc = datetime.now(timezone.utc)
    now_local = datetime.now().astimezone()
    since = now_utc - timedelta(hours=_WINDOW_HOURS)

    with get_connection(db_path) as conn:
        settings = repo_get_settings(conn)
        goals = repo_list_goals(conn, limit=1)
        entries = repo_list_entries(
            conn,
            200,
            since_utc=since.isoformat(),
            until_utc=now_utc.isoformat(),
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

    schedule: list[dict] = []
    anchor_time = _parse_anchor_time(settings.get("feed_schedule_anchor_time"))
    feeds_per_day = settings.get("feed_goal_max") or settings.get("feed_goal_min")
    if anchor_time and isinstance(feeds_per_day, int):
        upcoming = _build_schedule_times(
            now_local=now_local,
            anchor_time=anchor_time,
            feeds_per_day=feeds_per_day,
            overnight_gap_hours=_select_overnight_gap(settings),
        )
        entry_time_pairs = []
        for entry in entries:
            ts = _parse_timestamp(entry.get("timestamp_utc"))
            if ts is not None:
                entry_time_pairs.append((entry, ts))
        for idx, item in enumerate(upcoming):
            window_end = item.astimezone(timezone.utc)
            window_start = window_end - timedelta(hours=_WINDOW_HOURS)
            past_total = 0.0
            for entry, ts in entry_time_pairs:
                if window_start <= ts <= window_end:
                    past_total += _entry_total_ml(entry)
            gap = 0.0
            if isinstance(goal_ml, (int, float)):
                gap = max(0.0, float(goal_ml) - past_total)
            remaining_feeds = len(upcoming) - idx
            suggested = None
            if remaining_feeds and gap > 0:
                suggested = int(math.ceil(gap / remaining_feeds))
            elif remaining_feeds and gap == 0:
                suggested = 0
            schedule.append(
                {
                    "time_local": item.isoformat(),
                    "gap_ml": round(gap, 3),
                    "suggested_min_ml": suggested,
                }
            )

    return {
        "window_hours": _WINDOW_HOURS,
        "since_utc": since.isoformat(),
        "until_utc": now_utc.isoformat(),
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
        "schedule_horizon_hours": _SCHEDULE_HORIZON_HOURS,
        "schedule_anchor_time": settings.get("feed_schedule_anchor_time"),
        "schedule": schedule,
    }
