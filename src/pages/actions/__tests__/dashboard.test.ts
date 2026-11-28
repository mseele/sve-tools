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
import { getNewsletterSubscribers, getUnpaidBookings, loadEvents } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import {
  EventType,
  LifecycleStatus,
  NewsTopic,
  PaymentMethod,
  type Event,
  type EventSubscriber,
  type UnpaidBooking
} from '@/types'

vi.mock('@/api', () => ({
  loadEvents: vi.fn(),
  getUnpaidBookings: vi.fn(),
  getNewsletterSubscribers: vi.fn()
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
  const enrolled = Array.from({ length: 8 }, (_, i) =>
    makeSubscriber({ id: `en-${i}`, enrolled: true })
  )
  const waiting = Array.from({ length: 2 }, (_, i) =>
    makeSubscriber({ id: `wl-${i}`, enrolled: false })
  )
  return [
    makeEvent({
      id: 'e-ruecken',
      name: 'Rückenfitness',
      status: LifecycleStatus.Published,
      dates: [isoDateInDays(7)],
      subscribers: [...enrolled, ...waiting]
    }),
    makeEvent({
      id: 'e-weihnachten',
      name: 'Weihnachtsfeier',
      type: EventType.Events,
      status: LifecycleStatus.Published,
      max_subscribers: -1,
      dates: [isoDateInDays(14)],
      subscribers: Array.from({ length: 3 }, (_, i) =>
        makeSubscriber({ id: `wx-${i}`, enrolled: true })
      )
    }),
    makeEvent({
      id: 'e-laufend-alt',
      name: 'Laufend Alt',
      status: LifecycleStatus.Running,
      dates: [isoDateInDays(-3)],
      subscribers: []
    })
  ]
}

function fitnessUnpaid(): UnpaidBooking[] {
  return [
    makeUnpaid({
      booking_id: 'b-1',
      first_name: 'Max',
      last_name: 'Mahnung',
      due_in_days: -3,
      payment_reminder_sent: '2026-11-25'
    }),
    makeUnpaid({
      booking_id: 'b-2',
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
  vi.mocked(getNewsletterSubscribers).mockImplementation(async (topics: NewsTopic[]) => {
    if (topics.includes(NewsTopic.General)) return ['a@example.de', 'b@example.de']
    if (topics.includes(NewsTopic.Events)) return ['c@example.de']
    return []
  })
}

async function mountDashboard(path = '/actions/dashboard'): Promise<{
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
  await router.push(path)
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
  vi.mocked(getNewsletterSubscribers).mockReset()
})

describe('dashboard page', () => {
  it('renders all three zones from the model', async () => {
    mockHappyApi()

    const { wrapper } = await mountDashboard()
    await flushPromises()

    const text = wrapper.text()

    expect(text).toContain('Aktive Events')
    expect(text).toContain('Offene Zahlungen')
    expect(text).toContain('Warteliste')
    expect(text).toContain('Newsletter')

    expect(text).toContain('3')
    expect(text).toContain('2 offen')
    expect(text).toContain('1 offen')
    expect(text).toContain('Allgemein: 2')

    expect(text).toContain('Auslastung')
    expect(text).toContain('Rückenfitness')
    expect(text).toContain('8 / 10')
    expect(text).toContain('Warteliste: 2')
    expect(text).toContain('Weihnachtsfeier')
    expect(text).toContain('Unbegrenzt')

    expect(text).toContain('Braucht Aufmerksamkeit')
    expect(text).toContain('Max Mahnung')
    expect(text).toContain('3 Tage überfällig')
    expect(text).toContain('Erinnerung gesendet')
    expect(text).toContain('Laufend Alt')
    expect(text).toContain('fertigstellen und abschließen')
  })

  it('shows an error notification and a zone placeholder when one endpoint fails', async () => {
    vi.mocked(loadEvents).mockResolvedValue(dashboardEvents())
    vi.mocked(getUnpaidBookings).mockRejectedValue(new Error('Backend nicht erreichbar'))
    vi.mocked(getNewsletterSubscribers).mockResolvedValue([])

    const { wrapper, pinia } = await mountDashboard()
    await flushPromises()

    const notify = useNotifyStore(pinia)
    expect(notify.message).toContain('unbezahlt')

    const text = wrapper.text()
    expect(text).toContain('Zahlungen nicht verfügbar')
    expect(text).not.toContain('2 offen')

    expect(text).toContain('Auslastung')
    expect(text).toContain('Rückenfitness')
    expect(text).toContain('3')
    expect(text).toContain('Laufend Alt')
  })
})

describe('dashboard prototype variants', () => {
  it('variant A renders campaign cards for promoted events', async () => {
    mockHappyApi()

    const { wrapper } = await mountDashboard('/actions/dashboard?variant=A')
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('2')
    expect(text).toContain('beworben')
    expect(text).toContain('Rückenfitness')
    expect(text).toContain('startet in 7 Tagen')
    expect(text).toContain('erwartet')
    expect(text).toContain('bestätigt')
    expect(text).toContain('Überweisung')
    expect(text).toContain('Unbegrenzt')
    expect(text).toContain('Braucht Aufmerksamkeit')
    expect(text).not.toContain('endet heute')
    expect(text).not.toContain('Demo-Daten')
  })

  it('variant B renders the dense matrix for promoted events', async () => {
    mockHappyApi()

    const { wrapper } = await mountDashboard('/actions/dashboard?variant=B')
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('2 beworbene Events')
    expect(text).toContain('Rückenfitness')
    expect(text).toContain('startet in 7 Tagen')
    expect(text).toContain('Erwartet')
    expect(text).toContain('Zahlart')
    expect(text).toContain('Trend')
    expect(text).toContain('Braucht Aufmerksamkeit')
    expect(text).not.toContain('endet heute')
  })

  it('variant C renders the revenue-first aggregate', async () => {
    mockHappyApi()

    const { wrapper } = await mountDashboard('/actions/dashboard?variant=C')
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Erwartete Einnahmen')
    expect(text).toContain('Nach Event')
    expect(text).toContain('Rückenfitness')
    expect(text).toContain('bestätigt')
    expect(text).toContain('SEPA-Lastschrift')
    expect(text).toContain('Überweisung')
    expect(text).toContain('Braucht Aufmerksamkeit')
  })

  it('variant D renders hero and compact pipeline rows', async () => {
    mockHappyApi()

    const { wrapper } = await mountDashboard('/actions/dashboard?variant=D')
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Braucht Aufmerksamkeit')
    expect(text).toContain('Rückenfitness')
    expect(text).toContain('startet in 7 Tagen')
    expect(text).toContain('Weihnachtsfeier')
    expect(text).toContain('Unbegrenzt')
    expect(text).toContain('offen')
    expect(text).not.toContain('endet heute')
    expect(text).not.toContain('Demo-Daten')
  })

  it('variant E leads with a status line and uniform campaign cards', async () => {
    mockHappyApi()

    const { wrapper } = await mountDashboard('/actions/dashboard?variant=E')
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('veröffentlichte Events')
    expect(text).toContain('110,00')
    expect(text).toContain('bestätigt')
    expect(text).toContain('offen')
    expect(text).toContain('überfällige Zahlung')
    expect(text).not.toContain('Max Mahnung')
    expect(text).toContain('Laufend Alt')
    expect(text).toContain('abschließen')
    expect(text).not.toContain('in 5 Tagen fällig')
    expect(text).toContain('Rückenfitness')
    expect(text).toContain('startet in 7 Tagen')
    expect(text).toContain('Weihnachtsfeier')
    expect(text).toContain('3 / ∞')
    expect(text).not.toContain('Braucht Aufmerksamkeit')
    expect(text).not.toContain('endet heute')
    expect(text).not.toContain('Demo-Daten')
  })

  it('falls back to demo fixtures when the events endpoint fails', async () => {
    vi.mocked(loadEvents).mockRejectedValue(new Error('Backend nicht erreichbar'))
    vi.mocked(getUnpaidBookings).mockResolvedValue([])
    vi.mocked(getNewsletterSubscribers).mockResolvedValue([])

    const { wrapper } = await mountDashboard('/actions/dashboard?variant=A')
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Demo-Daten')
    expect(text).toContain('Pilates Frühjahr')
    expect(text).toContain('endet in 3 Tagen')
  })
})
