# Task Plan: Wee Event Logging

**Feature**: Wee Event Logging  
**Branch**: `001-wee-events`  
**Spec**: `specs/001-wee-events/spec.md`  
**Plan**: `specs/001-wee-events/plan.md`

## Implementation Strategy

Add the wee event type end-to-end (validation, storage, API), then update the UI
for logging and display in the chart and log views.

## Phase 1: Setup

- [x] T001 Review existing entry type validation and storage constraints in `src/lib/validation.py` and `src/app/storage/schema.sql`

## Phase 2: Foundational

- [x] T002 Extend entry type validation to allow wee in `src/lib/validation.py`
- [x] T003 Update storage schema type check to include wee in `src/app/storage/schema.sql`
- [x] T004 [P] Ensure API documentation includes wee type in `specs/001-wee-events/contracts/openapi.yaml`

## Phase 3: User Story 1 (P1) - Log Wee Event

**Goal**: Allow a wee event to be logged with a single tap from the homepage.

**Independent Test Criteria**: Tapping the wee button creates a wee entry that
appears in the recent history and event log for the current user.

- [x] T005 [US1] Add a wee action button to the homepage in `src/web/templates/index.html`
- [x] T006 [US1] Wire wee button to create a wee entry in `src/web/static/app.js`
- [x] T007 [US1] Ensure wee entries are accepted by the create entry API in `src/app/services/entries.py`

## Phase 4: User Story 2 (P2) - Distinguish Wee Events

**Goal**: Show wee entries clearly in the homepage chart and log list.

**Independent Test Criteria**: Wee entries are labeled and visually distinct in
both the chart and the log list views.

- [x] T008 [US2] Add wee styling/legend entry for the chart in `src/web/templates/index.html`
- [x] T009 [US2] Render wee markers in the chart in `src/web/static/app.js`
- [x] T010 [US2] Render wee labels in the log list in `src/web/static/app.js`

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T011 Ensure empty-state messages mention wee where applicable in `src/web/static/app.js`
- [x] T012 Update quickstart validation steps in `specs/001-wee-events/quickstart.md`

## Dependencies

- T005-T007 depend on T002-T003.
- T008-T010 depend on T002-T003 and T005-T007.

## Parallel Execution Examples

- T002 and T003 can run in parallel.
- T004 can run in parallel with T002-T003.
- T008 and T010 can run in parallel once T005-T007 are done.

## Validation

All tasks follow checklist format: `- [x] T### [P] [US#] Description with file path`.
