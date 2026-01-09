from datetime import date, datetime, timezone

from src.app.storage.db import get_connection
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
    if fields:
        fields["updated_at_utc"] = _now_utc_iso()
    with get_connection(db_path) as conn:
        return repo_update_settings(conn, fields)
