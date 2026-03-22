## Why

The backend has added an admin endpoint to fetch newsletter subscribers by topic. The frontend needs a new tool to expose this data so administrators can view subscriber counts and email lists for General, Events, and Fitness topics.

## What Changes

- Add a new API function `getNewsletterSubscribers(topics)` that calls `GET /api/admin/news/subscribers?topic=...`
- Add a new action page at `/actions/newsletter` with topic selection and subscriber display
- Add navigation entry "Manage Newsletter" to the sidebar

## Capabilities

### New Capabilities

- `newsletter-subscribers`: Fetch and display newsletter subscribers filtered by topic (General, Events, Fitness)

### Modified Capabilities

- None

## Impact

- `src/api/index.ts` — new API function
- `src/types/index.ts` — new `NewsTopic` enum type
- `src/pages/actions/newsletter.vue` — new page (auto-routed)
- `src/data/actions.json` — new nav entry
