from dataclasses import dataclass
from pathlib import Path
import os


@dataclass(frozen=True)
class AppConfig:
    db_path: Path
    host: str
    port: int
    discord_webhook_url: str | None


def load_config() -> AppConfig:
    db_path = Path(os.getenv("BABY_TRACKER_DB_PATH", "./data/baby-tracker.sqlite"))
    host = os.getenv("BABY_TRACKER_HOST", "0.0.0.0")
    port = int(os.getenv("BABY_TRACKER_PORT", "8000"))
    discord_webhook_url = os.getenv("BABY_TRACKER_DISCORD_WEBHOOK_URL")
    return AppConfig(
        db_path=db_path,
        host=host,
        port=port,
        discord_webhook_url=discord_webhook_url,
    )
