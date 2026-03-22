## Context

The backend (`sv-eutingen.de`) now exposes `GET /api/admin/news/subscribers?topic=General,Events,Fitness` which returns newsletter subscriber emails grouped by topic. The frontend needs a new admin tool to browse this data.

Existing patterns: API calls use `fetchJson<T>()` for GET requests with auth headers, pages live in `src/pages/actions/` using `<ActionsLayout>`, and sidebar nav entries come from `src/data/actions.json`.

## Goals / Non-Goals

**Goals:**

- Fetch and display newsletter subscribers by topic
- Follow existing UI/API conventions (Vuetify, fetchJson, ActionsLayout)
- Support selecting one or more topics to filter results

**Non-Goals:**

- Adding, removing, or editing subscribers (read-only view)
- Emailing newsletter subscribers (separate concern)
- Pagination (subscriber counts are expected to be manageable)

## Decisions

**1. Topic selection via Vuetify checkboxes**
Rationale: Multiple topics can be queried at once. Checkboxes are simpler than a dropdown for a small fixed set (3 items). Consistent with existing selection patterns in the app.

**2. Display as a simple Vuetify list/table**
Rationale: Read-only email list per topic. A grouped table (topic → emails) keeps it minimal without overengineering.

**3. Reuse `fetchJson` helper**
Rationale: Matches existing pattern for GET endpoints. Auth headers handled automatically via `getAuthHeaders()`.

## Risks / Trade-offs

- [Large subscriber lists] → Simple v-list; if performance becomes an issue, virtual scrolling can be added later
- [No subscriber count shown] → Add count per topic in the UI for quick overview
