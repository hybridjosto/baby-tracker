import json
import math
import os
import socket
import uuid
from datetime import datetime, timezone
from urllib import error as urllib_error
from urllib import request as urllib_request

from src.app.services.settings import get_settings
from src.app.storage.db import get_connection
from src.app.storage.entries import create_entries_batch
from src.lib.validation import normalize_user_slug, validate_entry_type

OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
CORE_ENTRY_TYPES = ("feed", "sleep", "wee", "poo", "cry", "weight")
MAX_BACKFILL_ENTRIES = 10
MAX_BACKFILL_TEXT_LENGTH = 4000


class EntryBackfillError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def parse_backfill_text(
    db_path: str,
    user_slug: str,
    payload: dict,
    *,
    now_utc: datetime | None = None,
) -> dict:
    normalize_user_slug(user_slug)
    text = _normalize_text(payload.get("text"))
    reference_time = _normalize_reference_time(
        payload.get("reference_time_utc"),
        now_utc=now_utc,
    )
    timezone_name = _normalize_timezone(payload.get("timezone"))
    settings = get_settings(db_path)
    allowed_types = [*CORE_ENTRY_TYPES, *settings["custom_event_types"]]
    model = settings["openai_model"]
    prompt = _build_prompt(
        text,
        reference_time=reference_time,
        timezone_name=timezone_name,
        allowed_types=allowed_types,
    )
    content = _call_openai(
        model=model,
        prompt=prompt,
        timeout_seconds=settings["openai_timeout_seconds"],
    )
    raw_drafts = _parse_openai_drafts(content)
    batch_id = uuid.uuid4().hex
    drafts = [
        _normalize_draft(
            raw,
            index=index,
            allowed_types=allowed_types,
            now_utc=reference_time,
        )
        for index, raw in enumerate(raw_drafts[:MAX_BACKFILL_ENTRIES], start=1)
    ]
    return {
        "batch_id": batch_id,
        "drafts": drafts,
        "count": len(drafts),
        "truncated": len(raw_drafts) > MAX_BACKFILL_ENTRIES,
        "model": model,
        "provider": "openai",
        "reference_time_utc": reference_time.isoformat(),
        "timezone": timezone_name,
        "allowed_types": allowed_types,
    }


def commit_backfill_entries(
    db_path: str,
    user_slug: str,
    payload: dict,
    *,
    now_utc: datetime | None = None,
) -> dict:
    normalized_slug = normalize_user_slug(user_slug)
    batch_id = _normalize_batch_id(payload.get("batch_id"))
    entries = payload.get("entries")
    if not isinstance(entries, list) or not entries:
        raise ValueError("entries must be a non-empty list")
    if len(entries) > MAX_BACKFILL_ENTRIES:
        raise ValueError(f"entries must contain at most {MAX_BACKFILL_ENTRIES} items")

    settings = get_settings(db_path)
    allowed_types = [*CORE_ENTRY_TYPES, *settings["custom_event_types"]]
    current_time = (now_utc or datetime.now(timezone.utc)).astimezone(timezone.utc)
    prepared: list[dict] = []
    errors: list[dict] = []
    seen_draft_ids: set[str] = set()
    for index, raw in enumerate(entries, start=1):
        draft_id = _normalize_draft_id(
            raw.get("draft_id") if isinstance(raw, dict) else None,
            index,
        )
        if draft_id in seen_draft_ids:
            errors.append(
                {
                    "draft_id": draft_id,
                    "index": index - 1,
                    "errors": ["draft_id must be unique within the batch"],
                }
            )
            continue
        seen_draft_ids.add(draft_id)
        normalized = _normalize_draft(
            raw,
            index=index,
            allowed_types=allowed_types,
            now_utc=current_time,
            require_resolved_warnings=True,
        )
        if normalized["errors"]:
            errors.append(
                {
                    "draft_id": draft_id,
                    "index": index - 1,
                    "errors": normalized["errors"],
                }
            )
            continue
        now_iso = current_time.isoformat()
        prepared.append(
            {
                "user_slug": normalized_slug,
                "type": normalized["type"],
                "timestamp_utc": normalized["timestamp_utc"],
                "client_event_id": (
                    f"backfill-{normalized_slug}-{batch_id}-{draft_id}"
                ),
                "notes": normalized["notes"],
                "amount_ml": normalized["amount_ml"],
                "expressed_ml": normalized["expressed_ml"],
                "formula_ml": normalized["formula_ml"],
                "feed_duration_min": normalized["feed_duration_min"],
                "weight_kg": normalized["weight_kg"],
                "caregiver_id": None,
                "created_at_utc": now_iso,
                "updated_at_utc": now_iso,
            }
        )
    if errors:
        raise BackfillValidationError(errors)

    with get_connection(db_path) as conn:
        created, duplicates = create_entries_batch(conn, prepared)
    return {
        "created": len(created),
        "duplicates": len(duplicates),
        "entries": [*created, *duplicates],
        "batch_id": batch_id,
    }


class BackfillValidationError(ValueError):
    def __init__(self, errors: list[dict]):
        super().__init__("Backfill entries require correction")
        self.errors = errors


def _normalize_text(value: object) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("text is required")
    text = value.strip()
    if len(text) > MAX_BACKFILL_TEXT_LENGTH:
        raise ValueError(
            f"text must be {MAX_BACKFILL_TEXT_LENGTH} characters or fewer"
        )
    return text


def _normalize_reference_time(
    value: object, *, now_utc: datetime | None = None
) -> datetime:
    if value is None:
        return (now_utc or datetime.now(timezone.utc)).astimezone(timezone.utc)
    return _parse_timestamp(value, "reference_time_utc")


def _normalize_timezone(value: object) -> str:
    if value is None:
        return "UTC"
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > 100:
        raise ValueError("timezone must be a valid timezone name")
    return value.strip()


def _normalize_batch_id(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("batch_id is required")
    cleaned = value.strip().lower()
    if len(cleaned) != 32 or any(char not in "0123456789abcdef" for char in cleaned):
        raise ValueError("batch_id must be a 32-character hexadecimal ID")
    return cleaned


def _normalize_draft_id(value: object, index: int) -> str:
    if not isinstance(value, str) or not value.strip():
        return f"draft-{index}"
    cleaned = value.strip()
    if len(cleaned) > 64 or not all(
        char.isalnum() or char in {"-", "_"} for char in cleaned
    ):
        return f"draft-{index}"
    return cleaned


def _normalize_draft(
    raw: object,
    *,
    index: int,
    allowed_types: list[str],
    now_utc: datetime,
    require_resolved_warnings: bool = False,
) -> dict:
    data = raw if isinstance(raw, dict) else {}
    draft_id = _normalize_draft_id(data.get("draft_id"), index)
    warnings = _normalize_string_list(data.get("warnings"))
    errors: list[str] = []
    entry_type = _canonical_type(data.get("type"), allowed_types)
    if entry_type is None:
        errors.append("type must be one of the allowed entry types")

    timestamp_utc = None
    try:
        timestamp = _parse_timestamp(data.get("timestamp_utc"), "timestamp_utc")
        if timestamp > now_utc:
            errors.append("timestamp_utc cannot be in the future")
        else:
            timestamp_utc = timestamp.isoformat()
    except ValueError as exc:
        errors.append(str(exc))

    notes = data.get("notes")
    if notes is not None:
        if not isinstance(notes, str):
            errors.append("notes must be a string")
            notes = None
        else:
            notes = notes.strip() or None
            if notes and len(notes) > 2000:
                errors.append("notes must be 2000 characters or fewer")

    numbers: dict[str, float | None] = {}
    for field in (
        "amount_ml",
        "expressed_ml",
        "formula_ml",
        "feed_duration_min",
        "weight_kg",
    ):
        try:
            numbers[field] = _normalize_optional_number(data.get(field), field)
        except ValueError as exc:
            errors.append(str(exc))
            numbers[field] = None

    if entry_type == "feed" and not any(
        numbers[field] is not None
        for field in ("amount_ml", "expressed_ml", "formula_ml")
    ):
        errors.append("feed entries require an amount in ml")
    if entry_type == "sleep" and numbers["feed_duration_min"] is None:
        errors.append("sleep entries require a duration")
    if entry_type == "weight" and numbers["weight_kg"] is None:
        errors.append("weight entries require weight_kg")
    if require_resolved_warnings and warnings:
        errors.append("resolve or clear all warnings before saving")

    return {
        "draft_id": draft_id,
        "type": entry_type or "",
        "timestamp_utc": timestamp_utc,
        "notes": notes,
        **numbers,
        "warnings": warnings,
        "errors": errors,
        "valid": not errors and not warnings,
    }


def _canonical_type(value: object, allowed_types: list[str]) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    candidate = value.strip()
    try:
        validate_entry_type(candidate)
    except ValueError:
        return None
    by_lower = {entry_type.lower(): entry_type for entry_type in allowed_types}
    return by_lower.get(candidate.lower())


def _normalize_optional_number(value: object, field: str) -> float | None:
    if value in (None, ""):
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be a non-negative number")
    number = float(value)
    if not math.isfinite(number) or number < 0:
        raise ValueError(f"{field} must be a non-negative number")
    return number


def _normalize_string_list(value: object) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        return ["AI returned invalid warnings"]
    return [
        item.strip()
        for item in value
        if isinstance(item, str) and item.strip()
    ][:10]


def _parse_timestamp(value: object, field: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} is required")
    cleaned = value.strip()
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError as exc:
        raise ValueError(f"{field} must be ISO-8601") from exc
    if parsed.tzinfo is None:
        raise ValueError(f"{field} must include a timezone")
    return parsed.astimezone(timezone.utc)


def _build_prompt(
    text: str,
    *,
    reference_time: datetime,
    timezone_name: str,
    allowed_types: list[str],
) -> str:
    return (
        "Convert the user's historical baby-tracker notes into strict JSON.\n"
        f"Reference UTC time: {reference_time.isoformat()}\n"
        f"User timezone: {timezone_name}\n"
        f"Allowed entry types: {json.dumps(allowed_types, ensure_ascii=False)}\n"
        f"Maximum entries: {MAX_BACKFILL_ENTRIES}\n"
        "Return exactly {\"drafts\": [...]}.\n"
        "Each draft must contain draft_id, type, timestamp_utc, notes, amount_ml, "
        "expressed_ml, formula_ml, feed_duration_min, weight_kg, and warnings.\n"
        "Use null for unknown fields. Resolve explicit relative dates against the "
        "reference time and timezone. For sleep ranges use the start timestamp and "
        "duration in minutes. Do not invent quantities, times, dates, types, or notes. "
        "Add a concise warning for every ambiguity or missing required detail. "
        "Feeds need an ml amount, sleeps need a duration, and weights need kg. "
        "Use only allowed entry types.\n\n"
        f"User notes:\n{text}"
    )


def _call_openai(model: str, prompt: str, timeout_seconds: int) -> str:
    api_key = os.getenv("BABY_TRACKER_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise EntryBackfillError("OpenAI API key is not configured", 503)
    body = json.dumps(
        {
            "model": model,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You structure historical baby-tracker entries as strict JSON."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        }
    ).encode("utf-8")
    req = urllib_request.Request(
        OPENAI_API_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=timeout_seconds) as response:
            raw = response.read().decode("utf-8")
    except (TimeoutError, socket.timeout) as exc:
        raise EntryBackfillError("OpenAI request timed out", 504) from exc
    except urllib_error.HTTPError as exc:
        raise EntryBackfillError(f"OpenAI returned HTTP {exc.code}", 502) from exc
    except urllib_error.URLError as exc:
        raise EntryBackfillError("OpenAI is unavailable", 503) from exc
    try:
        data = json.loads(raw)
        content = data["choices"][0]["message"]["content"]
    except (json.JSONDecodeError, IndexError, KeyError, TypeError) as exc:
        raise EntryBackfillError("OpenAI returned malformed JSON", 502) from exc
    if not isinstance(content, str) or not content.strip():
        raise EntryBackfillError("OpenAI returned an empty response", 502)
    return content.strip()


def _parse_openai_drafts(content: str) -> list[dict]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise EntryBackfillError("OpenAI returned invalid backfill JSON", 502) from exc
    drafts = data.get("drafts") if isinstance(data, dict) else None
    if not isinstance(drafts, list):
        raise EntryBackfillError("OpenAI returned invalid backfill drafts", 502)
    return drafts
