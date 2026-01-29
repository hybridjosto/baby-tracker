from __future__ import annotations

import json
import logging
from urllib import request

from src.app.services.settings import get_settings

logger = logging.getLogger(__name__)


def send_entry_webhook(db_path: str, entry: dict) -> None:
    settings = get_settings(db_path)
    webhook_url = settings.get("entry_webhook_url")
    if not webhook_url:
        return
    payload = json.dumps(entry).encode("utf-8")
    req = request.Request(
        webhook_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=5):
            return None
    except Exception:
        logger.exception("Entry webhook delivery failed")
