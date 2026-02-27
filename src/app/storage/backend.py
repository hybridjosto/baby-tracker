from __future__ import annotations

from functools import lru_cache
import os
from typing import Literal


StorageBackend = Literal["sqlite", "dual", "firestore"]


@lru_cache(maxsize=1)
def get_storage_backend() -> StorageBackend:
    raw = os.getenv("BABY_TRACKER_STORAGE_BACKEND", "sqlite").strip().lower()
    if raw not in {"sqlite", "dual", "firestore"}:
        raise ValueError(
            "BABY_TRACKER_STORAGE_BACKEND must be one of: sqlite, dual, firestore"
        )
    return raw  # type: ignore[return-value]


@lru_cache(maxsize=1)
def get_firestore_namespace() -> str:
    return os.getenv("BABY_TRACKER_FIRESTORE_APP_NAMESPACE", "").strip().strip("/")


def is_sqlite_backend() -> bool:
    return get_storage_backend() == "sqlite"


def is_dual_backend() -> bool:
    return get_storage_backend() == "dual"


def is_firestore_backend() -> bool:
    return get_storage_backend() == "firestore"

