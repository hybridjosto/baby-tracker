import math
import re
import unicodedata

USER_SLUG_RE = re.compile(r"^[a-z0-9-]{1,24}$")


def _is_allowed_entry_type_char(char: str) -> bool:
    if char in {" ", "/", "-", "\u200d", "\ufe0f"}:
        return True
    category = unicodedata.category(char)
    if category[0] in {"L", "N"}:
        return True
    return category in {"So", "Sk"}


def _is_non_negative_number(value: object) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and value >= 0
    )


def validate_entry_type(value: str) -> None:
    if not isinstance(value, str):
        raise ValueError("type must be a non-empty string")
    trimmed = value.strip()
    if not trimmed:
        raise ValueError("type must be a non-empty string")
    if len(trimmed) > 32 or not all(
        _is_allowed_entry_type_char(char) for char in trimmed
    ):
        raise ValueError("type must use letters, numbers, spaces, /, -, or emoji")


def validate_entry_payload(payload: dict, require_client_event: bool = False) -> dict:
    if "type" not in payload:
        raise ValueError("type is required")
    validate_entry_type(payload["type"])

    if require_client_event and not payload.get("client_event_id"):
        raise ValueError("client_event_id is required")

    if "amount_ml" in payload and payload["amount_ml"] is not None:
        if not _is_non_negative_number(payload["amount_ml"]):
            raise ValueError("amount_ml must be a non-negative number")

    if "expressed_ml" in payload and payload["expressed_ml"] is not None:
        if not _is_non_negative_number(payload["expressed_ml"]):
            raise ValueError("expressed_ml must be a non-negative number")

    if "formula_ml" in payload and payload["formula_ml"] is not None:
        if not _is_non_negative_number(payload["formula_ml"]):
            raise ValueError("formula_ml must be a non-negative number")

    if "feed_duration_min" in payload and payload["feed_duration_min"] is not None:
        if not _is_non_negative_number(payload["feed_duration_min"]):
            raise ValueError("feed_duration_min must be a non-negative number")

    if "notes" in payload and payload["notes"] is not None:
        if not isinstance(payload["notes"], str):
            raise ValueError("notes must be a string")

    if "weight_kg" in payload and payload["weight_kg"] is not None:
        if not _is_non_negative_number(payload["weight_kg"]):
            raise ValueError("weight_kg must be a non-negative number")

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
