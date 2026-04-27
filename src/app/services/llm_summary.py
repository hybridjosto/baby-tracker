import json
import os
import socket
from datetime import datetime, timedelta, timezone
from pathlib import Path
from string import Template
from urllib import error as urllib_error
from urllib import request as urllib_request

from src.app.services.settings import get_settings
from src.app.storage.db import get_connection
from src.app.storage.entries import list_entries as repo_list_entries
from src.lib.validation import normalize_user_slug

MAX_SUMMARY_EVENTS = 500
COMPARE_DAY_COUNT = 7
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
DEFAULT_PROMPT_PATH = (
    Path(__file__).resolve().parents[1] / "prompts" / "llm_summary_prompt.txt"
)
PROMPT_PATH_ENV_VAR = "BABY_TRACKER_LLM_SUMMARY_PROMPT_PATH"


class LlmSummaryError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def generate_llm_summary(
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
    compare_since_utc = since_utc - timedelta(days=COMPARE_DAY_COUNT)

    with get_connection(db_path) as conn:
        entries = repo_list_entries(
            conn,
            MAX_SUMMARY_EVENTS,
            user_slug=normalized_slug,
            since_utc=compare_since_utc.isoformat(),
            until_utc=until_utc.isoformat(),
            include_deleted=False,
        )

    ordered_entries = sorted(entries, key=lambda entry: entry["timestamp_utc"])
    selected_entries = [
        entry
        for entry in ordered_entries
        if since_utc <= _normalize_timestamp(entry["timestamp_utc"], "timestamp_utc")
        < until_utc
    ]
    settings = get_settings(db_path)
    model = settings["openai_model"]
    if not selected_entries:
        return {
            "summary": "",
            "event_count": 0,
            "context_event_count": len(ordered_entries),
            "model": model,
            "provider": "openai",
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "window": {
                "since_utc": since_utc.isoformat(),
                "until_utc": until_utc.isoformat(),
            },
            "comparison_window": {
                "since_utc": compare_since_utc.isoformat(),
                "until_utc": since_utc.isoformat(),
                "days": COMPARE_DAY_COUNT,
            },
            "skipped": True,
        }

    prompt = _build_prompt(
        ordered_entries,
        selected_entries,
        since_utc,
        until_utc,
        prompt_template=settings.get("openai_prompt_template"),
    )
    response = _call_openai(
        model=model,
        prompt=prompt,
        timeout_seconds=settings["openai_timeout_seconds"],
    )
    structured_summary = _parse_structured_summary(response)
    summary_text = _render_summary_markdown(structured_summary)
    return {
        "summary": summary_text,
        "structured_summary": structured_summary,
        "event_count": len(selected_entries),
        "context_event_count": len(ordered_entries),
        "model": model,
        "provider": "openai",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "window": {
            "since_utc": since_utc.isoformat(),
            "until_utc": until_utc.isoformat(),
        },
        "comparison_window": {
            "since_utc": compare_since_utc.isoformat(),
            "until_utc": since_utc.isoformat(),
            "days": COMPARE_DAY_COUNT,
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


def _build_prompt(
    all_entries: list[dict],
    selected_entries: list[dict],
    since_utc: datetime,
    until_utc: datetime,
    prompt_template: str | None = None,
) -> str:
    comparison_days = _build_comparison_days(all_entries, since_utc, until_utc)
    selected_day_stats = _build_day_stats(selected_entries)
    selected_lines = json.dumps(
        [_summarize_entry(entry) for entry in selected_entries],
        ensure_ascii=False,
        indent=2,
    )
    comparison_lines = json.dumps(comparison_days, ensure_ascii=False, indent=2)
    template = _load_prompt_template(prompt_template)
    return _render_prompt_template(
        template,
        {
            "selected_day_since_utc": since_utc.isoformat(),
            "selected_day_until_utc": until_utc.isoformat(),
            "selected_day_stats_json": json.dumps(
                selected_day_stats,
                ensure_ascii=False,
            ),
            "selected_day_events_json": selected_lines,
            "comparison_days_json": comparison_lines,
        },
        "stored settings prompt" if prompt_template else str(_get_prompt_path()),
    )


def _get_prompt_path() -> Path:
    override = os.getenv(PROMPT_PATH_ENV_VAR)
    if override and override.strip():
        return Path(override.strip())
    return DEFAULT_PROMPT_PATH


def _load_prompt_template(stored_template: str | None = None) -> str:
    if isinstance(stored_template, str) and stored_template.strip():
        return stored_template
    prompt_path = _get_prompt_path()
    try:
        return prompt_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise LlmSummaryError(
            f"Unable to read AI summary prompt file: {prompt_path}",
            500,
        ) from exc


def _render_prompt_template(
    template_text: str,
    values: dict[str, str],
    prompt_source: str | None = None,
) -> str:
    try:
        return Template(template_text).substitute(values)
    except KeyError as exc:
        missing_key = exc.args[0]
        prompt_location = prompt_source or str(_get_prompt_path())
        raise LlmSummaryError(
            f"Invalid AI summary prompt placeholder '{missing_key}' in {prompt_location}",
            500,
        ) from exc
    except ValueError as exc:
        prompt_location = prompt_source or str(_get_prompt_path())
        raise LlmSummaryError(
            f"Invalid AI summary prompt template in {prompt_location}: {exc}",
            500,
        ) from exc


def _build_comparison_days(
    all_entries: list[dict],
    since_utc: datetime,
    until_utc: datetime,
) -> list[dict]:
    comparison_days: list[dict] = []
    for offset in range(COMPARE_DAY_COUNT, 0, -1):
        window_since = since_utc - timedelta(days=offset)
        window_until = until_utc - timedelta(days=offset)
        day_entries = []
        for entry in all_entries:
            entry_ts = _normalize_timestamp(entry["timestamp_utc"], "timestamp_utc")
            if window_since <= entry_ts < window_until:
                day_entries.append(entry)
        day_entries.sort(key=lambda entry: entry["timestamp_utc"])
        comparison_days.append(
            {
                "window": {
                    "since_utc": window_since.isoformat(),
                    "until_utc": window_until.isoformat(),
                },
                "stats": _build_day_stats(day_entries),
                "sample_notes": _collect_sample_notes(day_entries),
            }
        )
    return comparison_days


def _build_day_stats(entries: list[dict]) -> dict:
    stats = {
        "event_count": len(entries),
        "feed_count": 0,
        "total_feed_ml": 0.0,
        "amount_total_ml": 0.0,
        "expressed_total_ml": 0.0,
        "formula_total_ml": 0.0,
        "breastfeed_count": 0,
        "formula_feed_count": 0,
        "expressed_feed_count": 0,
        "wee_count": 0,
        "poo_count": 0,
        "sleep_count": 0,
        "sleep_total_min": 0,
        "cry_count": 0,
        "timed_event_count": 0,
    }
    for entry in entries:
        entry_type = str(entry.get("type") or "").strip().lower()
        total_amount = 0.0
        for key in ("amount_ml", "expressed_ml", "formula_ml"):
            value = entry.get(key)
            if isinstance(value, (int, float)):
                total_amount += float(value)
        duration = entry.get("feed_duration_min")
        duration_min = int(duration) if isinstance(duration, int) else 0
        if entry_type == "feed":
            stats["feed_count"] += 1
            stats["total_feed_ml"] += total_amount
            amount_value = entry.get("amount_ml")
            if isinstance(amount_value, (int, float)):
                stats["amount_total_ml"] += float(amount_value)
            expressed_value = entry.get("expressed_ml")
            if isinstance(expressed_value, (int, float)):
                stats["expressed_total_ml"] += float(expressed_value)
            formula_value = entry.get("formula_ml")
            if isinstance(formula_value, (int, float)):
                stats["formula_total_ml"] += float(formula_value)
            if duration_min > 0:
                stats["breastfeed_count"] += 1
            if isinstance(entry.get("formula_ml"), (int, float)):
                stats["formula_feed_count"] += 1
            if isinstance(entry.get("expressed_ml"), (int, float)):
                stats["expressed_feed_count"] += 1
        elif entry_type == "wee":
            stats["wee_count"] += 1
        elif entry_type == "poo":
            stats["poo_count"] += 1
        elif entry_type == "sleep":
            stats["sleep_count"] += 1
            stats["sleep_total_min"] += duration_min
            stats["timed_event_count"] += 1
        elif entry_type == "cry":
            stats["cry_count"] += 1
            stats["timed_event_count"] += 1
        elif duration_min > 0:
            stats["timed_event_count"] += 1
    stats["total_feed_ml"] = round(stats["total_feed_ml"], 1)
    stats["amount_total_ml"] = round(stats["amount_total_ml"], 1)
    stats["expressed_total_ml"] = round(stats["expressed_total_ml"], 1)
    stats["formula_total_ml"] = round(stats["formula_total_ml"], 1)
    return stats


def _collect_sample_notes(entries: list[dict], limit: int = 3) -> list[str]:
    notes: list[str] = []
    for entry in entries:
        note = entry.get("notes")
        if isinstance(note, str) and note.strip():
            notes.append(note.strip())
        if len(notes) >= limit:
            break
    return notes


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


def _call_openai(
    model: str,
    prompt: str,
    timeout_seconds: int,
) -> str:
    api_key = os.getenv("BABY_TRACKER_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise LlmSummaryError("OpenAI API key is not configured", 503)
    body = json.dumps(
        {
            "model": model,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You produce concise, factual baby handover summaries in strict JSON."
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
    except TimeoutError as exc:
        raise LlmSummaryError("OpenAI request timed out", 504) from exc
    except socket.timeout as exc:
        raise LlmSummaryError("OpenAI request timed out", 504) from exc
    except urllib_error.HTTPError as exc:
        raise LlmSummaryError(f"OpenAI returned HTTP {exc.code}", 502) from exc
    except urllib_error.URLError as exc:
        raise LlmSummaryError("OpenAI is unavailable", 503) from exc

    try:
        data = json.loads(raw)
        choices = data.get("choices") or []
        message = choices[0]["message"]
        content = message.get("content")
    except (json.JSONDecodeError, IndexError, KeyError, TypeError) as exc:
        raise LlmSummaryError("OpenAI returned malformed JSON", 502) from exc
    if not isinstance(content, str) or not content.strip():
        raise LlmSummaryError("OpenAI returned an empty summary", 502)
    return content.strip()


def _parse_structured_summary(content: str) -> dict:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise LlmSummaryError("OpenAI returned invalid summary JSON", 502) from exc
    if not isinstance(data, dict):
        raise LlmSummaryError("OpenAI returned invalid summary JSON", 502)
    headline = data.get("headline")
    selected_day = _normalize_bullet_list(data.get("selected_day"), "selected_day")
    comparison = _normalize_bullet_list(
        data.get("comparison_to_previous_7_days"),
        "comparison_to_previous_7_days",
    )
    follow_up = _normalize_bullet_list(data.get("follow_up"), "follow_up")
    if not isinstance(headline, str) or not headline.strip():
        raise LlmSummaryError("OpenAI returned invalid summary JSON", 502)
    return {
        "headline": headline.strip(),
        "selected_day": selected_day,
        "comparison_to_previous_7_days": comparison,
        "follow_up": follow_up,
    }


def _normalize_bullet_list(value: object, field: str) -> list[str]:
    if not isinstance(value, list):
        raise LlmSummaryError(f"OpenAI returned invalid {field}", 502)
    cleaned = [
        item.strip()
        for item in value
        if isinstance(item, str) and item.strip()
    ]
    if not cleaned:
        raise LlmSummaryError(f"OpenAI returned empty {field}", 502)
    return cleaned


def _render_summary_markdown(structured_summary: dict) -> str:
    parts = [f"## {structured_summary['headline']}"]
    parts.extend(_render_section("Selected day", structured_summary["selected_day"]))
    parts.extend(
        _render_section(
            "Compared with previous 7 days",
            structured_summary["comparison_to_previous_7_days"],
        )
    )
    parts.extend(_render_section("Handover follow-up", structured_summary["follow_up"]))
    return "\n".join(parts).strip()


def _render_section(title: str, bullets: list[str]) -> list[str]:
    lines = [f"### {title}"]
    lines.extend(f"- {bullet}" for bullet in bullets)
    return ["", *lines]
