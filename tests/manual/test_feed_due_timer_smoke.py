import os
from datetime import datetime, timedelta, timezone

import pytest

from src.app.services.entries import create_entry
from src.app.services.feed_due import dispatch_feed_due
from src.app.services.settings import update_settings
from src.app.storage.db import init_db


def _env_flag(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "y"}


def test_feed_due_timer_sends_pushcut(tmp_path):
    if not _env_flag("RUN_PUSHCUT_SMOKE"):
        pytest.skip("Set RUN_PUSHCUT_SMOKE=1 to send a real Pushcut notification.")

    pushcut_url = os.getenv("PUSHCUT_URL") or os.getenv("BABY_TRACKER_PUSHCUT_URL")
    if not pushcut_url:
        pytest.skip("Set PUSHCUT_URL to your Pushcut endpoint to run.")

    user_slug = os.getenv("BABY_TRACKER_USER_SLUG", "suz")
    feed_interval_min = int(os.getenv("BABY_TRACKER_FEED_INTERVAL_MIN", "60"))

    db_path = str(tmp_path / "test.sqlite")
    init_db(db_path)
    update_settings(
        db_path,
        {
            "feed_interval_min": feed_interval_min,
            "pushcut_feed_due_url": pushcut_url,
            "default_user_slug": user_slug,
        },
    )

    now = datetime.now(timezone.utc)
    last_feed_at = now - timedelta(minutes=feed_interval_min + 5)
    create_entry(
        db_path,
        {
            "type": "feed",
            "user_slug": user_slug,
            "formula_ml": 90,
            "client_event_id": f"manual-smoke-{int(now.timestamp())}",
            "timestamp_utc": last_feed_at.isoformat(),
        },
    )

    result = dispatch_feed_due(db_path, now_utc=now)
    assert result["sent"] is True, result
