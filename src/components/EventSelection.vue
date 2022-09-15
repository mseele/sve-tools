<template>
  <div>
    <from-select
      ref="from"
      v-model="from"
      :disabled="disabled"
      @preset="changeFrom"
    />
    <v-autocomplete
      v-model="event"
      :items="events"
      :item-value="eventValue"
      :item-text="eventName"
      outlined
      hide-details
      label="Event auswählen"
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
import FromSelect from './FromSelect.vue'
import EventListItem from './EventListItem.vue'
import axios from 'axios'

export default {
  components: {
    FromSelect,
    EventListItem,
  },
  props: {
    eventsURL: {
      type: String,
      required: true,
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
      from: 'Fitness',
      allEvents: [],
      event: null,
      subject: '',
      content: '',
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
        .filter((e) => e.type === this.from)
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
    from() {
      this.emitChanges()
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
    async loadEvents() {
      const result = await axios.get(
        this.$page.metadata.loadEventsURL + '?status=review,published'
      )
      return result.data
    },
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
      }
      return event.name + ' (' + visibility + ')'
    },
    eventValue(event) {
      return event
    },
    statusIndex(status) {
      switch (status) {
        case 'Draft':
          return 2
        case 'Review':
          return 1
        case 'Published':
          return 0
        case 'Finished':
          return 3
        case 'Closed':
          return 4
      }
      return 5
    },
    changeFrom(preset) {
      this.subject = preset.subject
      this.content = preset.content
    },
    emitChanges() {
      const data = {
        from: this.from,
        subject: this.subject,
        content: this.content,
        event: this.event,
      }
      if (this.showBookingGroups) {
        data.bookingList = this.bookingList
        data.waitingList = this.waitingList
      }
      this.$emit('change', data)
    },
    reset() {
      this.$refs.from.reset()
      this.event = null
      this.bookingList = true
      this.waitingList = false
    },
  },
}
</script>
