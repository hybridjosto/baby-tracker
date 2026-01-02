# Implementation Plan: Two-Click Baby Logging

**Branch**: `001-two-click-log` | **Date**: 2026-01-02 | **Spec**: /Users/josh/my-code/baby/specs/001-two-click-log/spec.md
**Input**: Feature specification from `/specs/001-two-click-log/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable a two-tap flow to log feed/poo events and view recent activity, backed by
local SQLite storage on the Raspberry Pi and privately accessible via Tailscale.

## Technical Context

**Language/Version**: Python 3.11  
**Primary Dependencies**: Flask (web), SQLite (embedded DB)  
**Storage**: SQLite with WAL mode, local file on RPi  
**Testing**: pytest  
**Target Platform**: Raspberry Pi OS (Linux), iOS Safari/Chrome mobile browsers  
**Project Type**: single  
**Performance Goals**: Home screen loads and quick-log actions complete in <2s on LAN  
**Constraints**: Two-tap logging, offline-tolerant retries, private-only access  
**Scale/Scope**: 2-5 caregivers, <100k entries over multi-year use

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- All data stored locally on the RPi and exposed only over Tailscale. PASS
- Logging flow is minimal with sensible defaults for one-hand use. PASS
- Storage uses a compact, append-only event log (SQLite or flat file). PASS
- App tolerates intermittent connectivity with safe retries/idempotency. PASS
- Dependencies and ops remain minimal with a clear backup/export path. PASS

**Post-design re-check**: PASS

## Project Structure

### Documentation (this feature)

```text
specs/001-two-click-log/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── routes/
│   ├── services/
│   └── storage/
├── web/
│   ├── static/
│   └── templates/
└── lib/

tests/
├── integration/
└── unit/
```

**Structure Decision**: Single project with a small server-rendered web UI and
minimal client-side JS, aligning with Operational Simplicity.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations.
