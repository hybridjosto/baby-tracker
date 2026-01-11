from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Protocol
from urllib import request


class Notifier(Protocol):
    def send(self, message: str) -> None: ...


def build_discord_payload(message: str) -> bytes:
    return json.dumps({"content": message}).encode("utf-8")


@dataclass(frozen=True)
class DiscordWebhookNotifier:
    webhook_url: str

    def send(self, message: str) -> None:
        payload = build_discord_payload(message)
        req = request.Request(
            self.webhook_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=10):
            return None
