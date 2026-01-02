VALID_TYPES = {"feed", "poo"}


def validate_entry_type(value: str) -> None:
    if value not in VALID_TYPES:
        raise ValueError("type must be feed or poo")


def validate_entry_payload(payload: dict, require_client_event: bool = False) -> dict:
    if "type" not in payload:
        raise ValueError("type is required")
    validate_entry_type(payload["type"])

    if require_client_event and not payload.get("client_event_id"):
        raise ValueError("client_event_id is required")

    if "amount_ml" in payload and payload["amount_ml"] is not None:
        if not isinstance(payload["amount_ml"], int) or payload["amount_ml"] < 0:
            raise ValueError("amount_ml must be a non-negative integer")

    if "notes" in payload and payload["notes"] is not None:
        if not isinstance(payload["notes"], str):
            raise ValueError("notes must be a string")

    return dict(payload)
