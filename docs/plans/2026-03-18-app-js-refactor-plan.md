# `app.js` Gradual Refactor Plan

- Date: 2026-03-18
- Scope: `src/web/static/app.js` and the templates that depend on it
- Goal: split the current all-in-one frontend runtime into small modules without breaking the current multi-page, footer-driven app shell

## Why this plan exists

- `src/web/static/app.js` currently owns bootstrap, page routing, quick logging, offline sync, page-specific rendering, and shared UI state.
- Most pages load the same script via `data-page` and optional DOM nodes, so seemingly local changes can break unrelated pages.
- The safest path is extraction by seam, starting with pure helpers and shared services before moving page modules.

## Current responsibility map

1. App bootstrap and shared shell
   - Theme, nav menu, status messages, user selection, service worker, shared links.
2. Quick logging footer
   - Feed/nappy/misc menus, breastfeeding timer, timed-event timer, manual ml entry.
3. Data and sync
   - IndexedDB cache, outbox, sync cursor/device id, periodic sync, offline fallbacks.
4. Shared entry workflows
   - Build/save/edit/delete entry flows, edit modal, current-page refresh.
5. Page renderers and handlers
   - Home, log, summary, timeline, calendar, settings, goals, bottles, milk-express.

## Constraints to preserve

- Keep the current page templates working while refactoring incrementally.
- Preserve `data-page`, `data-user`, `data-user-valid`, and `data-base-path` bootstrap behavior from templates.
- Preserve `logging_footer.html` as a shared partial until footer behavior has its own stable module.
- Avoid a big-bang rewrite; every step should leave the app runnable.

## Target module layout

```text
src/web/static/app/
  main.js
  core/
    config.js
    state.js
    dom.js
    formatters.js
    dates.js
    status.js
    routing.js
  data/
    api.js
    indexeddb.js
    sync.js
  shared/
    theme.js
    nav.js
    user-session.js
    quick-log.js
    timed-events.js
    edit-entry-modal.js
  pages/
    home.js
    log.js
    summary.js
    timeline.js
    calendar.js
    calendar-form.js
    settings.js
    goals.js
    bottles.js
    milk-express.js
```

## State to centralize early

### App/session state

- `activeUser`
- `userValid`
- `pageType`
- `logFilterType`
- `logWindowHours`
- `basePath`

### Settings/domain state

- `babyDob`
- `feedIntervalMinutes`
- `feedSizeSmallMl`
- `feedSizeBigMl`
- `customEventTypes`
- `activeFeedingGoal`

### Sync/cache state

- `syncInFlight`
- `syncTimerId`
- prune flags
- timeline paging state
- summary datasets
- ruler datasets
- bottle cache
- milk-express ledger state

### UI ephemeral state

- modal state
- menu open state
- ticker ids
- page init flags

## Safest extraction order

### Phase 1: Pure utilities

- Move constants, regexes, date helpers, formatting helpers, and non-DOM pure calculators first.
- Candidate examples: time formatting, date window helpers, feed total helpers, chart utility helpers.
- Validation: existing pages still work with imports re-exported through `main.js`.

### Phase 2: Config and centralized state

- Introduce `core/config.js` for body dataset bootstrap and constants.
- Introduce `core/state.js` for mutable shared state instead of many top-level globals.
- Keep public getters/setters thin so the rest of the code can migrate gradually.

### Phase 3: Data layer

- Extract fetch wrappers to `data/api.js`.
- Extract IndexedDB/outbox/meta helpers to `data/indexeddb.js`.
- Extract `syncNow()` and scheduling into `data/sync.js`.
- Keep current entry flows calling the same interface during transition.

### Phase 4: Shared shell/UI modules

- Extract theme and nav first; they have narrow, mostly template-stable dependencies.
- Extract status messaging into a tiny helper rather than direct `statusEl` writes.
- Extract quick-log footer behavior only after state and data interfaces are stable.

### Phase 5: Shared entry workflows

- Extract entry payload builders, save/update/delete flows, and edit modal.
- This reduces duplication across home/log/timeline and makes later page splits safer.

### Phase 6: Page modules

- Recommended order:
  1. `calendar.js`
  2. `calendar-form.js`
  3. `settings.js`
  4. `goals.js`
  5. `bottles.js`
  6. `milk-express.js`
  7. `timeline.js`
  8. `log.js`
  9. `summary.js`
  10. `home.js`
- Leave `home.js` for last because it shares the most derived state with next-feed planning, goals, latest-entry rendering, and charts.

## Coupling hazards to watch

### `applyUserState()` is a hidden app router

- It currently gates controls, hydrates timers, initializes pages, and triggers page loads.
- Risk: extracting one page without replacing this orchestration can silently skip hydration or shared setup.

### Footer behavior is shared across many templates

- `logging_footer.html` is included on home, log, summary, timeline, calendar, and milk-express pages.
- Risk: changing footer assumptions can break pages that only partially use its controls.

### Edit modal markup is duplicated

- The edit modal appears in multiple templates.
- Risk: behavior and markup drift if JS is extracted but templates are not normalized.
- Follow-up candidate: convert duplicated modal markup into a shared partial once JS extraction settles.

### Settings affect multiple pages indirectly

- `loadBabySettings()` updates custom event types, feed intervals, feed sizes, age display, and next-feed calculations.
- Risk: page modules may accidentally cache stale settings if they read copied values instead of central state.

### Summary and home share feed-derived calculations

- Feed totals, daily goals, next-feed predictions, and rolling windows overlap heavily.
- Risk: duplicated selectors/calculations diverge if extracted twice instead of shared.

## First implementation slice

1. Create `core/config.js`, `core/state.js`, `core/dates.js`, and `core/formatters.js`.
2. Move pure helpers and constants into those modules.
3. Keep `src/web/static/app.js` as the entrypoint that imports and re-exports behavior.
4. Verify all pages still load before any page-specific extraction.
5. Then extract `theme.js`, `nav.js`, and `status.js`.

## Definition of done for the refactor

- `src/web/static/app.js` becomes a thin bootstrap file.
- Shared services are imported rather than relying on top-level mutable globals.
- Each page has a page module with one public `init...` entrypoint.
- Shared footer, edit modal, sync, and settings logic are each owned by dedicated modules.
- Templates keep the same runtime behavior, or any required template changes are consolidated and documented.

## Suggested checkpoints

- Checkpoint 1: pure helpers extracted
- Checkpoint 2: central state + config extracted
- Checkpoint 3: sync/indexeddb extracted
- Checkpoint 4: shared shell/footer extracted
- Checkpoint 5: low-risk pages extracted
- Checkpoint 6: home/log/summary extracted and `app.js` reduced to bootstrap
