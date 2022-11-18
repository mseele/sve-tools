<template>
  <v-dialog v-model="show" persistent max-width="400">
    <template v-slot:activator="{ on, attrs }">
      <v-btn icon color="primary" v-bind="attrs" v-on="on">
        <v-icon>{{ mdiPlus }}</v-icon>
      </v-btn>
    </template>
    <v-card>
      <v-card-title class="text-h5">Neues Event</v-card-title>
      <v-card-text class="pb-0">
        Wähle ein Vorlage-Event aus:<br />
        <div class="mt-2 mb-4">
          <EventSelection
            :eventType="eventType"
            :eventsURL="loadEventsURL"
            @error="showError"
            @change="onEventSelection"
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="onCancel()"> Abbrechen </v-btn>
        <v-btn color="primary" text @click="onApply()" :disabled="!valid"
          >Starten</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mdiPlus } from '@mdi/js'
import { cloneDeep } from 'lodash-es'
import EventSelection from '~/components/EventSelection.vue'

export default {
  components: {
    EventSelection,
  },
  props: {
    eventType: {
      type: String,
      required: true,
    },
    loadEventsURL: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      show: false,
      selection: null,
      mdiPlus,
    }
  },
  computed: {
    valid() {
      return this.selection != null
    },
  },
  methods: {
    onEventSelection(data) {
      this.selection = data.event
    },
    onCancel() {
      this.selection = null
      this.show = false
    },
    onApply() {
      const duplicate = cloneDeep(this.selection)
      duplicate.id = null
      duplicate.status = 'Draft'
      this.$emit('new', duplicate)
      this.onCancel()
    },
    showError(error) {
      this.$emit('error', error)
    },
  },
}
</script>
