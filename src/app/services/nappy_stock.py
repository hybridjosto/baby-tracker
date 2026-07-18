from datetime import datetime, timezone, timedelta
import math

from src.app.storage.db import get_connection
from src.app.storage.nappy_stock import (
    count_nappy_changes_between,
    count_nappy_changes_since,
    create_nappy_stock_batch as repo_create_nappy_stock_batch,
    get_latest_nappy_stock_batch,
    get_nappy_stock_threshold,
    list_nappy_stock_batches as repo_list_nappy_stock_batches,
    update_nappy_stock_batch as repo_update_nappy_stock_batch,
    update_nappy_stock_threshold as repo_update_nappy_stock_threshold,
)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _now_utc_iso() -> str:
    return _now_utc().isoformat()


def _normalize_non_negative_int(value: object, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field_name} must be a whole number")
    if not math.isfinite(float(value)) or int(value) != float(value) or int(value) < 0:
        raise ValueError(f"{field_name} must be a whole number")
    return int(value)


def _normalize_signed_int(value: object, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field_name} must be a whole number")
    if not math.isfinite(float(value)) or int(value) != float(value) or int(value) == 0:
        raise ValueError(f"{field_name} must be a non-zero whole number")
    return int(value)


def _normalize_timestamp_utc(value: object | None) -> str:
    if value is None:
        return _now_utc_iso()
    if not isinstance(value, str):
        raise ValueError("stock_added_at_utc must be ISO-8601")
    cleaned = value.strip()
    if not cleaned:
        return _now_utc_iso()
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError as exc:
        raise ValueError("stock_added_at_utc must be ISO-8601") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat()


def _parse_utc(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _normalize_notes(value: object | None) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("notes must be text")
    trimmed = value.strip()
    return trimmed[:240] if trimmed else None


def _build_summary(batch: dict | None, used_count: int, now_utc: datetime) -> dict:
    if not batch:
        return {
            "configured": False,
            "batch": None,
            "used_count": 0,
            "remaining_count": 0,
            "threshold_count": 0,
            "is_below_threshold": False,
            "average_per_day": None,
            "days_until_empty": None,
            "estimated_empty_at_utc": None,
            "estimated_threshold_at_utc": None,
        }

    stock_added_at = _parse_utc(batch["stock_added_at_utc"])
    elapsed_seconds = max(0.0, (now_utc - stock_added_at).total_seconds())
    elapsed_days = elapsed_seconds / 86400
    total_count = int(batch["total_count"])
    threshold_count = int(batch["threshold_count"])
    remaining_count = max(0, total_count - used_count)
    average_per_day = None
    days_until_empty = None
    estimated_empty_at_utc = None
    estimated_threshold_at_utc = None

    if used_count > 0 and elapsed_days > 0:
        average_per_day = used_count / elapsed_days
        if average_per_day > 0:
            days_until_empty = remaining_count / average_per_day
            estimated_empty_at_utc = (
                now_utc + timedelta(days=days_until_empty)
            ).isoformat()
            if remaining_count > threshold_count:
                threshold_days = (remaining_count - threshold_count) / average_per_day
                estimated_threshold_at_utc = (
                    now_utc + timedelta(days=threshold_days)
                ).isoformat()
            else:
                estimated_threshold_at_utc = now_utc.isoformat()

    return {
        "configured": True,
        "batch": batch,
        "used_count": used_count,
        "remaining_count": remaining_count,
        "threshold_count": threshold_count,
        "is_below_threshold": remaining_count <= threshold_count,
        "average_per_day": round(average_per_day, 2)
        if average_per_day is not None
        else None,
        "days_until_empty": round(days_until_empty, 1)
        if days_until_empty is not None
        else None,
        "estimated_empty_at_utc": estimated_empty_at_utc,
        "estimated_threshold_at_utc": estimated_threshold_at_utc,
    }


def get_nappy_stock_status(
    db_path: str, now_utc: datetime | None = None, history_limit: int = 10
) -> dict:
    safe_limit = max(1, min(history_limit, 50))
    now = now_utc or _now_utc()
    with get_connection(db_path) as conn:
        batch = get_latest_nappy_stock_batch(conn)
        threshold_count = get_nappy_stock_threshold(conn)
        used_count = (
            count_nappy_changes_since(conn, batch["stock_added_at_utc"])
            if batch
            else 0
        )
        history = repo_list_nappy_stock_batches(conn, safe_limit)

    if batch:
        batch["threshold_count"] = threshold_count
    summary = _build_summary(batch, used_count, now)
    summary["threshold_count"] = threshold_count
    summary["history"] = history
    return summary


def create_nappy_stock_batch(db_path: str, payload: dict) -> dict:
    total_count = _normalize_non_negative_int(payload.get("total_count"), "total_count")
    stock_added_at_utc = _normalize_timestamp_utc(payload.get("stock_added_at_utc"))
    now = _now_utc_iso()
    with get_connection(db_path) as conn:
        if "threshold_count" in payload:
            threshold_count = _normalize_non_negative_int(
                payload.get("threshold_count"), "threshold_count"
            )
            repo_update_nappy_stock_threshold(conn, threshold_count, now)
        else:
            threshold_count = get_nappy_stock_threshold(conn)
        fields = {
            "total_count": total_count,
            "threshold_count": threshold_count,
            "stock_added_at_utc": stock_added_at_utc,
            "notes": _normalize_notes(payload.get("notes")),
            "created_at_utc": now,
            "updated_at_utc": now,
        }
        repo_create_nappy_stock_batch(conn, fields)
    return get_nappy_stock_status(db_path)


def restock_nappies(db_path: str, payload: dict) -> dict:
    loose_count = _normalize_non_negative_int(
        payload.get("loose_count", 0), "loose_count"
    )
    pack_count = _normalize_non_negative_int(
        payload.get("pack_count", 0), "pack_count"
    )
    nappies_per_pack = _normalize_non_negative_int(
        payload.get("nappies_per_pack", 0), "nappies_per_pack"
    )
    if pack_count > 0 and nappies_per_pack == 0:
        raise ValueError("nappies_per_pack must be greater than zero")
    quantity_added = loose_count + (pack_count * nappies_per_pack)
    if quantity_added <= 0:
        raise ValueError("stock added must be greater than zero")

    stock_added_at_utc = _normalize_timestamp_utc(payload.get("stock_added_at_utc"))
    now = _now_utc_iso()
    with get_connection(db_path) as conn:
        latest = get_latest_nappy_stock_batch(conn)
        current_remaining = 0
        if latest:
            latest_added_at = _parse_utc(latest["stock_added_at_utc"])
            restock_added_at = _parse_utc(stock_added_at_utc)
            if restock_added_at < latest_added_at:
                raise ValueError(
                    "stock_added_at_utc cannot be earlier than the latest stock batch"
                )
            used_before_restock = count_nappy_changes_between(
                conn,
                latest["stock_added_at_utc"],
                stock_added_at_utc,
            )
            current_remaining = max(
                0, int(latest["total_count"]) - used_before_restock
            )
        threshold_count = get_nappy_stock_threshold(conn)
        fields = {
            "total_count": current_remaining + quantity_added,
            "threshold_count": threshold_count,
            "stock_added_at_utc": stock_added_at_utc,
            "notes": _normalize_notes(payload.get("notes")),
            "created_at_utc": now,
            "updated_at_utc": now,
        }
        repo_create_nappy_stock_batch(conn, fields)

    status = get_nappy_stock_status(db_path)
    status["quantity_added"] = quantity_added
    return status


def update_nappy_stock_threshold(db_path: str, payload: dict) -> dict:
    threshold_count = _normalize_non_negative_int(
        payload.get("threshold_count"), "threshold_count"
    )
    with get_connection(db_path) as conn:
        repo_update_nappy_stock_threshold(
            conn, threshold_count, _now_utc_iso()
        )
        batch = get_latest_nappy_stock_batch(conn)
        if batch:
            repo_update_nappy_stock_batch(
                conn,
                batch["id"],
                {
                    "threshold_count": threshold_count,
                    "updated_at_utc": _now_utc_iso(),
                },
            )
    return get_nappy_stock_status(db_path)


def update_latest_nappy_stock_batch(db_path: str, payload: dict) -> dict:
    with get_connection(db_path) as conn:
        batch = get_latest_nappy_stock_batch(conn)
        if not batch:
            raise ValueError("No nappy stock batch exists")

        fields: dict = {}
        total_count = int(batch["total_count"])
        if "total_count" in payload:
            total_count = _normalize_non_negative_int(
                payload.get("total_count"), "total_count"
            )
            fields["total_count"] = total_count
        if "threshold_count" in payload:
            threshold_count = _normalize_non_negative_int(
                payload.get("threshold_count"), "threshold_count"
            )
            fields["threshold_count"] = threshold_count
            repo_update_nappy_stock_threshold(
                conn, threshold_count, _now_utc_iso()
            )
        if "stock_added_at_utc" in payload:
            fields["stock_added_at_utc"] = _normalize_timestamp_utc(
                payload.get("stock_added_at_utc")
            )
        if "notes" in payload:
            fields["notes"] = _normalize_notes(payload.get("notes"))
        fields["updated_at_utc"] = _now_utc_iso()
        repo_update_nappy_stock_batch(conn, batch["id"], fields)
    return get_nappy_stock_status(db_path)


def adjust_nappy_stock_remaining(db_path: str, payload: dict) -> dict:
    delta = _normalize_signed_int(payload.get("delta"), "delta")
    with get_connection(db_path) as conn:
        batch = get_latest_nappy_stock_batch(conn)
        if not batch:
            raise ValueError("No nappy stock batch exists")
        used_count = count_nappy_changes_since(conn, batch["stock_added_at_utc"])
        current_remaining = max(0, int(batch["total_count"]) - used_count)
        next_remaining = current_remaining + delta
        if next_remaining < 0:
            raise ValueError("remaining stock cannot be negative")
        next_total = used_count + next_remaining
        repo_update_nappy_stock_batch(
            conn,
            batch["id"],
            {
                "total_count": next_total,
                "updated_at_utc": _now_utc_iso(),
            },
        )
    return get_nappy_stock_status(db_path)
