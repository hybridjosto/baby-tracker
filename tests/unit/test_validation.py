import pytest

from src.lib.validation import validate_entry_type


def test_validate_entry_type_accepts_wee():
    validate_entry_type("wee")


@pytest.mark.parametrize("entry_type", ["feed", "poo"])
def test_validate_entry_type_accepts_known_types(entry_type):
    validate_entry_type(entry_type)


def test_validate_entry_type_rejects_invalid():
    with pytest.raises(ValueError, match="type must be feed, poo, or wee"):
        validate_entry_type("sleep")
