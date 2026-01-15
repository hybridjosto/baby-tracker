import re

USER_SLUG_RE = re.compile(r"^[a-z0-9-]{1,24}$")
ENTRY_TYPE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 /-]{0,31}$")


def validate_entry_type(value: str) -> None:
    if not isinstance(value, str):
        raise ValueError("type must be a non-empty string")
    trimmed = value.strip()
    if not trimmed:
        raise ValueError("type must be a non-empty string")
    if not ENTRY_TYPE_RE.match(trimmed):
        raise ValueError("type must use letters, numbers, spaces, / or -")


def validate_entry_payload(payload: dict, require_client_event: bool = False) -> dict:
    if "type" not in payload:
        raise ValueError("type is required")
    validate_entry_type(payload["type"])

    if require_client_event and not payload.get("client_event_id"):
        raise ValueError("client_event_id is required")

    if "amount_ml" in payload and payload["amount_ml"] is not None:
        if not isinstance(payload["amount_ml"], int) or payload["amount_ml"] < 0:
            raise ValueError("amount_ml must be a non-negative integer")

    if "expressed_ml" in payload and payload["expressed_ml"] is not None:
        if not isinstance(payload["expressed_ml"], int) or payload["expressed_ml"] < 0:
            raise ValueError("expressed_ml must be a non-negative integer")

    if "formula_ml" in payload and payload["formula_ml"] is not None:
        if not isinstance(payload["formula_ml"], int) or payload["formula_ml"] < 0:
            raise ValueError("formula_ml must be a non-negative integer")

    if "feed_duration_min" in payload and payload["feed_duration_min"] is not None:
        if (
            not isinstance(payload["feed_duration_min"], int)
            or payload["feed_duration_min"] < 0
        ):
            raise ValueError("feed_duration_min must be a non-negative integer")

    if "notes" in payload and payload["notes"] is not None:
        if not isinstance(payload["notes"], str):
            raise ValueError("notes must be a string")

    validated = dict(payload)
    if isinstance(validated.get("type"), str):
        validated["type"] = validated["type"].strip()
    return validated


def normalize_user_slug(value: str) -> str:
    if value is None:
        raise ValueError("user_slug is required")
    slug = value.strip().lower()
    if not USER_SLUG_RE.match(slug):
        raise ValueError("user_slug must be 1-24 chars: a-z, 0-9, hyphen")
    return slug
