## 1. Types and API

- [x] 1.1 Add `NewsTopic` enum to `src/types/index.ts` with values `General`, `Events`, `Fitness`
- [x] 1.2 Add `getNewsletterSubscribers(topics)` function to `src/api/index.ts` calling `GET /api/admin/news/subscribers?topic=...`

## 2. Page and UI

- [x] 2.1 Create `src/pages/actions/newsletter.vue` with topic checkboxes, fetch button, and subscriber list display
- [x] 2.2 Add `"Manage Newsletter"` entry to `src/data/actions.json`
