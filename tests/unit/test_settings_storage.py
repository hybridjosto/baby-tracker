from src.app.storage.db import get_connection, init_db
from src.app.storage.settings import get_settings


def test_settings_defaults_include_feed_size_defaults(tmp_path):
    db_path = tmp_path / "settings.sqlite"
    init_db(str(db_path))

    with get_connection(str(db_path)) as conn:
        settings = get_settings(conn)

    assert settings["feed_size_small_ml"] == 120.0
    assert settings["feed_size_big_ml"] == 150.0
    assert settings["ollama_base_url"] == "http://127.0.0.1:11434"
    assert settings["ollama_model"] == "gemma4"
    assert settings["ollama_timeout_seconds"] == 45


def test_settings_migrates_missing_feed_size_columns(tmp_path):
    db_path = tmp_path / "legacy.sqlite"

    with get_connection(str(db_path)) as conn:
        conn.execute(
            """
            CREATE TABLE baby_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                dob TEXT,
                feed_interval_min INTEGER,
                custom_event_types TEXT,
                updated_at_utc TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            INSERT INTO baby_settings (id, updated_at_utc)
            VALUES (1, datetime('now'))
            """
        )
        conn.commit()

    init_db(str(db_path))

    with get_connection(str(db_path)) as conn:
        settings = get_settings(conn)
        columns = {
            row["name"] for row in conn.execute("PRAGMA table_info(baby_settings)").fetchall()
        }

    assert "feed_size_small_ml" in columns
    assert "feed_size_big_ml" in columns
    assert "ollama_base_url" in columns
    assert "ollama_model" in columns
    assert "ollama_timeout_seconds" in columns
    assert settings["feed_size_small_ml"] == 120.0
    assert settings["feed_size_big_ml"] == 150.0
    assert settings["ollama_base_url"] == "http://127.0.0.1:11434"
    assert settings["ollama_model"] == "gemma4"
    assert settings["ollama_timeout_seconds"] == 45
