import json
import sqlite3
from datetime import datetime, timezone

DEFAULT_FEED_SIZE_SMALL_ML = 120.0
DEFAULT_FEED_SIZE_BIG_ML = 150.0
DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434"
DEFAULT_OLLAMA_MODEL = "gemma4"
DEFAULT_OLLAMA_TIMEOUT_SECONDS = 45
DEFAULT_OLLAMA_THINKING_ENABLED = False
DEFAULT_OPENAI_MODEL = "gpt-4.1-mini"
DEFAULT_OPENAI_TIMEOUT_SECONDS = 45


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
    "feed_size_small_ml",
    "feed_size_big_ml",
    "ollama_base_url",
    "ollama_model",
    "ollama_timeout_seconds",
    "ollama_thinking_enabled",
    "openai_model",
    "openai_timeout_seconds",
    "openai_prompt_template",
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
    small_value = raw.get("feed_size_small_ml")
    big_value = raw.get("feed_size_big_ml")
    settings["feed_size_small_ml"] = (
        float(small_value)
        if isinstance(small_value, (int, float))
        else DEFAULT_FEED_SIZE_SMALL_ML
    )
    settings["feed_size_big_ml"] = (
        float(big_value)
        if isinstance(big_value, (int, float))
        else DEFAULT_FEED_SIZE_BIG_ML
    )
    base_url = raw.get("ollama_base_url")
    settings["ollama_base_url"] = (
        base_url.strip()
        if isinstance(base_url, str) and base_url.strip()
        else DEFAULT_OLLAMA_BASE_URL
    )
    model = raw.get("ollama_model")
    settings["ollama_model"] = (
        model.strip()
        if isinstance(model, str) and model.strip()
        else DEFAULT_OLLAMA_MODEL
    )
    timeout = raw.get("ollama_timeout_seconds")
    settings["ollama_timeout_seconds"] = (
        int(timeout)
        if isinstance(timeout, int) and not isinstance(timeout, bool) and timeout > 0
        else DEFAULT_OLLAMA_TIMEOUT_SECONDS
    )
    thinking_enabled = raw.get("ollama_thinking_enabled")
    settings["ollama_thinking_enabled"] = (
        bool(thinking_enabled)
        if isinstance(thinking_enabled, (int, bool))
        else DEFAULT_OLLAMA_THINKING_ENABLED
    )
    openai_model = raw.get("openai_model")
    settings["openai_model"] = (
        openai_model.strip()
        if isinstance(openai_model, str) and openai_model.strip()
        else DEFAULT_OPENAI_MODEL
    )
    openai_timeout = raw.get("openai_timeout_seconds")
    settings["openai_timeout_seconds"] = (
        int(openai_timeout)
        if isinstance(openai_timeout, int)
        and not isinstance(openai_timeout, bool)
        and openai_timeout > 0
        else DEFAULT_OPENAI_TIMEOUT_SECONDS
    )
    prompt_template = raw.get("openai_prompt_template")
    settings["openai_prompt_template"] = (
        prompt_template
        if isinstance(prompt_template, str) and prompt_template.strip()
        else None
    )
    return settings


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
    assert conn is not None
    _ensure_settings_row(conn)
    row = conn.execute(
        """
        SELECT dob, feed_interval_min, custom_event_types,
               feed_goal_min, feed_goal_max,
               overnight_gap_min_hours, overnight_gap_max_hours,
               behind_target_mode, entry_webhook_url,
               default_user_slug, pushcut_feed_due_url,
               home_kpis_webhook_url, feed_size_small_ml, feed_size_big_ml,
               ollama_base_url, ollama_model, ollama_timeout_seconds,
               ollama_thinking_enabled, openai_model, openai_timeout_seconds,
               openai_prompt_template
        FROM baby_settings
        WHERE id = 1
        """
    ).fetchone()
    data = _normalize_settings_payload(dict(row) if row else {})
    return data


def update_settings(conn: sqlite3.Connection | None, fields: dict) -> dict:
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
        "feed_size_small_ml",
        "feed_size_big_ml",
        "ollama_base_url",
        "ollama_model",
        "ollama_timeout_seconds",
        "ollama_thinking_enabled",
        "openai_model",
        "openai_timeout_seconds",
        "openai_prompt_template",
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
    return get_settings(conn)


def get_feed_due_state(conn: sqlite3.Connection | None) -> dict:
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
    return get_feed_due_state(conn)
