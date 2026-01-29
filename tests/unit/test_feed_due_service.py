from datetime import datetime, timezone

from src.app.services.entries import create_entry
from src.app.services.feed_due import dispatch_feed_due
from src.app.services.settings import update_settings
from src.app.storage.db import init_db


def _setup_feed(db_path: str) -> None:
    init_db(db_path)
    update_settings(
        db_path,
        {
            "feed_interval_min": 60,
            "pushcut_feed_due_url": "https://pushcut.example.com/feed",
            "default_user_slug": "suz",
        },
    )
    create_entry(
        db_path,
        {
            "type": "feed",
            "user_slug": "suz",
            "formula_ml": 90,
            "client_event_id": "feed-1",
            "timestamp_utc": "2026-01-01T00:00:00+00:00",
        },
    )


def test_dispatch_feed_due_sends_once(tmp_path):
    db_path = str(tmp_path / "test.sqlite")
    _setup_feed(db_path)

    calls = []

    def sender(url, payload):
        calls.append((url, payload))
        return True

    now = datetime(2026, 1, 1, 1, 1, tzinfo=timezone.utc)
    result = dispatch_feed_due(db_path, now_utc=now, send_fn=sender)
    assert result["sent"] is True
    assert len(calls) == 1

    repeat = dispatch_feed_due(db_path, now_utc=now, send_fn=sender)
    assert repeat["sent"] is False
    assert repeat["reason"] == "already_sent"
    assert len(calls) == 1


def test_dispatch_feed_due_not_due(tmp_path):
    db_path = str(tmp_path / "test.sqlite")
    _setup_feed(db_path)

    def sender(url, payload):
        raise AssertionError("should not send when not due")

    early = datetime(2026, 1, 1, 0, 30, tzinfo=timezone.utc)
    result = dispatch_feed_due(db_path, now_utc=early, send_fn=sender)
    assert result["sent"] is False
    assert result["reason"] == "not_due"


def test_dispatch_feed_due_missing_pushcut(tmp_path):
    db_path = str(tmp_path / "test.sqlite")
    init_db(db_path)
    update_settings(db_path, {"feed_interval_min": 60})

    def sender(url, payload):
        raise AssertionError("should not send without pushcut url")

    now = datetime(2026, 1, 1, 1, 1, tzinfo=timezone.utc)
    result = dispatch_feed_due(db_path, now_utc=now, send_fn=sender)
    assert result["sent"] is False
    assert result["reason"] == "missing_pushcut_url"
