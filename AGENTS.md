# SVE Tools - Agent Guidelines

## Project Overview

Vue 3 + TypeScript + Vite admin dashboard for managing events and bookings. Uses Pinia for state management, Vuetify for UI, and Vue Router with file-based auto-routing.

## Build & Development Commands

```bash
# Development server
bun run dev

# Production build (runs type-check, lint, format, then build)
bun run build

# Build without checks
bun run build-only

# Type checking
bun run type-check

# Linting (oxlint)
bun run lint

# Code formatting (oxfmt)
bun run format

# Release with version bump
bun run release
```

**Note**: No test framework is currently configured. If adding tests, use Vitest and follow the existing patterns in `src/**/__tests__/*`.

## Code Style Guidelines

### Formatting (oxfmt / Prettier)

- **No semicolons** (`semi: false`)
- **Single quotes** for strings
- **2-space indentation** (no tabs)
- **100 character** print width
- **No trailing commas**

### TypeScript

- Use strict TypeScript with explicit types on exports
- Prefer `interface` over `type` for object shapes
- Use `const` assertions for literal values when needed
- Leverage auto-imported Vue APIs (`ref`, `computed`, etc.)

### Vue Components

```vue
<script setup lang="ts">
// 1. External imports first
import { mdiPlus } from '@mdi/js'
import { cloneDeep } from 'lodash-es'

// 2. Vue/Vuetify imports (auto-imported, but explicit is OK)
import { computed, ref } from 'vue'

// 3. Local imports (use @/ alias)
import { EventType } from '@/types'

// 4. Props/Emits with explicit types
defineProps<{
  eventType: EventType
}>()

defineEmits<{
  new: [event: Event]
}>()
</script>

<template>
  <!-- Use Vuetify components with kebab-case -->
  <v-card>
    <v-card-title>Title</v-card-title>
  </v-card>
</template>
```

### Naming Conventions

- **Components**: PascalCase (e.g., `EventSelection.vue`)
- **Files**: camelCase for TS files (e.g., `auth.ts`)
- **Functions**: camelCase, use verbs (e.g., `loadEvents`, `handleAuthError`)
- **Types/Interfaces**: PascalCase (e.g., `Event`, `LifecycleStatus`)
- **Enums**: PascalCase for name, PascalCase for members (e.g., `EventType.Fitness`)
- **Stores**: `use` prefix + descriptive name (e.g., `useAuthStore`)
- **Composables**: `use` prefix (e.g., `useNotifyStore`)

### Imports

- Use `@/` alias for all local imports (configured in vite.config.ts and tsconfig.app.json)
- Vue APIs and components are auto-imported via unplugin-vue-components
- Vue Router routes are auto-generated from files in `src/pages/`
- Group imports: external → Vue → local

### State Management (Pinia)

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value)

  // Actions
  function logout() {
    token.value = null
  }

  return { token, isAuthenticated, logout }
})
```

Use Composition API style (function-based) with `ref()` and `computed()`.

### Error Handling

- Use try/catch for async operations
- Return `null` on recoverable failures
- Throw only for unrecoverable errors
- Use the notify store for user-facing errors:

```typescript
import { useNotifyStore } from '@/stores/notify'

useNotifyStore().showError('Error message', {
  actionLabel: 'Retry',
  onAction: () => retryOperation()
})
```

### API Calls

- Define all API functions in `src/api/index.ts`
- Use the `fetchJson<T>()` helper for typed responses
- Handle 401/403 errors via `handleAuthError()` helper
- Always include auth headers via `getAuthHeaders()`

### Project Structure

```
src/
├── api/           # API functions
├── assets/        # Static assets
├── components/    # Vue components
│   └── events/    # Feature-specific components
├── data/          # Static data
├── pages/         # File-based routes (vue-router)
├── stores/        # Pinia stores
├── types/         # TypeScript types
│   └── index.ts   # Main exports
└── utils/         # Utility functions
```

### Icons

Use `@mdi/js` for Material Design icons:

```vue
<script setup>
import { mdiPlus } from '@mdi/js'
</script>

<template>
  <v-icon>{{ mdiPlus }}</v-icon>
</template>
```

### Environment Variables

- Use `VITE_` prefix for env vars accessible in client code
- Reference via `import.meta.env.VITE_BACKEND_URL`

### Authentication

All protected routes require authentication via JWT token stored in `localStorage`. The router automatically redirects to `/` if not authenticated.

### VSCode Settings

Auto-import excludes `vue-router` to prevent conflicts with auto-routing. Use the file-based routing in `src/pages/` instead.

## Important Notes

- This project uses **Bun** as the package manager (see `bun.lock`)
- Components are auto-imported from `src/components/` - no need to import them
- Routes are auto-generated from `src/pages/` - use file naming conventions from unplugin-vue-router
- The project targets modern browsers (ES2020+)
