import pytest

from src.lib.validation import validate_entry_type


@pytest.mark.parametrize("entry_type", ["feed", "poo", "wee", "room/body temp"])
def test_validate_entry_type_accepts_known_types(entry_type):
    validate_entry_type(entry_type)


def test_validate_entry_type_rejects_empty():
    with pytest.raises(ValueError, match="type must be a non-empty string"):
        validate_entry_type("")


def test_validate_entry_type_rejects_invalid_chars():
    with pytest.raises(ValueError, match="type must use letters, numbers, spaces, / or -"):
        validate_entry_type("temp!*")
