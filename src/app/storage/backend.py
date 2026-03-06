from functools import lru_cache
import os
from typing import Literal


StorageBackend = Literal["sqlite"]


@lru_cache(maxsize=1)
def get_storage_backend() -> StorageBackend:
    raw = os.getenv("BABY_TRACKER_STORAGE_BACKEND", "sqlite").strip().lower()
    if raw != "sqlite":
        raise ValueError("BABY_TRACKER_STORAGE_BACKEND must be sqlite")
    return "sqlite"


def is_sqlite_backend() -> bool:
    return True
