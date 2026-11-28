import { format } from 'date-fns'
import { EventType, LifecycleStatus, NewsTopic, type Event, type UnpaidBooking } from '@/types'

const unlimitedCapacity = -1

const bookingsLink = '/actions/bookings'
const eventsLink = '/actions/events'
const paymentsLink = '/actions/payments'

const stragglerHint = 'Letzter Termin liegt zurück — Event fertigstellen und abschließen'

export type EventPhase = 'Unlimited' | 'Subscribing' | 'WaitingList' | 'FullyBooked'

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

export interface DashboardKpis {
  activeEvents: number
  openPayments: Record<EventType, number>
  waitingListTotal: number
  newsletterSubscribers: Record<NewsTopic, number>
}

export interface EventFillEntry {
  eventId: string
  name: string
  type: EventType
  /** Next upcoming date as ISO day (YYYY-MM-DD). */
  nextDate: string
  phase: EventPhase
  availability: EventAvailability
  link: string
}

export interface UnpaidAttentionEntry {
  kind: 'unpaid_booking'
  bookingId: string
  eventName: string
  name: string
  price: string
  dueInDays: number
  reminderSent: boolean
  link: string
}

export interface StragglerAttentionEntry {
  kind: 'lifecycle_straggler'
  eventId: string
  eventName: string
  /** Last passed date as ISO day (YYYY-MM-DD). */
  lastDate: string
  hint: string
  link: string
}

export type AttentionEntry = UnpaidAttentionEntry | StragglerAttentionEntry

export interface DashboardModel {
  kpis: DashboardKpis
  fill: EventFillEntry[]
  attention: AttentionEntry[]
}

export interface DashboardInput {
  now: Date
  events: Event[]
  unpaidBookings: Record<EventType, UnpaidBooking[]>
  newsletterSubscribers: Record<NewsTopic, string[]>
}

const activeStatuses = [LifecycleStatus.Published, LifecycleStatus.Running]

function isActive(event: Event): boolean {
  return activeStatuses.includes(event.status)
}

function dateDay(date: string): string {
  return date.slice(0, 10)
}

function nextDate(event: Event, today: string): string | undefined {
  if (event.custom_date) {
    return dateDay(event.custom_date) >= today ? event.custom_date : undefined
  }
  return event.dates.filter((date) => dateDay(date) >= today).sort()[0]
}

function lastDate(event: Event): string | undefined {
  if (event.custom_date) {
    return event.custom_date
  }
  return [...event.dates].sort().pop()
}

function phaseOf(event: Event, availability: EventAvailability): EventPhase {
  if (availability.unlimited) {
    return 'Unlimited'
  }
  if ((availability.maxSubscribers ?? 0) > availability.enrolled) {
    return 'Subscribing'
  }
  return availability.waitingList < event.max_waiting_list ? 'WaitingList' : 'FullyBooked'
}

export function deriveDashboardModel(input: DashboardInput): DashboardModel {
  const today = format(input.now, 'yyyy-MM-dd')
  const active = input.events.filter(isActive)

  const waitingListTotal = active.reduce(
    (sum, event) => sum + readEventAvailability(event).waitingList,
    0
  )

  const newsletterSubscribers = {} as Record<NewsTopic, number>
  for (const topic of Object.values(NewsTopic)) {
    newsletterSubscribers[topic] = new Set(input.newsletterSubscribers[topic] ?? []).size
  }

  const openPayments = {} as Record<EventType, number>
  for (const type of Object.values(EventType)) {
    openPayments[type] = input.unpaidBookings[type]?.length ?? 0
  }

  return {
    kpis: {
      activeEvents: active.length,
      openPayments,
      waitingListTotal,
      newsletterSubscribers
    },
    fill: deriveFill(active, today),
    attention: deriveAttention(input, active, today)
  }
}

function deriveAttention(input: DashboardInput, active: Event[], today: string): AttentionEntry[] {
  const payments: UnpaidAttentionEntry[] = []
  for (const type of Object.values(EventType)) {
    for (const booking of input.unpaidBookings[type] ?? []) {
      payments.push({
        kind: 'unpaid_booking',
        bookingId: booking.booking_id,
        eventName: booking.event_name,
        name: `${booking.first_name} ${booking.last_name}`,
        price: booking.price,
        dueInDays: booking.due_in_days,
        reminderSent: booking.payment_reminder_sent !== undefined,
        link: paymentsLink
      })
    }
  }
  payments.sort((a, b) => a.dueInDays - b.dueInDays)

  const stragglers: StragglerAttentionEntry[] = []
  for (const event of active) {
    if (event.status !== LifecycleStatus.Running) {
      continue
    }
    const last = lastDate(event)
    if (last === undefined || dateDay(last) >= today) {
      continue
    }
    stragglers.push({
      kind: 'lifecycle_straggler',
      eventId: event.id,
      eventName: event.name,
      lastDate: dateDay(last),
      hint: stragglerHint,
      link: eventsLink
    })
  }
  stragglers.sort((a, b) => a.lastDate.localeCompare(b.lastDate))

  return [...payments, ...stragglers]
}

function deriveFill(active: Event[], today: string): EventFillEntry[] {
  const fill: EventFillEntry[] = []
  for (const event of active) {
    const next = nextDate(event, today)
    if (next === undefined) {
      continue
    }
    const availability = readEventAvailability(event)
    fill.push({
      eventId: event.id,
      name: event.name,
      type: event.type,
      nextDate: dateDay(next),
      phase: phaseOf(event, availability),
      availability,
      link: bookingsLink
    })
  }
  return fill.sort((a, b) => a.nextDate.localeCompare(b.nextDate) || a.name.localeCompare(b.name))
}
