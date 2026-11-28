// PROTOTYPE — throwaway, lives only on the prototype/ branch.
//
// Question: "Wie zeigt das Dashboard die beworbenen (Published, noch nicht
// laufenden) Events — Auslastung, erwartete Einnahmen, Zahlungsart-Split,
// Start-Countdown, Buchungstrend — und läuft laufende Events auf 'endet in
// X Tagen' herunter?" Drei Varianten auf der bestehenden Route
// /actions/dashboard, schaltbar via ?variant=.
//
// Alles hier ist reine Ablesung der bestehenden Admin-Events-Antwort
// (loadEvents([Published, Running], subscribers=true)) — kein neuer Endpunkt.

import { differenceInCalendarDays, parseISO } from 'date-fns'
import {
  LifecycleStatus as LS,
  EventType as ET,
  PaymentMethod as PM,
  PaymentMethod,
  NewsTopic,
  type Event,
  type EventSubscriber,
  type FetchStatus,
  type EventType,
  type UnpaidBooking
} from '@/types'

export interface PrototypeProps {
  events: Event[]
  unpaidBookings: Record<EventType, UnpaidBooking[]>
  newsletterSubscribers: Record<NewsTopic, string[]>
  eventsStatus: FetchStatus
  unpaidStatus: FetchStatus
  now: Date
  demo: boolean
}

export interface EventMoney {
  expected: number
  confirmed: number
  open: number
  method: PaymentMethod
  sepaNotExported: number
  /** Einnahmen − Termine × Preis pro Einheit; undefiniert, solange kein
      Preis pro Einheit gepflegt ist — dieselbe Rechnung wie
      EventBookings.vue (finacialResult). */
  result: number | undefined
}

/** Erwartete Einnahmen eines Events: enrolled × (Mitglied/Nicht-Mitglied-Preis). */
export function eventMoney(event: Event): EventMoney {
  const price = (s: EventSubscriber) =>
    parseFloat(s.member ? event.price_member : event.price_non_member) || 0
  const enrolled = (event.subscribers ?? []).filter((s) => s.enrolled)
  let expected = 0
  let confirmed = 0
  for (const s of enrolled) {
    expected += price(s)
    if (s.payment_confirmed_at) confirmed += price(s)
  }
  return {
    expected,
    confirmed,
    open: expected - confirmed,
    method: event.payment_method,
    sepaNotExported:
      event.payment_method === PM.SepaDirectDebit
        ? enrolled.filter((s) => !s.sepa_exported_at).length
        : 0,
    result:
      event.cost_per_date == undefined
        ? undefined
        : expected - (event.custom_date != undefined ? 1 : event.dates.length) * event.cost_per_date
  }
}

export function euro(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function dayFromNow(now: Date, offset: number): string {
  const d = new Date(now)
  d.setDate(d.getDate() + offset)
  return isoDay(d)
}

export function dayDiff(target: string, now: Date): number {
  return differenceInCalendarDays(parseISO(target.slice(0, 10)), now)
}

/** Erster zukünftiger Termin (beworbene Events) — Basis für 'startet in X Tagen'. */
export function startsOn(event: Event, now: Date): string | undefined {
  const today = isoDay(now)
  if (event.custom_date) {
    return event.custom_date.slice(0, 10) >= today ? event.custom_date : undefined
  }
  return [...event.dates].sort().find((date) => date.slice(0, 10) >= today)
}

/** Letzter Termin (laufende Events) — Basis für 'endet in X Tagen'. */
export function endsOn(event: Event): string | undefined {
  if (event.custom_date) return event.custom_date
  return [...event.dates].sort().pop()
}

export function countdown(
  days: number,
  verb: 'startet' | 'endet'
): { color: string; text: string } {
  if (days <= 0) return { color: 'warning', text: `${verb} heute` }
  const text = `${verb} in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`
  if (days <= 7) return { color: 'primary', text }
  return { color: 'default', text }
}

/** Buchungen pro Kalenderwoche der letzten `weeks` Wochen (aus subscribers.created). */
export function enrollmentTrend(event: Event, now: Date, weeks = 8): number[] {
  const buckets = new Array<number>(weeks).fill(0)
  for (const s of event.subscribers ?? []) {
    const ago = dayDiff(s.created, now)
    const index = weeks - 1 - Math.floor(ago / 7)
    if (ago >= 0 && index >= 0 && index < weeks) buckets[index] += 1
  }
  return buckets
}

export function isPromoted(event: Event): boolean {
  return event.status === LS.Published
}

export function isRunning(event: Event): boolean {
  return event.status === LS.Running
}

export function methodLabel(method: PaymentMethod): string {
  return method === PM.SepaDirectDebit ? 'SEPA' : 'Überweisung'
}

// --- Demo-Fixtures: nur aktiv, wenn der echte Endpunkt keine Daten liefert ---

const PAID = {
  payment_confirmed_at: '2026-01-15T09:30:00',
  sepa_exported_at: '2026-01-20T09:30:00'
}

let seq = 0

function sub(
  now: Date,
  dayOffset: number,
  overrides: Partial<EventSubscriber> = {}
): EventSubscriber {
  seq += 1
  return {
    id: `demo-s-${seq}`,
    created: `${dayFromNow(now, dayOffset)}T18:23:00`,
    first_name: 'Demo',
    last_name: `Person ${seq}`,
    street: 'Musterweg 1',
    city: 'Eutingen',
    email: `demo${seq}@example.com`,
    enrolled: true,
    member: false,
    payment_id: `demo-p-${seq}`,
    custom_values: [],
    ...overrides
  }
}

function group(
  now: Date,
  count: number,
  firstDay: number,
  gap: number,
  overrides: Partial<EventSubscriber> = {}
): EventSubscriber[] {
  return Array.from({ length: count }, (_, i) => sub(now, firstDay - i * gap, overrides))
}

function demoEvent(now: Date, overrides: Partial<Event>): Event {
  return {
    id: `demo-e-${seq}`,
    type: ET.Fitness,
    status: LS.Published,
    name: 'Demo Event',
    sort_index: 0,
    short_description: '',
    description: '',
    image: '',
    light: false,
    dates: [],
    duration_in_minutes: 90,
    max_subscribers: 12,
    max_waiting_list: 4,
    price_member: '30.00',
    price_non_member: '42.00',
    location: 'Sporthalle',
    booking_template: '',
    payment_account: '',
    external_operator: false,
    custom_fields: [],
    payment_method: PM.SepaDirectDebit,
    ...overrides
  }
}

export function demoEvents(now: Date): Event[] {
  return [
    // Heißer SEPA-Kurs, startet bald, fast voll, Export steht noch aus
    demoEvent(now, {
      id: 'demo-pilates',
      name: 'Pilates Frühjahr',
      payment_method: PM.SepaDirectDebit,
      price_member: '30.00',
      price_non_member: '42.00',
      cost_per_date: 40,
      max_subscribers: 12,
      dates: [dayFromNow(now, 4), dayFromNow(now, 11), dayFromNow(now, 18)],
      subscribers: [
        ...group(now, 3, -30, 2, { member: true, ...PAID }),
        ...group(now, 6, -28, 2, { ...PAID }),
        ...group(now, 2, -9, 3, { member: true }),
        sub(now, -4),
        ...group(now, 3, -6, 2, { enrolled: false })
      ]
    }),
    // Transfer-Event mit gutem Momentum, aber offenen Zahlungen
    demoEvent(now, {
      id: 'demo-klettern',
      type: ET.Events,
      name: 'Klettern für Anfänger',
      payment_method: PM.BankTransfer,
      price_member: '35.00',
      price_non_member: '50.00',
      cost_per_date: 60,
      max_subscribers: 14,
      dates: [dayFromNow(now, 9), dayFromNow(now, 16)],
      subscribers: [
        ...group(now, 4, -45, 3, { member: true, ...PAID }),
        ...group(now, 2, -40, 4, { ...PAID }),
        ...group(now, 2, -14, 3, { member: true }),
        ...group(now, 4, -12, 3),
        ...group(now, 2, -5, 2, { enrolled: false })
      ]
    }),
    // Frühe Kampagne, noch wenig los
    demoEvent(now, {
      id: 'demo-wanderung',
      type: ET.Events,
      name: 'Wanderwochenende Alb',
      payment_method: PM.BankTransfer,
      price_member: '45.00',
      price_non_member: '60.00',
      cost_per_date: 160,
      max_subscribers: 20,
      dates: [dayFromNow(now, 31)],
      subscribers: [
        sub(now, -20, { member: true, ...PAID }),
        sub(now, -12, { member: true }),
        sub(now, -5)
      ]
    }),
    // Unbegrenzter Kurs, alles bezogen und exportiert
    demoEvent(now, {
      id: 'demo-ruecken',
      name: 'Rückenschule',
      payment_method: PM.SepaDirectDebit,
      price_member: '25.00',
      price_non_member: '35.00',
      max_subscribers: -1,
      dates: [dayFromNow(now, 16)],
      subscribers: [
        ...group(now, 5, -38, 5, { member: true, ...PAID }),
        ...group(now, 3, -30, 6, { ...PAID })
      ]
    }),
    // Startet heute, ausverkauft
    demoEvent(now, {
      id: 'demo-volleyball',
      type: ET.Events,
      name: 'Volleyball-Camp',
      payment_method: PM.SepaDirectDebit,
      price_member: '20.00',
      price_non_member: '30.00',
      cost_per_date: 200,
      max_subscribers: 18,
      max_waiting_list: 4,
      dates: [dayFromNow(now, 0)],
      subscribers: [
        ...group(now, 10, -25, 2, { member: true, ...PAID }),
        ...group(now, 8, -20, 2, { ...PAID }),
        ...group(now, 4, -8, 2, { enrolled: false })
      ]
    }),
    // Laufendes Event: nur noch das Ende interessant
    demoEvent(now, {
      id: 'demo-aikido',
      name: 'Aikido Herbstkurs',
      status: LS.Running,
      max_subscribers: 15,
      dates: [dayFromNow(now, -20), dayFromNow(now, 3)],
      subscribers: [...group(now, 12, -60, 4, { ...PAID })]
    }),
    // Straggler: Running, letzter Termin liegt zurück
    demoEvent(now, {
      id: 'demo-nordic',
      type: ET.Events,
      name: 'Nordic Walking',
      status: LS.Running,
      payment_method: PM.BankTransfer,
      dates: [dayFromNow(now, -40), dayFromNow(now, -6)],
      subscribers: [...group(now, 9, -80, 6, { ...PAID })]
    })
  ]
}

export function demoNewsletter(): Record<NewsTopic, string[]> {
  const mails = (n: number) => Array.from({ length: n }, (_, i) => `newsletter${i + 1}@example.com`)
  return {
    [NewsTopic.General]: mails(120),
    [NewsTopic.Events]: mails(45),
    [NewsTopic.Fitness]: mails(89)
  }
}

export function demoUnpaid(now: Date): Record<EventType, UnpaidBooking[]> {
  const booking = (
    event: Event,
    dayOffset: number,
    price: string,
    dueInDays: number,
    reminder?: string
  ): UnpaidBooking => ({
    event_id: event.id,
    event_name: event.name,
    booking_id: `demo-b-${++seq}`,
    booking_date: `${dayFromNow(now, dayOffset)}T12:00:00`,
    first_name: 'Demo',
    last_name: `Person ${seq}`,
    email: `demo${seq}@example.com`,
    price,
    payment_id: `demo-p-${seq}`,
    due_in_days: dueInDays,
    ...(reminder ? { payment_reminder_sent: reminder } : {})
  })
  const pilates: Event = { id: 'demo-pilates', name: 'Pilates Frühjahr' } as Event
  const klettern: Event = { id: 'demo-klettern', name: 'Klettern für Anfänger' } as Event
  return {
    [ET.Fitness]: [
      booking(pilates, -9, '42.00', -2, `${dayFromNow(now, -1)}T10:00:00`),
      booking(pilates, -4, '30.00', 3)
    ],
    [ET.Events]: [booking(klettern, -12, '35.00', 12), booking(klettern, -2, '50.00', 0)]
  }
}
