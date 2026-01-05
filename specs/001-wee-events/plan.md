# Implementation Plan: Wee Event Logging

**Branch**: `001-wee-events` | **Date**: 2026-01-03 | **Spec**: /Users/josh/my-code/baby/specs/001-wee-events/spec.md
**Input**: Feature specification from `/specs/001-wee-events/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a wee event type to the logging flow so users can record wee alongside feed
and poo, and ensure it appears in the chart and log views.

## Technical Context

**Language/Version**: Python 3.12  
**Primary Dependencies**: Flask  
**Storage**: SQLite (local file)  
**Testing**: Manual smoke tests  
**Target Platform**: Raspberry Pi (Linux)  
**Project Type**: Web application (server-rendered HTML + JS)  
**Performance Goals**: Logging completes in under 300ms on LAN  
**Constraints**: Offline-tolerant, minimal dependencies, low-resource host  
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
specs/001-wee-events/
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
│   ├── routes/
│   │   └── entries.py
│   ├── services/
│   │   └── entries.py
│   └── storage/
│       ├── db.py
│       └── entries.py
├── lib/
│   └── validation.py
└── web/
    ├── templates/
    │   ├── index.html
    │   └── log.html
    └── static/
        └── app.js
```

**Structure Decision**: Single web app with Flask routes in `src/app` and a
lightweight HTML/JS UI in `src/web`.

## Post-Design Constitution Check

- Data remains local in SQLite with wee entries stored alongside others.
- UI additions keep the one-hand logging flow intact.
- No new dependencies beyond existing Flask and browser-native rendering.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
