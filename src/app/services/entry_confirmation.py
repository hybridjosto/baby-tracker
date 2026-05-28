from __future__ import annotations

from datetime import datetime, timedelta, timezone
import math

from src.app.services.home_kpis import BREASTFEED_IN_PROGRESS_NOTE
from src.app.services.push_subscriptions import (
    SendPushFn,
    VapidConfig,
    build_push_payload,
    delete_push_subscription,
    get_push_subscription,
    send_web_push,
)
from src.app.storage.db import get_connection
from src.app.storage.entries import list_entries_for_export as repo_list_entries_for_export


def _get_server_timezone():
    return datetime.now().astimezone().tzinfo or timezone.utc


def _parse_utc_iso(value: str) -> datetime:
    cleaned = value.strip()
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    parsed = datetime.fromisoformat(cleaned)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _build_local_day_windows(
    anchor_timestamp_utc: str,
) -> tuple[tuple[datetime, datetime], tuple[datetime, datetime]]:
    anchor_utc = _parse_utc_iso(anchor_timestamp_utc)
    local_tz = _get_server_timezone()
    anchor_local = anchor_utc.astimezone(local_tz)
    local_midnight = anchor_local.replace(hour=0, minute=0, second=0, microsecond=0)
    elapsed = anchor_local - local_midnight
    yesterday_start_local = local_midnight - timedelta(days=1)
    yesterday_end_local = yesterday_start_local + elapsed
    return (
        (local_midnight.astimezone(timezone.utc), anchor_utc),
        (
            yesterday_start_local.astimezone(timezone.utc),
            yesterday_end_local.astimezone(timezone.utc),
        ),
    )


def _sum_feed_intake(entries: list[dict]) -> float:
    total = 0.0
    for entry in entries:
        if entry.get("notes") == BREASTFEED_IN_PROGRESS_NOTE:
            continue
        for key in ("amount_ml", "expressed_ml", "formula_ml"):
            value = entry.get(key)
            if isinstance(value, (int, float)) and math.isfinite(value):
                total += float(value)
    return total


def calculate_feed_comparison_totals(
    db_path: str,
    user_slug: str,
    anchor_timestamp_utc: str,
) -> tuple[float, float]:
    today_window, yesterday_window = _build_local_day_windows(anchor_timestamp_utc)
    with get_connection(db_path) as conn:
        today_entries = repo_list_entries_for_export(
            conn,
            since_utc=today_window[0].isoformat(),
            until_utc=today_window[1].isoformat(),
            entry_type="feed",
        )
        yesterday_entries = repo_list_entries_for_export(
            conn,
            since_utc=yesterday_window[0].isoformat(),
            until_utc=yesterday_window[1].isoformat(),
            entry_type="feed",
        )
    return _sum_feed_intake(today_entries), _sum_feed_intake(yesterday_entries)


def _clip_sleep_minutes(entries: list[dict], start_utc: datetime, end_utc: datetime) -> int:
    total_seconds = 0.0
    for entry in entries:
        duration_min = entry.get("feed_duration_min")
        if not isinstance(duration_min, (int, float)) or not math.isfinite(duration_min):
            continue
        sleep_start = _parse_utc_iso(str(entry.get("timestamp_utc") or ""))
        sleep_end = sleep_start + timedelta(minutes=float(duration_min))
        overlap_start = max(start_utc, sleep_start)
        overlap_end = min(end_utc, sleep_end)
        if overlap_end > overlap_start:
            total_seconds += (overlap_end - overlap_start).total_seconds()
    return int(round(total_seconds / 60))


def calculate_sleep_comparison_totals(
    db_path: str,
    user_slug: str,
    anchor_timestamp_utc: str,
) -> tuple[int, int]:
    today_window, yesterday_window = _build_local_day_windows(anchor_timestamp_utc)
    with get_connection(db_path) as conn:
        sleep_entries = repo_list_entries_for_export(
            conn,
            until_utc=today_window[1].isoformat(),
            entry_type="sleep",
        )
    return (
        _clip_sleep_minutes(sleep_entries, today_window[0], today_window[1]),
        _clip_sleep_minutes(sleep_entries, yesterday_window[0], yesterday_window[1]),
    )


def _format_ml(value: float) -> str:
    rounded = round(value * 10) / 10
    if float(rounded).is_integer():
        return f"{int(rounded)} ml"
    return f"{rounded:.1f} ml"


def _format_minutes(value: int) -> str:
    return f"{value} min"


def _sleep_end_timestamp_utc(entry: dict) -> str | None:
    duration_min = entry.get("feed_duration_min")
    timestamp_utc = entry.get("timestamp_utc")
    if (
        not isinstance(duration_min, (int, float))
        or not math.isfinite(duration_min)
        or not isinstance(timestamp_utc, str)
        or not timestamp_utc.strip()
    ):
        return None
    return (
        _parse_utc_iso(timestamp_utc) + timedelta(minutes=float(duration_min))
    ).isoformat()


def _build_confirmation_body(db_path: str, entry: dict) -> str:
    entry_type = str(entry.get("type") or "entry").strip() or "entry"
    user_slug = str(entry.get("user_slug") or "").strip()
    if entry_type == "feed" and user_slug and entry.get("timestamp_utc"):
        today_total, yesterday_total = calculate_feed_comparison_totals(
            db_path,
            user_slug,
            entry["timestamp_utc"],
        )
        return (
            f"Today: {_format_ml(today_total)} / "
            f"Yesterday by now: {_format_ml(yesterday_total)}"
        )
    if (
        entry_type == "sleep"
        and user_slug
        and _sleep_end_timestamp_utc(entry)
    ):
        today_minutes, yesterday_minutes = calculate_sleep_comparison_totals(
            db_path,
            user_slug,
            _sleep_end_timestamp_utc(entry),
        )
        return (
            f"Slept today: {_format_minutes(today_minutes)} / "
            f"Yesterday by now: {_format_minutes(yesterday_minutes)}"
        )
    return f"{entry_type.capitalize()} logged for {user_slug}"


def dispatch_entry_confirmation_push(
    db_path: str,
    entry: dict,
    *,
    vapid_config: VapidConfig | None = None,
    base_path: str = "",
    send_fn: SendPushFn | None = None,
) -> dict:
    if vapid_config is None:
        return {"sent": False, "reason": "missing_vapid_config"}

    user_slug = entry.get("user_slug")
    if not isinstance(user_slug, str) or not user_slug:
        return {"sent": False, "reason": "missing_user_slug"}

    subscription = get_push_subscription(db_path, user_slug)
    if not subscription:
        return {"sent": False, "reason": "missing_subscription"}

    payload = build_push_payload(
        title="Entry saved",
        body=_build_confirmation_body(db_path, entry),
        url=f"{base_path}/{user_slug}",
        tag=f"entry-confirmation-{user_slug}",
    )
    sender = send_fn or send_web_push
    result = sender(subscription, payload, vapid_config)
    if result.get("sent"):
        return {"sent": True, "payload": payload, "user_slug": user_slug}
    if result.get("reason") == "invalid_subscription":
        delete_push_subscription(db_path, user_slug)
        return {"sent": False, "reason": "invalid_subscription", "user_slug": user_slug}
    return {
        "sent": False,
        "reason": result.get("reason", "push_failed"),
        "user_slug": user_slug,
    }
