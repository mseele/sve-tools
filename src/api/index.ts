import type {
  EventEmail,
  EventType,
  LifecycleStatus,
  UnpaidBooking,
  Event,
  EventCustomField
} from '@/types'

const backend_prefix = `${import.meta.env.VITE_BACKEND_URL}/api`

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  if (!response.ok) throw new Error(await response.text())
  return response.json()
}

export async function loadEvents(status?: LifecycleStatus[], subscribers?: boolean) {
  let url = `${backend_prefix}/events`
  if (status != undefined && status.length > 0) {
    url += `?status=${status.map((s) => s.toLowerCase()).join(',')}`
  }
  if (subscribers !== undefined) {
    url += `${status != undefined && status.length > 0 ? '&' : '?'}subscribers=${subscribers}`
  }
  return fetchJson<Event[]>(url)
}

export async function updateEvent(event_id: string, update: Partial<Event>): Promise<Event> {
  const res = await fetch(`${backend_prefix}/events/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: event_id, ...update })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteEvent(event_id: string) {
  const res = await fetch(`${backend_prefix}/events/${event_id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
  return { status: res.status, statusText: res.statusText }
}

export async function loadCustomFields(): Promise<EventCustomField[]> {
  return fetchJson<EventCustomField[]>(`${backend_prefix}/events/custom_fields`)
}

export async function sendEmails(data: EventEmail) {
  const res = await fetch(`${backend_prefix}/contact/emails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: data })
  })
  if (!res.ok) throw new Error(await res.text())
  return { status: res.status, statusText: res.statusText }
}

export async function getUnpaidBookings(type: EventType): Promise<UnpaidBooking[]> {
  return fetchJson<UnpaidBooking[]>(`${backend_prefix}/events/payments/unpaid/${type}`)
}

export async function verifyPayments(csv: string, start_date?: string) {
  const res = await fetch(`${backend_prefix}/events/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv, start_date })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function sendPaymentReminders(type: EventType) {
  const res = await fetch(`${backend_prefix}/tasks/send_payment_reminders/${type}`)
  if (!res.ok) throw new Error(await res.text())
  return { status: res.status, statusText: res.statusText }
}

export async function sendParticipationConfirmation(event_id: string) {
  const res = await fetch(`${backend_prefix}/tasks/send_participation_confirmation/${event_id}`)
  if (!res.ok) throw new Error(await res.text())
  return { status: res.status, statusText: res.statusText }
}

export async function markEventBookingAsPayed(subscriber_id: string) {
  const res = await fetch(`${backend_prefix}/events/booking/${subscriber_id}?update_payment=true`, {
    method: 'PATCH'
  })
  if (!res.ok) throw new Error(await res.text())
  return { status: res.status, statusText: res.statusText }
}

export async function cancelBooking(subscriber_id: string) {
  const res = await fetch(`${backend_prefix}/events/booking/${subscriber_id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error(await res.text())
  return { status: res.status, statusText: res.statusText }
}

export async function triggerDeploy(prod: boolean) {
  const url = prod
    ? 'https://api.netlify.com/build_hooks/67081838b3ea234af2ebd0b2'
    : 'https://api.netlify.com/build_hooks/6127d32c2032942b064c7947'
  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) throw new Error(await res.text())
  return { status: res.status, statusText: res.statusText }
}

export function exportEventBookingsURL(event_id: string) {
  return `${backend_prefix}/events/booking/export/${event_id}`
}

export function exportEventParticipantListURL(event_id: string) {
  return `${backend_prefix}/events/booking/participants_list/${event_id}`
}
