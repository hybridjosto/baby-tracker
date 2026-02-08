from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
import re

from src.app.storage.calendar import (
    create_event as repo_create_event,
    delete_event as repo_delete_event,
    get_event as repo_get_event,
    list_events as repo_list_events,
    update_event as repo_update_event,
)
from src.app.storage.db import get_connection


class CalendarEventNotFoundError(Exception):
    pass


DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_RE = re.compile(r"^\d{2}:\d{2}$")
CATEGORY_VALUES = {"group", "meetup", "hub", "other"}
RECURRENCE_VALUES = {"none", "weekly"}


@dataclass(frozen=True)
class DateRange:
    start: date
    end: date


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_date(value: object, field: str) -> date:
    if not isinstance(value, str) or not DATE_RE.match(value):
        raise ValueError(f"{field} must be YYYY-MM-DD")
    return date.fromisoformat(value)


def _parse_time(value: object, field: str) -> str:
    if not isinstance(value, str) or not TIME_RE.match(value):
        raise ValueError(f"{field} must be HH:MM")
    return value


def _normalize_text(value: object, field: str, max_len: int = 160) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field} is required")
    trimmed = value.strip()
    if not trimmed:
        raise ValueError(f"{field} is required")
    if len(trimmed) > max_len:
        raise ValueError(f"{field} must be {max_len} chars or less")
    return trimmed


def _normalize_optional_text(value: object, max_len: int = 200) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("invalid text value")
    trimmed = value.strip()
    if not trimmed:
        return None
    if len(trimmed) > max_len:
        raise ValueError(f"text must be {max_len} chars or less")
    return trimmed


def _normalize_category(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("category is required")
    key = value.strip().lower()
    if key not in CATEGORY_VALUES:
        raise ValueError("category must be group, meetup, hub, or other")
    return key


def _normalize_recurrence(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("recurrence is required")
    key = value.strip().lower()
    if key not in RECURRENCE_VALUES:
        raise ValueError("recurrence must be none or weekly")
    return key


def _normalize_optional_date(value: object, field: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field} must be YYYY-MM-DD")
    trimmed = value.strip()
    if not trimmed:
        return None
    if not DATE_RE.match(trimmed):
        raise ValueError(f"{field} must be YYYY-MM-DD")
    return trimmed


def _normalize_optional_time(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("end_time_local must be HH:MM")
    trimmed = value.strip()
    if not trimmed:
        return None
    if not TIME_RE.match(trimmed):
        raise ValueError("end_time_local must be HH:MM")
    return trimmed


def _validate_time_order(start_time: str, end_time: str | None) -> None:
    if not end_time:
        return
    start_parts = start_time.split(":")
    end_parts = end_time.split(":")
    start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
    end_minutes = int(end_parts[0]) * 60 + int(end_parts[1])
    if end_minutes <= start_minutes:
        raise ValueError("end_time_local must be after start_time_local")


def _normalize_payload(payload: dict, require_all: bool = True) -> dict:
    fields: dict = {}
    if require_all or "title" in payload:
        fields["title"] = _normalize_text(payload.get("title"), "title", 80)
    if require_all or "date_local" in payload:
        parsed_date = _parse_date(payload.get("date_local"), "date_local")
        fields["date_local"] = parsed_date.isoformat()
    if require_all or "start_time_local" in payload:
        fields["start_time_local"] = _parse_time(
            payload.get("start_time_local"), "start_time_local"
        )
    if require_all or "end_time_local" in payload:
        fields["end_time_local"] = _normalize_optional_time(
            payload.get("end_time_local")
        )
    if require_all or "location" in payload:
        fields["location"] = _normalize_optional_text(payload.get("location"), 120)
    if require_all or "notes" in payload:
        fields["notes"] = _normalize_optional_text(payload.get("notes"), 400)
    if require_all or "category" in payload:
        fields["category"] = _normalize_category(payload.get("category"))
    if require_all or "recurrence" in payload:
        fields["recurrence"] = _normalize_recurrence(payload.get("recurrence"))
    if require_all or "recurrence_until_local" in payload:
        fields["recurrence_until_local"] = _normalize_optional_date(
            payload.get("recurrence_until_local"), "recurrence_until_local"
        )
    if fields.get("recurrence") == "none":
        fields["recurrence_until_local"] = None
    if (
        "recurrence_until_local" in fields
        and fields.get("recurrence") == "weekly"
        and fields.get("recurrence_until_local")
        and "date_local" in fields
    ):
        start_date = date.fromisoformat(fields["date_local"])
        until_date = date.fromisoformat(fields["recurrence_until_local"])
        if until_date < start_date:
            raise ValueError("recurrence_until_local must be on or after date_local")
    if "start_time_local" in fields:
        _validate_time_order(fields["start_time_local"], fields.get("end_time_local"))
    return fields


def _normalize_date_range(start_value: str, end_value: str) -> DateRange:
    start_date = _parse_date(start_value, "start")
    end_date = _parse_date(end_value, "end")
    if end_date < start_date:
        raise ValueError("end must be on or after start")
    return DateRange(start=start_date, end=end_date)


def _expand_weekly(event: dict, date_range: DateRange) -> list[dict]:
    occurrences: list[dict] = []
    event_start = date.fromisoformat(event["date_local"])
    until = event.get("recurrence_until_local")
    until_date = date.fromisoformat(until) if until else None
    cursor = event_start
    if cursor < date_range.start:
        delta_days = (date_range.start - cursor).days
        weeks = delta_days // 7
        cursor = cursor + timedelta(days=weeks * 7)
        while cursor < date_range.start:
            cursor += timedelta(days=7)
    while cursor <= date_range.end:
        if until_date and cursor > until_date:
            break
        if cursor >= date_range.start:
            occurrences.append(_occurrence_for(event, cursor))
        cursor += timedelta(days=7)
    return occurrences


def _occurrence_for(event: dict, occurrence_date: date) -> dict:
    payload = dict(event)
    payload["occurrence_date"] = occurrence_date.isoformat()
    return payload


def list_event_occurrences(db_path: str, start: str, end: str) -> list[dict]:
    date_range = _normalize_date_range(start, end)
    with get_connection(db_path) as conn:
        events = repo_list_events(conn, start, end, include_deleted=False)
    occurrences: list[dict] = []
    for event in events:
        recurrence = event.get("recurrence")
        if recurrence == "weekly":
            occurrences.extend(_expand_weekly(event, date_range))
        else:
            event_date = date.fromisoformat(event["date_local"])
            if date_range.start <= event_date <= date_range.end:
                occurrences.append(_occurrence_for(event, event_date))
    occurrences.sort(
        key=lambda item: (item["occurrence_date"], item["start_time_local"], item["id"])
    )
    return occurrences


def create_event(db_path: str, payload: dict) -> dict:
    fields = _normalize_payload(payload, require_all=True)
    now = _now_utc_iso()
    fields["created_at_utc"] = now
    fields["updated_at_utc"] = now
    with get_connection(db_path) as conn:
        return repo_create_event(conn, fields)


def update_event(db_path: str, event_id: int, payload: dict) -> dict:
    fields = _normalize_payload(payload, require_all=False)
    with get_connection(db_path) as conn:
        existing = repo_get_event(conn, event_id)
        if not existing:
            raise CalendarEventNotFoundError()
        if (
            fields.get("recurrence") == "weekly"
            and fields.get("recurrence_until_local")
            and "date_local" not in fields
        ):
            start_date = date.fromisoformat(existing["date_local"])
            until_date = date.fromisoformat(fields["recurrence_until_local"])
            if until_date < start_date:
                raise ValueError("recurrence_until_local must be on or after date_local")
        if fields:
            fields["updated_at_utc"] = _now_utc_iso()
        event = repo_update_event(conn, event_id, fields)
    if not event:
        raise CalendarEventNotFoundError()
    return event


def delete_event(db_path: str, event_id: int) -> None:
    now = _now_utc_iso()
    with get_connection(db_path) as conn:
        deleted = repo_delete_event(conn, event_id, now, now)
    if not deleted:
        raise CalendarEventNotFoundError()


def get_event(db_path: str, event_id: int) -> dict:
    with get_connection(db_path) as conn:
        event = repo_get_event(conn, event_id)
    if not event:
        raise CalendarEventNotFoundError()
    return event
