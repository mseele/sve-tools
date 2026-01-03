import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface User {
  email: string
  hd?: string
  exp: number
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const user = ref<User | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  function decodeCredential(credential: string): User | null {
    try {
      const parts = credential.split('.')
      if (parts.length < 3) return null
      const part = parts[1]!
      const payload = JSON.parse(atob(part))
      return {
        email: payload.email ?? '',
        hd: payload.hd,
        exp: payload.exp ?? 0
      }
    } catch {
      return null
    }
  }

  function setCredential(credential: string) {
    const userData = decodeCredential(credential)
    if (!userData) return
    token.value = credential
    user.value = userData
    localStorage.setItem('token', credential)
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    window.google?.accounts?.id.disableAutoSelect()
  }

  function initFromStorage() {
    const stored: string | null = localStorage.getItem('token')
    if (stored) {
      try {
        const parts = stored.split('.')
        if (parts.length < 3) {
          logout()
          return
        }
        const part = parts[1]!
        const payload = JSON.parse(atob(part))
        if ((payload.exp ?? 0) * 1000 > Date.now()) {
          token.value = stored
          user.value = {
            email: payload.email ?? '',
            hd: payload.hd,
            exp: payload.exp ?? 0
          }
        } else {
          logout()
        }
      } catch {
        logout()
      }
    }
  }

  return { token, user, isAuthenticated, setCredential, logout, initFromStorage }
})
