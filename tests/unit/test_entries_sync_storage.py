from datetime import datetime, timezone

from src.app.storage.db import get_connection, init_db
from src.app.storage.entries import (
    create_entry,
    delete_entry,
    list_entries_updated_since,
)


def test_list_entries_updated_since_includes_deleted(tmp_path):
    db_path = tmp_path / "entries.sqlite"
    init_db(str(db_path))

    now = datetime.now(timezone.utc).isoformat()
    with get_connection(str(db_path)) as conn:
        entry, _ = create_entry(
            conn,
            {
                "user_slug": "suz",
                "type": "feed",
                "timestamp_utc": now,
                "client_event_id": "evt-sync-1",
                "created_at_utc": now,
                "updated_at_utc": now,
            },
        )
        delete_entry(conn, entry["id"], now, now)

        results = list_entries_updated_since(conn, now, limit=10)

    assert len(results) == 1
    assert results[0]["client_event_id"] == "evt-sync-1"
    assert results[0]["deleted_at_utc"] is not None
