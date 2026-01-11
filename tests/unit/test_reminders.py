from datetime import datetime, timedelta, timezone

from src.app.services.notifications import build_discord_payload
from src.app.services.reminders import dispatch_due_reminders
from src.app.storage.db import get_connection, init_db
from src.app.storage.reminders import list_reminders


class RecorderNotifier:
    def __init__(self) -> None:
        self.messages: list[str] = []

    def send(self, message: str) -> None:
        self.messages.append(message)


def test_init_db_seeds_default_reminders(tmp_path):
    db_path = tmp_path / "test.sqlite"
    init_db(str(db_path))

    with get_connection(str(db_path)) as conn:
        reminders = list_reminders(conn)

    assert len(reminders) == 2
    assert reminders[0]["kind"] == "nappy"
    assert reminders[1]["kind"] == "food"
    assert reminders[0]["interval_min"] == 180
    assert reminders[1]["interval_min"] == 180


def test_dispatch_due_reminders_updates_schedule(tmp_path):
    db_path = tmp_path / "test.sqlite"
    init_db(str(db_path))
    now = datetime(2024, 1, 1, tzinfo=timezone.utc)

    with get_connection(str(db_path)) as conn:
        reminders = list_reminders(conn)
        due_id = reminders[0]["id"]
        due_at = (now - timedelta(minutes=1)).isoformat()
        conn.execute(
            "UPDATE reminders SET next_due_at_utc = ? WHERE id = ?",
            (due_at, due_id),
        )
        conn.commit()

    notifier = RecorderNotifier()
    dispatched = dispatch_due_reminders(str(db_path), notifier, now_utc=now)

    assert len(dispatched) == 1
    assert len(notifier.messages) == 1

    with get_connection(str(db_path)) as conn:
        reminder = [
            row for row in list_reminders(conn) if row["id"] == due_id
        ][0]

    assert reminder["last_sent_at_utc"] == now.isoformat()
    assert reminder["next_due_at_utc"] == (
        now + timedelta(minutes=reminder["interval_min"])
    ).isoformat()


def test_build_discord_payload_sets_content():
    payload = build_discord_payload("hello")
    assert b"hello" in payload
