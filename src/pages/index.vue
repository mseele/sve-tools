<script setup lang="ts">
import { exchangeGoogleToken } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { useAuthStore } from '@/stores/auth'
import ProgressSpinner from 'primevue/progressspinner'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const auth = useAuthStore()
const notify = useNotifyStore()
const buttonRef = ref<HTMLElement>()
const loading = ref(false)

onMounted(() => {
  auth.initFromStorage()
  if (auth.isAuthenticated) {
    redirect()
    return
  }

  if (typeof window !== 'undefined' && window.google?.accounts?.id) {
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response: { credential: string }) => {
        loading.value = true
        try {
          const sessionToken = await exchangeGoogleToken(response.credential)
          auth.setCredential(sessionToken)
          redirect()
        } catch {
          notify.showError('Login fehlgeschlagen. Bitte erneut versuchen.')
        } finally {
          loading.value = false
        }
      },
      auto_select: true,
      cancel_on_tap_outside: false
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
  <div class="login">
    <ProgressSpinner
      v-if="loading"
      class="login-spinner"
      style="width: 48px; height: 48px"
      strokeWidth="4"
    />
    <div v-else ref="buttonRef"></div>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
