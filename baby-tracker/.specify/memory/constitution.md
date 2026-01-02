<!--
Sync Impact Report
- Version change: N/A → 1.0.0
- Modified principles: [PRINCIPLE_1_NAME] → Privacy-First Local Access; [PRINCIPLE_2_NAME] → Fast One-Hand Logging; [PRINCIPLE_3_NAME] → Space-Efficient Event Log; [PRINCIPLE_4_NAME] → Resilient Offline Operation; [PRINCIPLE_5_NAME] → Operational Simplicity
- Added sections: Data & Storage Standards; Delivery Workflow & Quality Gates
- Removed sections: None
- Templates requiring updates:
  - ✅ updated .specify/templates/plan-template.md
  - ✅ no change .specify/templates/spec-template.md
  - ✅ no change .specify/templates/tasks-template.md
  - ⚠ none found .specify/templates/commands/*.md
- Follow-up TODOs:
  - TODO(RATIFICATION_DATE): original adoption date not provided
-->
# Baby Tracker Constitution

## Core Principles

### Privacy-First Local Access
All data MUST be stored on the Raspberry Pi and only exposed over Tailscale.
No third-party analytics, telemetry, or external storage is permitted unless
explicitly approved and documented. Rationale: this is a family-only system
handling sensitive health data.

### Fast One-Hand Logging
Logging a feed or poo MUST be possible in a few taps with sensible defaults
(e.g., current time). The UI MUST avoid mandatory fields beyond event type,
so quick entries are possible during night or one-handed use. Rationale: ease
of use ensures consistent, accurate tracking.

### Space-Efficient Event Log
Events MUST be stored in a compact schema (SQLite or flat file) with an
append-only event log mindset. Data SHOULD avoid redundant duplication and
favor short enums/ints over verbose strings where feasible. Rationale: long
retention on low-power hardware needs predictable storage growth.

### Resilient Offline Operation
The app MUST tolerate intermittent connectivity between iPhones and the RPi,
with clear error handling and safe retries. Writes MUST be idempotent or
otherwise protected against duplicate submissions. Rationale: home Wi-Fi and
VPN connections are not always stable.

### Operational Simplicity
The system MUST remain low-maintenance: minimal dependencies, a simple deploy
story on the RPi, and straightforward backups/exports. Rationale: the system
should be maintainable by parents without a full DevOps workflow.

## Data & Storage Standards

- The canonical record is an event with type (feed/poo), timestamp, and
  optional attributes (amount, notes, tags).
- Time MUST be stored unambiguously (ISO 8601 with timezone or UTC epoch).
- Storage format MUST be documented and include a reliable export path (CSV
  or JSON) for portability.
- Data migrations MUST be explicit, reversible where possible, and run safely
  on the RPi.

## Delivery Workflow & Quality Gates

- Every feature plan MUST include a Constitution Check and call out any
  deviations with justification.
- Schema changes MUST include a migration plan and backup/restore notes.
- Any new dependency MUST be justified against the Operational Simplicity
  principle and documented.

## Governance

This constitution supersedes other development practices in this repository.
Amendments require updating this file, documenting impact, and bumping the
version using semantic versioning: MAJOR for incompatible governance changes,
MINOR for new principles/sections, PATCH for clarifications. Compliance is
reviewed during planning (spec/plan templates) and at merge time.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date not provided | **Last Amended**: 2026-01-02
