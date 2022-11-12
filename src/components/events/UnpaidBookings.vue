<template>
  <div>
    <div v-if="bookings == undefined">
      Unbezahlte Buchungen werden geladen...
    </div>
    <template v-else>
      <template v-if="bookings.length > 0">
        <h4 class="d-flex align-center">
          <v-icon color="error">{{ mdiCloseCircle }}</v-icon>

          <span class="ml-1"
            >{{ bookings.length }} Unbezahlte
            {{ bookings.length == 1 ? 'Buchung' : 'Buchungen' }}</span
          >
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
    </template>
  </div>
</template>

<script>
import { mdiCheckCircle, mdiCloseCircle, mdiCash } from '@mdi/js'
import axios from 'axios'

export default {
  props: {
    updateEventBookingURL: {
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
  methods: {
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
  },
}
</script>
