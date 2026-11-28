import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import 'vuetify/styles'
import App from './App.vue'
import { useAuthStore } from './stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes
})
router.beforeEach((to) => {
  // PROTOTYPE (throwaway branch): Demo-Link ohne Login — ?demo=1 zeigt das
  // Dashboard mit Fixtures statt echter Daten. Mit echtem Token bleibt
  // alles beim Alten; auf feature/dashboard existiert diese Freigabe nicht.
  const demo = to.query.demo
  if (
    to.path === '/actions/dashboard' &&
    (demo === '1' || (Array.isArray(demo) && demo[0] === '1'))
  ) {
    return true
  }
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
  .use(
    createVuetify({
      components,
      directives,

      icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
          mdi
        }
      },
      theme: {
        defaultTheme: 'light',
        themes: {
          light: {
            dark: false,
            colors: {
              primary: '#C62828',
              secondary: '#FFCDD2'
            }
          }
        }
      }
    })
  )
  .mount('#app')
