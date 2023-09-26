<script setup lang="ts">
import { markEventBookingAsPayed, sendPaymentReminders } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { EventType, type UnpaidBooking } from '@/types'
import { formatPrice } from '@/utils'
import { mdiCash, mdiCashClock, mdiCheckCircle, mdiCloseCircle } from '@mdi/js'
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

const headers = [
  { title: '', key: 'due_in_days' },
  { title: 'Event', key: 'event_name' },
  { title: 'Name', key: 'first_name' },
  { title: 'Payment ID', key: 'payment_id' },
  { title: 'Preis', key: 'price' },
  { title: '', key: 'actions', sortable: false }
]

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
    console.error(error)
    notify.showError('Als Bezahlt markieren ist fehlgeschlagen. Details siehe Console')
  }
  emit('refresh')
}

async function sendingPaymentReminders() {
  paymentReminderLoading.value = true
  try {
    await sendPaymentReminders(props.eventType)
  } catch (error) {
    console.error(error)
    notify.showError('Senden der Zahlungserinnerungen ist fehlgeschlagen. Details siehe Console')
  } finally {
    paymentReminderLoading.value = false
  }
  emit('refresh')
}
</script>

<template>
  <div>
    <div v-if="bookings == undefined" class="mt-4">Unbezahlte Buchungen werden geladen...</div>
    <template v-else>
      <template v-if="bookings.length > 0">
        <h4 class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon color="error">{{ mdiCloseCircle }}</v-icon>
            <div class="mx-1">
              {{ bookings.length }} Unbezahlte
              {{ bookings.length == 1 ? 'Buchung' : 'Buchungen' }}
            </div>
          </div>
          <div v-if="bookingsDue.length > 0">
            <v-tooltip left>
              <template v-slot:activator="{ props }">
                <v-btn
                  icon
                  variant="text"
                  color="primary"
                  v-bind="props"
                  :loading="paymentReminderLoading"
                  @click="sendingPaymentReminders()"
                >
                  <v-icon>{{ mdiCashClock }}</v-icon>
                </v-btn>
              </template>
              <span>
                Zahlungserinnerung an {{ bookingsDue.length }} überfällige
                {{ bookingsDue.length == 1 ? ' Buchung' : ' Buchungen' }} senden
              </span>
            </v-tooltip>
          </div>
        </h4>
        <v-data-table-virtual
          density="compact"
          :headers="headers"
          :items="bookings"
          item-key="id"
          class="elevation-1 my-4"
        >
          <template v-slot:item="{ item }">
            <tr>
              <td>
                <v-tooltip bottom>
                  <template v-slot:activator="{ props }">
                    <div class="d-flex align-center" v-bind="props">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16pt" height="21.333">
                        <path
                          d="M15.625 10a5.625 5.625 0 11-11.25 0 5.625 5.625 0 0111.25 0z"
                          :fill="dueInDaysColor(item.raw)"
                        />
                      </svg>
                    </div>
                  </template>
                  <span>{{ dueInDaysTooltip(item.raw) }}</span>
                </v-tooltip>
              </td>
              <td>{{ item.raw.event_name }}</td>
              <td>{{ `${item.raw.first_name} ${item.raw.last_name}` }}</td>
              <td>{{ item.raw.payment_id }}</td>
              <td>{{ formatPrice(item.raw.price) }}</td>
              <td>
                <div class="d-flex align-center justify-end">
                  <template v-if="!item.raw.payed">
                    <v-tooltip left>
                      <template v-slot:activator="{ props }">
                        <v-icon small class="mr-2" @click="markPayed(item.raw)" v-bind="props">{{
                          mdiCash
                        }}</v-icon>
                      </template>
                      <span>Als Bezahlt markieren</span>
                    </v-tooltip>
                  </template>
                </div>
              </td>
            </tr>
          </template>
        </v-data-table-virtual>
      </template>
      <h4 v-else class="d-flex align-center mt-4">
        <v-icon color="success">{{ mdiCheckCircle }}</v-icon>
        <div class="ml-1">Keine unbezahlten Buchungen</div>
      </h4>
    </template>
  </div>
</template>
