<template>
  <Layout>
    <v-container>
      <action-header
        title="Manage Bookings"
        subtitle="Event & Fitnessbuchungen bearbeiten"
        :help="['Anzeige und Bearbeitung aller aktuellen Buchungen']"
      />
      <v-row>
        <v-col cols="12" class="d-flex align-center justify-space-between pb-0">
          <EventTypeSelection v-model="eventType" />
          <v-btn icon color="primary" @click="refresh()">
            <v-icon>{{ mdiRefresh }}</v-icon>
          </v-btn>
        </v-col>
      </v-row>
      <template v-if="allEvents != undefined">
        <EventBookings
          :updateEventBookingURL="$page.metadata.updateEventBookingURL"
          status="Review"
          :events="events"
          @error="showError"
          @refresh="loadEvents"
        />
        <EventBookings
          :updateEventBookingURL="$page.metadata.updateEventBookingURL"
          status="Published"
          :events="events"
          @error="showError"
          @refresh="loadEvents"
        />
        <EventBookings
          :updateEventBookingURL="$page.metadata.updateEventBookingURL"
          status="Running"
          :events="events"
          @error="showError"
          @refresh="loadEvents"
        />
        <v-row v-if="events.length == 0" class="text-center">
          <v-col cols="12">
            Keine aktiven {{ eventType == 'Fitness' ? 'Kurse' : 'Events' }}
          </v-col>
        </v-row>
      </template>
    </v-container>
    <notify ref="notify" />
  </Layout>
</template>

<script>
import { mdiRefresh } from '@mdi/js'
import axios from 'axios'
import ActionHeader from '~/components/ActionHeader.vue'
import Notify from '~/components/Notify.vue'
import EventTypeSelection from '~/components/EventTypeSelection.vue'
import EventListItem from '~/components/EventListItem.vue'
import EventBookings from '~/components/events/EventBookings.vue'

// TODO: add the possibility to create tn-lists
// TODO: add the possibility to send certificates

export default {
  components: {
    ActionHeader,
    Notify,
    EventTypeSelection,
    EventListItem,
    EventBookings,
  },
  metaInfo: {
    title: 'Manage Bookings',
  },
  data() {
    return {
      eventType: 'Fitness',
      allEvents: undefined,
      mdiRefresh,
    }
  },
  mounted() {
    this.loadEvents()
  },
  computed: {
    events() {
      if (this.allEvents == undefined) {
        return []
      }
      return this.allEvents
        .filter((e) => e.type === this.eventType)
        .sort((a, b) => {
          const value = this.statusIndex(a.status) - this.statusIndex(b.status)
          if (value != 0) {
            return value
          }
          return a.sortIndex - b.sortIndex
        })
    },
  },
  watch: {
    eventType() {
      this.refresh()
    },
  },
  methods: {
    async loadEvents() {
      try {
        this.allEvents = (
          await axios.get(
            this.$page.metadata.loadEventsURL +
              '?status=review,published,running&subscribers=true'
          )
        ).data
      } catch (error) {
        console.log(error)
        this.showError('Fehler beim Laden der Events. Details siehe Console')
      }
    },
    statusIndex(status) {
      switch (status) {
        case 'Draft':
          return 2
        case 'Review':
          return 1
        case 'Published':
          return 0
        case 'Running':
          return 3
        case 'Finished':
          return 4
        case 'Closed':
          return 5
      }
      return 6
    },
    showError(error) {
      this.$refs.notify.showError(error)
    },
    async refresh() {
      this.allEvents = undefined
      this.loadEvents()
    },
  },
}
</script>

<page-query>
query {
  metadata {
    loadEventsURL
    updateEventBookingURL
  }
}
</page-query>
