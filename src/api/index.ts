import type {
  EventEmail,
  EventType,
  LifecycleStatus,
  UnpaidBooking,
  Event,
  EventCustomField
} from '@/types'
import { useNotifyStore } from '@/stores/notify'

const backend_prefix = `${import.meta.env.VITE_BACKEND_URL}/api`

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function handleAuthError(res: Response): boolean {
  if (res.status === 401 || res.status === 403) {
    useNotifyStore().showError('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.', {
      actionLabel: 'Abmelden',
      onAction: () => {
        localStorage.removeItem('token')
        window.location.href = '/'
      }
    })
    return true
  }
  return false
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  if (handleAuthError(response)) throw null
  if (!response.ok) throw new Error(await response.text())
  return response.json()
}

export async function loadEvents(status?: LifecycleStatus[], subscribers?: boolean) {
  let url = `${backend_prefix}/admin/events`
  if (status != undefined && status.length > 0) {
    url += `?status=${status.map((s) => s.toLowerCase()).join(',')}`
  }
  if (subscribers !== undefined) {
    url += `${status != undefined && status.length > 0 ? '&' : '?'}subscribers=${subscribers}`
  }
  return fetchJson<Event[]>(url, {
    headers: { ...getAuthHeaders() }
  })
}

export async function updateEvent(event_id: string, update: Partial<Event>): Promise<Event> {
  const res = await fetch(`${backend_prefix}/admin/events/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ id: event_id, ...update })
  })
  if (handleAuthError(res)) throw null
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteEvent(event_id: string) {
  const res = await fetch(`${backend_prefix}/admin/events/${event_id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  })
  if (handleAuthError(res)) throw null
  if (!res.ok) throw new Error(await res.text())
  return { status: res.status, statusText: res.statusText }
}

export async function loadCustomFields(): Promise<EventCustomField[]> {
  return fetchJson<EventCustomField[]>(`${backend_prefix}/events/custom_fields`)
}

export async function sendEmails(data: EventEmail) {
  const res = await fetch(`${backend_prefix}/admin/contact/emails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ event: data })
  })
  if (handleAuthError(res)) throw null
  if (!res.ok) throw new Error(await res.text())
  return { status: res.status, statusText: res.statusText }
}

export async function getUnpaidBookings(type: EventType): Promise<UnpaidBooking[]> {
  const res = await fetch(`${backend_prefix}/admin/events/payments/unpaid/${type}`, {
    headers: { ...getAuthHeaders() }
  })
  if (handleAuthError(res)) throw null
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function verifyPayments(csv: string, start_date?: string) {
  const res = await fetch(`${backend_prefix}/admin/events/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ csv, start_date })
  })
  if (handleAuthError(res)) throw null
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function sendPaymentReminders(type: EventType) {
  const res = await fetch(`${backend_prefix}/admin/tasks/send_payment_reminders/${type}`, {
    headers: { ...getAuthHeaders() }
  })
  if (handleAuthError(res)) throw null
  if (!res.ok) throw new Error(await res.text())
  return { status: res.status, statusText: res.statusText }
}

export async function sendParticipationConfirmation(event_id: string) {
  const res = await fetch(
    `${backend_prefix}/admin/tasks/send_participation_confirmation/${event_id}`,
    {
      headers: { ...getAuthHeaders() }
    }
  )
  if (handleAuthError(res)) throw null
  if (!res.ok) throw new Error(await res.text())
  return { status: res.status, statusText: res.statusText }
}

export async function markEventBookingAsPayed(subscriber_id: string) {
  const res = await fetch(
    `${backend_prefix}/admin/events/booking/${subscriber_id}?update_payment=true`,
    {
      method: 'PATCH',
      headers: { ...getAuthHeaders() }
    }
  )
  if (handleAuthError(res)) throw null
  if (!res.ok) throw new Error(await res.text())
  return { status: res.status, statusText: res.statusText }
}

export async function cancelBooking(subscriber_id: string) {
  const res = await fetch(`${backend_prefix}/admin/events/booking/${subscriber_id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  })
  if (handleAuthError(res)) throw null
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

export async function exportEventBookings(event: Event) {
  await downloadFile(
    `${backend_prefix}/admin/events/booking/export/${event.id}`,
    `buchungen-${event.name}.xlsx`
  )
}

export async function exportEventParticipantList(event: Event) {
  await downloadFile(
    `${backend_prefix}/admin/events/booking/participants_list/${event.id}`,
    `teilnehmerliste-${event.name}.pdf`
  )
}

async function downloadFile(url: string, filename: string) {
  const token = localStorage.getItem('token')
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  if (handleAuthError(res)) throw null
  if (!res.ok) throw new Error(await res.text())

  const blob = await res.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(downloadUrl)
}
