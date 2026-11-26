import Aura from '@primevue/themes/aura'
import { definePreset, palette } from '@primevue/themes'
import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Tooltip from 'primevue/tooltip'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import App from './App.vue'
import { locale } from './data/primevueLocale'
import { useAuthStore } from './stores/auth'

const SvePreset = definePreset(Aura, {
  semantic: {
    primary: palette('#C62828'),
    secondary: palette('#FFCDD2')
  }
})

const router = createRouter({
  history: createWebHistory(),
  routes
})
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.path !== '/' && !auth.isAuthenticated) {
    auth.initFromStorage()
    if (!auth.isAuthenticated) {
      return { path: '/' }
    }
  }
})

createApp(App)
  .use(router)
  .use(createPinia())
  .use(createHead())
  .use(PrimeVue, {
    ripple: true,
    locale,
    theme: {
      preset: SvePreset,
      options: {
        darkModeSelector: false,
        cssLayer: false
      }
    }
  })
  .use(ToastService)
  .directive('tooltip', Tooltip)
  .mount('#app')
