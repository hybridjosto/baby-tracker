from datetime import datetime, timezone

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


def list_entries(db_path: str, limit: int = 50, user_slug: str | None = None) -> list[dict]:
    safe_limit = max(1, min(limit, 200))
    normalized_slug = normalize_user_slug(user_slug) if user_slug else None
    with get_connection(db_path) as conn:
        return repo_list_entries(conn, safe_limit, user_slug=normalized_slug)


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
