<template>
  <div>
    <div v-if="bookings == undefined">
      Unbezahlte Buchungen werden geladen...
    </div>
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
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  color="primary"
                  v-bind="attrs"
                  v-on="on"
                  :loading="paymentReminderLoading"
                  @click="sendPaymentReminders()"
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
        <v-data-table
          dense
          hide-default-footer
          disable-pagination
          :headers="headers"
          :items="bookings"
          item-key="id"
          class="elevation-1 my-4"
        >
          <template v-slot:item.first_name="{ item }">
            {{ item.first_name + ' ' + item.last_name }}
          </template>
          <template v-slot:item.due_in_days="{ item }">
            <v-tooltip bottom>
              <template v-slot:activator="{ on, attrs }">
                <div class="d-flex align-center" v-bind="attrs" v-on="on">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16pt"
                    height="21.333"
                  >
                    <path
                      d="M15.625 10a5.625 5.625 0 11-11.25 0 5.625 5.625 0 0111.25 0z"
                      :fill="dueInDaysColor(item)"
                    />
                  </svg>
                </div>
              </template>
              <span>{{ dueInDaysTooltip(item) }}</span>
            </v-tooltip>
          </template>
          <template v-slot:item.cost="{ item }">
            {{ item.cost.replace('.', ',') + '  €' }}
          </template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center justify-end">
              <template v-if="!item.payed">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-icon
                      small
                      class="mr-2"
                      @click="markPayed(item)"
                      v-bind="attrs"
                      v-on="on"
                      >{{ mdiCash }}</v-icon
                    >
                  </template>
                  <span>Als Bezahlt markieren</span>
                </v-tooltip>
              </template>
            </div>
          </template>
        </v-data-table>
      </template>
      <h4 v-else class="d-flex align-center">
        <v-icon color="success">{{ mdiCheckCircle }}</v-icon>
        <div class="ml-1">Keine unbezahlten Buchungen</div>
      </h4>
    </template>
  </div>
</template>

<script>
import { mdiCheckCircle, mdiCloseCircle, mdiCash, mdiCashClock } from '@mdi/js'
import axios from 'axios'

export default {
  props: {
    updateEventBookingURL: {
      type: String,
      required: true,
    },
    sendPaymentRemindersURL: {
      type: String,
      required: true,
    },
    bookings: {
      type: Array,
      default: undefined,
    },
  },
  data() {
    return {
      headers: [
        { text: '', value: 'due_in_days' },
        { text: 'Event', value: 'event_name' },
        { text: 'Name', value: 'first_name' },
        { text: 'Payment ID', value: 'payment_id' },
        { text: 'Preis', value: 'cost' },
        { text: '', value: 'actions', sortable: false },
      ],
      paymentReminderLoading: false,
      mdiCheckCircle,
      mdiCloseCircle,
      mdiCash,
      mdiCashClock,
    }
  },
  computed: {
    bookingsDue() {
      return this.bookings.filter((b) => b.due_in_days < 0)
    },
  },
  methods: {
    dueInDaysTooltip(item) {
      const prefix =
        item.payment_reminder_sent == undefined
          ? 'Zahlung'
          : 'Zahlungserinnerung'
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
    },
    dueInDaysColor(item) {
      if (item.due_in_days == undefined) {
        return 'blue'
      } else if (item.due_in_days < 0) {
        if (item.payment_reminder_sent == undefined) {
          return 'red'
        }
        return 'black'
      } else if (
        item.due_in_days >= 0 &&
        item.payment_reminder_sent != undefined
      ) {
        return 'purple'
      }
      return 'green'
    },
    async markPayed(booking) {
      try {
        await axios.patch(
          this.updateEventBookingURL +
            booking.booking_id +
            '?update_payment=true'
        )
      } catch (error) {
        console.log(error)
        this.$emit(
          'error',
          'Als Bezahlt markieren is fehlgeschlagen. Details siehe Console'
        )
      }
      this.$emit('refresh')
    },
    async sendPaymentReminders() {
      this.paymentReminderLoading = true
      try {
        await axios.get(this.sendPaymentRemindersURL)
      } catch (error) {
        console.log(error)
        this.$emit(
          'error',
          'Senden der Zahlungserinnerungen ist fehlgeschlagen. Details siehe Console'
        )
      } finally {
        this.paymentReminderLoading = false
      }
      this.$emit('refresh')
    },
  },
}
</script>
