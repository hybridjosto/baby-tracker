from datetime import date, datetime, timezone

from src.app.storage.db import get_connection
from src.app.storage.feeding_goals import create_goal as repo_create_goal
from src.app.storage.feeding_goals import delete_goal as repo_delete_goal
from src.app.storage.feeding_goals import get_current_goal as repo_get_current_goal
from src.app.storage.feeding_goals import get_goal as repo_get_goal
from src.app.storage.feeding_goals import list_goals as repo_list_goals
from src.app.storage.feeding_goals import update_goal as repo_update_goal


class FeedingGoalNotFoundError(Exception):
    pass


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_goal_ml(value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("goal_ml must be a positive number")
    if not value or not float(value) > 0:
        raise ValueError("goal_ml must be a positive number")
    return float(value)


def _normalize_start_date(value: object) -> str:
    if value is None:
        return date.today().isoformat()
    if not isinstance(value, str):
        raise ValueError("start_date must be YYYY-MM-DD")
    trimmed = value.strip()
    if not trimmed:
        return date.today().isoformat()
    try:
        date.fromisoformat(trimmed)
    except ValueError as exc:
        raise ValueError("start_date must be YYYY-MM-DD") from exc
    return trimmed


def list_goals(db_path: str, limit: int = 50) -> list[dict]:
    safe_limit = max(1, min(limit, 200))
    with get_connection(db_path) as conn:
        return repo_list_goals(conn, safe_limit)


def get_current_goal(db_path: str) -> dict | None:
    with get_connection(db_path) as conn:
        return repo_get_current_goal(conn)


def create_goal(db_path: str, payload: dict) -> dict:
    if "goal_ml" not in payload:
        raise ValueError("goal_ml is required")
    fields = {
        "goal_ml": _normalize_goal_ml(payload["goal_ml"]),
        "start_date": _normalize_start_date(payload.get("start_date")),
        "created_at_utc": _now_utc_iso(),
    }
    with get_connection(db_path) as conn:
        return repo_create_goal(conn, fields)


def update_goal(db_path: str, goal_id: int, payload: dict) -> dict:
    fields: dict = {}
    if "goal_ml" in payload:
        fields["goal_ml"] = _normalize_goal_ml(payload["goal_ml"])
    if "start_date" in payload:
        fields["start_date"] = _normalize_start_date(payload["start_date"])
    with get_connection(db_path) as conn:
        existing = repo_get_goal(conn, goal_id)
        if not existing:
            raise FeedingGoalNotFoundError()
        updated = repo_update_goal(conn, goal_id, fields)
    if not updated:
        raise FeedingGoalNotFoundError()
    return updated


def delete_goal(db_path: str, goal_id: int) -> None:
    with get_connection(db_path) as conn:
        deleted = repo_delete_goal(conn, goal_id)
    if not deleted:
        raise FeedingGoalNotFoundError()
