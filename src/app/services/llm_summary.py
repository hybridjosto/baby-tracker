from datetime import datetime, timedelta, timezone
import json
import socket
from urllib import error as urllib_error
from urllib import request as urllib_request

from src.app.services.settings import get_settings
from src.app.storage.db import get_connection
from src.app.storage.entries import list_entries as repo_list_entries
from src.lib.validation import normalize_user_slug


MAX_SUMMARY_EVENTS = 500


class LlmSummaryError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def generate_ollama_summary(
    db_path: str,
    payload: dict,
) -> dict:
    since_utc = _normalize_timestamp(payload.get("since_utc"), "since_utc")
    until_utc = _normalize_timestamp(payload.get("until_utc"), "until_utc")
    if since_utc >= until_utc:
        raise ValueError("since_utc must be before until_utc")
    if until_utc - since_utc > timedelta(hours=25):
        raise ValueError("summary window must be 25 hours or less")
    user_slug = payload.get("user_slug")
    normalized_slug = normalize_user_slug(user_slug) if user_slug else None

    with get_connection(db_path) as conn:
        entries = repo_list_entries(
            conn,
            MAX_SUMMARY_EVENTS,
            user_slug=normalized_slug,
            since_utc=since_utc.isoformat(),
            until_utc=until_utc.isoformat(),
            include_deleted=False,
        )

    ordered_entries = sorted(entries, key=lambda entry: entry["timestamp_utc"])
    settings = get_settings(db_path)
    model = settings["ollama_model"]
    if not ordered_entries:
        return {
            "summary": "",
            "event_count": 0,
            "model": model,
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "window": {
                "since_utc": since_utc.isoformat(),
                "until_utc": until_utc.isoformat(),
            },
            "skipped": True,
        }

    prompt = _build_prompt(ordered_entries, since_utc, until_utc)
    summary = _call_ollama(
        settings["ollama_base_url"],
        model,
        prompt,
        settings["ollama_timeout_seconds"],
    )
    return {
        "summary": summary,
        "event_count": len(ordered_entries),
        "model": model,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "window": {
            "since_utc": since_utc.isoformat(),
            "until_utc": until_utc.isoformat(),
        },
    }


def _normalize_timestamp(value: object, field: str) -> datetime:
    if not isinstance(value, str):
        raise ValueError(f"{field} must be ISO-8601")
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field} must be ISO-8601")
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError as exc:
        raise ValueError(f"{field} must be ISO-8601") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _build_prompt(entries: list[dict], since_utc: datetime, until_utc: datetime) -> str:
    event_lines = json.dumps(
        [_summarize_entry(entry) for entry in entries],
        ensure_ascii=False,
        indent=2,
    )
    return (
        "You are summarising a baby's tracking log for a parent handover.\n"
        "Use only the provided events. Do not invent missing details. "
        "Do not provide medical diagnosis.\n"
        "Write concise bullets covering feeds, nappies, sleep or crying if present, "
        "notable notes, and practical things to watch next.\n"
        f"Window UTC: {since_utc.isoformat()} to {until_utc.isoformat()}.\n"
        f"Events:\n{event_lines}"
    )


def _summarize_entry(entry: dict) -> dict:
    result = {
        "type": entry.get("type"),
        "timestamp_utc": entry.get("timestamp_utc"),
        "user_slug": entry.get("user_slug"),
    }
    for key in (
        "notes",
        "amount_ml",
        "expressed_ml",
        "formula_ml",
        "feed_duration_min",
        "weight_kg",
        "caregiver_id",
    ):
        value = entry.get(key)
        if value is not None:
            result[key] = value
    return result


def _call_ollama(
    base_url: str,
    model: str,
    prompt: str,
    timeout_seconds: int,
) -> str:
    body = json.dumps(
        {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.2},
        }
    ).encode("utf-8")
    req = urllib_request.Request(
        f"{base_url.rstrip('/')}/api/generate",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=timeout_seconds) as response:
            raw = response.read().decode("utf-8")
    except TimeoutError as exc:
        raise LlmSummaryError("Ollama request timed out", 504) from exc
    except socket.timeout as exc:
        raise LlmSummaryError("Ollama request timed out", 504) from exc
    except urllib_error.HTTPError as exc:
        raise LlmSummaryError(f"Ollama returned HTTP {exc.code}", 502) from exc
    except urllib_error.URLError as exc:
        raise LlmSummaryError("Ollama is unavailable", 503) from exc

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise LlmSummaryError("Ollama returned malformed JSON", 502) from exc
    summary = data.get("response")
    if not isinstance(summary, str) or not summary.strip():
        raise LlmSummaryError("Ollama returned an empty summary", 502)
    return summary.strip()
