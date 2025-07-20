import type {
  EventEmail,
  EventType,
  LifecycleStatus,
  UnpaidBooking,
  Event,
  EventCustomField
} from '@/types'
import axios, { type AxiosResponse } from 'axios'

const backend_prefix = `${import.meta.env.VITE_BACKEND_URL}/api`

export async function loadEvents(status?: LifecycleStatus[], subscribers?: boolean) {
  let url = `${backend_prefix}/events`
  if (status != undefined && status.length > 0) {
    url += `?status=${status.map((s) => s.toLowerCase()).join(',')}`
  }
  if (subscribers !== undefined) {
    url += `${status != undefined && status.length > 0 ? '&' : '?'}subscribers=${subscribers}`
  }
  return axios.get(url)
}

export async function updateEvent(
  event_id: string,
  update: Partial<Event>
): Promise<AxiosResponse<Event>> {
  return await axios.post(`${backend_prefix}/events/update`, {
    id: event_id,
    ...update
  })
}

export async function deleteEvent(event_id: string) {
  return axios.delete(`${backend_prefix}/events/${event_id}`)
}

export async function loadCustomFields(): Promise<AxiosResponse<EventCustomField[]>> {
  return axios.get(`${backend_prefix}/events/custom_fields`)
}

export async function sendEmails(data: EventEmail) {
  return axios.post(`${backend_prefix}/contact/emails`, { event: data })
}

export async function getUnpaidBookings(type: EventType): Promise<AxiosResponse<UnpaidBooking[]>> {
  return axios.get(`${backend_prefix}/events/payments/unpaid/${type}`)
}

export async function verifyPayments(csv: string, start_date?: string) {
  return axios.post(`${backend_prefix}/events/payments/verify`, { csv, start_date })
}

export async function sendPaymentReminders(type: EventType) {
  return axios.get(`${backend_prefix}/tasks/send_payment_reminders/${type}`)
}

export async function sendParticipationConfirmation(event_id: string) {
  return axios.get(`${backend_prefix}/tasks/send_participation_confirmation/${event_id}`)
}

export async function markEventBookingAsPayed(subscriber_id: string) {
  return axios.patch(`${backend_prefix}/events/booking/${subscriber_id}?update_payment=true`)
}

export async function cancelBooking(subscriber_id: string) {
  return axios.delete(`${backend_prefix}/events/booking/${subscriber_id}`)
}

export async function triggerDeploy(prod: boolean) {
  const url = prod
    ? 'https://api.netlify.com/build_hooks/67081838b3ea234af2ebd0b2'
    : 'https://api.netlify.com/build_hooks/6127d32c2032942b064c7947'
  return axios.post(url)
}

export function exportEventBookingsURL(event_id: string) {
  return `${backend_prefix}/events/booking/export/${event_id}`
}

export function exportEventParticipantListURL(event_id: string) {
  return `${backend_prefix}/events/booking/participants_list/${event_id}`
}
