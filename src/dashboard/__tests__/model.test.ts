import { describe, expect, it } from 'vitest'
import modelSource from '../model.ts?raw'
import {
  deriveDashboardModel,
  readEventAvailability,
  readEventMoney,
  type DashboardInput,
  type DashboardModel
} from '../model'
import {
  EventType,
  LifecycleStatus,
  PaymentMethod,
  type Event,
  type EventSubscriber,
  type UnpaidBooking
} from '@/types'

const now = new Date('2026-11-28T10:00:00')

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

function makeInput(overrides: Partial<DashboardInput> = {}): DashboardInput {
  return {
    now,
    events: [],
    unpaidBookings: { [EventType.Fitness]: [], [EventType.Events]: [] },
    ...overrides
  }
}

describe('deriveDashboardModel', () => {
  it('derives an empty model from empty input', () => {
    const model: DashboardModel = deriveDashboardModel(makeInput())

    expect(model.stats).toEqual({ events: 0, bookings: 0, expected: 0, open: 0, result: 0 })
    expect(model.overdue).toEqual({ count: 0, total: 0 })
    expect(model.cards).toEqual([])
    expect(model.stragglers).toEqual([])
    expect(model.running).toEqual([])
  })

  it('totals the stats over published and review events', () => {
    const events = [
      makeEvent({
        id: 'e-pub',
        name: 'Veröffentlicht',
        status: LifecycleStatus.Published,
        dates: ['2026-12-01'],
        cost_per_date: 10,
        subscribers: [
          makeSubscriber({ id: 's-1', payment_confirmed_at: '2026-11-20T10:00:00' }),
          makeSubscriber({ id: 's-2' })
        ]
      }),
      makeEvent({
        id: 'e-run',
        name: 'Laufend',
        status: LifecycleStatus.Running,
        dates: ['2026-12-10'],
        subscribers: [makeSubscriber({ id: 's-3' })]
      }),
      makeEvent({
        id: 'e-review',
        name: 'Vorbuchung',
        status: LifecycleStatus.Review,
        dates: ['2026-12-05'],
        cost_per_date: 10,
        subscribers: [makeSubscriber({ id: 's-4' }), makeSubscriber({ id: 's-5' })]
      })
    ]

    const model = deriveDashboardModel(makeInput({ events }))

    // Published: 20 € erwartet, 10 € offen, +10 Ergebnis. Vorbuchung:
    // 20 € erwartet, +10 Ergebnis. Laufende zählen nirgends.
    expect(model.stats).toEqual({ events: 2, bookings: 0, expected: 40, open: 30, result: 20 })
  })

  it('counts bookings of the last 7 days across published events', () => {
    const events = [
      makeEvent({
        id: 'e-1',
        name: 'Frisch',
        status: LifecycleStatus.Published,
        dates: ['2026-12-01'],
        subscribers: [
          makeSubscriber({ id: 's-1', created: '2026-11-28T09:00:00' }),
          makeSubscriber({ id: 's-2', created: '2026-11-22T10:00:00' }),
          makeSubscriber({ id: 's-3', created: '2026-11-21T10:00:00' }),
          makeSubscriber({ id: 's-4', created: '2026-11-14T10:00:00' }),
          makeSubscriber({ id: 's-5', created: '2026-11-27T09:00:00', enrolled: false })
        ]
      }),
      makeEvent({
        id: 'e-2',
        name: 'Laufend',
        status: LifecycleStatus.Running,
        dates: ['2026-12-10'],
        subscribers: [makeSubscriber({ id: 's-6', created: '2026-11-27T09:00:00' })]
      }),
      makeEvent({
        id: 'e-3',
        name: 'Vorbuchung',
        status: LifecycleStatus.Review,
        dates: ['2026-12-05'],
        subscribers: [makeSubscriber({ id: 's-7', created: '2026-11-27T09:00:00' })]
      })
    ]

    const model = deriveDashboardModel(makeInput({ events }))

    // Genau 7 Tage zählt noch; Wartelisten und Vorbuchungen sind
    // Buchungen; laufende Events zählen nicht.
    expect(model.stats.bookings).toBe(5)
  })

  it('sums overdue payments across types and counts them per event', () => {
    const unpaidBookings = {
      [EventType.Fitness]: [
        makeUnpaid({ booking_id: 'b-1', event_id: 'e-1', due_in_days: -3, price: '10.50' }),
        makeUnpaid({ booking_id: 'b-2', event_id: 'e-1', due_in_days: -1, price: '42' }),
        makeUnpaid({ booking_id: 'b-3', event_id: 'e-2', due_in_days: 5 })
      ],
      [EventType.Events]: [
        makeUnpaid({ booking_id: 'b-4', event_id: 'e-2', due_in_days: 0, price: '15' }),
        makeUnpaid({ booking_id: 'b-5', event_id: 'e-3', due_in_days: -10, price: '20.25' })
      ]
    }
    const events = [
      makeEvent({
        id: 'e-1',
        name: 'Kurs Eins',
        status: LifecycleStatus.Published,
        dates: ['2026-12-01']
      }),
      makeEvent({
        id: 'e-2',
        name: 'Kurs Zwei',
        status: LifecycleStatus.Published,
        dates: ['2026-12-02']
      }),
      makeEvent({
        id: 'e-3',
        name: 'Laufend',
        status: LifecycleStatus.Running,
        dates: ['2026-12-10']
      })
    ]

    const model = deriveDashboardModel(makeInput({ events, unpaidBookings }))

    expect(model.overdue).toEqual({ count: 3, total: 72.75 })
    expect(model.cards.find((card) => card.eventId === 'e-1')?.overdue).toBe(2)
    expect(model.cards.find((card) => card.eventId === 'e-2')?.overdue).toBe(0)
  })

  it('derives one card per published event, sorted by days until start', () => {
    const events = [
      makeEvent({
        id: 'e-late',
        name: 'Später',
        status: LifecycleStatus.Published,
        dates: ['2026-12-20'],
        cost_per_date: 10,
        subscribers: [makeSubscriber({ id: 's-l' })]
      }),
      makeEvent({
        id: 'e-soon',
        name: 'Bald',
        type: EventType.Events,
        status: LifecycleStatus.Published,
        dates: ['2026-12-02', '2026-12-09', '2026-12-16'],
        subscribers: Array.from({ length: 5 }, (_, i) => makeSubscriber({ id: `s-s${i}` }))
      }),
      makeEvent({
        id: 'e-custom',
        name: 'Freies Datum',
        status: LifecycleStatus.Published,
        custom_date: '2026-12-03T18:00:00',
        dates: [],
        subscribers: []
      }),
      makeEvent({
        id: 'e-past',
        name: 'Nur Vergangenheit',
        status: LifecycleStatus.Published,
        dates: ['2026-11-01'],
        subscribers: []
      }),
      makeEvent({
        id: 'e-run',
        name: 'Laufend',
        status: LifecycleStatus.Running,
        dates: ['2026-12-05'],
        subscribers: []
      })
    ]

    const model = deriveDashboardModel(makeInput({ events }))

    expect(model.cards.map((card) => card.eventId)).toEqual([
      'e-soon',
      'e-custom',
      'e-late',
      'e-past'
    ])

    const soon = model.cards[0]
    expect(soon?.name).toBe('Bald')
    expect(soon?.type).toBe(EventType.Events)
    expect(soon?.startDays).toBe(4)
    expect(soon?.terms).toBe(3)
    expect(soon?.availability).toEqual({
      unlimited: false,
      maxSubscribers: 10,
      enrolled: 5,
      waitingList: 0,
      fillPercent: 50
    })
    expect(soon?.money.expected).toBe(50)
    expect(soon?.money.result).toBeUndefined()
    expect(soon?.link).toBe('/actions/bookings')
    expect(soon?.prebooking).toBe(false)

    // custom_date zählt als ein Termin und wird als Tag normalisiert.
    expect(model.cards[1]?.startDays).toBe(5)
    expect(model.cards[1]?.terms).toBe(1)

    expect(model.cards[2]?.money.result).toBe(0)
    expect(model.cards[3]?.startDays).toBeUndefined()
  })

  it('splits active events into cards, stragglers and running rows', () => {
    const unpaidBookings = {
      [EventType.Fitness]: [makeUnpaid({ booking_id: 'b-1', due_in_days: 2 })],
      [EventType.Events]: []
    }
    const events = [
      makeEvent({
        id: 'e-past',
        name: 'Laufend Vergangen',
        status: LifecycleStatus.Running,
        dates: ['2026-11-20'],
        subscribers: []
      }),
      makeEvent({
        id: 'e-custom',
        name: 'Laufend Frei Datum',
        status: LifecycleStatus.Running,
        custom_date: '2026-11-01T20:00:00',
        dates: [],
        subscribers: []
      }),
      makeEvent({
        id: 'e-today',
        name: 'Laufend Heute',
        status: LifecycleStatus.Running,
        dates: ['2026-11-28'],
        subscribers: []
      }),
      makeEvent({
        id: 'e-future',
        name: 'Laufend Zukunft',
        status: LifecycleStatus.Running,
        dates: ['2026-12-30'],
        subscribers: []
      }),
      makeEvent({
        id: 'e-published',
        name: 'Veroeffentlicht Vergangen',
        status: LifecycleStatus.Published,
        dates: ['2026-11-20'],
        subscribers: []
      }),
      makeEvent({
        id: 'e-undated',
        name: 'Laufend Ohne Termin',
        status: LifecycleStatus.Running,
        dates: [],
        subscribers: []
      }),
      makeEvent({
        id: 'e-review-bald',
        name: 'Review Bald',
        status: LifecycleStatus.Review,
        dates: ['2026-12-06'],
        subscribers: []
      }),
      makeEvent({
        id: 'e-review-past',
        name: 'Review Vergangen',
        status: LifecycleStatus.Review,
        dates: ['2026-11-20'],
        subscribers: []
      }),
      makeEvent({
        id: 'e-review-ohne',
        name: 'Review Ohne Termin',
        status: LifecycleStatus.Review,
        dates: [],
        subscribers: []
      })
    ]

    const model = deriveDashboardModel(makeInput({ events, unpaidBookings }))

    // Straggler bleiben laufende Events mit zurückliegendem Termin —
    // Review-Events werden nie Straggler.
    expect(model.stragglers.map((s) => s.eventId)).toEqual(['e-custom', 'e-past'])
    expect(model.stragglers[0]?.lastDate).toBe('2026-11-01')
    expect(model.stragglers.every((s) => s.link === '/actions/events')).toBe(true)
    expect(model.stragglers.every((s) => s.hint.length > 0)).toBe(true)

    // Laufende Events zählen zum Ende herunter; ohne Termin keine Zeile.
    expect(model.running.map((row) => ({ id: row.eventId, endDays: row.endDays }))).toEqual([
      { id: 'e-today', endDays: 0 },
      { id: 'e-future', endDays: 32 }
    ])
    expect(model.running.every((row) => row.link === '/actions/bookings')).toBe(true)

    // Vorbuchungen werden Karten wie die veröffentlichten Events — nach
    // Start sortiert, ohne künftigen Termin ohne Countdown hinten.
    expect(model.cards.map((card) => ({ id: card.eventId, prebooking: card.prebooking }))).toEqual([
      { id: 'e-review-bald', prebooking: true },
      { id: 'e-review-ohne', prebooking: true },
      { id: 'e-review-past', prebooking: true },
      { id: 'e-published', prebooking: false }
    ])
    expect(model.cards[0]?.startDays).toBe(8)
    expect(model.cards[1]?.startDays).toBeUndefined()
    expect(model.stats.events).toBe(4)
  })

  it('reads empty, partial and exactly-full fill rates', () => {
    const empty = readEventAvailability(
      makeEvent({
        id: 'e-1',
        name: 'Empty',
        status: LifecycleStatus.Published,
        dates: [],
        max_subscribers: 10,
        subscribers: [makeSubscriber({ id: 's-1', enrolled: false })]
      })
    )
    expect(empty).toEqual({
      unlimited: false,
      maxSubscribers: 10,
      enrolled: 0,
      waitingList: 1,
      fillPercent: 0
    })

    const partial = readEventAvailability(
      makeEvent({
        id: 'e-2',
        name: 'Partial',
        status: LifecycleStatus.Published,
        dates: [],
        max_subscribers: 10,
        subscribers: [
          makeSubscriber({ id: 's-2', enrolled: true }),
          makeSubscriber({ id: 's-3', enrolled: true }),
          makeSubscriber({ id: 's-4', enrolled: true }),
          makeSubscriber({ id: 's-5', enrolled: true }),
          makeSubscriber({ id: 's-6', enrolled: true }),
          makeSubscriber({ id: 's-7', enrolled: true }),
          makeSubscriber({ id: 's-8', enrolled: true }),
          makeSubscriber({ id: 's-9', enrolled: true })
        ]
      })
    )
    expect(partial).toEqual({
      unlimited: false,
      maxSubscribers: 10,
      enrolled: 8,
      waitingList: 0,
      fillPercent: 80
    })

    const full = readEventAvailability(
      makeEvent({
        id: 'e-3',
        name: 'Full',
        status: LifecycleStatus.Published,
        dates: [],
        max_subscribers: 8,
        subscribers: [
          makeSubscriber({ id: 's-10', enrolled: true }),
          makeSubscriber({ id: 's-11', enrolled: true }),
          makeSubscriber({ id: 's-12', enrolled: true }),
          makeSubscriber({ id: 's-13', enrolled: true }),
          makeSubscriber({ id: 's-14', enrolled: true }),
          makeSubscriber({ id: 's-15', enrolled: true }),
          makeSubscriber({ id: 's-16', enrolled: true }),
          makeSubscriber({ id: 's-17', enrolled: true })
        ]
      })
    )
    expect(full).toEqual({
      unlimited: false,
      maxSubscribers: 8,
      enrolled: 8,
      waitingList: 0,
      fillPercent: 100
    })
  })

  it('reads a -1 capacity as unlimited without a fill rate', () => {
    const unlimited = readEventAvailability(
      makeEvent({
        id: 'e-4',
        name: 'Unlimited',
        status: LifecycleStatus.Published,
        dates: [],
        max_subscribers: -1,
        subscribers: [
          makeSubscriber({ id: 's-18', enrolled: true }),
          makeSubscriber({ id: 's-19', enrolled: true }),
          makeSubscriber({ id: 's-20', enrolled: true })
        ]
      })
    )

    expect(unlimited).toEqual({ unlimited: true, enrolled: 3, waitingList: 0 })
    expect(unlimited.maxSubscribers).toBeUndefined()
    expect(unlimited.fillPercent).toBeUndefined()
  })
})

describe('readEventMoney', () => {
  it('derives expected and open money from enrolled subscribers only', () => {
    const money = readEventMoney(
      makeEvent({
        id: 'e-1',
        name: 'Kurs',
        status: LifecycleStatus.Published,
        dates: [],
        subscribers: [
          makeSubscriber({ id: 's-1', payment_confirmed_at: '2026-11-20T10:00:00' }),
          makeSubscriber({ id: 's-2' }),
          makeSubscriber({ id: 's-3', member: false }),
          makeSubscriber({ id: 's-4', member: false, enrolled: false })
        ]
      })
    )

    expect(money.expected).toBe(35)
    expect(money.open).toBe(25)
    expect(money.method).toBe(PaymentMethod.BankTransfer)
    expect(money.sepaNotExported).toBe(0)
  })

  it('computes the result like the bookings page: income minus dates times cost per date', () => {
    const withDates = readEventMoney(
      makeEvent({
        id: 'e-dates',
        name: 'Drei Termine',
        status: LifecycleStatus.Published,
        dates: ['2026-12-01', '2026-12-08', '2026-12-15'],
        cost_per_date: 10,
        subscribers: Array.from({ length: 4 }, (_, i) => makeSubscriber({ id: `s-d${i}` }))
      })
    )
    expect(withDates.result).toBe(10)

    const withCustomDate = readEventMoney(
      makeEvent({
        id: 'e-custom',
        name: 'Freies Datum',
        status: LifecycleStatus.Published,
        custom_date: '2026-12-05',
        dates: ['2026-12-01', '2026-12-08'],
        cost_per_date: 10,
        subscribers: Array.from({ length: 2 }, (_, i) => makeSubscriber({ id: `s-c${i}` }))
      })
    )
    expect(withCustomDate.result).toBe(10)
  })

  it('leaves the result undefined without a maintained cost per date', () => {
    const money = readEventMoney(
      makeEvent({
        id: 'e-free',
        name: 'Ohne Preis pro Einheit',
        status: LifecycleStatus.Published,
        dates: ['2026-12-01'],
        subscribers: [makeSubscriber()]
      })
    )

    expect(money.result).toBeUndefined()
  })

  it('counts enrolled SEPA participants without an export', () => {
    const money = readEventMoney(
      makeEvent({
        id: 'e-sepa',
        name: 'SEPA Kurs',
        status: LifecycleStatus.Published,
        dates: ['2026-12-01'],
        payment_method: PaymentMethod.SepaDirectDebit,
        subscribers: [
          makeSubscriber({ id: 's-1', sepa_exported_at: '2026-11-20T10:00:00' }),
          makeSubscriber({ id: 's-2' }),
          makeSubscriber({ id: 's-3' }),
          makeSubscriber({ id: 's-4', enrolled: false })
        ]
      })
    )

    expect(money.sepaNotExported).toBe(2)
  })
})

describe('sentinel isolation', () => {
  it('pins the raw -1 sentinel to the availability reader', () => {
    const regions = allowedSentinelRegions(modelSource)

    const matches = [...modelSource.matchAll(/-1(?![\d.])/g)]
    expect(matches.length).toBeGreaterThan(0)

    for (const match of matches) {
      const index = match.index ?? -1
      const inside = regions.some(([start, end]) => index >= start && index < end)
      expect(inside, `raw -1 outside the availability reader at index ${index}`).toBe(true)
    }
  })
})

function allowedSentinelRegions(source: string): Array<[number, number]> {
  const regions: Array<[number, number]> = []

  const sentinelMatch = source.match(/^.*const unlimitedCapacity = -1.*$/m)
  if (sentinelMatch && sentinelMatch.index !== undefined) {
    regions.push([sentinelMatch.index, sentinelMatch.index + sentinelMatch[0].length])
  }

  const readerStart = source.indexOf('export function readEventAvailability')
  if (readerStart !== -1) {
    const openBrace = source.indexOf('{', readerStart)
    let depth = 0
    for (let i = openBrace; i < source.length; i++) {
      if (source[i] === '{') depth++
      if (source[i] === '}') {
        depth--
        if (depth === 0) {
          regions.push([readerStart, i + 1])
          break
        }
      }
    }
  }

  return regions
}
