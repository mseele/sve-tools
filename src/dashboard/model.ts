import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import {
  EventType,
  LifecycleStatus,
  PaymentMethod,
  type Event,
  type EventSubscriber,
  type UnpaidBooking
} from '@/types'

const unlimitedCapacity = -1

const bookingsLink = '/actions/bookings'
const eventsLink = '/actions/events'

const stragglerHint = 'Letzter Termin liegt zurück — Event fertigstellen und abschließen'

/** Buchungen zählen `created` innerhalb dieses Fensters (in Tagen). */
const bookingsWindowDays = 7

export interface EventAvailability {
  unlimited: boolean
  maxSubscribers?: number
  enrolled: number
  waitingList: number
  fillPercent?: number
}

export function readEventAvailability(event: Event): EventAvailability {
  const subscribers = event.subscribers ?? []
  const enrolled = subscribers.filter((s) => s.enrolled).length
  const waitingList = subscribers.filter((s) => !s.enrolled).length

  if (event.max_subscribers === unlimitedCapacity) {
    return { unlimited: true, enrolled, waitingList }
  }

  const maxSubscribers = event.max_subscribers
  const fillPercent = maxSubscribers > 0 ? Math.floor((enrolled / maxSubscribers) * 100) : 0
  return { unlimited: false, maxSubscribers, enrolled, waitingList, fillPercent }
}

export interface EventMoney {
  /** Erwartete Einnahmen: enrolled × (Mitglied/Nicht-Mitglied-Preis). */
  expected: number
  /** Erwartete Einnahmen ohne bestätigte Zahlung. */
  open: number
  method: PaymentMethod
  /** SEPA-Teilnehmer ohne Export — Rückstand in der Karten-Fußzeile. */
  sepaNotExported: number
  /** Einnahmen − Termine × Preis pro Einheit — dieselbe Rechnung wie
      EventBookings.vue (finacialResult). Ohne gepflegten Preis pro
      Einheit undefined; die Karte zeigt das Paar dann nicht. */
  result: number | undefined
}

export function readEventMoney(event: Event): EventMoney {
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
    open: expected - confirmed,
    method: event.payment_method,
    sepaNotExported:
      event.payment_method === PaymentMethod.SepaDirectDebit
        ? enrolled.filter((s) => !s.sepa_exported_at).length
        : 0,
    result:
      event.cost_per_date == undefined
        ? undefined
        : expected - dateCount(event) * event.cost_per_date
  }
}

/** Termine für Rechnungen: custom_date zählt als einer (wie finacialResult). */
function dateCount(event: Event): number {
  return event.custom_date != undefined ? 1 : event.dates.length
}

export interface EventCard {
  eventId: string
  name: string
  type: EventType
  /** Tage bis zum ersten künftigen Termin; ohne künftigen Termin
      undefined — die Karte sortiert hinten und ohne Countdown. */
  startDays: number | undefined
  /** Anzahl Termine; custom_date zählt als einer. */
  terms: number
  /** Vorbuchung: Event liegt in Review und ist noch nicht öffentlich —
      die Karte trägt den Hinweis im Untertitel. */
  prebooking: boolean
  availability: EventAvailability
  money: EventMoney
  /** Überfällige Zahlungen dieses Events — das einzige Rot auf der Karte. */
  overdue: number
  link: string
}

export interface RunningEventRow {
  eventId: string
  name: string
  /** Tage bis zum letzten Termin; 0 heißt heute. */
  endDays: number
  link: string
}

export interface StragglerEntry {
  eventId: string
  eventName: string
  /** Last passed date as ISO day (YYYY-MM-DD). */
  lastDate: string
  hint: string
  link: string
}

export interface DashboardStats {
  /** Veröffentlichte Events und Vorbuchungen — eine Karte pro Event. */
  events: number
  /** Buchungen der letzten 7 Tage über alle Karten-Events. */
  bookings: number
  /** Erwartete Einnahmen aller Karten-Events. */
  expected: number
  /** Erwartete Einnahmen ohne bestätigte Zahlung. */
  open: number
  /** Summe der Karten-Ergebnisse; ohne gepflegten Preis pro Einheit
      zählt ein Event mit 0. */
  result: number
}

export interface OverduePayments {
  count: number
  total: number
}

export interface DashboardModel {
  stats: DashboardStats
  overdue: OverduePayments
  stragglers: StragglerEntry[]
  /** Hauptinhalt: eine Karte pro veröffentlichten Event und pro
      Vorbuchung, nach Start sortiert. */
  cards: EventCard[]
  /** Neutrale Schlusszeilen: laufende Events zählen zum Ende herunter. */
  running: RunningEventRow[]
}

export interface DashboardInput {
  now: Date
  events: Event[]
  unpaidBookings: Record<EventType, UnpaidBooking[]>
}

function dateDay(date: string): string {
  return date.slice(0, 10)
}

/** Erster zukünftiger Termin — Basis für den Start-Countdown der Karten. */
function nextDate(event: Event, today: string): string | undefined {
  if (event.custom_date) {
    return dateDay(event.custom_date) >= today ? event.custom_date : undefined
  }
  return event.dates.filter((date) => dateDay(date) >= today).sort()[0]
}

/** Letzter Termin — Basis für Straggler und End-Countdown. */
function lastDate(event: Event): string | undefined {
  if (event.custom_date) {
    return event.custom_date
  }
  return [...event.dates].sort().pop()
}

function dayDiff(day: string, now: Date): number {
  return differenceInCalendarDays(parseISO(dateDay(day)), now)
}

export function deriveDashboardModel(input: DashboardInput): DashboardModel {
  const today = format(input.now, 'yyyy-MM-dd')
  // Karten sind der Hauptinhalt: veröffentlichte Events und Vorbuchungen
  // (Review-Events, gleiche Auswahl wie die Prebooking-Seite).
  const cardEvents = input.events.filter(
    (event) => event.status === LifecycleStatus.Published || event.status === LifecycleStatus.Review
  )
  const runningEvents = input.events.filter((event) => event.status === LifecycleStatus.Running)

  // Überfällige Zahlungen: eine Zählzeile statt einer Einzelliste — bei
  // 10, 20 Stück wäre die Liste zu lang. Details stehen im Zahlungen-Tab.
  const overdueByEvent = new Map<string, number>()
  let overdueCount = 0
  let overdueTotal = 0
  for (const list of Object.values(input.unpaidBookings)) {
    for (const booking of list) {
      if (booking.due_in_days >= 0) continue
      overdueCount += 1
      overdueTotal += parseFloat(booking.price) || 0
      overdueByEvent.set(booking.event_id, (overdueByEvent.get(booking.event_id) ?? 0) + 1)
    }
  }

  // Neue Buchungen der letzten 7 Tage über alle Karten-Events —
  // „was ist passiert, seit ich zuletzt geschaut habe?“
  const cutoff = input.now.getTime() - bookingsWindowDays * 24 * 60 * 60 * 1000
  let bookings = 0
  let expected = 0
  let open = 0
  let result = 0
  const cards: EventCard[] = cardEvents.map((event) => {
    const start = nextDate(event, today)
    const money = readEventMoney(event)
    expected += money.expected
    open += money.open
    result += money.result ?? 0
    bookings += (event.subscribers ?? []).filter(
      (s) => new Date(s.created).getTime() >= cutoff
    ).length
    return {
      eventId: event.id,
      name: event.name,
      type: event.type,
      startDays: start === undefined ? undefined : dayDiff(start, input.now),
      terms: dateCount(event),
      prebooking: event.status === LifecycleStatus.Review,
      availability: readEventAvailability(event),
      money,
      overdue: overdueByEvent.get(event.id) ?? 0,
      link: bookingsLink
    }
  })
  cards.sort(
    (a, b) => (a.startDays ?? Infinity) - (b.startDays ?? Infinity) || a.name.localeCompare(b.name)
  )

  const stragglers: StragglerEntry[] = []
  const running: RunningEventRow[] = []
  for (const event of runningEvents) {
    const last = lastDate(event)
    if (last === undefined) continue
    if (dateDay(last) < today) {
      stragglers.push({
        eventId: event.id,
        eventName: event.name,
        lastDate: dateDay(last),
        hint: stragglerHint,
        link: eventsLink
      })
    } else {
      running.push({
        eventId: event.id,
        name: event.name,
        endDays: dayDiff(last, input.now),
        link: bookingsLink
      })
    }
  }
  stragglers.sort((a, b) => a.lastDate.localeCompare(b.lastDate))
  running.sort((a, b) => a.endDays - b.endDays)

  return {
    stats: { events: cards.length, bookings, expected, open, result },
    overdue: { count: overdueCount, total: overdueTotal },
    stragglers,
    cards,
    running
  }
}
