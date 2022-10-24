<template>
  <div>
    <v-autocomplete
      v-model="event"
      :items="events"
      :item-value="eventValue"
      :item-text="eventName"
      outlined
      hide-details
      :label="label"
      :disabled="disabled"
    >
      <template v-slot:item="data">
        <EventListItem
          :status="data.item.status"
          :text="eventName(data.item)"
        />
      </template>
    </v-autocomplete>
    <v-row v-if="showBookingGroups">
      <v-col cols="6">
        <v-checkbox
          label="Email an Buchungen"
          v-model="bookingList"
          :disabled="event == null"
        ></v-checkbox>
      </v-col>
      <v-col cols="6">
        <v-checkbox
          label="Email an Warteliste"
          v-model="waitingList"
          :disabled="event == null"
        ></v-checkbox>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import EventListItem from './EventListItem.vue'
import axios from 'axios'

export default {
  components: {
    EventListItem,
  },
  props: {
    eventsURL: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      default: 'Event auswählen',
    },
    showBookingGroups: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      allEvents: [],
      event: null,
      bookingList: true,
      waitingList: false,
    }
  },
  async mounted() {
    try {
      this.allEvents = (await axios.get(this.eventsURL)).data
      this.emitChanges()
    } catch (error) {
      console.log(error)
      this.$emit('error', 'Fehler beim Laden der Events. Details siehe Console')
    }
  },
  computed: {
    events() {
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
    events() {
      this.event = null
    },
    event() {
      this.emitChanges()
    },
    bookingList() {
      this.emitChanges()
    },
    waitingList() {
      this.emitChanges()
    },
  },
  methods: {
    eventName(event) {
      let visibility
      switch (event.status) {
        case 'Draft':
          visibility = 'Entwurf - Unsichtbar'
          break
        case 'Review':
          visibility = 'Überprüfung - Beta'
          break
        case 'Published':
          visibility = 'Sichtbar'
          break
        case 'Running':
          visibility = 'Laufend - Unsichtbar'
          break
        case 'Finished':
          visibility = 'Fertiggestellt - Unsichtbar'
        case 'Closed':
          visibility = 'Abgeschlossen - Unsichtbar'
      }
      return event.name + ' (' + visibility + ')'
    },
    eventValue(event) {
      return event
    },
    statusIndex(status) {
      switch (status) {
        case 'Draft':
          return 3
        case 'Review':
          return 1
        case 'Published':
          return 0
        case 'Running':
          return 2
        case 'Finished':
          return 4
        case 'Closed':
          return 5
      }
      return 6
    },
    emitChanges() {
      const data = {
        event: this.event,
      }
      if (this.showBookingGroups) {
        data.bookingList = this.bookingList
        data.waitingList = this.waitingList
      }
      this.$emit('change', data)
    },
    reset() {
      this.event = null
      this.bookingList = true
      this.waitingList = false
    },
  },
}
</script>
