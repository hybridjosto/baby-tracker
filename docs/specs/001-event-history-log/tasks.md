# Task Plan: 24h History Visualization & Log

**Feature**: 24h History Visualization & Log  
**Branch**: `001-event-history-log`  
**Spec**: `specs/001-event-history-log/spec.md`  
**Plan**: `specs/001-event-history-log/plan.md`

## Implementation Strategy

Start with the 24h chart on the homepage (P1) so the MVP delivers immediate
insight. Then add the separate log page (P2). Keep API changes minimal and reuse
existing entry data paths.

## Phase 1: Setup

- [x] T001 Review existing entry schema and routes for compatibility in `src/app/storage/schema.sql` and `src/app/routes/entries.py`

## Phase 2: Foundational

- [x] T002 Add API support for time-window filtering (since/until) in `src/app/routes/entries.py`
- [x] T003 Add service-layer filtering parameters in `src/app/services/entries.py`
- [x] T004 Add storage-layer time filtering in `src/app/storage/entries.py`
- [x] T005 [P] Add helper to compute 24h window bounds in `src/web/static/app.js`

## Phase 3: User Story 1 (P1) - 24h Timeline Overview

**Goal**: Show a rolling 24-hour visualization of feed/poo events on the homepage.

**Independent Test Criteria**: Opening `/{user}` renders a chart that includes only
entries within the last 24 hours and distinguishes feed vs poo events.

- [x] T006 [US1] Add chart container and legend to homepage template in `src/web/templates/index.html`
- [x] T007 [US1] Render a 24h SVG timeline chart from entries in `src/web/static/app.js`
- [x] T008 [US1] Add chart styling and layout rules in `src/web/templates/index.html`
- [x] T009 [US1] Wire homepage data load to request only last 24h entries in `src/web/static/app.js`

## Phase 4: User Story 2 (P2) - Scrollable Event Log

**Goal**: Provide a separate log page with a scrollable list of recent events.

**Independent Test Criteria**: Opening `/{user}/log` shows a scrollable list ordered
newest to oldest with timestamps and event type.

- [x] T010 [US2] Add log page route in `src/app/main.py`
- [x] T011 [US2] Create log page template with list container in `src/web/templates/log.html`
- [x] T012 [US2] Add log page data fetch and render logic in `src/web/static/app.js`
- [x] T013 [US2] Add scrollable log styles in `src/web/templates/log.html`
- [x] T014 [US2] Add homepage link to log page in `src/web/templates/index.html`

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T015 Ensure empty states for chart and log are user-friendly in `src/web/static/app.js`
- [x] T016 Update quickstart validation steps in `specs/001-event-history-log/quickstart.md`

## Dependencies

- Story 2 depends on Story 1 only for shared entry API changes (T002-T004).
- T006-T009 depend on T002-T005.
- T010-T014 depend on T002-T004.

## Parallel Execution Examples

- T005 can run in parallel with T002-T004.
- T006 and T014 can run in parallel once T002-T004 are done.
- T011 and T013 can run in parallel once T010 is complete.

## Validation

All tasks follow checklist format: `- [x] T### [P] [US#] Description with file path`.
