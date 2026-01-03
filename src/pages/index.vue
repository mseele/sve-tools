<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const auth = useAuthStore()
const buttonRef = ref<HTMLElement>()

onMounted(() => {
  auth.initFromStorage()
  if (auth.isAuthenticated) {
    redirect()
    return
  }

  if (typeof window !== 'undefined' && window.google?.accounts?.id) {
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: (response: { credential: string }) => {
        auth.setCredential(response.credential)
        redirect()
      },
      auto_select: false,
      cancel_on_tap_outside: true
    })

    if (buttonRef.value) {
      window.google.accounts.id.renderButton(buttonRef.value, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 300
      })
    }
  }
})

function redirect() {
  router.push({ name: 'default_action' })
}
</script>

<template>
  <v-layout full-height>
    <v-main style="min-height: 100vh">
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="4">
            <div ref="buttonRef" class="d-flex justify-center"></div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-layout>
</template>
