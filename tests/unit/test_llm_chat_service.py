from datetime import datetime, timezone

import pytest

from src.app.services.llm_chat import (
    LlmChatError,
    _render_chat_prompt_template,
    _resolve_chat_window,
    build_chat_facts,
    build_chat_prompt,
    parse_chat_answer,
)


def test_resolve_last_night_window_before_8am_uses_previous_overnight():
    now = datetime(2026, 5, 14, 6, 30, tzinfo=timezone.utc)

    window = _resolve_chat_window(
        {"question": "How did last night's sleep go?"},
        now=now,
    )

    assert window["label"] == "last night"
    assert window["since_utc"] == datetime(2026, 5, 12, 18, tzinfo=timezone.utc)
    assert window["until_utc"] == datetime(2026, 5, 13, 8, tzinfo=timezone.utc)


def test_resolve_today_preset_uses_local_day_start_to_now():
    now = datetime(2026, 5, 14, 12, 15, tzinfo=timezone.utc)

    window = _resolve_chat_window(
        {"question": "What stood out?", "preset_window": "today"},
        now=now,
    )

    assert window["label"] == "today"
    assert window["since_utc"] == datetime(2026, 5, 14, tzinfo=timezone.utc)
    assert window["until_utc"] == now


def test_resolve_custom_window_rejects_reversed_dates():
    with pytest.raises(ValueError) as exc_info:
        _resolve_chat_window(
            {
                "question": "How was sleep?",
                "since_utc": "2026-05-14T08:00:00+00:00",
                "until_utc": "2026-05-14T07:00:00+00:00",
            }
        )

    assert str(exc_info.value) == "since_utc must be before until_utc"


def test_build_chat_facts_summarizes_sleep_feeds_and_nappies():
    since_utc = datetime(2026, 5, 14, tzinfo=timezone.utc)
    until_utc = datetime(2026, 5, 15, tzinfo=timezone.utc)

    facts = build_chat_facts(
        [
            {
                "type": "sleep",
                "timestamp_utc": "2026-05-14T01:00:00+00:00",
                "feed_duration_min": 180,
                "notes": "settled",
            },
            {
                "type": "feed",
                "timestamp_utc": "2026-05-14T05:00:00+00:00",
                "formula_ml": 90,
            },
            {
                "type": "feed",
                "timestamp_utc": "2026-05-14T08:00:00+00:00",
                "expressed_ml": 60,
            },
            {"type": "wee", "timestamp_utc": "2026-05-14T09:00:00+00:00"},
            {"type": "poo", "timestamp_utc": "2026-05-14T10:00:00+00:00"},
        ],
        since_utc,
        until_utc,
    )

    assert facts["event_count"] == 5
    assert facts["sleep"]["total_hours"] == 3.0
    assert facts["sleep"]["longest_stretch_hours"] == 3.0
    assert facts["sleep"]["night_hours"] == 3.0
    assert facts["feed"]["count"] == 2
    assert facts["feed"]["total_ml"] == 150.0
    assert facts["feed"]["average_interval_min"] == 180.0
    assert facts["nappies"] == {"wee": 1, "poo": 1, "total": 2}
    assert facts["sample_notes"] == ["settled"]


def test_build_chat_facts_handles_empty_data():
    facts = build_chat_facts(
        [],
        datetime(2026, 5, 14, tzinfo=timezone.utc),
        datetime(2026, 5, 15, tzinfo=timezone.utc),
    )

    assert facts["event_count"] == 0
    assert facts["feed"]["average_interval_min"] is None
    assert facts["sleep"]["total_hours"] == 0
    assert facts["nappies"]["total"] == 0


@pytest.mark.parametrize(
    ("wake_count", "expected_many_wakes"),
    [(2, False), (3, True), (4, True)],
)
def test_build_chat_facts_flags_many_overnight_wakes_at_three_events(
    wake_count,
    expected_many_wakes,
):
    since_utc = datetime(2026, 5, 13, 18, tzinfo=timezone.utc)
    until_utc = datetime(2026, 5, 14, 8, tzinfo=timezone.utc)
    entries = [
        {
            "type": "sleep",
            "timestamp_utc": "2026-05-13T19:00:00+00:00",
            "feed_duration_min": 45,
        }
    ]
    entries.extend(
        {
            "type": "feed",
            "timestamp_utc": f"2026-05-13T{20 + index:02d}:00:00+00:00",
            "formula_ml": 60,
        }
        for index in range(wake_count)
    )

    facts = build_chat_facts(entries, since_utc, until_utc)

    assert facts["sleep"]["overnight_wake_count"] == wake_count
    assert facts["sleep"]["many_overnight_wakes"] is expected_many_wakes
    assert bool(facts["sleep"]["likely_explanation_signals"]) is expected_many_wakes


@pytest.mark.parametrize(
    ("current_ml", "comparison_ml", "expected_direction"),
    [
        (660, 500, "increased"),
        (520, 500, "similar"),
        (420, 500, "decreased"),
        (500, None, "unknown"),
    ],
)
def test_build_chat_facts_reports_feed_volume_trend(
    current_ml,
    comparison_ml,
    expected_direction,
):
    since_utc = datetime(2026, 5, 14, tzinfo=timezone.utc)
    until_utc = datetime(2026, 5, 15, tzinfo=timezone.utc)
    comparison_entries = []
    if comparison_ml is not None:
        comparison_entries = [
            {
                "type": "feed",
                "timestamp_utc": "2026-05-13T08:00:00+00:00",
                "formula_ml": comparison_ml,
            }
        ]

    facts = build_chat_facts(
        [
            {
                "type": "feed",
                "timestamp_utc": "2026-05-14T08:00:00+00:00",
                "formula_ml": current_ml,
            }
        ],
        since_utc,
        until_utc,
        comparison_entries=comparison_entries,
    )

    assert facts["feed"]["trend"]["direction"] == expected_direction


def test_build_chat_prompt_renders_supported_placeholders():
    prompt = build_chat_prompt(
        "How was sleep?",
        [{"type": "sleep", "timestamp_utc": "2026-05-14T01:00:00+00:00"}],
        {"event_count": 1},
        datetime(2026, 5, 14, tzinfo=timezone.utc),
        datetime(2026, 5, 15, tzinfo=timezone.utc),
        "today",
    )

    assert "Question: How was sleep?" in prompt
    assert "Window: today" in prompt
    assert "Always report sleep durations in hours, not minutes." in prompt
    assert "Do not include generic parenting tips" in prompt
    assert '"event_count": 1' in prompt
    assert '"type": "sleep"' in prompt


def test_render_chat_prompt_template_reports_unknown_placeholder():
    with pytest.raises(LlmChatError) as exc_info:
        _render_chat_prompt_template("Hello $missing", {"question": "x"}, "test prompt")

    assert str(exc_info.value) == "Invalid AI chat prompt placeholder 'missing' in test prompt"
    assert exc_info.value.status_code == 500


def test_parse_chat_answer_requires_structured_json():
    answer = parse_chat_answer(
        """
        {
          "answer": "Sleep looked settled.",
          "grounded_facts": ["There were 2 sleep entries."],
          "possible_explanations": ["More feeds than usual may have contributed."],
          "suggested_followups": ["How were feeds?"]
        }
        """
    )

    assert answer["answer"] == "Sleep looked settled."
    assert answer["grounded_facts"] == ["There were 2 sleep entries."]
    assert answer["possible_explanations"] == ["More feeds than usual may have contributed."]
    assert answer["suggested_followups"] == ["How were feeds?"]
