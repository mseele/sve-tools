<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDisplay } from 'vuetify'
import actions from '@/data/actions.json'
import { mdiHelp, mdiCloseCircle, mdiClose, mdiLogout } from '@mdi/js'
import { useNotifyStore } from '@/stores/notify'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const props = defineProps<{
  title: string
  help?: string[]
}>()

const { mdAndUp } = useDisplay()
const notify = useNotifyStore()
const auth = useAuthStore()
const router = useRouter()

const navToggle = ref(false)
const helpToggle = ref(false)

const drawer = computed({
  get: () => (mdAndUp.value ? true : navToggle.value),
  set: (value: boolean) => {
    if (!mdAndUp.value) {
      navToggle.value = value
    }
  }
})

const hasHelp = computed(() => props.help !== undefined && props.help.length > 0)

const notifySnackbar = computed({
  get: () => notify.message !== undefined,
  set: (value) => {
    if (!value) {
      notify.hideMessage()
    }
  }
})

function handleLogout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <v-layout class="rounded rounded-md">
    <v-app-bar>
      <template v-if="!mdAndUp" v-slot:prepend>
        <v-app-bar-nav-icon @click.stop="navToggle = !navToggle"></v-app-bar-nav-icon>
      </template>
      <img src="@/assets/logo.svg" class="ml-2 ml-md-6" style="height: 1.5rem" />
      <v-app-bar-title>{{ props.title }}</v-app-bar-title>
      <template v-if="hasHelp" v-slot:append>
        <v-btn variant="text" icon @click="helpToggle = true">
          <v-icon size="x-small">{{ mdiHelp }}</v-icon>
        </v-btn>
        <v-btn variant="text" icon @click="handleLogout" title="Logout">
          <v-icon size="x-small">{{ mdiLogout }}</v-icon>
        </v-btn>
      </template>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" :permanent="mdAndUp">
      <v-list nav dense>
        <v-list-item
          v-for="(action, index) of actions"
          :key="index"
          link
          :to="action.link"
          color="primary"
        >
          <v-list-item-title>{{ action.name }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main class="d-flex align-center justify-center">
      <v-container>
        <slot />
      </v-container>

      <v-bottom-sheet v-if="hasHelp" v-model="helpToggle">
        <v-sheet>
          <div class="text-center">
            <v-btn class="mt-1" variant="text" icon color="red" @click="helpToggle = !helpToggle">
              <v-icon>{{ mdiCloseCircle }}</v-icon>
            </v-btn>
          </div>
          <div class="pa-3 pl-6">
            <ul>
              <li v-for="(item, index) of help" :key="index" v-html="item" />
            </ul>
          </div>
        </v-sheet>
      </v-bottom-sheet>

      <v-snackbar v-model="notifySnackbar" bottom :color="notify.type" :timeout="4000">
        {{ notify.message }}
        <template v-slot:actions>
          <v-btn v-if="notify.actionLabel" variant="text" @click="notify.onAction?.()">
            {{ notify.actionLabel }}
          </v-btn>
          <v-btn variant="text" @click="notify.hideMessage()">
            <v-icon>{{ mdiClose }}</v-icon>
          </v-btn>
        </template>
      </v-snackbar>
    </v-main>
  </v-layout>
</template>
