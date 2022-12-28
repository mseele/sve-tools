<template>
  <Layout>
    <v-container>
      <action-header
        title="Manage Events"
        subtitle="Events &amp; Fitnesskurse bearbeiten"
        :help="[
          'Hier können Events & Fitnesskurse bearbeitet werden',
          'In der Beschreibung kann mit HTML-Tags z.B. für eine Liste oder eine fettgedruckte Schrift gerarbeitet werden',
        ]"
      />
      <v-row>
        <v-col cols="12">
          <EventTypeSelection v-model="eventType" />
          <div class="d-flex align-center">
            <EventSelection
              ref="eventSelection"
              :eventType="eventType"
              :eventsURL="eventsURL"
              label="Event auswählen"
              @error="showError"
              @change="onEventSelection"
            />
            <CreateNew
              :eventType="eventType"
              :loadEventsURL="$page.metadata.loadEventsURL"
              @error="showError"
              @new="onNew"
            />
            <v-dialog v-model="deleteDialog" persistent max-width="400">
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  color="primary"
                  :disabled="selection == null || selection.status != 'Draft'"
                  v-bind="attrs"
                  v-on="on"
                >
                  <v-icon>{{ mdiDelete }}</v-icon>
                </v-btn>
              </template>
              <v-card>
                <v-card-title class="text-h5">Event löschen</v-card-title>
                <v-card-text
                  >Willst du das Event
                  <span class="font-weight-bold">{{
                    selection != null ? selection.name : selection
                  }}</span>
                  wirklich löschen?</v-card-text
                >
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="primary" text @click="deleteDialog = false">
                    Abbrechen
                  </v-btn>
                  <v-btn
                    color="error"
                    text
                    :loading="deleteLoading"
                    @click="onDelete()"
                  >
                    Löschen
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </div>
        </v-col>
      </v-row>
      <component
        v-if="selection != null"
        :key="selection.id || 'new'"
        :is="contents"
        :event="selection"
        :updateEventURL="$page.metadata.updateEventURL"
        :sendParticipationConfirmationURL="
          $page.metadata.sendParticipationConfirmationURL
        "
        :eventImageNodes="$page.eventImages"
        @error="showError"
        @success="onUpdate"
        class="mt-8"
      />
    </v-container>
    <notify ref="notify" />
  </Layout>
</template>

<script>
import { mdiDelete } from '@mdi/js'
import axios from 'axios'
import ActionHeader from '~/components/ActionHeader.vue'
import EventListItem from '~/components/EventListItem.vue'
import CreateNew from '~/components/events/CreateNew.vue'
import EditAttributes from '~/components/events/EditAttributes.vue'
import EditFinished from '~/components/events/EditFinished.vue'
import EventSelection from '~/components/EventSelection.vue'
import EventTypeSelection from '~/components/EventTypeSelection.vue'
import Notify from '~/components/Notify.vue'

export default {
  components: {
    ActionHeader,
    Notify,
    EventTypeSelection,
    EventSelection,
    EventListItem,
    CreateNew,
    EditAttributes,
    EditFinished,
  },
  metaInfo: {
    title: 'Manage Events',
  },
  data() {
    return {
      eventType: 'Fitness',
      selection: null,
      deleteDialog: false,
      deleteLoading: false,
      mdiDelete,
    }
  },
  computed: {
    eventsURL() {
      return (
        this.$page.metadata.loadEventsURL +
        '?status=draft,review,published,running,finished'
      )
    },
    contents() {
      switch (this.selection.status) {
        case 'Finished':
          return 'EditFinished'
        default:
          return 'EditAttributes'
      }
    },
  },
  watch: {
    eventType() {
      this.selection = null
    },
  },
  methods: {
    onEventSelection(data) {
      this.selection = data.event
    },
    onNew(event) {
      this.$refs.eventSelection.addEvent(event)
    },
    async onUpdate(event, message) {
      await this.$refs.eventSelection.loadEvents()
      this.$nextTick(() => {
        if (event != null) {
          this.$refs.eventSelection.selectEvent(event)
        }
        window.scrollTo(0, 0)
        if (message != null) {
          this.$refs.notify.showSuccess(message)
        }
      })
    },
    async onDelete() {
      this.deleteLoading = true
      try {
        await axios.delete(
          this.$page.metadata.deleteEventURL + this.selection.id
        )
        await this.$refs.eventSelection.loadEvents()
        this.$refs.notify.showSuccess('Das Event wurde erfolgreich gelöscht')
      } catch (error) {
        console.log(error)
        this.showError('Fehler beim Löschen des Events. Details siehe Console')
      } finally {
        this.deleteDialog = false
        this.deleteLoading = false
      }
    },
    showError(error) {
      this.$refs.notify.showError(error)
    },
  },
}
</script>

<page-query>
query {
  metadata {
    loadEventsURL
    updateEventURL
    deleteEventURL
    sendParticipationConfirmationURL
  }
  eventImages: allEventImages(sortBy: "name", order: ASC) {
    edges {
      node {
        name
        image
        light
      }
    }
  }
}
</page-query>
