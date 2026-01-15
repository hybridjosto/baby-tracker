from datetime import datetime, timezone
import csv
import io
import uuid

from src.app.storage.db import get_connection
from src.app.storage.entries import (
    create_entry as repo_create_entry,
    delete_entry as repo_delete_entry,
    list_entries as repo_list_entries,
    update_entry as repo_update_entry,
)
from src.lib.validation import (
    normalize_user_slug,
    validate_entry_payload,
    validate_entry_type,
)


class DuplicateEntryError(Exception):
    def __init__(self, entry: dict):
        super().__init__("Entry already exists")
        self.entry = entry


class EntryNotFoundError(Exception):
    pass


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_csv_timestamp(value: str) -> str:
    cleaned = (value or "").strip()
    if not cleaned:
        raise ValueError("timestamp is required")
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    if "T" not in cleaned and " " in cleaned:
        cleaned = cleaned.replace(" ", "T", 1)
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError as exc:
        raise ValueError("timestamp must be ISO-8601") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat()


def create_entry(db_path: str, payload: dict) -> dict:
    validated = validate_entry_payload(payload, require_client_event=True)
    validated["user_slug"] = normalize_user_slug(payload.get("user_slug"))
    timestamp = validated.get("timestamp_utc") or _now_utc_iso()
    validated["timestamp_utc"] = timestamp
    validated["created_at_utc"] = _now_utc_iso()
    validated["updated_at_utc"] = validated["created_at_utc"]

    with get_connection(db_path) as conn:
        entry, duplicate = repo_create_entry(conn, validated)
    if duplicate:
        raise DuplicateEntryError(entry)
    return entry


def _normalize_filter_ts(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().replace(" ", "+")
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise ValueError("Invalid timestamp filter") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat()


def list_entries(
    db_path: str,
    limit: int = 50,
    user_slug: str | None = None,
    since_utc: str | None = None,
    until_utc: str | None = None,
    entry_type: str | None = None,
) -> list[dict]:
    safe_limit = max(1, min(limit, 200))
    normalized_slug = normalize_user_slug(user_slug) if user_slug else None
    normalized_since = _normalize_filter_ts(since_utc)
    normalized_until = _normalize_filter_ts(until_utc)
    normalized_type = None
    if entry_type:
        validate_entry_type(entry_type)
        normalized_type = entry_type
    if normalized_since and normalized_until and normalized_since > normalized_until:
        raise ValueError("Invalid time window")
    with get_connection(db_path) as conn:
        return repo_list_entries(
            conn,
            safe_limit,
            user_slug=normalized_slug,
            since_utc=normalized_since,
            until_utc=normalized_until,
            entry_type=normalized_type,
        )


def import_entries_csv(db_path: str, user_slug: str, file_storage) -> dict:
    if not file_storage:
        raise ValueError("CSV file is required")
    try:
        file_storage.stream.seek(0)
    except Exception:
        pass
    text_stream = io.TextIOWrapper(file_storage.stream, encoding="utf-8")
    reader = csv.DictReader(text_stream)
    if not reader.fieldnames:
        raise ValueError("CSV must include headers")
    field_map = {
        name.strip().lower(): name for name in reader.fieldnames if name is not None
    }
    required = ["timestamp", "type", "duration", "comment"]
    missing = [name for name in required if name not in field_map]
    if missing:
        raise ValueError("CSV must have headings: timestamp, type, duration, comment")

    normalized_slug = normalize_user_slug(user_slug)
    rows: list[dict] = []
    errors: list[str] = []
    for index, row in enumerate(reader, start=2):
        if not any((value or "").strip() for value in row.values()):
            continue
        try:
            timestamp = _parse_csv_timestamp(row.get(field_map["timestamp"]))
            entry_type = (row.get(field_map["type"]) or "").strip()
            if not entry_type:
                raise ValueError("type is required")
            validate_entry_type(entry_type)
            duration_raw = (row.get(field_map["duration"]) or "").strip()
            duration = None
            if duration_raw:
                try:
                    duration = int(duration_raw)
                except ValueError as exc:
                    raise ValueError("duration must be an integer") from exc
                if duration < 0:
                    raise ValueError("duration must be a non-negative integer")
            comment_raw = (row.get(field_map["comment"]) or "").strip()
            notes = comment_raw or None
        except ValueError as exc:
            errors.append(f"Row {index}: {exc}")
            continue
        rows.append(
            {
                "user_slug": normalized_slug,
                "type": entry_type,
                "timestamp_utc": timestamp,
                "client_event_id": f"csv-{uuid.uuid4().hex}",
                "notes": notes,
                "feed_duration_min": duration,
            }
        )
    if errors:
        raise ValueError("; ".join(errors))
    if not rows:
        raise ValueError("CSV did not include any entries")

    created = 0
    duplicates = 0
    with get_connection(db_path) as conn:
        for payload in rows:
            now = _now_utc_iso()
            payload["created_at_utc"] = now
            payload["updated_at_utc"] = now
            _, duplicate = repo_create_entry(conn, payload)
            if duplicate:
                duplicates += 1
            else:
                created += 1
    return {"created": created, "duplicates": duplicates}


def update_entry(db_path: str, entry_id: int, payload: dict) -> dict:
    fields: dict = {}
    if "type" in payload:
        validate_entry_type(payload["type"])
        fields["type"] = payload["type"]
    if "timestamp_utc" in payload:
        fields["timestamp_utc"] = payload["timestamp_utc"]
    if "notes" in payload:
        fields["notes"] = payload["notes"]
    if "amount_ml" in payload:
        fields["amount_ml"] = payload["amount_ml"]
    if "expressed_ml" in payload:
        if payload["expressed_ml"] is not None and (
            not isinstance(payload["expressed_ml"], int)
            or payload["expressed_ml"] < 0
        ):
            raise ValueError("expressed_ml must be a non-negative integer")
        fields["expressed_ml"] = payload["expressed_ml"]
    if "formula_ml" in payload:
        if payload["formula_ml"] is not None and (
            not isinstance(payload["formula_ml"], int)
            or payload["formula_ml"] < 0
        ):
            raise ValueError("formula_ml must be a non-negative integer")
        fields["formula_ml"] = payload["formula_ml"]
    if "feed_duration_min" in payload:
        if payload["feed_duration_min"] is not None and (
            not isinstance(payload["feed_duration_min"], int)
            or payload["feed_duration_min"] < 0
        ):
            raise ValueError("feed_duration_min must be a non-negative integer")
        fields["feed_duration_min"] = payload["feed_duration_min"]
    if "caregiver_id" in payload:
        fields["caregiver_id"] = payload["caregiver_id"]
    fields["updated_at_utc"] = _now_utc_iso()

    with get_connection(db_path) as conn:
        entry = repo_update_entry(conn, entry_id, fields)
    if not entry:
        raise EntryNotFoundError()
    return entry


def delete_entry(db_path: str, entry_id: int) -> None:
    with get_connection(db_path) as conn:
        deleted = repo_delete_entry(conn, entry_id)
    if not deleted:
        raise EntryNotFoundError()
