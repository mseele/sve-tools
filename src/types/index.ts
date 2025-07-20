export interface Event {
  id: string
  closed?: Date
  type: EventType
  status: LifecycleStatus
  name: string
  sort_index: number
  short_description: string
  description: string
  image: string
  light: boolean
  dates: string[]
  custom_date?: string
  duration_in_minutes: number
  max_subscribers: number
  max_waiting_list: number
  price_member: string
  price_non_member: string
  cost_per_date?: number
  location: string
  booking_template: string
  payment_account: string
  alt_booking_button_text?: string
  alt_email_address?: string
  external_operator: boolean
  custom_fields: EventCustomField[]
  subscribers?: EventSubscriber[]
}

export enum EventType {
  Fitness = 'Fitness',
  Events = 'Events'
}

export enum LifecycleStatus {
  Draft = 'Draft',
  Review = 'Review',
  Published = 'Published',
  Running = 'Running',
  Finished = 'Finished',
  Closed = 'Closed',
  Archived = 'Archived'
}

export interface EventCustomField {
  id: string
  name: string
  type: EventCustomFieldType
  min_value?: number
  max_value?: number
}

export enum EventCustomFieldType {
  Text = 'Text',
  Number = 'Number'
}

export interface UnpaidBooking {
  event_id: string
  event_name: string
  booking_id: string
  first_name: string
  last_name: string
  email: string
  price: string
  payment_id: string
  due_in_days: number
  payment_reminder_sent?: Date
}

export interface EventEmail {
  event_id: string
  bookings: boolean
  waiting_list: boolean
  prebooking_event_id?: string
  subject: string
  body: string
  attachments?: EmailAttachment[]
}

export interface EmailAttachment {
  name: string
  mime_type: string
  data: string
}

export interface EventSubscriber {
  id: string
  created: Date
  first_name: string
  last_name: string
  street: string
  city: string
  email: string
  phone?: string
  enrolled: boolean
  member: boolean
  payment_id: string
  payed: boolean
  comment?: string
  custom_values: string[]
}
