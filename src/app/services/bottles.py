from datetime import datetime, timezone
import math
import re

from src.app.storage.db import get_connection
from src.app.storage.bottles import (
    create_bottle as repo_create_bottle,
    list_bottles as repo_list_bottles,
    update_bottle as repo_update_bottle,
    delete_bottle as repo_delete_bottle,
    get_bottle as repo_get_bottle,
)
class BottleNotFoundError(Exception):
    pass


_BOTTLE_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 /-]{0,47}$")


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_name(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("name is required")
    trimmed = value.strip()
    if not trimmed:
        raise ValueError("name is required")
    if not _BOTTLE_NAME_RE.match(trimmed):
        raise ValueError("name must use letters, numbers, spaces, / or - (max 48 chars)")
    return trimmed


def _normalize_weight_g(value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("empty_weight_g must be a positive number")
    if not math.isfinite(value) or float(value) <= 0:
        raise ValueError("empty_weight_g must be a positive number")
    return float(value)


def list_bottles(db_path: str) -> list[dict]:
    with get_connection(db_path) as conn:
        return repo_list_bottles(conn, include_deleted=False)


def create_bottle(db_path: str, payload: dict) -> dict:
    fields = {
        "name": _normalize_name(payload.get("name")),
        "empty_weight_g": _normalize_weight_g(payload.get("empty_weight_g")),
        "created_at_utc": _now_utc_iso(),
        "updated_at_utc": _now_utc_iso(),
    }
    with get_connection(db_path) as conn:
        return repo_create_bottle(conn, fields)


def update_bottle(db_path: str, bottle_id: int, payload: dict) -> dict:
    fields: dict = {}
    if "name" in payload:
        fields["name"] = _normalize_name(payload["name"])
    if "empty_weight_g" in payload:
        fields["empty_weight_g"] = _normalize_weight_g(payload["empty_weight_g"])
    fields["updated_at_utc"] = _now_utc_iso()
    with get_connection(db_path) as conn:
        bottle = repo_update_bottle(conn, bottle_id, fields)
    if not bottle:
        raise BottleNotFoundError()
    return bottle


def delete_bottle(db_path: str, bottle_id: int) -> None:
    with get_connection(db_path) as conn:
        now = _now_utc_iso()
        deleted = repo_delete_bottle(conn, bottle_id, now, now)
    if not deleted:
        raise BottleNotFoundError()


def get_bottle(db_path: str, bottle_id: int) -> dict:
    with get_connection(db_path) as conn:
        bottle = repo_get_bottle(conn, bottle_id)
    if not bottle:
        raise BottleNotFoundError()
    return bottle
