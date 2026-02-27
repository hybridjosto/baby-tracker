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


def test_should_start_schedulers_checks_enable_flag(monkeypatch):
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    assert _should_start_schedulers(True) is True
    assert _should_start_schedulers(False) is False


def test_should_start_schedulers_disables_under_pytest(monkeypatch):
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "tests/unit/test_file.py::test_case")
    assert _should_start_schedulers(True) is False
