import { addDays, format } from 'date-fns'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createHead } from '@unhead/vue/client'
import { createPinia, type Pinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as vuetifyComponents from 'vuetify/components'
import * as vuetifyDirectives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import DashboardPage from '../dashboard.vue'
import { getUnpaidBookings, loadEvents } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import {
  EventType,
  LifecycleStatus,
  PaymentMethod,
  type Event,
  type EventSubscriber,
  type UnpaidBooking
} from '@/types'

vi.mock('@/api', () => ({
  loadEvents: vi.fn(),
  getUnpaidBookings: vi.fn()
}))

function isoDateInDays(days: number): string {
  return format(addDays(new Date(), days), 'yyyy-MM-dd')
}

function makeEvent(
  overrides: Partial<Event> & Pick<Event, 'id' | 'name' | 'status' | 'dates'>
): Event {
  return {
    type: EventType.Fitness,
    sort_index: 0,
    short_description: '',
    description: '',
    image: '',
    light: false,
    duration_in_minutes: 60,
    max_subscribers: 10,
    max_waiting_list: 5,
    price_member: '10',
    price_non_member: '15',
    location: '',
    booking_template: '',
    payment_account: '',
    external_operator: false,
    custom_fields: [],
    payment_method: PaymentMethod.BankTransfer,
    subscribers: [],
    ...overrides
  }
}

function makeSubscriber(overrides: Partial<EventSubscriber> = {}): EventSubscriber {
  return {
    id: 's-1',
    created: '2026-11-01',
    first_name: 'Anna',
    last_name: 'Muster',
    street: '',
    city: '',
    email: 'anna@example.de',
    enrolled: true,
    member: true,
    payment_id: 'P-1',
    custom_values: [],
    ...overrides
  }
}

function makeUnpaid(
  overrides: Partial<UnpaidBooking> & Pick<UnpaidBooking, 'booking_id'>
): UnpaidBooking {
  return {
    event_id: 'e-1',
    event_name: 'Rückenfitness',
    booking_date: '2026-11-01',
    first_name: 'Anna',
    last_name: 'Muster',
    email: 'anna@example.de',
    price: '10',
    payment_id: 'P-1',
    due_in_days: 0,
    ...overrides
  }
}

function dashboardEvents(): Event[] {
  const recent = makeSubscriber({ id: 's-neu', created: isoDateInDays(-2) })
  const exported = Array.from({ length: 5 }, (_, i) =>
    makeSubscriber({ id: `ex-${i}`, sepa_exported_at: '2026-11-20T10:00:00' })
  )
  const open = Array.from({ length: 2 }, (_, i) => makeSubscriber({ id: `op-${i}` }))
  const waiting = Array.from({ length: 2 }, (_, i) =>
    makeSubscriber({ id: `wl-${i}`, enrolled: false })
  )
  return [
    // 8 enrolled (80 € erwartet), 1 Termin à 20 € Preis pro Einheit → + 60 €
    // Ergebnis, 3 SEPA-Teilnehmer noch nicht exportiert, 1 überfällige
    // Zahlung.
    makeEvent({
      id: 'e-ruecken',
      name: 'Rückenfitness',
      status: LifecycleStatus.Published,
      dates: [isoDateInDays(7)],
      cost_per_date: 20,
      payment_method: PaymentMethod.SepaDirectDebit,
      subscribers: [recent, ...exported, ...open, ...waiting]
    }),
    // Unbegrenzt und ohne Preis pro Einheit → kein Ergebnis-Paar.
    makeEvent({
      id: 'e-weihnachten',
      name: 'Weihnachtsfeier',
      type: EventType.Events,
      status: LifecycleStatus.Published,
      max_subscribers: -1,
      dates: [isoDateInDays(14)],
      subscribers: Array.from({ length: 3 }, (_, i) => makeSubscriber({ id: `wx-${i}` }))
    }),
    makeEvent({
      id: 'e-laufend-jetzt',
      name: 'Aikido Herbstkurs',
      status: LifecycleStatus.Running,
      dates: [isoDateInDays(3)],
      subscribers: []
    }),
    makeEvent({
      id: 'e-laufend-alt',
      name: 'Laufend Alt',
      status: LifecycleStatus.Running,
      dates: [isoDateInDays(-3)],
      subscribers: []
    }),
    // Vorbuchung: Review-Events sammeln Buchungen vor der Veröffentlichung
    // und erscheinen als Zeilen, nicht als Karten.
    makeEvent({
      id: 'e-review',
      name: 'Nordic Walking Sommer',
      status: LifecycleStatus.Review,
      dates: [isoDateInDays(20)],
      subscribers: Array.from({ length: 4 }, (_, i) => makeSubscriber({ id: `nw-${i}` }))
    })
  ]
}

function fitnessUnpaid(): UnpaidBooking[] {
  return [
    makeUnpaid({
      booking_id: 'b-1',
      event_id: 'e-ruecken',
      first_name: 'Max',
      last_name: 'Mahnung',
      due_in_days: -3,
      payment_reminder_sent: '2026-11-25'
    }),
    makeUnpaid({
      booking_id: 'b-2',
      event_id: 'e-ruecken',
      first_name: 'Nur',
      last_name: 'Zukunft',
      due_in_days: 5
    })
  ]
}

function eventsUnpaid(): UnpaidBooking[] {
  return [
    makeUnpaid({
      booking_id: 'b-3',
      event_id: 'e-weihnachten',
      event_name: 'Weihnachtsfeier',
      first_name: 'Erika',
      last_name: 'Bald',
      due_in_days: 1
    })
  ]
}

function mockHappyApi() {
  vi.mocked(loadEvents).mockResolvedValue(dashboardEvents())
  vi.mocked(getUnpaidBookings).mockImplementation(async (type: EventType) =>
    type === EventType.Fitness ? fitnessUnpaid() : eventsUnpaid()
  )
}

async function mountDashboard(): Promise<{
  wrapper: VueWrapper
  pinia: Pinia
  router: Router
}> {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/actions/dashboard', component: { template: '<div />' } },
      { path: '/actions/events', component: { template: '<div />' } },
      { path: '/actions/bookings', component: { template: '<div />' } },
      { path: '/actions/payments', component: { template: '<div />' } },
      { path: '/actions/newsletter', component: { template: '<div />' } }
    ]
  })
  await router.push('/actions/dashboard')
  const vuetify = createVuetify({
    components: vuetifyComponents,
    directives: vuetifyDirectives,
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
    theme: { defaultTheme: 'light' }
  })

  const wrapper = mount(DashboardPage, {
    global: { plugins: [router, pinia, createHead(), vuetify] }
  })

  return { wrapper, pinia, router }
}

beforeEach(() => {
  vi.mocked(loadEvents).mockReset()
  vi.mocked(getUnpaidBookings).mockReset()
})

describe('dashboard page', () => {
  it('renders header stats, exception rows, event cards and running rows', async () => {
    mockHappyApi()

    const { wrapper } = await mountDashboard()
    await flushPromises()

    const text = wrapper.text()

    // Kopf-Kasten: Events, Buchungen der letzten 7 Tage, Geldwerte,
    // Gesamtergebnis. Bestätigt ist erwartet − offen und fehlt.
    expect(text).toContain('Events')
    expect(text).toContain('Buchungen (7 Tage)')
    expect(text).toContain('150,00')
    expect(text).toContain('erwartet')
    expect(text).toContain('offen')
    expect(text).toContain('Ergebnis')
    expect(text).toContain('+ 60')
    expect(text).not.toContain('bestätigt')

    // Rote Problemzeilen: überfällige Zahlungen als Zählzeile, Straggler
    // einzeln — keine Einzelliste aller offenen Buchungen.
    expect(text).toContain('1 überfällige Zahlung')
    expect(text).toContain('Laufend Alt')
    expect(text).toContain('abschließen')
    expect(text).not.toContain('Max Mahnung')
    expect(text).not.toContain('Zukunft')

    // Karten: Rückenfitness vollständig, Weihnachtsfeier ohne Ergebnis,
    // Vorbuchung mit Marker im Untertitel.
    expect(text).toContain('Rückenfitness')
    expect(text).toContain('startet in 7 Tagen')
    expect(text).toContain('8 / 10')
    expect(text).toContain('2 WL')
    expect(text).toContain('1 überfällig')
    expect(text).toContain('SEPA · 3 n. exportiert')
    expect(text).toContain('Weihnachtsfeier')
    expect(text).toContain('3 / ∞')
    expect(text).toContain('Nordic Walking Sommer')
    expect(text).toContain('startet in 20 Tagen')
    expect(text).toContain('4 / 10')
    expect(text).toContain('Vorbuchung')

    // Laufende Events als neutrale Zeilen am Ende.
    expect(text).toContain('Aikido Herbstkurs')
    expect(text).toContain('endet in 3 Tagen')
    expect(text).not.toContain('endet heute')
  })

  it('renders the empty state without active events', async () => {
    vi.mocked(loadEvents).mockResolvedValue([])
    vi.mocked(getUnpaidBookings).mockResolvedValue([])

    const { wrapper } = await mountDashboard()
    await flushPromises()

    const text = wrapper.text()

    expect(text).toContain('Keine veröffentlichten Events')
    expect(text).not.toContain('Buchungen (7 Tage)')
    expect(text).not.toContain('überfällig')
  })

  it('renders prebooking cards when no event is published', async () => {
    vi.mocked(loadEvents).mockResolvedValue([
      makeEvent({
        id: 'e-review',
        name: 'Pilates Frühjahr',
        status: LifecycleStatus.Review,
        dates: [isoDateInDays(12)],
        subscribers: [makeSubscriber({ id: 's-v1' })]
      })
    ])
    vi.mocked(getUnpaidBookings).mockResolvedValue([])

    const { wrapper } = await mountDashboard()
    await flushPromises()

    const text = wrapper.text()

    // Volle Karte mit Marker und Stats — kein leerer Zustand mehr.
    expect(text).not.toContain('Keine veröffentlichten Events')
    expect(text).toContain('Pilates Frühjahr')
    expect(text).toContain('startet in 12 Tagen')
    expect(text).toContain('Vorbuchung')
    expect(text).toContain('10,00')
    expect(text).not.toContain('endet')
  })

  it('shows a payment placeholder without counts when the unpaid endpoint fails', async () => {
    vi.mocked(loadEvents).mockResolvedValue(dashboardEvents())
    vi.mocked(getUnpaidBookings).mockRejectedValue(new Error('Backend nicht erreichbar'))

    const { wrapper, pinia } = await mountDashboard()
    await flushPromises()

    const notify = useNotifyStore(pinia)
    expect(notify.message).toContain('unbezahlt')

    const text = wrapper.text()
    expect(text).toContain('Zahlungen nicht verfügbar')
    expect(text).not.toContain('überfällig')
    expect(text).toContain('Rückenfitness')
    expect(text).toContain('endet in 3 Tagen')
  })
})
