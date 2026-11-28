import { describe, expect, it } from 'vitest'
import modelSource from '../model.ts?raw'
import {
  deriveDashboardModel,
  readEventAvailability,
  type DashboardInput,
  type DashboardModel,
  type StragglerAttentionEntry
} from '../model'
import {
  EventType,
  LifecycleStatus,
  NewsTopic,
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
    newsletterSubscribers: {
      [NewsTopic.General]: [],
      [NewsTopic.Events]: [],
      [NewsTopic.Fitness]: []
    },
    ...overrides
  }
}

describe('deriveDashboardModel', () => {
  it('derives an empty model from empty input', () => {
    const model: DashboardModel = deriveDashboardModel(makeInput())

    expect(model.kpis.activeEvents).toBe(0)
    expect(model.kpis.openPayments).toEqual({ Fitness: 0, Events: 0 })
    expect(model.kpis.waitingListTotal).toBe(0)
    expect(model.kpis.newsletterSubscribers).toEqual({ General: 0, Events: 0, Fitness: 0 })
    expect(model.fill).toEqual([])
    expect(model.attention).toEqual([])
  })

  it('counts only published and running events as active', () => {
    const events = [
      makeEvent({ id: 'e-1', name: 'Published', status: LifecycleStatus.Published, dates: [] }),
      makeEvent({ id: 'e-2', name: 'Running', status: LifecycleStatus.Running, dates: [] }),
      makeEvent({ id: 'e-3', name: 'Draft', status: LifecycleStatus.Draft, dates: [] }),
      makeEvent({ id: 'e-4', name: 'Finished', status: LifecycleStatus.Finished, dates: [] })
    ]

    const model = deriveDashboardModel(makeInput({ events }))

    expect(model.kpis.activeEvents).toBe(2)
  })

  it('counts open payments per event type', () => {
    const unpaidBookings = {
      [EventType.Fitness]: [makeUnpaid({ booking_id: 'b-1' }), makeUnpaid({ booking_id: 'b-2' })],
      [EventType.Events]: [makeUnpaid({ booking_id: 'b-3' })]
    }

    const model = deriveDashboardModel(makeInput({ unpaidBookings }))

    expect(model.kpis.openPayments).toEqual({ Fitness: 2, Events: 1 })
  })

  it('totals waiting-list entries across active events', () => {
    const events = [
      makeEvent({
        id: 'e-1',
        name: 'Published',
        status: LifecycleStatus.Published,
        dates: [],
        subscribers: [
          makeSubscriber({ id: 's-1', enrolled: false }),
          makeSubscriber({ id: 's-2', enrolled: false }),
          makeSubscriber({ id: 's-3', enrolled: true })
        ]
      }),
      makeEvent({
        id: 'e-2',
        name: 'Running',
        status: LifecycleStatus.Running,
        dates: [],
        subscribers: [makeSubscriber({ id: 's-4', enrolled: false })]
      }),
      makeEvent({
        id: 'e-3',
        name: 'Draft',
        status: LifecycleStatus.Draft,
        dates: [],
        subscribers: [makeSubscriber({ id: 's-5', enrolled: false })]
      })
    ]

    const model = deriveDashboardModel(makeInput({ events }))

    expect(model.kpis.waitingListTotal).toBe(3)
  })

  it('counts unique newsletter subscribers per topic', () => {
    const newsletterSubscribers = {
      [NewsTopic.General]: ['a@example.de', 'b@example.de', 'a@example.de'],
      [NewsTopic.Events]: ['c@example.de'],
      [NewsTopic.Fitness]: []
    }

    const model = deriveDashboardModel(makeInput({ newsletterSubscribers }))

    expect(model.kpis.newsletterSubscribers).toEqual({ General: 2, Events: 1, Fitness: 0 })
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

  it('lists upcoming active events by next date with their phase', () => {
    const events = [
      makeEvent({
        id: 'e-a',
        name: 'Fitness A',
        status: LifecycleStatus.Published,
        dates: ['2026-12-24', '2026-12-05'],
        subscribers: [
          ...Array.from({ length: 8 }, (_, i) => makeSubscriber({ id: `s-a${i}`, enrolled: true })),
          ...Array.from({ length: 2 }, (_, i) =>
            makeSubscriber({ id: `s-aw${i}`, enrolled: false })
          )
        ]
      }),
      makeEvent({
        id: 'e-b',
        name: 'Fitness B',
        status: LifecycleStatus.Running,
        max_subscribers: -1,
        dates: ['2026-12-01'],
        subscribers: Array.from({ length: 3 }, (_, i) =>
          makeSubscriber({ id: `s-b${i}`, enrolled: true })
        )
      }),
      makeEvent({
        id: 'e-c',
        name: 'Fitness C',
        status: LifecycleStatus.Published,
        max_subscribers: 4,
        dates: ['2026-12-03'],
        subscribers: [
          ...Array.from({ length: 4 }, (_, i) => makeSubscriber({ id: `s-c${i}`, enrolled: true })),
          ...Array.from({ length: 3 }, (_, i) =>
            makeSubscriber({ id: `s-cw${i}`, enrolled: false })
          )
        ]
      }),
      makeEvent({
        id: 'e-d',
        name: 'Fitness D',
        status: LifecycleStatus.Published,
        max_subscribers: 4,
        max_waiting_list: 5,
        dates: ['2026-12-02'],
        subscribers: [
          ...Array.from({ length: 4 }, (_, i) => makeSubscriber({ id: `s-d${i}`, enrolled: true })),
          ...Array.from({ length: 5 }, (_, i) =>
            makeSubscriber({ id: `s-dw${i}`, enrolled: false })
          )
        ]
      }),
      makeEvent({
        id: 'e-e',
        name: 'Fitness E',
        status: LifecycleStatus.Running,
        dates: ['2026-11-01'],
        subscribers: []
      }),
      makeEvent({
        id: 'e-f',
        name: 'Fitness F',
        status: LifecycleStatus.Draft,
        dates: ['2026-12-20'],
        subscribers: []
      }),
      makeEvent({
        id: 'e-g',
        name: 'Fitness G',
        status: LifecycleStatus.Published,
        custom_date: '2026-12-10',
        dates: [],
        subscribers: []
      })
    ]

    const model = deriveDashboardModel(makeInput({ events }))

    expect(
      model.fill.map((f) => ({
        id: f.eventId,
        name: f.name,
        next: f.nextDate,
        phase: f.phase,
        unlimited: f.availability.unlimited
      }))
    ).toEqual([
      { id: 'e-b', name: 'Fitness B', next: '2026-12-01', phase: 'Unlimited', unlimited: true },
      { id: 'e-d', name: 'Fitness D', next: '2026-12-02', phase: 'FullyBooked', unlimited: false },
      { id: 'e-c', name: 'Fitness C', next: '2026-12-03', phase: 'WaitingList', unlimited: false },
      { id: 'e-a', name: 'Fitness A', next: '2026-12-05', phase: 'Subscribing', unlimited: false },
      { id: 'e-g', name: 'Fitness G', next: '2026-12-10', phase: 'Subscribing', unlimited: false }
    ])
    expect(model.fill[0]?.link).toBe('/actions/bookings')
    expect(model.fill[0]?.type).toBe(EventType.Fitness)
  })

  it('normalises model dates to days when stored dates carry times', () => {
    const events = [
      makeEvent({
        id: 'e-time',
        name: 'Mit Uhrzeit',
        status: LifecycleStatus.Published,
        custom_date: '2026-12-05T18:00:00',
        dates: [],
        subscribers: []
      }),
      makeEvent({
        id: 'e-past-time',
        name: 'Vergangen Mit Uhrzeit',
        status: LifecycleStatus.Running,
        custom_date: '2026-11-01T20:00:00',
        dates: [],
        subscribers: []
      })
    ]

    const model = deriveDashboardModel(makeInput({ events }))

    const fillEntry = model.fill.find((entry) => entry.eventId === 'e-time')
    expect(fillEntry?.nextDate).toBe('2026-12-05')

    const straggler = model.attention.find((entry) => entry.kind === 'lifecycle_straggler')
    expect(
      straggler !== undefined && straggler.kind === 'lifecycle_straggler'
        ? straggler.lastDate
        : undefined
    ).toBe('2026-11-01')
  })

  it('pins the phase and fill rate of a zero-capacity event', () => {
    const withWaitingRoom = makeEvent({
      id: 'e-zero-room',
      name: 'Null Kapazität',
      status: LifecycleStatus.Published,
      max_subscribers: 0,
      dates: ['2026-12-05'],
      subscribers: [makeSubscriber({ id: 's-z1', enrolled: false })]
    })
    const withoutWaitingRoom = makeEvent({
      id: 'e-zero-full',
      name: 'Null Kapazität Voll',
      status: LifecycleStatus.Published,
      max_subscribers: 0,
      max_waiting_list: 0,
      dates: ['2026-12-05'],
      subscribers: []
    })

    const model = deriveDashboardModel(makeInput({ events: [withWaitingRoom, withoutWaitingRoom] }))

    const withRoom = model.fill.find((entry) => entry.eventId === 'e-zero-room')
    expect(withRoom?.phase).toBe('WaitingList')
    expect(withRoom?.availability.fillPercent).toBe(0)

    const withoutRoom = model.fill.find((entry) => entry.eventId === 'e-zero-full')
    expect(withoutRoom?.phase).toBe('FullyBooked')
  })

  it('orders open payments on the attention list by days until due', () => {
    const unpaidBookings = {
      [EventType.Fitness]: [
        makeUnpaid({
          booking_id: 'b-1',
          due_in_days: 5,
          first_name: 'Nur',
          last_name: 'Zukunft'
        }),
        makeUnpaid({
          booking_id: 'b-2',
          due_in_days: -3,
          payment_reminder_sent: '2026-11-25',
          first_name: 'Max',
          last_name: 'Mahnung'
        })
      ],
      [EventType.Events]: [
        makeUnpaid({
          booking_id: 'b-3',
          due_in_days: 1,
          event_name: 'Weihnachtsfeier',
          first_name: 'Erika',
          last_name: 'Bald'
        })
      ]
    }

    const model = deriveDashboardModel(makeInput({ unpaidBookings }))

    expect(
      model.attention.map((entry) => {
        if (entry.kind !== 'unpaid_booking') throw new Error('expected unpaid booking')
        return {
          id: entry.bookingId,
          name: entry.name,
          due: entry.dueInDays,
          reminder: entry.reminderSent
        }
      })
    ).toEqual([
      { id: 'b-2', name: 'Max Mahnung', due: -3, reminder: true },
      { id: 'b-3', name: 'Erika Bald', due: 1, reminder: false },
      { id: 'b-1', name: 'Nur Zukunft', due: 5, reminder: false }
    ])
    expect(model.attention.every((entry) => entry.link === '/actions/payments')).toBe(true)
  })

  it('flags running events whose last date has passed as lifecycle stragglers', () => {
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
        custom_date: '2026-11-01',
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
      })
    ]

    const model = deriveDashboardModel(makeInput({ events, unpaidBookings }))

    const kinds = model.attention.map((entry) => entry.kind)
    expect(kinds).toEqual(['unpaid_booking', 'lifecycle_straggler', 'lifecycle_straggler'])

    const stragglers = model.attention.filter(
      (entry): entry is StragglerAttentionEntry => entry.kind === 'lifecycle_straggler'
    )
    expect(stragglers.map((s) => s.eventId)).toEqual(['e-custom', 'e-past'])
    expect(stragglers[0]?.lastDate).toBe('2026-11-01')
    expect(stragglers.every((s) => s.link === '/actions/events')).toBe(true)
    expect(stragglers.every((s) => s.hint.length > 0)).toBe(true)
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
