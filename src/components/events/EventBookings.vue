<template>
  <v-row v-if="filteredEvents.length > 0">
    <v-col cols="12" class="d-flex text-h6 pb-0">
      <EventListItem :status="status" :text="titleText()" />
    </v-col>
    <v-col cols="12" v-for="(event, index) of filteredEvents" :key="index">
      <v-data-table
        dense
        hide-default-footer
        disable-pagination
        :headers="headers"
        :items="event.subscribers"
        item-key="id"
        class="elevation-1"
        :item-class="subscriberClasses"
      >
        <template v-slot:top>
          <div class="d-flex align-center">
            <h3 class="px-2 py-1 border">{{ event.name }}</h3>
            <div>
              {{ free_bookings(event, true) }} freie Plätze /
              {{ free_bookings(event, false) }} freie Wartelistplätze
            </div>
          </div>
          <v-divider class="mb-1"></v-divider>
          <v-dialog v-model="cancelBookingDialog" max-width="400px">
            <v-card>
              <v-card-title class="text-h5">Buchung stornieren</v-card-title>
              <v-card-text>
                Soll die Buchung wirklich storniert werden?
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="red" text @click="cancelBookingDialog = false">
                  Abbrechen
                </v-btn>
                <v-btn
                  color="primary"
                  text
                  @click="confirmCancelBooking"
                  :loading="cancelBookingLoading"
                >
                  Stornieren
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </template>
        <template v-slot:no-data>Bisher noch keine Buchungen</template>
        <template v-slot:item.enrolled="{ item }">
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
                    :fill="item.enrolled ? 'green' : 'red'"
                  />
                </svg>
              </div>
            </template>
            <span>{{ item.enrolled ? 'Gebucht' : 'Warteliste' }}</span>
          </v-tooltip>
        </template>
        <template v-slot:item.member="{ item }">
          <v-icon v-if="item.member">{{ mdiCheck }}</v-icon>
        </template>
        <template v-slot:item.payed="{ item }">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <div
                class="d-flex align-center text-no-wrap"
                v-bind="attrs"
                v-on="on"
              >
                <v-icon :color="item.payed ? 'green' : 'red'">{{
                  item.payed ? mdiCheck : mdiClose
                }}</v-icon>
                <div>{{ item.payment_id }}</div>
              </div>
            </template>
            <span>{{ cost(event, item.cost) }}</span>
          </v-tooltip>
        </template>
        <template v-slot:item.comment="{ item }">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-icon
                small
                v-if="item.comment != undefined"
                v-bind="attrs"
                v-on="on"
                >{{ mdiComment }}</v-icon
              >
            </template>
            <span>{{ item.comment }}</span>
          </v-tooltip>
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

            <v-tooltip bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-icon
                  small
                  @click="cancelBooking(item)"
                  v-bind="attrs"
                  v-on="on"
                  >{{ mdiDelete }}</v-icon
                >
              </template>
              <span>Buchung stornieren</span>
            </v-tooltip>
          </div>
        </template>
      </v-data-table>
    </v-col>
  </v-row>
</template>

<script>
import { mdiCash, mdiCheck, mdiClose, mdiComment, mdiDelete } from '@mdi/js'
import axios from 'axios'
import EventListItem from '~/components/EventListItem.vue'

export default {
  components: { EventListItem },
  props: {
    updateEventBookingURL: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    events: {
      type: Array,
      default: [],
    },
  },
  data() {
    return {
      headers: [
        { text: '', value: 'enrolled' },
        { text: 'Vorname', value: 'first_name' },
        { text: 'Nachname', value: 'last_name' },
        { text: 'Email', value: 'email' },
        { text: 'Mgl.', value: 'member' },
        { text: 'Bezahlt', value: 'payed' },
        { text: 'Komm.', value: 'comment' },
        { text: '', value: 'actions', sortable: false },
      ],
      cancelBookingDialog: false,
      cancelBookingId: null,
      cancelBookingLoading: false,
      mdiCheck,
      mdiClose,
      mdiComment,
      mdiCash,
      mdiDelete,
    }
  },
  computed: {
    filteredEvents() {
      return this.events.filter((e) => e.status == this.status)
    },
  },
  methods: {
    titleText() {
      switch (this.status) {
        case 'Draft':
          return 'Entwurf - Unsichtbar'
        case 'Review':
          return 'Überprüfung - Beta'
        case 'Published':
          return 'Sichtbar'
        case 'Running':
          return 'Laufend - Unsichtbar'
        case 'Finished':
          return 'Fertiggestellt - Unsichtbar'
        case 'Closed':
          return 'Abgeschlossen - Unsichtbar'
      }
      return '-'
    },
    subscriberClasses(subscriber) {
      return subscriber.enrolled ? '' : 'grey--text'
    },
    cost(event, member) {
      const cost = member ? event.cost_member : event.cost_non_member
      return cost.replace('.', ',') + '  €'
    },
    free_bookings(event, enrolled) {
      return Math.max(
        (enrolled ? event.max_subscribers : event.max_waiting_list) -
          event.subscribers.filter((s) => s.enrolled == enrolled).length,
        0
      )
    },
    async markPayed(subscriber) {
      try {
        await axios.patch(
          this.updateEventBookingURL + subscriber.id + '?update_payment=true'
        )
      } catch (error) {
        console.log(error)
        this.$emit(
          'error',
          'Als Bezahlt markieren is fehlgeschlagen. Details siehe Console'
        )
      }
      this.refresh()
    },
    cancelBooking(subscriber) {
      this.cancelBookingId = subscriber.id
      this.cancelBookingLoading = false
      this.cancelBookingDialog = true
    },
    async confirmCancelBooking() {
      this.cancelBookingLoading = true
      try {
        await axios.delete(this.updateEventBookingURL + this.cancelBookingId)
      } catch (error) {
        console.log(error)
        this.$emit(
          'error',
          'Die Stornierung is fehlgeschlagen. Details siehe Console'
        )
      }
      this.cancelBookingDialog = false
      this.cancelBookingLoading = false
      this.refresh()
    },
    refresh() {
      this.$emit('refresh')
    },
  },
}
</script>
