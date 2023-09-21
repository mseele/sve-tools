import { createHead } from '@unhead/vue'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router/auto'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { VBottomSheet } from 'vuetify/labs/VBottomSheet'
import { VDataTable, VDataTableVirtual } from 'vuetify/labs/VDataTable'
import 'vuetify/styles'
import App from './App.vue'

createApp(App)
  .use(
    createRouter({
      history: createWebHistory()
    })
  )
  .use(createPinia())
  .use(createHead())
  .use(
    createVuetify({
      components: {
        VBottomSheet,
        VDataTable,
        VDataTableVirtual,
        ...components
      },
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
