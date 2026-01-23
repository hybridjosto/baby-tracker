# Offline Mode Sync Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Add offline-first logging with IndexedDB storage, background sync, and last-write-wins multi-device convergence.

**Architecture:** A service worker caches the app shell for offline launch. The client writes entries to IndexedDB and queues mutations in an outbox. A `/api/sync/entries` endpoint accepts batched changes and returns deltas since a cursor, using server-time last-write-wins and soft deletes.

**Tech Stack:** Flask, SQLite, vanilla JS, Service Worker, IndexedDB.

---

### Task 1: Add soft-delete + sync-friendly schema

**Files:**
- Modify: `src/app/storage/schema.sql`
- Modify: `src/app/storage/db.py`

**Step 1: Write the failing test**

```python
def test_delete_entry_marks_deleted(client):
    created = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-del-1"},
    ).get_json()

    response = client.delete(f"/api/entries/{created['id']}")
    assert response.status_code == 204

    entries = client.get("/api/entries").get_json()
    assert all(entry["id"] != created["id"] for entry in entries)
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/integration/test_entries_api.py::test_delete_entry_marks_deleted -v`  
Expected: FAIL because the test doesn't exist yet.

**Step 3: Write minimal implementation**

Update schema to include `deleted_at_utc` and an index on `updated_at_utc`:

```sql
ALTER TABLE entries ADD COLUMN deleted_at_utc TEXT;
CREATE INDEX IF NOT EXISTS idx_entries_updated_at_utc ON entries (updated_at_utc DESC);
```

Add a migration helper in `db.py`:

```python
def _ensure_entries_deleted_at_column(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(entries)")}
    if "deleted_at_utc" not in columns:
        conn.execute("ALTER TABLE entries ADD COLUMN deleted_at_utc TEXT")
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_entries_updated_at_utc ON entries (updated_at_utc DESC)"
    )
```

Call `_ensure_entries_deleted_at_column` from `init_db`.

**Step 4: Run test to verify it passes**

Run: `uv run pytest tests/integration/test_entries_api.py::test_delete_entry_marks_deleted -v`  
Expected: FAIL (still), because delete is not yet soft delete. We’ll fix in Task 2.

**Step 5: Commit**

```bash
git add src/app/storage/schema.sql src/app/storage/db.py
git commit -m "feat(db): add deleted_at support and updated_at index"
```

---

### Task 2: Update entry storage to respect soft delete

**Files:**
- Modify: `src/app/storage/entries.py`
- Modify: `src/app/services/entries.py`
- Modify: `tests/integration/test_entries_api.py`

**Step 1: Write the failing test**

Add a test that list endpoints exclude deleted entries and that delete is idempotent:

```python
def test_delete_entry_soft_delete_idempotent(client):
    created = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-del-2"},
    ).get_json()

    response = client.delete(f"/api/entries/{created['id']}")
    assert response.status_code == 204

    response = client.delete(f"/api/entries/{created['id']}")
    assert response.status_code == 404

    entries = client.get("/api/entries").get_json()
    assert all(entry["id"] != created["id"] for entry in entries)
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/integration/test_entries_api.py::test_delete_entry_soft_delete_idempotent -v`  
Expected: FAIL.

**Step 3: Write minimal implementation**

Update `list_entries` to exclude soft-deleted rows by default:

```python
if not include_deleted:
    clauses.append("deleted_at_utc IS NULL")
```

Update `get_entry` and `get_entry_by_client_event_id` to include `deleted_at_utc` in selects.

Update `delete_entry` to soft delete:

```python
cursor = conn.execute(
    "UPDATE entries SET deleted_at_utc = ?, updated_at_utc = ? WHERE id = ? AND deleted_at_utc IS NULL",
    (now, now, entry_id),
)
```

Update `services.delete_entry` to use the new soft delete, passing server `updated_at_utc = now`.

**Step 4: Run test to verify it passes**

Run: `uv run pytest tests/integration/test_entries_api.py::test_delete_entry_soft_delete_idempotent -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/storage/entries.py src/app/services/entries.py tests/integration/test_entries_api.py
git commit -m "feat(entries): soft delete entries"
```

---

### Task 3: Add sync storage helpers

**Files:**
- Modify: `src/app/storage/entries.py`
- Modify: `src/app/services/entries.py`
- Create: `tests/unit/test_entries_sync_storage.py`

**Step 1: Write the failing test**

```python
def test_list_entries_updated_since_includes_deleted(conn):
    # create entry, then soft delete, then list by updated_at
    ...
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/unit/test_entries_sync_storage.py -v`  
Expected: FAIL.

**Step 3: Write minimal implementation**

Add storage helpers:

```python
def list_entries_updated_since(conn, since_utc: str | None, limit: int = 500) -> list[dict]:
    clauses = ["updated_at_utc >= ?"] if since_utc else []
    params = [since_utc] if since_utc else []
    cursor = conn.execute(
        f"""
        SELECT id, user_slug, type, timestamp_utc, client_event_id, notes, amount_ml,
               expressed_ml, formula_ml, feed_duration_min, caregiver_id,
               created_at_utc, updated_at_utc, deleted_at_utc
        FROM entries
        {('WHERE ' + ' AND '.join(clauses)) if clauses else ''}
        ORDER BY updated_at_utc ASC
        LIMIT ?
        """,
        (*params, limit),
    )
    return [dict(row) for row in cursor.fetchall()]
```

Add an upsert helper by `client_event_id`:

```python
def upsert_entry_by_client_event_id(conn, payload: dict) -> dict:
    existing = get_entry_by_client_event_id(conn, payload["client_event_id"])
    if not existing:
        # insert new
        return create_entry(conn, payload)[0]
    fields = { ... }  # all mutable fields + updated_at_utc + deleted_at_utc
    return update_entry(conn, existing["id"], fields)
```

In service layer, expose `sync_entries` that:
1) applies incoming changes via upsert/delete
2) returns entries updated since the cursor (including deleted)
3) returns a new cursor (max updated_at_utc in result or now).

**Step 4: Run test to verify it passes**

Run: `uv run pytest tests/unit/test_entries_sync_storage.py -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/storage/entries.py src/app/services/entries.py tests/unit/test_entries_sync_storage.py
git commit -m "feat(sync): add storage helpers for sync"
```

---

### Task 4: Add sync API endpoint

**Files:**
- Modify: `src/app/routes/entries.py`
- Create: `tests/integration/test_entries_sync_api.py`

**Step 1: Write the failing test**

```python
def test_sync_push_and_pull_changes(client):
    payload = {
        "device_id": "dev-1",
        "cursor": None,
        "changes": [
            {
                "action": "upsert",
                "entry": {"type": "feed", "client_event_id": "evt-sync-1"},
            }
        ],
    }
    response = client.post("/api/sync/entries", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert "cursor" in data
    assert any(entry["client_event_id"] == "evt-sync-1" for entry in data["entries"])
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/integration/test_entries_sync_api.py -v`  
Expected: FAIL (endpoint missing).

**Step 3: Write minimal implementation**

Add a route:

```python
@entries_api.post("/sync/entries")
def sync_entries_route():
    payload = request.get_json(silent=True) or {}
    try:
        result = sync_entries(_db_path(), payload)
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
```

Define payload shape in `services.entries.sync_entries`:
- `device_id` required string
- `cursor` optional ISO string
- `changes`: list of `{"action": "upsert", "entry": {...}}` or `{"action": "delete", "client_event_id": "..."}`.

Return:
- `cursor`: max `updated_at_utc` after applying changes
- `entries`: list of entries updated since incoming cursor (including deleted_at_utc)

**Step 4: Run test to verify it passes**

Run: `uv run pytest tests/integration/test_entries_sync_api.py -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/routes/entries.py src/app/services/entries.py tests/integration/test_entries_sync_api.py
git commit -m "feat(api): add entries sync endpoint"
```

---

### Task 5: Add service worker + registration

**Files:**
- Create: `src/web/static/sw.js`
- Modify: `src/web/static/app.js`

**Step 1: Write the failing test**

No automated test; add a manual checklist to the PR description later.

**Step 2: Implement**

Add a minimal service worker that:
- pre-caches static assets (`/static/app.js`, `/static/styles.css`, `/static/manifest.json`, icons)
- network-first for HTML navigations (fallback to cache)
- cache-first for static assets

Register the service worker on `window.load` in `app.js`:

```js
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/static/sw.js");
  });
}
```

**Step 3: Manual check**

- Load app once online; then switch device to airplane mode and reload → app shell loads.

**Step 4: Commit**

```bash
git add src/web/static/sw.js src/web/static/app.js
git commit -m "feat(pwa): add service worker for offline shell"
```

---

### Task 6: Add IndexedDB storage + outbox

**Files:**
- Modify: `src/web/static/app.js`

**Step 1: Write the failing test**

No automated test; add a manual checklist later.

**Step 2: Implement**

Add IndexedDB helpers in `app.js`:
- `openDb()` opens DB `baby-tracker` v1
- Stores: `entries` (key `client_event_id`), `outbox` (auto id), `meta` (key)
- `getDeviceId()` generates and persists UUID in `meta`
- `getSyncCursor()` / `setSyncCursor()`
- `upsertEntryLocal(entry)` and `deleteEntryLocal(client_event_id)`
- `listEntriesLocal({sinceDays, type, limit})`
- `enqueueOutbox(change)`
- `drainOutbox()` returns queued changes

**Step 3: Manual check**

- Load app online, add an entry, reload → entry appears from IndexedDB.

**Step 4: Commit**

```bash
git add src/web/static/app.js
git commit -m "feat(offline): add IndexedDB storage and outbox"
```

---

### Task 7: Wire sync engine into UI flows

**Files:**
- Modify: `src/web/static/app.js`

**Step 1: Write the failing test**

No automated test; add a manual checklist later.

**Step 2: Implement**

Update entry flows:
- On app load, render from `listEntriesLocal` before network fetch.
- On `saveEntry`, always write to IndexedDB and enqueue outbox item; attempt network sync in background.
- On edit/delete actions, update IndexedDB + enqueue outbox.
- Add a `syncNow()` function that POSTs to `/api/sync/entries` with `device_id`, `cursor`, and `changes`.
- On successful sync, merge server entries into IndexedDB, advance cursor, and refresh UI.
- Add `window.addEventListener("online", syncNow)` and a periodic timer (e.g., every 60s while online).
- Update `setStatus` messages to show “Saved offline” and “Syncing…/Synced”.

**Step 3: Manual check**

- Go offline, add/edit/delete entries → UI updates immediately.
- Go back online → entries sync to server; second device sees changes after refresh.

**Step 4: Commit**

```bash
git add src/web/static/app.js
git commit -m "feat(offline): sync outbox with server"
```

---

### Task 8: Add docs and manual test checklist

**Files:**
- Modify: `README.md`

**Step 1: Write the failing test**

N/A.

**Step 2: Implement**

Add a short “Offline Mode” section describing:
- Works offline with last 30 days
- Auto-sync on reconnect
- Last-write-wins behavior
- How to clear app data if needed

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document offline mode behavior"
```

---

### Task 9: Full test run

**Step 1: Run full tests**

Run: `uv run pytest`  
Expected: PASS.

**Step 2: Commit**

No new code; no commit needed.

