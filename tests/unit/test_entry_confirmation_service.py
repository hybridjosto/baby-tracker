from datetime import timedelta, timezone

from src.app.services import entry_confirmation as confirmation_module
from src.app.services.entries import create_entry


def test_build_local_day_windows_uses_server_local_midnight(monkeypatch):
    monkeypatch.setattr(
        confirmation_module,
        "_get_server_timezone",
        lambda: timezone(timedelta(hours=1)),
    )

    today_window, yesterday_window = confirmation_module._build_local_day_windows(
        "2026-04-27T10:30:00+00:00"
    )

    assert today_window[0].isoformat() == "2026-04-26T23:00:00+00:00"
    assert today_window[1].isoformat() == "2026-04-27T10:30:00+00:00"
    assert yesterday_window[0].isoformat() == "2026-04-25T23:00:00+00:00"
    assert yesterday_window[1].isoformat() == "2026-04-26T10:30:00+00:00"


def test_build_local_day_windows_handles_near_midnight_anchor(monkeypatch):
    monkeypatch.setattr(
        confirmation_module,
        "_get_server_timezone",
        lambda: timezone(timedelta(hours=1)),
    )

    today_window, yesterday_window = confirmation_module._build_local_day_windows(
        "2026-04-27T23:30:00+00:00"
    )

    assert today_window[0].isoformat() == "2026-04-27T23:00:00+00:00"
    assert today_window[1].isoformat() == "2026-04-27T23:30:00+00:00"
    assert yesterday_window[0].isoformat() == "2026-04-26T23:00:00+00:00"
    assert yesterday_window[1].isoformat() == "2026-04-26T23:30:00+00:00"


def test_calculate_feed_comparison_totals_sums_all_feed_fields_and_skips_placeholder(
    app, monkeypatch
):
    monkeypatch.setattr(confirmation_module, "_get_server_timezone", lambda: timezone.utc)
    db_path = app.config["DB_PATH"]

    create_entry(
        db_path,
        {
            "type": "feed",
            "client_event_id": "feed-today-1",
            "user_slug": "suz",
            "timestamp_utc": "2026-04-27T08:00:00+00:00",
            "amount_ml": 20,
            "expressed_ml": 30,
            "formula_ml": 40,
        },
    )
    create_entry(
        db_path,
        {
            "type": "feed",
            "client_event_id": "feed-today-placeholder",
            "user_slug": "suz",
            "timestamp_utc": "2026-04-27T09:00:00+00:00",
            "amount_ml": 500,
            "notes": "Breastfeeding (started)",
        },
    )
    create_entry(
        db_path,
        {
            "type": "feed",
            "client_event_id": "feed-yesterday-1",
            "user_slug": "suz",
            "timestamp_utc": "2026-04-26T07:30:00+00:00",
            "amount_ml": 10,
            "expressed_ml": 5,
            "formula_ml": 15,
        },
    )
    create_entry(
        db_path,
        {
            "type": "feed",
            "client_event_id": "feed-today-other-user",
            "user_slug": "rob",
            "timestamp_utc": "2026-04-27T09:30:00+00:00",
            "amount_ml": 25,
        },
    )
    create_entry(
        db_path,
        {
            "type": "feed",
            "client_event_id": "feed-yesterday-other-user",
            "user_slug": "rob",
            "timestamp_utc": "2026-04-26T08:30:00+00:00",
            "formula_ml": 12,
        },
    )

    today_total, yesterday_total = confirmation_module.calculate_feed_comparison_totals(
        db_path,
        "suz",
        "2026-04-27T10:00:00+00:00",
    )

    assert today_total == 115.0
    assert yesterday_total == 42.0


def test_calculate_sleep_comparison_totals_clips_overnight_sleep(monkeypatch, app):
    monkeypatch.setattr(confirmation_module, "_get_server_timezone", lambda: timezone.utc)
    db_path = app.config["DB_PATH"]

    create_entry(
        db_path,
        {
            "type": "sleep",
            "client_event_id": "sleep-yesterday-cross-midnight",
            "user_slug": "suz",
            "timestamp_utc": "2026-04-26T23:30:00+00:00",
            "feed_duration_min": 120,
        },
    )
    create_entry(
        db_path,
        {
            "type": "sleep",
            "client_event_id": "sleep-today-morning",
            "user_slug": "suz",
            "timestamp_utc": "2026-04-27T07:00:00+00:00",
            "feed_duration_min": 45,
        },
    )
    create_entry(
        db_path,
        {
            "type": "sleep",
            "client_event_id": "sleep-other-user-today",
            "user_slug": "rob",
            "timestamp_utc": "2026-04-27T06:30:00+00:00",
            "feed_duration_min": 15,
        },
    )

    today_minutes, yesterday_minutes = (
        confirmation_module.calculate_sleep_comparison_totals(
            db_path,
            "suz",
            "2026-04-27T08:00:00+00:00",
        )
    )

    assert today_minutes == 150
    assert yesterday_minutes == 0


def test_calculate_sleep_comparison_totals_uses_same_time_yesterday_and_skips_active_sleep(
    monkeypatch, app
):
    monkeypatch.setattr(confirmation_module, "_get_server_timezone", lambda: timezone.utc)
    db_path = app.config["DB_PATH"]

    create_entry(
        db_path,
        {
            "type": "sleep",
            "client_event_id": "sleep-yesterday-1",
            "user_slug": "suz",
            "timestamp_utc": "2026-04-26T01:00:00+00:00",
            "feed_duration_min": 90,
        },
    )
    create_entry(
        db_path,
        {
            "type": "sleep",
            "client_event_id": "sleep-yesterday-2",
            "user_slug": "suz",
            "timestamp_utc": "2026-04-26T04:30:00+00:00",
            "feed_duration_min": 45,
        },
    )
    create_entry(
        db_path,
        {
            "type": "sleep",
            "client_event_id": "sleep-today-active",
            "user_slug": "suz",
            "timestamp_utc": "2026-04-27T03:00:00+00:00",
            "feed_duration_min": None,
        },
    )
    create_entry(
        db_path,
        {
            "type": "sleep",
            "client_event_id": "sleep-other-user-yesterday",
            "user_slug": "rob",
            "timestamp_utc": "2026-04-26T02:30:00+00:00",
            "feed_duration_min": 20,
        },
    )

    today_minutes, yesterday_minutes = (
        confirmation_module.calculate_sleep_comparison_totals(
            db_path,
            "suz",
            "2026-04-27T05:00:00+00:00",
        )
    )

    assert today_minutes == 0
    assert yesterday_minutes == 140
