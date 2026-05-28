import json
import os
import socket
from datetime import datetime, time, timedelta, timezone
from pathlib import Path
from string import Template
from urllib import error as urllib_error
from urllib import request as urllib_request

from src.app.services.settings import get_settings
from src.app.storage.db import get_connection
from src.app.storage.entries import list_entries as repo_list_entries
from src.lib.validation import normalize_user_slug

MAX_CHAT_EVENTS = 1000
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
DEFAULT_PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "llm_chat_prompt.txt"
PROMPT_PATH_ENV_VAR = "BABY_TRACKER_LLM_CHAT_PROMPT_PATH"
ALLOWED_PRESET_WINDOWS = {"last_night", "today", "yesterday", "last_7_days"}
MANY_OVERNIGHT_WAKES_THRESHOLD = 3
FEED_TREND_MIN_DELTA_PERCENT = 10.0


class LlmChatError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def answer_llm_question(db_path: str, payload: dict) -> dict:
    question = _normalize_question(payload.get("question"))
    window = _resolve_chat_window(payload)
    user_slug = payload.get("user_slug")
    normalized_slug = normalize_user_slug(user_slug) if user_slug else None

    window_duration = window["until_utc"] - window["since_utc"]
    compare_since_utc = window["since_utc"] - (window_duration * 7)

    with get_connection(db_path) as conn:
        entries = repo_list_entries(
            conn,
            MAX_CHAT_EVENTS,
            user_slug=normalized_slug,
            since_utc=compare_since_utc.isoformat(),
            until_utc=window["until_utc"].isoformat(),
            include_deleted=False,
        )

    ordered_entries = sorted(entries, key=lambda entry: entry["timestamp_utc"])
    selected_entries = [
        entry
        for entry in ordered_entries
        if window["since_utc"]
        <= _normalize_timestamp(entry["timestamp_utc"], "timestamp_utc")
            < window["until_utc"]
    ]
    comparison_entries = [
        entry
        for entry in ordered_entries
        if compare_since_utc
        <= _normalize_timestamp(entry["timestamp_utc"], "timestamp_utc")
        < window["since_utc"]
    ]
    settings = get_settings(db_path)
    model = settings["openai_model"]
    facts = build_chat_facts(
        selected_entries,
        window["since_utc"],
        window["until_utc"],
        comparison_entries=comparison_entries,
    )
    generated_at = datetime.now(timezone.utc).isoformat()
    response_base = {
        "facts": facts,
        "event_count": len(selected_entries),
        "model": model,
        "provider": "openai",
        "generated_at_utc": generated_at,
        "window": {
            "label": window["label"],
            "since_utc": window["since_utc"].isoformat(),
            "until_utc": window["until_utc"].isoformat(),
        },
    }
    if not selected_entries:
        return {
            **response_base,
            "answer": (
                "I could not find any tracked events for that window, so there is not "
                "enough baby-tracker data to answer this one."
            ),
            "suggested_followups": [
                "Ask about today",
                "Ask about yesterday",
                "Ask about the last 7 days",
            ],
            "skipped": True,
        }

    prompt = build_chat_prompt(
        question,
        selected_entries,
        facts,
        window["since_utc"],
        window["until_utc"],
        window["label"],
    )
    response = _call_openai_chat(
        model=model,
        prompt=prompt,
        timeout_seconds=settings["openai_timeout_seconds"],
    )
    structured_answer = parse_chat_answer(response)
    return {
        **response_base,
        "answer": render_chat_answer_markdown(structured_answer),
        "structured_answer": structured_answer,
        "suggested_followups": structured_answer["suggested_followups"],
    }


def _normalize_question(value: object) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("question is required")
    question = value.strip()
    if len(question) > 1000:
        raise ValueError("question must be 1000 characters or fewer")
    return question


def _resolve_chat_window(payload: dict, now: datetime | None = None) -> dict:
    preset = payload.get("preset_window")
    since_raw = payload.get("since_utc")
    until_raw = payload.get("until_utc")
    if preset is not None:
        if not isinstance(preset, str) or preset not in ALLOWED_PRESET_WINDOWS:
            raise ValueError("preset_window must be last_night, today, yesterday, or last_7_days")
        return _resolve_preset_window(preset, now=now)
    if since_raw is None and until_raw is None:
        return _resolve_question_window(payload.get("question"), now=now)
    since_utc = _normalize_timestamp(since_raw, "since_utc")
    until_utc = _normalize_timestamp(until_raw, "until_utc")
    _validate_window(since_utc, until_utc)
    return {
        "label": "custom",
        "since_utc": since_utc,
        "until_utc": until_utc,
    }


def _resolve_question_window(question: object, now: datetime | None = None) -> dict:
    text = question.lower() if isinstance(question, str) else ""
    if "last night" in text or "overnight" in text:
        return _resolve_preset_window("last_night", now=now)
    if "yesterday" in text:
        return _resolve_preset_window("yesterday", now=now)
    if "last 7 days" in text or "last week" in text or "past week" in text:
        return _resolve_preset_window("last_7_days", now=now)
    return _resolve_preset_window("today", now=now)


def _resolve_preset_window(preset: str, now: datetime | None = None) -> dict:
    local_now = now or datetime.now().astimezone()
    if local_now.tzinfo is None:
        local_now = local_now.replace(tzinfo=timezone.utc)
    today = local_now.date()
    if preset == "last_night":
        end_local = datetime.combine(today, time(hour=8), tzinfo=local_now.tzinfo)
        if local_now < end_local:
            end_local = end_local - timedelta(days=1)
        since_local = end_local - timedelta(hours=14)
        label = "last night"
    elif preset == "today":
        since_local = datetime.combine(today, time.min, tzinfo=local_now.tzinfo)
        end_local = local_now
        label = "today"
    elif preset == "yesterday":
        yesterday = today - timedelta(days=1)
        since_local = datetime.combine(yesterday, time.min, tzinfo=local_now.tzinfo)
        end_local = since_local + timedelta(days=1)
        label = "yesterday"
    elif preset == "last_7_days":
        end_local = local_now
        since_local = end_local - timedelta(days=7)
        label = "last 7 days"
    else:
        raise ValueError("preset_window must be last_night, today, yesterday, or last_7_days")
    since_utc = since_local.astimezone(timezone.utc)
    until_utc = end_local.astimezone(timezone.utc)
    _validate_window(since_utc, until_utc)
    return {"label": label, "since_utc": since_utc, "until_utc": until_utc}


def _validate_window(since_utc: datetime, until_utc: datetime) -> None:
    if since_utc >= until_utc:
        raise ValueError("since_utc must be before until_utc")
    if until_utc - since_utc > timedelta(days=8):
        raise ValueError("chat window must be 8 days or less")


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


def build_chat_facts(
    entries: list[dict],
    since_utc: datetime,
    until_utc: datetime,
    comparison_entries: list[dict] | None = None,
) -> dict:
    sleep_total_min = 0
    sleep_longest_min = 0
    sleep_day_min = 0
    sleep_night_min = 0
    night_sleep_stretch_count = 0
    night_interrupting_event_count = 0
    overnight_feed_count = 0
    overnight_nappy_count = 0
    overnight_cry_count = 0
    facts = {
        "event_count": len(entries),
        "window_hours": round((until_utc - since_utc).total_seconds() / 3600, 2),
        "feed": {
            "count": 0,
            "total_ml": 0.0,
            "amount_total_ml": 0.0,
            "expressed_total_ml": 0.0,
            "formula_total_ml": 0.0,
            "average_interval_min": None,
            "trend": {
                "direction": "unknown",
                "current_total_ml": 0.0,
                "recent_average_total_ml": None,
                "delta_ml": None,
                "delta_percent": None,
                "comparison_window_count": 0,
            },
        },
        "sleep": {
            "count": 0,
            "total_hours": 0.0,
            "longest_stretch_hours": 0.0,
            "day_hours": 0.0,
            "night_hours": 0.0,
            "overnight_wake_count": 0,
            "many_overnight_wakes": False,
            "many_overnight_wakes_threshold": MANY_OVERNIGHT_WAKES_THRESHOLD,
            "night_interrupting_event_count": 0,
            "likely_explanation_signals": [],
        },
        "nappies": {"wee": 0, "poo": 0, "total": 0},
        "event_counts": {},
        "sample_notes": _collect_sample_notes(entries),
    }
    feed_times: list[datetime] = []
    for entry in entries:
        entry_type = str(entry.get("type") or "").strip().lower()
        facts["event_counts"][entry_type] = facts["event_counts"].get(entry_type, 0) + 1
        entry_ts = _normalize_timestamp(entry["timestamp_utc"], "timestamp_utc")
        if entry_type == "feed":
            facts["feed"]["count"] += 1
            feed_times.append(entry_ts)
            if _is_night_timestamp(entry_ts):
                overnight_feed_count += 1
                night_interrupting_event_count += 1
            for key, fact_key in (
                ("amount_ml", "amount_total_ml"),
                ("expressed_ml", "expressed_total_ml"),
                ("formula_ml", "formula_total_ml"),
            ):
                value = entry.get(key)
                if isinstance(value, (int, float)):
                    facts["feed"][fact_key] += float(value)
                    facts["feed"]["total_ml"] += float(value)
        elif entry_type == "sleep":
            duration = _duration_minutes(entry.get("feed_duration_min"))
            facts["sleep"]["count"] += 1
            sleep_total_min += duration
            sleep_longest_min = max(sleep_longest_min, duration)
            split = _split_sleep_day_night(entry_ts, duration, since_utc, until_utc)
            sleep_day_min += split["day_min"]
            sleep_night_min += split["night_min"]
            if split["night_min"] > 0:
                night_sleep_stretch_count += 1
        elif entry_type == "wee":
            facts["nappies"]["wee"] += 1
            if _is_night_timestamp(entry_ts):
                overnight_nappy_count += 1
                night_interrupting_event_count += 1
        elif entry_type == "poo":
            facts["nappies"]["poo"] += 1
            if _is_night_timestamp(entry_ts):
                overnight_nappy_count += 1
                night_interrupting_event_count += 1
        elif entry_type == "cry" and _is_night_timestamp(entry_ts):
            overnight_cry_count += 1
            night_interrupting_event_count += 1

    facts["nappies"]["total"] = facts["nappies"]["wee"] + facts["nappies"]["poo"]
    feed_times.sort()
    if len(feed_times) > 1:
        gaps = [
            (feed_times[index] - feed_times[index - 1]).total_seconds() / 60
            for index in range(1, len(feed_times))
        ]
        facts["feed"]["average_interval_min"] = round(sum(gaps) / len(gaps), 1)
    for key in ("total_ml", "amount_total_ml", "expressed_total_ml", "formula_total_ml"):
        facts["feed"][key] = round(facts["feed"][key], 1)
    facts["feed"]["trend"] = _build_feed_trend(
        facts["feed"]["total_ml"],
        comparison_entries,
        since_utc,
        until_utc,
    )
    overnight_wake_count = max(
        max(0, night_sleep_stretch_count - 1),
        night_interrupting_event_count,
    )
    facts["sleep"].update(
        {
            "total_hours": _minutes_to_hours(sleep_total_min),
            "longest_stretch_hours": _minutes_to_hours(sleep_longest_min),
            "day_hours": _minutes_to_hours(sleep_day_min),
            "night_hours": _minutes_to_hours(sleep_night_min),
            "overnight_wake_count": overnight_wake_count,
            "many_overnight_wakes": overnight_wake_count >= MANY_OVERNIGHT_WAKES_THRESHOLD,
            "night_interrupting_event_count": night_interrupting_event_count,
            "likely_explanation_signals": _build_wake_explanation_signals(
                overnight_wake_count,
                overnight_feed_count,
                overnight_nappy_count,
                overnight_cry_count,
                sleep_longest_min,
            ),
        }
    )
    return facts


def _build_feed_trend(
    current_total_ml: float,
    comparison_entries: list[dict] | None,
    since_utc: datetime,
    until_utc: datetime,
) -> dict:
    trend = {
        "direction": "unknown",
        "current_total_ml": round(current_total_ml, 1),
        "recent_average_total_ml": None,
        "delta_ml": None,
        "delta_percent": None,
        "comparison_window_count": 0,
    }
    if not comparison_entries:
        return trend

    window_duration = until_utc - since_utc
    totals: list[float] = []
    for offset in range(7, 0, -1):
        window_since = since_utc - (window_duration * offset)
        window_until = window_since + window_duration
        total = 0.0
        has_feed = False
        for entry in comparison_entries:
            entry_ts = _normalize_timestamp(entry["timestamp_utc"], "timestamp_utc")
            if not (window_since <= entry_ts < window_until):
                continue
            if str(entry.get("type") or "").strip().lower() != "feed":
                continue
            has_feed = True
            total += _entry_feed_total_ml(entry)
        if has_feed:
            totals.append(total)

    if not totals:
        return trend

    recent_average = sum(totals) / len(totals)
    delta_ml = current_total_ml - recent_average
    delta_percent = (delta_ml / recent_average * 100) if recent_average else None
    direction = "similar"
    if delta_percent is not None and delta_percent >= FEED_TREND_MIN_DELTA_PERCENT:
        direction = "increased"
    elif delta_percent is not None and delta_percent <= -FEED_TREND_MIN_DELTA_PERCENT:
        direction = "decreased"
    trend.update(
        {
            "direction": direction,
            "recent_average_total_ml": round(recent_average, 1),
            "delta_ml": round(delta_ml, 1),
            "delta_percent": round(delta_percent, 1) if delta_percent is not None else None,
            "comparison_window_count": len(totals),
        }
    )
    return trend


def _entry_feed_total_ml(entry: dict) -> float:
    total = 0.0
    for key in ("amount_ml", "expressed_ml", "formula_ml"):
        value = entry.get(key)
        if isinstance(value, (int, float)):
            total += float(value)
    return total


def _build_wake_explanation_signals(
    overnight_wake_count: int,
    overnight_feed_count: int,
    overnight_nappy_count: int,
    overnight_cry_count: int,
    sleep_longest_min: int,
) -> list[str]:
    if overnight_wake_count < MANY_OVERNIGHT_WAKES_THRESHOLD:
        return []
    signals: list[str] = []
    if overnight_feed_count:
        signals.append(
            f"{overnight_feed_count} overnight feed event(s) could point to hunger or catch-up feeding."
        )
    if overnight_nappy_count:
        signals.append(
            f"{overnight_nappy_count} overnight nappy event(s) may have contributed to resettling."
        )
    if overnight_cry_count:
        signals.append(
            f"{overnight_cry_count} overnight crying event(s) suggest the wakes were unsettled."
        )
    if sleep_longest_min and sleep_longest_min < 120:
        signals.append("The longest sleep stretch was under 2 hours, so sleep was quite fragmented.")
    return signals


def _minutes_to_hours(minutes: int) -> float:
    return round(minutes / 60, 2)


def _is_night_timestamp(timestamp_utc: datetime) -> bool:
    local_hour = timestamp_utc.astimezone().hour
    return local_hour < 7 or local_hour >= 19


def _duration_minutes(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return 0
    return max(0, int(round(float(value))))


def _split_sleep_day_night(
    start_utc: datetime,
    duration_min: int,
    window_since_utc: datetime,
    window_until_utc: datetime,
) -> dict:
    if duration_min <= 0:
        return {"day_min": 0, "night_min": 0}
    start = max(start_utc, window_since_utc)
    end = min(start_utc + timedelta(minutes=duration_min), window_until_utc)
    if start >= end:
        return {"day_min": 0, "night_min": 0}
    day_min = 0
    night_min = 0
    cursor = start
    while cursor < end:
        next_cursor = min(cursor + timedelta(minutes=1), end)
        local_hour = cursor.astimezone().hour
        minutes = int(round((next_cursor - cursor).total_seconds() / 60))
        if 7 <= local_hour < 19:
            day_min += minutes
        else:
            night_min += minutes
        cursor = next_cursor
    return {"day_min": day_min, "night_min": night_min}


def _collect_sample_notes(entries: list[dict], limit: int = 5) -> list[str]:
    notes: list[str] = []
    for entry in entries:
        note = entry.get("notes")
        if isinstance(note, str) and note.strip():
            notes.append(note.strip())
        if len(notes) >= limit:
            break
    return notes


def build_chat_prompt(
    question: str,
    entries: list[dict],
    facts: dict,
    since_utc: datetime,
    until_utc: datetime,
    window_label: str,
) -> str:
    template = _load_chat_prompt_template()
    return _render_chat_prompt_template(
        template,
        {
            "question": question,
            "window_label": window_label,
            "window_since_utc": since_utc.isoformat(),
            "window_until_utc": until_utc.isoformat(),
            "facts_json": json.dumps(facts, ensure_ascii=False, indent=2),
            "events_json": json.dumps(
                [_summarize_entry(entry) for entry in entries],
                ensure_ascii=False,
                indent=2,
            ),
        },
        str(_get_chat_prompt_path()),
    )


def _get_chat_prompt_path() -> Path:
    override = os.getenv(PROMPT_PATH_ENV_VAR)
    if override and override.strip():
        return Path(override.strip())
    return DEFAULT_PROMPT_PATH


def _load_chat_prompt_template() -> str:
    prompt_path = _get_chat_prompt_path()
    try:
        return prompt_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise LlmChatError(f"Unable to read AI chat prompt file: {prompt_path}", 500) from exc


def _render_chat_prompt_template(
    template_text: str,
    values: dict[str, str],
    prompt_source: str | None = None,
) -> str:
    try:
        return Template(template_text).substitute(values)
    except KeyError as exc:
        missing_key = exc.args[0]
        prompt_location = prompt_source or str(_get_chat_prompt_path())
        raise LlmChatError(
            f"Invalid AI chat prompt placeholder '{missing_key}' in {prompt_location}",
            500,
        ) from exc
    except ValueError as exc:
        prompt_location = prompt_source or str(_get_chat_prompt_path())
        raise LlmChatError(
            f"Invalid AI chat prompt template in {prompt_location}: {exc}",
            500,
        ) from exc


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


def _call_openai_chat(model: str, prompt: str, timeout_seconds: int) -> str:
    api_key = os.getenv("BABY_TRACKER_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise LlmChatError("OpenAI API key is not configured", 503)
    body = json.dumps(
        {
            "model": model,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You answer baby-tracker questions using supplied data in strict JSON."
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
        raise LlmChatError("OpenAI request timed out", 504) from exc
    except socket.timeout as exc:
        raise LlmChatError("OpenAI request timed out", 504) from exc
    except urllib_error.HTTPError as exc:
        raise LlmChatError(f"OpenAI returned HTTP {exc.code}", 502) from exc
    except urllib_error.URLError as exc:
        raise LlmChatError("OpenAI is unavailable", 503) from exc

    try:
        data = json.loads(raw)
        choices = data.get("choices") or []
        message = choices[0]["message"]
        content = message.get("content")
    except (json.JSONDecodeError, IndexError, KeyError, TypeError) as exc:
        raise LlmChatError("OpenAI returned malformed JSON", 502) from exc
    if not isinstance(content, str) or not content.strip():
        raise LlmChatError("OpenAI returned an empty answer", 502)
    return content.strip()


def parse_chat_answer(content: str) -> dict:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise LlmChatError("OpenAI returned invalid chat JSON", 502) from exc
    if not isinstance(data, dict):
        raise LlmChatError("OpenAI returned invalid chat JSON", 502)
    answer = _normalize_text(data.get("answer"), "answer")
    grounded_facts = _normalize_text_list(data.get("grounded_facts"), "grounded_facts")
    explanations_value = data.get("possible_explanations")
    if explanations_value is None:
        explanations_value = data.get("general_tips")
    possible_explanations = _normalize_text_list(
        explanations_value,
        "possible_explanations",
        required=False,
    )
    suggested_followups = _normalize_text_list(
        data.get("suggested_followups"),
        "suggested_followups",
        required=False,
    )
    return {
        "answer": answer,
        "grounded_facts": grounded_facts,
        "possible_explanations": possible_explanations,
        "suggested_followups": suggested_followups[:3],
    }


def _normalize_text(value: object, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise LlmChatError(f"OpenAI returned invalid {field}", 502)
    return value.strip()


def _normalize_text_list(
    value: object,
    field: str,
    required: bool = True,
) -> list[str]:
    if value is None and not required:
        return []
    if not isinstance(value, list):
        raise LlmChatError(f"OpenAI returned invalid {field}", 502)
    cleaned = [item.strip() for item in value if isinstance(item, str) and item.strip()]
    if required and not cleaned:
        raise LlmChatError(f"OpenAI returned empty {field}", 502)
    return cleaned


def render_chat_answer_markdown(structured_answer: dict) -> str:
    parts = [structured_answer["answer"]]
    if structured_answer["grounded_facts"]:
        parts.append("### From the tracker")
        parts.extend(f"- {item}" for item in structured_answer["grounded_facts"])
    if structured_answer["possible_explanations"]:
        parts.append("### What might explain it")
        parts.extend(f"- {item}" for item in structured_answer["possible_explanations"])
    return "\n\n".join(parts).strip()
