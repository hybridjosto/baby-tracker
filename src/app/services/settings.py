from datetime import date, datetime, timezone
import json
import re
from urllib.parse import urlparse

from src.app.storage.db import get_connection
from src.lib.validation import normalize_user_slug
from src.app.storage.settings import get_settings as repo_get_settings
from src.app.storage.settings import update_settings as repo_update_settings


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_dob(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("dob must be YYYY-MM-DD")
    trimmed = value.strip()
    if not trimmed:
        return None
    try:
        date.fromisoformat(trimmed)
    except ValueError as exc:
        raise ValueError("dob must be YYYY-MM-DD") from exc
    return trimmed


def _normalize_feed_interval(value: object) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError("feed_interval_min must be a positive integer")
    if value <= 0:
        raise ValueError("feed_interval_min must be a positive integer")
    return value


_CUSTOM_TYPE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 /-]{0,31}$")
_BEHIND_TARGET_MODES = {"increase_next", "add_feed"}


def _normalize_custom_event_types(value: object) -> str:
    if value is None:
        return json.dumps([])
    if not isinstance(value, list):
        raise ValueError("custom_event_types must be a list of names")
    cleaned: list[str] = []
    seen: set[str] = set()
    for raw in value:
        if not isinstance(raw, str):
            raise ValueError("custom_event_types must be a list of names")
        trimmed = raw.strip()
        if not trimmed or not _CUSTOM_TYPE_RE.match(trimmed):
            raise ValueError("custom_event_types must use letters, numbers, spaces, / or -")
        key = trimmed.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(trimmed)
    return json.dumps(cleaned)


def _normalize_feed_goal_count(value: object, field: str) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{field} must be a positive integer")
    if value <= 0:
        raise ValueError(f"{field} must be a positive integer")
    return value


def _normalize_gap_hours(value: object, field: str) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be a positive number")
    if not value or float(value) <= 0:
        raise ValueError(f"{field} must be a positive number")
    return float(value)


def _normalize_behind_target_mode(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("behind_target_mode must be increase_next or add_feed")
    trimmed = value.strip()
    if not trimmed:
        return None
    if trimmed not in _BEHIND_TARGET_MODES:
        raise ValueError("behind_target_mode must be increase_next or add_feed")
    return trimmed


def _normalize_entry_webhook_url(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("entry_webhook_url must be http(s) URL")
    trimmed = value.strip()
    if not trimmed:
        return None
    parsed = urlparse(trimmed)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("entry_webhook_url must be http(s) URL")
    return trimmed


def _normalize_default_user_slug(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("default_user_slug must be a valid user slug")
    trimmed = value.strip().lower()
    if not trimmed:
        return None
    return normalize_user_slug(trimmed)


def _normalize_pushcut_feed_due_url(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("pushcut_feed_due_url must be http(s) URL")
    trimmed = value.strip()
    if not trimmed:
        return None
    parsed = urlparse(trimmed)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("pushcut_feed_due_url must be http(s) URL")
    return trimmed


def get_settings(db_path: str) -> dict:
    with get_connection(db_path) as conn:
        return repo_get_settings(conn)


def update_settings(db_path: str, payload: dict) -> dict:
    fields: dict = {}
    if "dob" in payload:
        fields["dob"] = _normalize_dob(payload["dob"])
    if "feed_interval_min" in payload:
        fields["feed_interval_min"] = _normalize_feed_interval(
            payload["feed_interval_min"]
        )
    if "custom_event_types" in payload:
        fields["custom_event_types"] = _normalize_custom_event_types(
            payload["custom_event_types"]
        )
    if "entry_webhook_url" in payload:
        fields["entry_webhook_url"] = _normalize_entry_webhook_url(
            payload["entry_webhook_url"]
        )
    if "default_user_slug" in payload:
        fields["default_user_slug"] = _normalize_default_user_slug(
            payload["default_user_slug"]
        )
    if "pushcut_feed_due_url" in payload:
        fields["pushcut_feed_due_url"] = _normalize_pushcut_feed_due_url(
            payload["pushcut_feed_due_url"]
        )
    with get_connection(db_path) as conn:
        current = repo_get_settings(conn)
        if "feed_goal_min" in payload:
            fields["feed_goal_min"] = _normalize_feed_goal_count(
                payload["feed_goal_min"], "feed_goal_min"
            )
        if "feed_goal_max" in payload:
            fields["feed_goal_max"] = _normalize_feed_goal_count(
                payload["feed_goal_max"], "feed_goal_max"
            )
        if "overnight_gap_min_hours" in payload:
            fields["overnight_gap_min_hours"] = _normalize_gap_hours(
                payload["overnight_gap_min_hours"], "overnight_gap_min_hours"
            )
        if "overnight_gap_max_hours" in payload:
            fields["overnight_gap_max_hours"] = _normalize_gap_hours(
                payload["overnight_gap_max_hours"], "overnight_gap_max_hours"
            )
        if "behind_target_mode" in payload:
            fields["behind_target_mode"] = _normalize_behind_target_mode(
                payload["behind_target_mode"]
            )

        next_min = fields.get("feed_goal_min", current.get("feed_goal_min"))
        next_max = fields.get("feed_goal_max", current.get("feed_goal_max"))
        if next_min is not None and next_max is not None and next_min > next_max:
            raise ValueError("feed_goal_min must be <= feed_goal_max")

        gap_min = fields.get(
            "overnight_gap_min_hours", current.get("overnight_gap_min_hours")
        )
        gap_max = fields.get(
            "overnight_gap_max_hours", current.get("overnight_gap_max_hours")
        )
        if gap_min is not None and gap_max is not None and gap_min > gap_max:
            raise ValueError("overnight_gap_min_hours must be <= overnight_gap_max_hours")

        if fields:
            fields["updated_at_utc"] = _now_utc_iso()
        return repo_update_settings(conn, fields)
