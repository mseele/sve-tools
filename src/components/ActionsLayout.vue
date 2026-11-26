<script setup lang="ts">
import { mdiCloseCircle, mdiHelp, mdiLogout, mdiMenu } from '@mdi/js'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import actions from '@/data/actions.json'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  title: string
  help?: string[]
}>()

const auth = useAuthStore()
const router = useRouter()

// 960px is the md breakpoint; the nav is permanent above it.
const desktopQuery = window.matchMedia('(min-width: 960px)')
const isDesktop = ref(desktopQuery.matches)

function onDesktopChange(event: MediaQueryListEvent) {
  isDesktop.value = event.matches
}

onMounted(() => desktopQuery.addEventListener('change', onDesktopChange))
onBeforeUnmount(() => desktopQuery.removeEventListener('change', onDesktopChange))

const navToggle = ref(false)
const helpToggle = ref(false)

const hasHelp = computed(() => props.help !== undefined && props.help.length > 0)

function handleLogout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="app-shell">
    <header class="app-toolbar">
      <Button
        v-if="!isDesktop"
        variant="text"
        rounded
        severity="secondary"
        aria-label="Menü"
        @click="navToggle = !navToggle"
      >
        <MdiIcon :path="mdiMenu" :size="16" />
      </Button>
      <img src="@/assets/logo.svg" class="app-logo" alt="SVE Eutingen" />
      <span class="app-title">{{ props.title }}</span>
      <div v-if="hasHelp" class="app-toolbar-end">
        <Button variant="text" rounded aria-label="Hilfe" @click="helpToggle = true">
          <MdiIcon :path="mdiHelp" :size="16" />
        </Button>
        <Button variant="text" rounded aria-label="Logout" title="Logout" @click="handleLogout">
          <MdiIcon :path="mdiLogout" :size="16" />
        </Button>
      </div>
    </header>

    <div class="app-body">
      <aside v-if="isDesktop" class="app-nav">
        <nav>
          <RouterLink
            v-for="(action, index) of actions"
            :key="index"
            :to="action.link"
            class="app-nav-link"
          >
            {{ action.name }}
          </RouterLink>
        </nav>
      </aside>

      <main class="app-main">
        <div class="app-container">
          <slot />
        </div>
      </main>
    </div>

    <Drawer v-model:visible="navToggle" modal position="left" :style="{ width: '240px' }">
      <nav>
        <RouterLink
          v-for="(action, index) of actions"
          :key="index"
          :to="action.link"
          class="app-nav-link"
          @click="navToggle = false"
        >
          {{ action.name }}
        </RouterLink>
      </nav>
    </Drawer>

    <Drawer
      v-if="hasHelp"
      v-model:visible="helpToggle"
      position="bottom"
      :style="{ height: 'auto' }"
    >
      <div class="app-help-close">
        <Button
          variant="text"
          rounded
          severity="danger"
          aria-label="Hilfe schließen"
          @click="helpToggle = false"
        >
          <MdiIcon :path="mdiCloseCircle" />
        </Button>
      </div>
      <ul class="app-help-list">
        <li v-for="(item, index) of help" :key="index" v-html="item" />
      </ul>
    </Drawer>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 16px;
  background: var(--p-content-background, #fff);
  border-bottom: 1px solid var(--p-surface-200, #eee);
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-logo {
  height: 1.5rem;
}

.app-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-toolbar-end {
  display: flex;
  margin-left: auto;
}

.app-body {
  display: flex;
  flex: 1;
}

.app-nav {
  width: 240px;
  flex-shrink: 0;
  padding: 16px 8px;
  border-right: 1px solid var(--p-surface-200, #eee);
}

.app-nav-link {
  display: block;
  padding: 8px 16px;
  border-radius: 6px;
  color: inherit;
  text-decoration: none;
}

.app-nav-link:hover {
  background: var(--p-content-hover-background, rgba(0, 0, 0, 0.04));
}

.app-nav-link.router-link-active {
  color: var(--p-primary-color, #c62828);
  font-weight: 600;
}

.app-main {
  display: flex;
  flex: 1;
  min-width: 0;
}

.app-container {
  margin: auto;
  width: 100%;
  max-width: 1200px;
  padding: 16px;
}

.app-help-close {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}

.app-help-list {
  padding: 8px 24px 24px;
}
</style>
