import sys
import threading
from pathlib import Path

import pytest
from werkzeug.serving import make_server

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.app.main import create_app


@pytest.fixture()
def app(tmp_path, monkeypatch):
    db_path = tmp_path / "test.sqlite"
    monkeypatch.setenv("BABY_TRACKER_DB_PATH", str(db_path))
    monkeypatch.setenv("BABY_TRACKER_VAPID_PUBLIC_KEY", "test-public-key")
    monkeypatch.setenv("BABY_TRACKER_VAPID_PRIVATE_KEY", "test-private-key")
    monkeypatch.setenv("BABY_TRACKER_VAPID_SUBJECT", "mailto:test@example.com")
    app = create_app()
    app.config.update(TESTING=True)
    return app


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def live_server(app):
    try:
        server = make_server("127.0.0.1", 0, app, threaded=True)
    except (OSError, SystemExit) as exc:
        pytest.skip(f"Live server unavailable in this environment: {exc}")
    address = server.server_address
    host = address[0]
    port = address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://{host}:{port}"
    finally:
        server.shutdown()
        thread.join(timeout=5)
