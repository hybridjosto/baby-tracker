import re

VALID_TYPES = {"feed", "poo", "wee"}
USER_SLUG_RE = re.compile(r"^[a-z0-9-]{1,24}$")


def validate_entry_type(value: str) -> None:
    if value not in VALID_TYPES:
        raise ValueError("type must be feed, poo, or wee")


def validate_entry_payload(payload: dict, require_client_event: bool = False) -> dict:
    if "type" not in payload:
        raise ValueError("type is required")
    validate_entry_type(payload["type"])

    if require_client_event and not payload.get("client_event_id"):
        raise ValueError("client_event_id is required")

    if "amount_ml" in payload and payload["amount_ml"] is not None:
        if not isinstance(payload["amount_ml"], int) or payload["amount_ml"] < 0:
            raise ValueError("amount_ml must be a non-negative integer")

    if "feed_duration_min" in payload and payload["feed_duration_min"] is not None:
        if (
            not isinstance(payload["feed_duration_min"], int)
            or payload["feed_duration_min"] < 0
        ):
            raise ValueError("feed_duration_min must be a non-negative integer")

    if "notes" in payload and payload["notes"] is not None:
        if not isinstance(payload["notes"], str):
            raise ValueError("notes must be a string")

    return dict(payload)


def normalize_user_slug(value: str) -> str:
    if value is None:
        raise ValueError("user_slug is required")
    slug = value.strip().lower()
    if not USER_SLUG_RE.match(slug):
        raise ValueError("user_slug must be 1-24 chars: a-z, 0-9, hyphen")
    return slug
