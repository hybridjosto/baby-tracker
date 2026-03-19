import pytest

from src.app.config import load_config
from src.app.main import _should_start_schedulers


def test_enable_schedulers_defaults_false(monkeypatch):
    monkeypatch.delenv("BABY_TRACKER_ENABLE_SCHEDULERS", raising=False)
    cfg = load_config()
    assert cfg.enable_schedulers is False


def test_enable_schedulers_parses_true(monkeypatch):
    monkeypatch.setenv("BABY_TRACKER_ENABLE_SCHEDULERS", "1")
    cfg = load_config()
    assert cfg.enable_schedulers is True


def test_enable_schedulers_invalid_value(monkeypatch):
    monkeypatch.setenv("BABY_TRACKER_ENABLE_SCHEDULERS", "maybe")
    with pytest.raises(ValueError, match="BABY_TRACKER_ENABLE_SCHEDULERS"):
        load_config()


def test_vapid_keys_must_be_configured_together(monkeypatch):
    monkeypatch.setenv("BABY_TRACKER_VAPID_PUBLIC_KEY", "public")
    monkeypatch.delenv("BABY_TRACKER_VAPID_PRIVATE_KEY", raising=False)
    monkeypatch.delenv("BABY_TRACKER_VAPID_SUBJECT", raising=False)
    with pytest.raises(ValueError, match="BABY_TRACKER_VAPID_PUBLIC_KEY"):
        load_config()


def test_vapid_subject_required_when_keys_present(monkeypatch):
    monkeypatch.setenv("BABY_TRACKER_VAPID_PUBLIC_KEY", "public")
    monkeypatch.setenv("BABY_TRACKER_VAPID_PRIVATE_KEY", "private")
    monkeypatch.delenv("BABY_TRACKER_VAPID_SUBJECT", raising=False)
    with pytest.raises(ValueError, match="BABY_TRACKER_VAPID_SUBJECT"):
        load_config()


def test_storage_backend_must_be_sqlite(monkeypatch):
    monkeypatch.setenv("BABY_TRACKER_STORAGE_BACKEND", "firestore")
    with pytest.raises(ValueError, match="BABY_TRACKER_STORAGE_BACKEND must be sqlite"):
        load_config()


def test_should_start_schedulers_checks_enable_flag(monkeypatch):
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    assert _should_start_schedulers(True) is True
    assert _should_start_schedulers(False) is False


def test_should_start_schedulers_disables_under_pytest(monkeypatch):
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "tests/unit/test_file.py::test_case")
    assert _should_start_schedulers(True) is False
