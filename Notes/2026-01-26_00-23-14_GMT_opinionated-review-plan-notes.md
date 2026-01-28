# Opinionated Senior-Dev Take (Baby Tracker)

- Date: 2026-01-26 00:23:14 GMT
- Repo: /home/josh/baby-tracker
- Context: Project started simple; features added as needed; no full end-to-end design upfront.

## What’s good (preserve)
- Clear layering: routes → services → storage; validation centralized.
- Local-first PWA with background sync is a good domain fit.
- SQLite is appropriate; pragmatic DB initialization/migrations.

## Seams showing
- Inconsistent contracts across layers (client vs server timestamps, partial payloads).
- Reminders route references non-existent service functions; blueprint not registered.
- `main.py` does too much (app init + UI routes + helpers); scaling risk.
- Sync has weak scoping and limited safeguards as data grows.

## Design debt likely to bite
- User scoping bug: `/api/users/<user_slug>/entries` does not actually filter by user.
- Dict-heavy data model; validation drift likely without typed models.
- Ad-hoc migrations (`_ensure_*`) will become fragile as schema evolves.

## Opinionated take
- It’s a solid pragmatic product, but now in “product territory.”
- Without refactoring, next features will cost much more and increase bug risk.

## Candidate plan directions (for later)
1) **Define canonical models** for Entry/Settings/Goal (dataclass or Pydantic). Use consistently across service/storage layers.
2) **Normalize API contracts** (who owns timestamps; how deletes work; user scoping enforced server-side).
3) **Introduce lightweight migrations** (schema versioning table, explicit migrations) to replace `_ensure_*` drift.
4) **Tighten sync semantics** (per-user scoping, pagination/limits, conflict policy explicit).

## Open questions to resolve before planning
- Do we trust client timestamps or server timestamps?
- Is multi-user in-scope, or just multiple slugs on one local device?
- Is background sync required for all entry types, or can some be online-only?
- Are reminders intended as a first-class feature, or is that unfinished?
