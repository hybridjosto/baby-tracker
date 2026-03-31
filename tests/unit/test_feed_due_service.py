from datetime import datetime, timezone

from src.app.services.entries import create_entry
from src.app.services.feed_due import dispatch_feed_due
from src.app.services.push_subscriptions import (
    VapidConfig,
    get_push_subscription,
    save_push_subscription,
)
from src.app.services.settings import update_settings
from src.app.storage.db import init_db


VAPID_CONFIG = VapidConfig(
    public_key="test-public-key",
    private_key="test-private-key",
    subject="mailto:test@example.com",
)


def _setup_feed(db_path: str, *, user_slug: str = "suz") -> None:
    init_db(db_path)
    update_settings(
        db_path,
        {
            "feed_interval_min": 60,
            "default_user_slug": user_slug,
        },
    )
    save_push_subscription(
        db_path,
        user_slug=user_slug,
        subscription={
            "endpoint": f"https://push.example.com/{user_slug}",
            "keys": {"p256dh": f"p256dh-{user_slug}", "auth": f"auth-{user_slug}"},
        },
    )
    create_entry(
        db_path,
        {
            "type": "feed",
            "user_slug": user_slug,
            "formula_ml": 90,
            "client_event_id": f"feed-{user_slug}",
            "timestamp_utc": "2026-01-01T00:00:00+00:00",
        },
    )


def test_dispatch_feed_due_waits_until_repeat_window(tmp_path):
    db_path = str(tmp_path / "test.sqlite")
    _setup_feed(db_path)

    calls = []

    def sender(subscription, payload, vapid_config):
        calls.append((subscription, payload, vapid_config.subject))
        return {"sent": True}

    now = datetime(2026, 1, 1, 1, 1, tzinfo=timezone.utc)
    result = dispatch_feed_due(
        db_path,
        vapid_config=VAPID_CONFIG,
        now_utc=now,
        send_fn=sender,
    )
    assert result["sent"] is True
    assert result["users"] == ["suz"]
    assert len(calls) == 1

    repeat = dispatch_feed_due(
        db_path,
        vapid_config=VAPID_CONFIG,
        now_utc=now,
        send_fn=sender,
    )
    assert repeat["sent"] is False
    assert repeat["reason"] == "already_sent"
    assert len(calls) == 1


def test_dispatch_feed_due_repeats_after_feed_interval(tmp_path):
    db_path = str(tmp_path / "test.sqlite")
    _setup_feed(db_path)

    calls = []

    def sender(subscription, payload, vapid_config):
        calls.append((subscription["user_slug"], payload["tag"], vapid_config.subject))
        return {"sent": True}

    first_due = datetime(2026, 1, 1, 1, 1, tzinfo=timezone.utc)
    first = dispatch_feed_due(
        db_path,
        vapid_config=VAPID_CONFIG,
        now_utc=first_due,
        send_fn=sender,
    )
    assert first["sent"] is True

    still_waiting = dispatch_feed_due(
        db_path,
        vapid_config=VAPID_CONFIG,
        now_utc=datetime(2026, 1, 1, 1, 30, tzinfo=timezone.utc),
        send_fn=sender,
    )
    assert still_waiting["sent"] is False
    assert still_waiting["reason"] == "already_sent"

    second = dispatch_feed_due(
        db_path,
        vapid_config=VAPID_CONFIG,
        now_utc=datetime(2026, 1, 1, 2, 2, tzinfo=timezone.utc),
        send_fn=sender,
    )
    assert second["sent"] is True
    assert second["users"] == ["suz"]
    assert len(calls) == 2


def test_dispatch_feed_due_not_due(tmp_path):
    db_path = str(tmp_path / "test.sqlite")
    _setup_feed(db_path)

    def sender(subscription, payload, vapid_config):
        raise AssertionError("should not send when not due")

    early = datetime(2026, 1, 1, 0, 30, tzinfo=timezone.utc)
    result = dispatch_feed_due(
        db_path,
        vapid_config=VAPID_CONFIG,
        now_utc=early,
        send_fn=sender,
    )
    assert result["sent"] is False
    assert result["reason"] == "not_due"


def test_dispatch_feed_due_missing_subscription(tmp_path):
    db_path = str(tmp_path / "test.sqlite")
    init_db(db_path)
    update_settings(db_path, {"feed_interval_min": 60})

    def sender(subscription, payload, vapid_config):
        raise AssertionError("should not send without a subscription")

    now = datetime(2026, 1, 1, 1, 1, tzinfo=timezone.utc)
    result = dispatch_feed_due(
        db_path,
        vapid_config=VAPID_CONFIG,
        now_utc=now,
        send_fn=sender,
    )
    assert result["sent"] is False
    assert result["reason"] == "missing_subscription"


def test_dispatch_feed_due_clears_invalid_subscription(tmp_path):
    db_path = str(tmp_path / "test.sqlite")
    _setup_feed(db_path)

    def sender(subscription, payload, vapid_config):
        return {"sent": False, "reason": "invalid_subscription"}

    now = datetime(2026, 1, 1, 1, 1, tzinfo=timezone.utc)
    result = dispatch_feed_due(
        db_path,
        vapid_config=VAPID_CONFIG,
        now_utc=now,
        send_fn=sender,
    )
    assert result["sent"] is False
    assert result["reason"] == "invalid_subscription"
    assert get_push_subscription(db_path, "suz") is None


def test_dispatch_feed_due_checks_each_subscribed_user(tmp_path):
    db_path = str(tmp_path / "test.sqlite")
    _setup_feed(db_path, user_slug="suz")
    _setup_feed(db_path, user_slug="ivy")

    calls = []

    def sender(subscription, payload, vapid_config):
        calls.append(subscription["user_slug"])
        return {"sent": True}

    now = datetime(2026, 1, 1, 1, 1, tzinfo=timezone.utc)
    result = dispatch_feed_due(
        db_path,
        vapid_config=VAPID_CONFIG,
        now_utc=now,
        send_fn=sender,
    )
    assert result["sent"] is True
    assert calls == ["ivy", "suz"]
