from src.app.services.push_subscriptions import (
    delete_push_subscription,
    get_push_subscription,
    list_push_subscriptions,
    save_push_subscription,
)
from src.app.storage.db import init_db


def test_save_push_subscription_replaces_same_user(tmp_path):
    db_path = str(tmp_path / "test.sqlite")
    init_db(db_path)

    save_push_subscription(
        db_path,
        user_slug="suz",
        subscription={
            "endpoint": "https://push.example.com/device-1",
            "keys": {"p256dh": "p256dh-1", "auth": "auth-1"},
        },
    )
    save_push_subscription(
        db_path,
        user_slug="suz",
        subscription={
            "endpoint": "https://push.example.com/device-2",
            "keys": {"p256dh": "p256dh-2", "auth": "auth-2"},
        },
    )

    subscription = get_push_subscription(db_path, "suz")
    assert subscription is not None
    assert subscription["endpoint"] == "https://push.example.com/device-2"
    assert len(list_push_subscriptions(db_path)) == 1


def test_save_push_subscription_moves_device_to_new_user(tmp_path):
    db_path = str(tmp_path / "test.sqlite")
    init_db(db_path)

    save_push_subscription(
        db_path,
        user_slug="suz",
        subscription={
            "endpoint": "https://push.example.com/device-1",
            "keys": {"p256dh": "p256dh-1", "auth": "auth-1"},
        },
    )
    save_push_subscription(
        db_path,
        user_slug="ivy",
        subscription={
            "endpoint": "https://push.example.com/device-1",
            "keys": {"p256dh": "p256dh-1", "auth": "auth-1"},
        },
    )

    assert get_push_subscription(db_path, "suz") is None
    subscription = get_push_subscription(db_path, "ivy")
    assert subscription is not None
    assert subscription["endpoint"] == "https://push.example.com/device-1"


def test_delete_push_subscription_removes_row(tmp_path):
    db_path = str(tmp_path / "test.sqlite")
    init_db(db_path)

    save_push_subscription(
        db_path,
        user_slug="suz",
        subscription={
            "endpoint": "https://push.example.com/device-1",
            "keys": {"p256dh": "p256dh-1", "auth": "auth-1"},
        },
    )

    assert delete_push_subscription(db_path, "suz") is True
    assert get_push_subscription(db_path, "suz") is None
