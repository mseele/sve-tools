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
          <div v-if="result">
            <div
              v-for="(item, index) in result.csv_results"
              :key="index"
              class="mb-4"
            >
              <h4>{{ item.title }}</h4>
              <ul v-if="item.values.length > 0">
                <li v-for="(value, idx) in item.values" :key="idx" class="my-1">
                  {{ value }}
                </li>
              </ul>
            </div>
            <v-divider class="mb-4" />
            <template v-if="unpaid_bookings.length > 0">
              <h4 class="d-flex align-center">
                <v-icon color="error">{{ mdiCloseCircle }}</v-icon>
                <span class="ml-1"
                  >{{ unpaid_bookings.length }} Unbezahlte Buchungen</span
                >
              </h4>
              <v-data-table
                dense
                hide-default-footer
                disable-pagination
                :headers="unpaid_bookings_headers"
                :items="unpaid_bookings"
                item-key="id"
                class="elevation-1 my-4"
              >
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
              <span class="ml-1">Keine unbezahlten Buchungen</span>
            </h4>
          </div>
          <v-form :disabled="disabled" v-else>
            <EventTypeSelection v-model="event_type" />
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
            :send-visible="result == undefined"
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
import ButtonArea from '~/components/ButtonArea.vue'
import Notify from '~/components/Notify.vue'
import { readFile } from '~/utils/actions.js'

export default {
  components: {
    ActionHeader,
    EventTypeSelection,
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
      result: undefined,
      disabled: false,
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
  computed: {
    unpaid_bookings() {
      return this.result?.unpaid_bookings.filter((b) => b.payed == null) || []
    },
  },
  methods: {
    reset() {
      this.csv = undefined
      this.with_start_date = false
      this.start_date = undefined
      this.result = undefined
      this.disabled = false
    },
    async send() {
      this.disabled = true
      let attachment
      try {
        attachment = await readFile(this.csv)
      } catch (error) {
        console.error(error)
        this.$refs.notify.showError(
          'Datei konnte nicht gelesen werden. Details siehe Console'
        )
        this.disabled = false
        return
      }

      try {
        const response = await axios.post(
          this.$page.metadata.verifyPaymentsURL,
          {
            event_type: this.event_type,
            csv: attachment,
            start_date:
              this.with_start_date && this.start_date
                ? this.start_date
                : undefined,
          }
        )
        this.result = response.data
      } catch (error) {
        console.error(error)
        this.$refs.notify.showError(
          'Überprüfung fehlgeschlafen. Details siehe Console'
        )
      } finally {
        this.disabled = false
      }
    },
    async markPayed(booking) {
      try {
        await axios.patch(
          this.$page.metadata.updateEventBookingURL +
            booking.booking_id +
            '?update_payment=true'
        )
        booking.payed = true
      } catch (error) {
        console.log(error)
        this.$refs.notify.showError(
          'Als Bezahlt markieren is fehlgeschlagen. Details siehe Console'
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
    updateEventBookingURL
  }
}
</page-query>
