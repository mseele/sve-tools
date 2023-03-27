<template>
  <Layout>
    <v-container>
      <action-header
        title="Pre-Booking Email"
        subtitle="Kursbuchung Email"
        :help="[
          'Historisches Event und deren Personengruppe  (Buchungen und/oder Warteliste) auswählen',
          'Prebooking Event auswählen (für dieses Event werden Prebooking Links erstellt)',
          'Zur Linkerzeugung <b>{{link}}</b> in der Email nutzen',
          'Für Individualisierung <b>{{firstname}}</b> für den Vorname in der Email nutzen',
          'Für Individualisierung <b>{{lastname}}</b> für den Nachname in der Email nutzen',
          'Für Individualisierung <b>{{name}}</b> für den Event Name in der Email nutzen',
          'Für Individualisierung <b>{{location}}</b> für den Ort in der Email nutzen',
          'Für Individualisierung <b>{{price}}</b> für den Preis in der Email nutzen',
          'Für Individualisierung <b>{{dates}}</b> für die Termine in der Email nutzen',
        ]"
      />
      <v-row>
        <v-col cols="12">
          <v-form :disabled="disabled">
            <EventTypeSelection
              ref="eventTypeSelection"
              v-model="eventType"
              :disabled="disabled"
              @change="onEventType"
            />
            <EventSelection
              label="Historisches Event auswählen"
              ref="fromEventSelection"
              :eventType="eventType"
              :eventsURL="fromEventsURL"
              :disabled="disabled"
              showBookingGroups
              showDate
              @error="showError"
              @change="onFromEventSelection"
            />
            <EventSelection
              label="Prebooking Event auswählen"
              ref="toEventSelection"
              :eventType="eventType"
              :eventsURL="toEventsURL"
              :disabled="disabled"
              @error="showError"
              @change="onToEventSelection"
              class="mb-6"
            />
            <v-text-field
              v-model="subject"
              outlined
              label="Betreff"
            ></v-text-field>
            <v-textarea v-model="content" outlined label="Email"></v-textarea>
            <v-file-input
              outlined
              multiple
              v-model="attachments"
              prepend-icon=""
              :clearable="false"
              label="Anhänge auswählen"
            >
              <template v-slot:selection="{ index, text }">
                <v-chip
                  small
                  label
                  :color="!disabled ? 'primary' : ''"
                  :close="!disabled"
                  @click:close="attachments.splice(index, 1)"
                >
                  {{ text }}
                </v-chip>
              </template>
            </v-file-input>
          </v-form>
          <button-area :disabled="disabled" @send="send" @reset="reset" />
        </v-col>
      </v-row>
    </v-container>
    <notify ref="notify" />
  </Layout>
</template>

<script>
import axios from 'axios'
import ActionHeader from '~/components/ActionHeader.vue'
import ButtonArea from '~/components/ButtonArea.vue'
import EventSelection from '~/components/EventSelection.vue'
import EventTypeSelection from '~/components/EventTypeSelection.vue'
import Notify from '~/components/Notify.vue'
import { readFile } from '~/utils/actions.js'

export default {
  components: {
    ActionHeader,
    EventSelection,
    Notify,
    ButtonArea,
    EventTypeSelection,
  },
  metaInfo: {
    title: 'Batch Email',
  },
  data() {
    return {
      eventType: 'Fitness',
      attachments: [],
      fromEvent: null,
      toEvent: null,
      subject: '',
      content: '',
      bookingList: false,
      waitingList: false,
      disabled: false,
    }
  },
  computed: {
    fromEventsURL() {
      return (
        this.$page.metadata.loadEventsURL + '?status=running,finished,closed'
      )
    },
    toEventsURL() {
      return this.$page.metadata.loadEventsURL + '?status=review,published'
    },
  },
  methods: {
    onEventType(data) {
      this.subject = data.subject
      this.content = data.content
    },
    onFromEventSelection(data) {
      this.fromEvent = data.event
      this.bookingList = data.bookingList
      this.waitingList = data.waitingList
    },
    onToEventSelection(data) {
      this.toEvent = data.event
    },
    reset() {
      this.$refs.eventTypeSelection.reset()
      this.$refs.fromEventSelection.reset()
      this.$refs.toEventSelection.reset()
      this.attachments = []
      this.disabled = false
    },
    showError(error) {
      this.$refs.notify.showError(error)
    },
    async send() {
      this.disabled = true

      const data = {
        event_id: this.fromEvent.id,
        bookings: this.bookingList,
        waiting_list: this.waitingList,
        prebooking_event_id: this.toEvent.id,
        subject: this.subject,
        body: this.content,
      }
      if (this.attachments.length > 0) {
        data.attachments = []
        for (const file of this.attachments) {
          const attachment = {
            name: file.name,
            mime_type: file.type,
          }
          try {
            attachment.data = await readFile(file)
          } catch (error) {
            console.error(error)
            this.$refs.notify.showError(
              'Datei konnte nicht gelesen werden. Details siehe Console'
            )
            this.disabled = false
            return
          }
          data.attachments.push(attachment)
        }
      }

      try {
        await axios.post(this.$page.metadata.sendEmailsURL, { event: data })
      } catch (error) {
        console.error(error)
        this.$refs.notify.showError(
          'Senden fehlgeschlafen. Details siehe Console'
        )
        this.disabled = false
        return
      }

      this.$refs.notify.showSuccess('Alle Emails wurden erfolgreich versandt')
      this.reset()
    },
  },
}
</script>

<page-query>
query {
  metadata {
    sendEmailsURL
    loadEventsURL
  }
}
</page-query>
