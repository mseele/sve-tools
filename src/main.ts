import { createHead } from '@unhead/vue'
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

createApp(App)
  .use(
    createRouter({
      history: createWebHistory(),
      routes
    })
  )
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
