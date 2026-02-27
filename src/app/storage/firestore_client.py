from __future__ import annotations

from functools import lru_cache
import os

from src.app.storage.backend import get_firestore_namespace

try:
    from google.cloud import firestore
except ImportError:  # pragma: no cover - exercised only when dependency missing
    firestore = None  # type: ignore[assignment]


def _require_firestore_module():
    if firestore is None:
        raise RuntimeError(
            "google-cloud-firestore is required for dual/firestore backends"
        )


@lru_cache(maxsize=1)
def get_client():
    _require_firestore_module()
    project = os.getenv("BABY_TRACKER_FIREBASE_PROJECT_ID") or None
    cred_path = os.getenv("BABY_TRACKER_FIREBASE_CREDENTIALS_PATH")
    if cred_path:
        os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", cred_path)
    return firestore.Client(project=project)  # type: ignore[union-attr]


def collection(name: str):
    client = get_client()
    namespace = get_firestore_namespace()
    if namespace:
        return (
            client.collection("app")
            .document(namespace)
            .collection(name)
        )
    return client.collection(name)


def next_counter(key: str) -> int:
    _require_firestore_module()
    client = get_client()
    counter_ref = collection("meta").document("counters")
    transactional = firestore.transactional  # type: ignore[union-attr]

    @transactional
    def _increment(transaction):
        snapshot = counter_ref.get(transaction=transaction)
        current = 0
        if snapshot.exists:
            data = snapshot.to_dict() or {}
            current = int(data.get(key, 0) or 0)
        next_value = current + 1
        transaction.set(counter_ref, {key: next_value}, merge=True)
        return next_value

    return _increment(client.transaction())
