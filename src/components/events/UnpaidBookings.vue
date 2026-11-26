<script setup lang="ts">
import { markEventBookingAsPayed, sendPaymentReminders } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { EventType, type UnpaidBooking } from '@/types'
import { formatPrice } from '@/utils'
import { mdiCash, mdiCashClock, mdiCheckCircle, mdiCloseCircle } from '@mdi/js'
import { format, parseISO } from 'date-fns'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import { computed, ref } from 'vue'

const props = defineProps<{
  eventType: EventType
  bookings?: UnpaidBooking[]
}>()

const emit = defineEmits<{ refresh: [] }>()

const notify = useNotifyStore()

const paymentReminderLoading = ref(false)

const bookingsDue = computed(() => {
  return props.bookings?.filter((b) => b.due_in_days < 0) || []
})

const reminderTooltip = computed(() => {
  return (
    'Zahlungserinnerung an ' +
    bookingsDue.value.length +
    ' überfällige ' +
    (bookingsDue.value.length == 1 ? 'Buchung' : 'Buchungen') +
    ' senden'
  )
})

function dueInDaysTooltip(item: UnpaidBooking) {
  const prefix = item.payment_reminder_sent == undefined ? 'Zahlung' : 'Zahlungserinnerung'
  if (item.due_in_days < -1) {
    return prefix + ' ' + -item.due_in_days + ' Tage überfällig'
  } else if (item.due_in_days == -1) {
    return prefix + ' ' + -item.due_in_days + ' Tag überfällig'
  } else if (item.due_in_days == 0) {
    return prefix + ' heute fällig'
  } else if (item.due_in_days == 1) {
    return prefix + ' morgen fällig'
  } else {
    return prefix + ' in ' + item.due_in_days + ' Tagen fällig'
  }
}

function dueInDaysColor(item: UnpaidBooking) {
  if (item.due_in_days == undefined) {
    return 'blue'
  } else if (item.due_in_days < 0) {
    if (item.payment_reminder_sent == undefined) {
      return 'red'
    }
    return 'black'
  } else if (item.due_in_days >= 0 && item.payment_reminder_sent != undefined) {
    return 'purple'
  }
  return 'green'
}

async function markPayed(booking: UnpaidBooking) {
  try {
    await markEventBookingAsPayed(booking.booking_id)
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Als Bezahlt markieren ist fehlgeschlagen. Details siehe Console')
    }
  }
  emit('refresh')
}

async function sendingPaymentReminders() {
  paymentReminderLoading.value = true
  try {
    await sendPaymentReminders(props.eventType)
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Senden der Zahlungserinnerungen ist fehlgeschlagen. Details siehe Console')
    }
  } finally {
    paymentReminderLoading.value = false
  }
  emit('refresh')
}

function formatDate(value: string) {
  const date = parseISO(value)
  const timezoneOffset = date.getTimezoneOffset() * 60000
  return format(new Date(date.getTime() + timezoneOffset), 'dd-MM-yyyy HH:mm')
}
</script>

<template>
  <div>
    <div v-if="bookings == undefined" class="loading">Unbezahlte Buchungen werden geladen...</div>
    <template v-else>
      <template v-if="bookings.length > 0">
        <h4 class="unpaid-header">
          <div class="unpaid-title">
            <MdiIcon :path="mdiCloseCircle" class="icon-error" />
            <div class="unpaid-count">
              {{ bookings.length }} Unbezahlte
              {{ bookings.length == 1 ? 'Buchung' : 'Buchungen' }}
            </div>
          </div>
          <div v-if="bookingsDue.length > 0">
            <Button
              v-tooltip.left="reminderTooltip"
              text
              rounded
              aria-label="Zahlungserinnerungen senden"
              :loading="paymentReminderLoading"
              @click="sendingPaymentReminders()"
            >
              <MdiIcon v-if="!paymentReminderLoading" :path="mdiCashClock" />
            </Button>
          </div>
        </h4>
        <DataTable :value="bookings || []" dataKey="booking_id" size="small" class="unpaid-table">
          <Column>
            <template #body="{ data }">
              <div v-tooltip.bottom="dueInDaysTooltip(data)" class="due-dot">
                <StatusDot :color="dueInDaysColor(data)" />
              </div>
            </template>
          </Column>
          <Column field="event_name" header="Event" sortable />
          <Column field="first_name" header="Name" sortable>
            <template #body="{ data }">{{ `${data.first_name} ${data.last_name}` }}</template>
          </Column>
          <Column field="booking_date" header="Buchungsdatum" sortable>
            <template #body="{ data }">{{ formatDate(data.booking_date) }}</template>
          </Column>
          <Column field="payment_id" header="Payment ID" sortable />
          <Column field="price" header="Preis" sortable>
            <template #body="{ data }">{{ formatPrice(data.price) }}</template>
          </Column>
          <Column>
            <template #body="{ data }">
              <div class="actions">
                <Button
                  v-tooltip.left="'Als Bezahlt markieren'"
                  text
                  rounded
                  size="small"
                  aria-label="Als Bezahlt markieren"
                  @click="markPayed(data)"
                >
                  <MdiIcon :path="mdiCash" :size="16" />
                </Button>
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
      <h4 v-else class="paid-header">
        <MdiIcon :path="mdiCheckCircle" class="icon-success" />
        <div class="paid-text">Keine unbezahlten Buchungen</div>
      </h4>
    </template>
  </div>
</template>

<style scoped>
.loading {
  margin-top: 16px;
}

.unpaid-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.unpaid-title {
  display: flex;
  align-items: center;
}

.unpaid-count {
  margin: 0 4px;
}

.unpaid-table {
  margin: 16px 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}

.paid-header {
  display: flex;
  align-items: center;
  margin-top: 16px;
}

.paid-text {
  margin-left: 4px;
}

.icon-error {
  color: #dc2626;
}

.icon-success {
  color: #65a30d;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
