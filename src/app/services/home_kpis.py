from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
import logging
import math
import threading
import time
from urllib import request as urllib_request

from flask import Flask

from src.app.services.entries import get_next_feed_time, list_entries
from src.app.services.feeding_goals import get_current_goal
from src.app.services.settings import get_settings

BREASTFEED_IN_PROGRESS_NOTE = "Breastfeeding (started)"
logger = logging.getLogger(__name__)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _parse_utc(value: str | None) -> datetime | None:
    if not value:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    parsed = datetime.fromisoformat(cleaned)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _format_time_until(target: datetime | None, now: datetime) -> str:
    if not target:
        return "--"
    diff_seconds = (target - now).total_seconds()
    if diff_seconds <= 0:
        return "due now"
    diff_minutes = round(diff_seconds / 60)
    if diff_minutes < 60:
        return f"in {diff_minutes}m"
    hours = diff_minutes // 60
    minutes = diff_minutes % 60
    if minutes == 0:
        return f"in {hours}h"
    return f"in {hours}h {minutes}m"


def _format_ml(value: float | int | None) -> str:
    if value is None or not math.isfinite(value) or value <= 0:
        return "0 ml"
    rounded = round(value * 10) / 10
    if float(rounded).is_integer():
        return f"{int(rounded)} ml"
    return f"{rounded:.1f} ml"


def _compute_feed_total(entries: list[dict]) -> float:
    total = 0.0
    for entry in entries:
        if entry.get("notes") == BREASTFEED_IN_PROGRESS_NOTE:
            continue
        amount = entry.get("amount_ml")
        if isinstance(amount, (int, float)) and math.isfinite(amount):
            total += float(amount)
        expressed = entry.get("expressed_ml")
        if isinstance(expressed, (int, float)) and math.isfinite(expressed):
            total += float(expressed)
        formula = entry.get("formula_ml")
        if isinstance(formula, (int, float)) and math.isfinite(formula):
            total += float(formula)
    return total


def build_home_kpis(db_path: str, user_slug: str | None = None) -> dict:
    now = _now_utc()
    window_start = now - timedelta(hours=24)
    feeds = list_entries(
        db_path,
        limit=200,
        user_slug=user_slug,
        since_utc=window_start.isoformat(),
        until_utc=now.isoformat(),
        entry_type="feed",
    )
    feed_total_ml = _compute_feed_total(feeds)

    next_feed = get_next_feed_time(db_path, user_slug=user_slug)
    next_timestamp = _parse_utc(next_feed.get("timestamp_utc"))
    next_feed_text = _format_time_until(next_timestamp, now)

    current_goal = get_current_goal(db_path)
    goal_ml = current_goal.get("goal_ml") if current_goal else None
    if goal_ml is None:
        goal_value = None
    else:
        goal_value = float(goal_ml)
    goal_text = "--" if goal_value is None else _format_ml(goal_value)
    if goal_value and goal_value > 0:
        percent = round((feed_total_ml / goal_value) * 100)
        percent_text = f"{percent}%"
        goal_detail = f"{_format_ml(feed_total_ml)} / {goal_text}"
    else:
        percent_text = "--"
        goal_detail = "--"

    return {
        "content": "Homepage KPIs",
        "inputs": {
            "input0": f"Next feed due: {next_feed_text}",
            "input1": f"Feed total (24h): {_format_ml(feed_total_ml)}",
            "input2": f"Goal (24h): {goal_detail}",
            "input3": f"Goal % (24h): {percent_text}",
        },
    }


def _send_home_kpis(webhook_url: str, payload: dict) -> bool:
    data = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(
        webhook_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=5):
            return True
    except Exception:
        logger.exception("Home KPIs webhook delivery failed")
        return False


def dispatch_home_kpis(
    db_path: str,
    user_slug: str | None = None,
    send_fn=None,
) -> dict:
    settings = get_settings(db_path)
    webhook_url = settings.get("home_kpis_webhook_url")
    if not webhook_url:
        return {"sent": False, "reason": "missing_webhook_url"}
    payload = build_home_kpis(db_path, user_slug=user_slug)
    sender = send_fn or _send_home_kpis
    if sender(webhook_url, payload):
        return {"sent": True, "payload": payload}
    return {"sent": False, "reason": "push_failed"}


def start_home_kpis_scheduler(app: Flask, poll_seconds: int) -> None:
    if poll_seconds <= 0:
        return

    def _loop() -> None:
        while True:
            try:
                with app.app_context():
                    dispatch_home_kpis(app.config["DB_PATH"])
            except Exception:
                logger.exception("Home KPIs scheduler failed")
            time.sleep(poll_seconds)

    thread = threading.Thread(
        target=_loop,
        daemon=True,
        name="home-kpis-scheduler",
    )
    thread.start()
    app.extensions["home_kpis_scheduler"] = thread
