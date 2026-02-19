# Research: 24h History Visualization & Log

## Decision: Render a lightweight 24h chart with inline SVG and minimal JS

**Rationale**: Inline SVG is dependency-free, works offline, and is easy to render
within a server-rendered page while keeping bundle size tiny.

**Alternatives considered**:
- Canvas chart: more code complexity with similar outcomes.
- Third-party chart library: adds weight and external dependency risk.

## Decision: Filter to the last 24 hours using API query parameters

**Rationale**: Requesting only the relevant window keeps the payload small and
reduces client-side processing for low-power devices.

**Alternatives considered**:
- Client-only filtering of a large list: simpler API but more bandwidth and JS work.

## Decision: Provide a dedicated log page at `/{user}/log`

**Rationale**: Keeps the homepage focused on the quick-glance visualization while
still allowing a full scrollable history view.

**Alternatives considered**:
- Embedding the log on the homepage: risks clutter and slower load times.
