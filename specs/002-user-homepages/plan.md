# Implementation Plan: User Homepages & Bottom Actions

**Branch**: `002-user-homepages` | **Date**: 2026-01-02 | **Spec**: /Users/josh/my-code/baby/specs/002-user-homepages/spec.md
**Input**: Feature specification from `/specs/002-user-homepages/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add user-specific homepages (`/[user]`) so entries are attributed to a user slug,
and update the mobile UI to use large bottom-fixed action buttons for fast
one-hand logging.

## Technical Context

**Language/Version**: Python 3.12  
**Primary Dependencies**: Flask  
**Storage**: SQLite (local file)  
**Testing**: Manual smoke tests  
**Target Platform**: Raspberry Pi (Linux)  
**Project Type**: Web application (server-rendered HTML + JS)  
**Performance Goals**: Home page loads in under 1s on LAN; log actions complete
under 300ms local  
**Constraints**: Offline-tolerant, idempotent writes, minimal dependencies  
**Scale/Scope**: 2-5 caregivers, low daily volume, single-device hosting

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- All data stored locally on the RPi and exposed only over Tailscale.
- Logging flow is minimal with sensible defaults for one-hand use.
- Storage uses a compact, append-only event log (SQLite or flat file).
- App tolerates intermittent connectivity with safe retries/idempotency.
- Dependencies and ops remain minimal with a clear backup/export path.

## Project Structure

### Documentation (this feature)

```text
specs/002-user-homepages/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── routes/
│   │   └── entries.py
│   ├── services/
│   │   └── entries.py
│   └── storage/
│       ├── db.py
│       └── entries.py
├── lib/
│   ├── logging.py
│   └── validation.py
└── web/
    ├── templates/
    │   └── index.html
    └── static/
        └── app.js
```

**Structure Decision**: Single web app with Flask routes in `src/app` and a
lightweight HTML/JS UI in `src/web`.

## Post-Design Constitution Check

- User slug storage remains local in SQLite with no external services.
- UI still supports two-tap logging with large bottom actions.
- Entries remain append-only with idempotency keys for retries.
- No new dependencies beyond existing Flask stack.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
