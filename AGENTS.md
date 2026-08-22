# SVE Tools

Vue 3 + TypeScript + Vite admin dashboard for events and bookings. Pinia, Vuetify, file-based Vue Router.

## Commands

```bash
bun run dev          # dev server
bun run build        # type-check + lint + format + build
bun run build-only   # build only
bun run type-check
bun run lint         # oxlint
bun run format       # oxfmt
bun run release      # version bump
```

No test framework configured; use Vitest if adding tests.

## Style

- No semicolons, single quotes, 2 spaces, 100 char width, no trailing commas
- Strict TypeScript; prefer `interface`
- Vue Composition API with `ref`/`computed`
- Components PascalCase; files camelCase for TS; types PascalCase; stores/composables `use` prefix
- Use `@/` alias for local imports
- Icons from `@mdi/js`
- Client env vars use `VITE_` prefix

## Project structure

```
src/
├── api/           # API functions (src/api/index.ts)
├── assets/
├── components/    # auto-imported
├── data/
├── pages/         # file-based routes
├── stores/        # Pinia
├── types/
└── utils/
```

## API / errors

- Use `fetchJson<T>()` helper; auth via `getAuthHeaders()`; 401/403 via `handleAuthError()`
- Recoverable failures return `null`; throw only for unrecoverable errors
- Use `useNotifyStore()` for user-facing errors

## Authentication

JWT in `localStorage`. Router redirects to `/` when unauthenticated.

## Git

- Always use conventional commits: `type(scope): summary`, type one of `feat fix chore refactor perf test docs style build ci`. Summary: imperative, ≤ 72 chars, no period.
- Body states what changed and why in short plain sentences. No filler or bloat.
- Commit closes an issue/ticket → end the body with `closes #<issue>`.
- One logical change per commit. Lint/format before committing, push the branch afterwards.

## Agent skills

### Issue tracker

Issues live as GitHub issues in `mseele/sve-tools`; external PRs are **not** a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default canonical label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo: expect `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
