from dataclasses import dataclass
from pathlib import Path
import os


@dataclass(frozen=True)
class AppConfig:
    db_path: Path
    storage_backend: str
    firebase_project_id: str | None
    firebase_credentials_path: Path | None
    app_shared_secret: str | None
    allow_insecure_local: bool
    host: str
    port: int
    base_path: str
    static_version: str
    discord_webhook_url: str | None
    tls_cert_path: Path | None
    tls_key_path: Path | None
    feed_due_poll_seconds: int
    home_kpis_poll_seconds: int


def load_config() -> AppConfig:
    db_path = Path(os.getenv("BABY_TRACKER_DB_PATH", "./data/baby-tracker.sqlite"))
    storage_backend = os.getenv("BABY_TRACKER_STORAGE_BACKEND", "sqlite").strip().lower()
    if storage_backend not in {"sqlite", "dual", "firestore"}:
        raise ValueError(
            "BABY_TRACKER_STORAGE_BACKEND must be one of: sqlite, dual, firestore"
        )
    firebase_project_id = os.getenv("BABY_TRACKER_FIREBASE_PROJECT_ID")
    firebase_credentials_path_raw = os.getenv("BABY_TRACKER_FIREBASE_CREDENTIALS_PATH")
    firebase_credentials_path = (
        Path(firebase_credentials_path_raw) if firebase_credentials_path_raw else None
    )
    app_shared_secret = os.getenv("BABY_TRACKER_APP_SHARED_SECRET")
    allow_insecure_local = _parse_bool_env(
        "BABY_TRACKER_ALLOW_INSECURE_LOCAL",
        default=False,
    )
    host = os.getenv("BABY_TRACKER_HOST", "0.0.0.0")
    port = int(os.getenv("BABY_TRACKER_PORT", "8000"))
    base_path = _normalize_base_path(os.getenv("BABY_TRACKER_BASE_PATH", ""))
    static_version = os.getenv("BABY_TRACKER_STATIC_VERSION", "dev")
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
    if firebase_credentials_path and not firebase_credentials_path.exists():
        raise FileNotFoundError(
            f"Firebase credentials not found: {firebase_credentials_path}"
        )
    if storage_backend in {"dual", "firestore"} and not app_shared_secret:
        raise ValueError(
            "BABY_TRACKER_APP_SHARED_SECRET is required when storage backend is dual/firestore"
        )
    return AppConfig(
        db_path=db_path,
        storage_backend=storage_backend,
        firebase_project_id=firebase_project_id,
        firebase_credentials_path=firebase_credentials_path,
        app_shared_secret=app_shared_secret,
        allow_insecure_local=allow_insecure_local,
        host=host,
        port=port,
        base_path=base_path,
        static_version=static_version,
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
