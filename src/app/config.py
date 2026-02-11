from dataclasses import dataclass
from pathlib import Path
import os


@dataclass(frozen=True)
class AppConfig:
    db_path: Path
    host: str
    port: int
    base_path: str
    discord_webhook_url: str | None
    tls_cert_path: Path | None
    tls_key_path: Path | None
    feed_due_poll_seconds: int
    home_kpis_poll_seconds: int


def load_config() -> AppConfig:
    db_path = Path(os.getenv("BABY_TRACKER_DB_PATH", "./data/baby-tracker.sqlite"))
    host = os.getenv("BABY_TRACKER_HOST", "0.0.0.0")
    port = int(os.getenv("BABY_TRACKER_PORT", "8000"))
    base_path = _normalize_base_path(os.getenv("BABY_TRACKER_BASE_PATH", ""))
    discord_webhook_url = os.getenv("BABY_TRACKER_DISCORD_WEBHOOK_URL")
    tls_cert_path_raw = os.getenv("BABY_TRACKER_TLS_CERT_PATH")
    tls_key_path_raw = os.getenv("BABY_TRACKER_TLS_KEY_PATH")
    tls_cert_path = Path(tls_cert_path_raw) if tls_cert_path_raw else None
    tls_key_path = Path(tls_key_path_raw) if tls_key_path_raw else None
    poll_raw = os.getenv("BABY_TRACKER_FEED_DUE_POLL_SECONDS", "60")
    try:
        feed_due_poll_seconds = int(poll_raw)
    except ValueError as exc:
        raise ValueError("BABY_TRACKER_FEED_DUE_POLL_SECONDS must be an integer") from exc
    kpis_raw = os.getenv("BABY_TRACKER_HOME_KPIS_POLL_SECONDS", "900")
    try:
        home_kpis_poll_seconds = int(kpis_raw)
    except ValueError as exc:
        raise ValueError(
            "BABY_TRACKER_HOME_KPIS_POLL_SECONDS must be an integer"
        ) from exc

    if (tls_cert_path is None) != (tls_key_path is None):
        raise ValueError(
            "Both BABY_TRACKER_TLS_CERT_PATH and BABY_TRACKER_TLS_KEY_PATH must be set"
        )
    if tls_cert_path and not tls_cert_path.exists():
        raise FileNotFoundError(f"TLS cert not found: {tls_cert_path}")
    if tls_key_path and not tls_key_path.exists():
        raise FileNotFoundError(f"TLS key not found: {tls_key_path}")
    return AppConfig(
        db_path=db_path,
        host=host,
        port=port,
        base_path=base_path,
        discord_webhook_url=discord_webhook_url,
        tls_cert_path=tls_cert_path,
        tls_key_path=tls_key_path,
        feed_due_poll_seconds=feed_due_poll_seconds,
        home_kpis_poll_seconds=home_kpis_poll_seconds,
    )


def _normalize_base_path(raw: str) -> str:
    raw = raw.strip()
    if not raw or raw == "/":
        return ""
    if not raw.startswith("/"):
        raw = f"/{raw}"
    return raw.rstrip("/")
