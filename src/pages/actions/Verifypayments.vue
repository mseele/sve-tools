<template>
  <Layout>
    <v-container>
      <action-header
        title="Verify Payments"
        subtitle="Automatische Zahlungsverifizierung"
        :help="[
          'Kontoauszug als CVS Datei angeben',
          'Überprüfung starten und Auswertung abwarten',
        ]"
      />
      <v-row>
        <v-col cols="12">
          <div v-if="csv_result">
            <div v-for="(item, index) in csv_result" :key="index" class="mb-4">
              <h4>{{ item.title }}</h4>
              <ul v-if="item.values.length > 0">
                <li v-for="(value, idx) in item.values" :key="idx" class="my-1">
                  {{ value }}
                </li>
              </ul>
            </div>
            <v-divider class="mb-4" />
            <UnpaidBookings
              :updateEventBookingURL="$page.metadata.updateEventBookingURL"
              :sendPaymentRemindersURL="sendPaymentRemindersURL"
              :bookings="unpaid_bookings"
              @error="showError"
              @refresh="loadUnpaidBookings"
            />
          </div>
          <v-form :disabled="disabled" v-else>
            <EventTypeSelection v-model="event_type" />
            <UnpaidBookings
              :updateEventBookingURL="$page.metadata.updateEventBookingURL"
              :sendPaymentRemindersURL="sendPaymentRemindersURL"
              :bookings="unpaid_bookings"
              @error="showError"
              @refresh="loadUnpaidBookings"
              class="mb-6"
            />
            <v-divider class="mb-6" />
            <v-file-input
              outlined
              v-model="csv"
              prepend-icon
              truncate-length="50"
              label="CSV Datei auswählen"
            ></v-file-input>
            <div class="d-flex">
              <v-checkbox v-model="with_start_date" hide-details></v-checkbox>
              <v-menu
                v-model="date_picker"
                :close-on-content-click="false"
                :nudge-right="40"
                transition="scale-transition"
                offset-y
                min-width="auto"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    :disabled="!with_start_date"
                    v-model="start_date"
                    label="CSV Start Date"
                    readonly
                    outlined
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-date-picker
                  v-model="start_date"
                  @input="date_picker = false"
                ></v-date-picker>
              </v-menu>
            </div>
          </v-form>
          <button-area
            :disabled="disabled"
            send-text="Starten"
            :send-visible="csv_result == undefined"
            @send="send"
            @reset="reset"
          />
        </v-col>
      </v-row>
    </v-container>
    <notify ref="notify" />
  </Layout>
</template>

<script>
import { mdiCheckCircle, mdiCloseCircle, mdiCash } from '@mdi/js'
import axios from 'axios'
import ActionHeader from '~/components/ActionHeader.vue'
import EventTypeSelection from '~/components/EventTypeSelection.vue'
import UnpaidBookings from '~/components/events/UnpaidBookings.vue'
import ButtonArea from '~/components/ButtonArea.vue'
import Notify from '~/components/Notify.vue'
import { readFile } from '~/utils/actions.js'

// TODO: add ability to send reminder email

export default {
  components: {
    ActionHeader,
    EventTypeSelection,
    UnpaidBookings,
    Notify,
    ButtonArea,
  },
  metaInfo: {
    title: 'Zahlungen überprüfen',
  },
  data() {
    return {
      event_type: 'Fitness',
      csv: undefined,
      with_start_date: false,
      start_date: undefined,
      date_picker: false,
      csv_result: undefined,
      disabled: false,
      unpaid_bookings: undefined,
      unpaid_bookings_headers: [
        { text: 'Event', value: 'event_name' },
        { text: 'Name', value: 'full_name' },
        { text: 'Payment ID', value: 'payment_id' },
        { text: 'Preis', value: 'cost' },
        { text: '', value: 'actions', sortable: false },
      ],
      mdiCheckCircle,
      mdiCloseCircle,
      mdiCash,
    }
  },
  mounted() {
    this.loadUnpaidBookings()
  },
  watch: {
    event_type() {
      this.reset()
    },
  },
  computed: {
    sendPaymentRemindersURL() {
      return this.$page.metadata.sendPaymentReminders + this.event_type
    },
  },
  methods: {
    reset() {
      this.csv = undefined
      this.with_start_date = false
      this.start_date = undefined
      this.csv_result = undefined
      this.disabled = false
      this.loadUnpaidBookings()
    },
    async send() {
      this.disabled = true
      let attachment
      try {
        attachment = await readFile(this.csv)
      } catch (error) {
        console.error(error)
        this.showError(
          'Datei konnte nicht gelesen werden. Details siehe Console'
        )
        this.disabled = false
        return
      }
      try {
        const response = await axios.post(
          this.$page.metadata.verifyPaymentsURL,
          {
            csv: attachment,
            start_date:
              this.with_start_date && this.start_date
                ? this.start_date
                : undefined,
          }
        )
        this.csv_result = response.data
        await this.loadUnpaidBookings()
      } catch (error) {
        console.error(error)
        this.showError('Überprüfung fehlgeschlafen. Details siehe Console')
      } finally {
        this.disabled = false
      }
    },
    showError(error) {
      this.$refs.notify.showError(error)
    },
    async loadUnpaidBookings() {
      this.unpaid_bookings = undefined
      try {
        const response = await axios.get(
          this.$page.metadata.unpaidBookingsURL + this.event_type
        )
        this.unpaid_bookings = response.data
      } catch (error) {
        console.error(error)
        this.showError(
          'Abholen unbezahlter Buchungen fehlgeschlafen. Details siehe Console'
        )
      }
    },
  },
}
</script>

<page-query>
query {
  metadata {
    verifyPaymentsURL
    unpaidBookingsURL
    updateEventBookingURL
    sendPaymentReminders
  }
}
</page-query>
