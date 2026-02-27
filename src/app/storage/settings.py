import json
import sqlite3
from datetime import datetime, timezone

from src.app.storage.backend import is_dual_backend, is_firestore_backend
from src.app.storage.firestore_client import collection


SETTINGS_KEYS = (
    "dob",
    "feed_interval_min",
    "custom_event_types",
    "feed_goal_min",
    "feed_goal_max",
    "overnight_gap_min_hours",
    "overnight_gap_max_hours",
    "behind_target_mode",
    "entry_webhook_url",
    "default_user_slug",
    "pushcut_feed_due_url",
    "home_kpis_webhook_url",
)


def _parse_custom_event_types(value: object) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [item for item in value if isinstance(item, str)]
    if not isinstance(value, str):
        return []
    try:
        loaded = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(loaded, list):
        return []
    return [item for item in loaded if isinstance(item, str)]


def _normalize_settings_payload(data: dict | None) -> dict:
    raw = data or {}
    settings = {key: raw.get(key) for key in SETTINGS_KEYS}
    settings["custom_event_types"] = _parse_custom_event_types(
        raw.get("custom_event_types")
    )
    return settings


def _firestore_settings_ref():
    return collection("settings").document("main")


def _firestore_get_settings() -> dict:
    snap = _firestore_settings_ref().get()
    if not snap.exists:
        return _normalize_settings_payload({})
    data = snap.to_dict() or {}
    return _normalize_settings_payload(data)


def _firestore_update_settings(fields: dict) -> dict:
    if fields:
        doc = dict(fields)
        if "custom_event_types" in doc:
            doc["custom_event_types"] = _parse_custom_event_types(doc["custom_event_types"])
        _firestore_settings_ref().set(doc, merge=True)
    return _firestore_get_settings()


def _firestore_get_feed_due_state() -> dict:
    snap = _firestore_settings_ref().get()
    if not snap.exists:
        return {"feed_due_last_entry_id": None, "feed_due_last_sent_at_utc": None}
    data = snap.to_dict() or {}
    return {
        "feed_due_last_entry_id": data.get("feed_due_last_entry_id"),
        "feed_due_last_sent_at_utc": data.get("feed_due_last_sent_at_utc"),
    }


def _firestore_update_feed_due_state(
    last_entry_id: int | None,
    sent_at_utc: str | None,
) -> dict:
    stamp = sent_at_utc or datetime.now(timezone.utc).isoformat()
    _firestore_settings_ref().set(
        {
            "feed_due_last_entry_id": last_entry_id,
            "feed_due_last_sent_at_utc": sent_at_utc,
            "updated_at_utc": stamp,
        },
        merge=True,
    )
    return _firestore_get_feed_due_state()


def _ensure_settings_row(conn: sqlite3.Connection) -> None:
    row = conn.execute("SELECT id FROM baby_settings WHERE id = 1").fetchone()
    if not row:
        conn.execute(
            """
            INSERT INTO baby_settings (id, dob, feed_interval_min, updated_at_utc)
            VALUES (1, NULL, NULL, datetime('now'))
            """
        )
        conn.commit()


def get_settings(conn: sqlite3.Connection | None) -> dict:
    if is_firestore_backend():
        return _firestore_get_settings()

    assert conn is not None
    _ensure_settings_row(conn)
    row = conn.execute(
        """
        SELECT dob, feed_interval_min, custom_event_types,
               feed_goal_min, feed_goal_max,
               overnight_gap_min_hours, overnight_gap_max_hours,
               behind_target_mode, entry_webhook_url,
               default_user_slug, pushcut_feed_due_url,
               home_kpis_webhook_url
        FROM baby_settings
        WHERE id = 1
        """
    ).fetchone()
    data = _normalize_settings_payload(dict(row) if row else {})
    return data


def update_settings(conn: sqlite3.Connection | None, fields: dict) -> dict:
    if is_firestore_backend():
        return _firestore_update_settings(fields)

    assert conn is not None
    _ensure_settings_row(conn)
    assignments: list[str] = []
    values: list[object] = []
    for key in (
        "dob",
        "feed_interval_min",
        "custom_event_types",
        "feed_goal_min",
        "feed_goal_max",
        "overnight_gap_min_hours",
        "overnight_gap_max_hours",
        "behind_target_mode",
        "entry_webhook_url",
        "default_user_slug",
        "pushcut_feed_due_url",
        "home_kpis_webhook_url",
        "updated_at_utc",
    ):
        if key in fields:
            assignments.append(f"{key} = ?")
            values.append(fields[key])
    if assignments:
        values.append(1)
        conn.execute(
            f"UPDATE baby_settings SET {', '.join(assignments)} WHERE id = ?",
            values,
        )
        conn.commit()
        if is_dual_backend():
            _firestore_update_settings(fields)
    return get_settings(conn)


def get_feed_due_state(conn: sqlite3.Connection | None) -> dict:
    if is_firestore_backend():
        return _firestore_get_feed_due_state()

    assert conn is not None
    _ensure_settings_row(conn)
    row = conn.execute(
        """
        SELECT feed_due_last_entry_id, feed_due_last_sent_at_utc
        FROM baby_settings
        WHERE id = 1
        """
    ).fetchone()
    if not row:
        return {"feed_due_last_entry_id": None, "feed_due_last_sent_at_utc": None}
    return dict(row)


def update_feed_due_state(
    conn: sqlite3.Connection | None,
    last_entry_id: int | None,
    sent_at_utc: str | None,
) -> dict:
    if is_firestore_backend():
        return _firestore_update_feed_due_state(last_entry_id, sent_at_utc)

    assert conn is not None
    _ensure_settings_row(conn)
    stamp = sent_at_utc or datetime.now(timezone.utc).isoformat()
    conn.execute(
        """
        UPDATE baby_settings
        SET feed_due_last_entry_id = ?,
            feed_due_last_sent_at_utc = ?,
            updated_at_utc = ?
        WHERE id = 1
        """,
        (last_entry_id, sent_at_utc, stamp),
    )
    conn.commit()
    if is_dual_backend():
        _firestore_update_feed_due_state(last_entry_id, sent_at_utc)
    return get_feed_due_state(conn)
