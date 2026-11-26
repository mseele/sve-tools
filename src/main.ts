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
import { useAuthStore } from './stores/auth'

const SvePreset = definePreset(Aura, {
  semantic: {
    primary: palette('#C62828'),
    secondary: palette('#FFCDD2')
  }
})

// German locale for the date pickers: month and day names, week start on
// Monday and the date format used across the app.
const locale = {
  fileSizeTypes: ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
  dayNames: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  dayNamesShort: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  dayNamesMin: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  monthNames: [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember'
  ],
  monthNamesShort: [
    'Jan',
    'Feb',
    'Mär',
    'Apr',
    'Mai',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Okt',
    'Nov',
    'Dez'
  ],
  firstDayOfWeek: 1,
  dateFormat: 'dd.mm.yy',
  today: 'Heute',
  weekHeader: 'Wo',
  chooseDate: 'Datum wählen',
  chooseMonth: 'Monat wählen',
  chooseYear: 'Jahr wählen',
  prevDecade: 'Vorheriges Jahrzehnt',
  nextDecade: 'Nächstes Jahrzehnt',
  prevYear: 'Vorheriges Jahr',
  nextYear: 'Nächstes Jahr',
  prevMonth: 'Vorheriger Monat',
  nextMonth: 'Nächster Monat',
  prevHour: 'Vorherige Stunde',
  nextHour: 'Nächste Stunde',
  prevMinute: 'Vorherige Minute',
  nextMinute: 'Nächste Minute',
  prevSecond: 'Vorherige Sekunde',
  nextSecond: 'Nächste Sekunde'
}

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
