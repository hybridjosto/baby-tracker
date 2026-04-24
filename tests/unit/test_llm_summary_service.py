from datetime import datetime, timezone

import pytest

from src.app.services.llm_summary import (
    LlmSummaryError,
    _build_prompt,
    _get_prompt_path,
    _load_prompt_template,
    _render_prompt_template,
)


def test_load_prompt_template_uses_default_file():
    template = _load_prompt_template()

    assert "Selected day UTC window: $selected_day_since_utc to $selected_day_until_utc." in template
    assert _get_prompt_path().name == "llm_summary_prompt.txt"


def test_load_prompt_template_honors_env_override(tmp_path, monkeypatch):
    prompt_path = tmp_path / "custom_prompt.txt"
    prompt_path.write_text("Window $selected_day_since_utc -> $selected_day_until_utc", encoding="utf-8")
    monkeypatch.setenv("BABY_TRACKER_LLM_SUMMARY_PROMPT_PATH", str(prompt_path))

    template = _load_prompt_template()

    assert template == "Window $selected_day_since_utc -> $selected_day_until_utc"
    assert _get_prompt_path() == prompt_path


def test_load_prompt_template_raises_clear_error_for_missing_file(monkeypatch, tmp_path):
    missing_path = tmp_path / "missing_prompt.txt"
    monkeypatch.setenv("BABY_TRACKER_LLM_SUMMARY_PROMPT_PATH", str(missing_path))

    with pytest.raises(LlmSummaryError) as exc_info:
        _load_prompt_template()

    assert str(exc_info.value) == f"Unable to read AI summary prompt file: {missing_path}"
    assert exc_info.value.status_code == 500


def test_render_prompt_template_raises_clear_error_for_unknown_placeholder(
    monkeypatch, tmp_path
):
    prompt_path = tmp_path / "bad_prompt.txt"
    monkeypatch.setenv("BABY_TRACKER_LLM_SUMMARY_PROMPT_PATH", str(prompt_path))

    with pytest.raises(LlmSummaryError) as exc_info:
        _render_prompt_template("Hello $unknown_placeholder", {"selected_day_since_utc": "x"})

    assert (
        str(exc_info.value)
        == f"Invalid AI summary prompt placeholder 'unknown_placeholder' in {prompt_path}"
    )
    assert exc_info.value.status_code == 500


def test_build_prompt_renders_from_override_file(tmp_path, monkeypatch):
    prompt_path = tmp_path / "prompt.txt"
    prompt_path.write_text(
        (
            "Window $selected_day_since_utc -> $selected_day_until_utc\n"
            "Stats $selected_day_stats_json\n"
            "Events $selected_day_events_json\n"
            "Compare $comparison_days_json\n"
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("BABY_TRACKER_LLM_SUMMARY_PROMPT_PATH", str(prompt_path))
    since_utc = datetime(2024, 1, 1, tzinfo=timezone.utc)
    until_utc = datetime(2024, 1, 1, 23, 59, 59, tzinfo=timezone.utc)

    prompt = _build_prompt(
        all_entries=[
            {
                "type": "feed",
                "timestamp_utc": "2024-01-01T08:00:00+00:00",
                "user_slug": "suz",
                "amount_ml": 90,
                "notes": "settled afterwards",
            }
        ],
        selected_entries=[
            {
                "type": "feed",
                "timestamp_utc": "2024-01-01T08:00:00+00:00",
                "user_slug": "suz",
                "amount_ml": 90,
                "notes": "settled afterwards",
            }
        ],
        since_utc=since_utc,
        until_utc=until_utc,
    )

    assert "Window 2024-01-01T00:00:00+00:00 -> 2024-01-01T23:59:59+00:00" in prompt
    assert '"total_feed_ml": 90.0' in prompt
    assert '"amount_ml": 90' in prompt
    assert "Compare [" in prompt
