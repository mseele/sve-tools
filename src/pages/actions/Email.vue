<template>
  <Layout>
    <v-container>
      <action-header
        title="Batch Email"
        subtitle="Individuelle Email"
        :help="[
          'Event auswählen',
          'Personengruppe auswählen (Buchungen und/oder Warteliste)',
          'Für Individualisierung <b>${firstname}</b> für den Vorname in der Email nutzen',
          'Für Individualisierung <b>${lastname}</b> für den Nachname in der Email nutzen',
          'Für Individualisierung <b>${name}</b> für den Event Name in der Email nutzen',
          'Für Individualisierung <b>${location}</b> für den Ort in der Email nutzen',
          'Für Individualisierung <b>${price}</b> für den Preis in der Email nutzen',
          'Für Individualisierung <b>${dates}</b> für die Termine in der Email nutzen',
          'Für Individualisierung <b>${payment_id}</b> für die Zahlungsnummer in der Email nutzen',
        ]"
      />
      <v-row>
        <v-col cols="12">
          <v-form :disabled="disabled">
            <EventSelection
              ref="eventSelection"
              :eventsURL="eventsURL"
              :disabled="disabled"
              :showBookingGroups="true"
              @error="showError"
              @change="eventSelectionChanged"
            />
            <v-text-field
              v-model="subject"
              outlined
              label="Betreff"
              :disabled="!editable"
            ></v-text-field>
            <v-textarea
              v-model="content"
              outlined
              label="Email"
              :disabled="!editable"
            ></v-textarea>
            <v-file-input
              outlined
              multiple
              v-model="attachments"
              prepend-icon=""
              :clearable="false"
              label="Anhänge auswählen"
              :disabled="!editable"
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

<style lang="scss">
.colored-border {
  border-color: rgba(0, 0, 0, 0.42) !important;
}
</style>

<script>
import ActionHeader from '~/components/ActionHeader.vue'
import EventSelection from '~/components/EventSelection.vue'
import Notify from '~/components/Notify.vue'
import PeopleField from '~/components/PeopleField.vue'
import ButtonArea from '~/components/ButtonArea.vue'
import FromSelect from '~/components/FromSelect.vue'
import { replace, readFile } from '~/utils/actions.js'
import axios from 'axios'

export default {
  components: {
    ActionHeader,
    EventSelection,
    Notify,
    PeopleField,
    ButtonArea,
    FromSelect,
  },
  metaInfo: {
    title: 'Batch Email',
  },
  data() {
    return {
      from: 'Fitness',
      attachments: [],
      event: null,
      subject: '',
      content: '',
      bookingList: false,
      waitingList: false,
      disabled: false,
    }
  },
  computed: {
    eventsURL() {
      return (
        this.$page.metadata.loadEventsURL + '?status=review,published,finished'
      )
    },
    editable() {
      return this.event != null
    },
  },
  methods: {
    eventSelectionChanged(data) {
      this.event = data.event
      this.bookingList = data.bookingList
      this.waitingList = data.waitingList
      this.subject = data.subject
      this.content = data.content
    },
    reset() {
      this.$refs.eventSelection.reset()
      this.attachments = []
      this.disabled = false
    },
    showError(error) {
      this.$refs.notify.showError(error)
    },
    async send() {
      this.disabled = true

      const data = {
        event_id: this.event.id,
        bookings: this.bookingList,
        waiting_list: this.waitingList,
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
    loadEventsURL
    sendEmailsURL
  }
}
</page-query>
