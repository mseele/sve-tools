<template>
  <v-row class="my-5" justify="center">
    <v-col cols="10">
      <v-alert
        prominent
        :color="
          confirmParticipationConfirmation ? 'red lighten-2' : 'blue lighten-4'
        "
        dense
      >
        <v-row align="center">
          <v-col class="grow">Teilnahmebestätigungen senden</v-col>
          <v-col class="shrink">
            <v-btn
              :loading="loadingParticipationConfirmation"
              :disabled="loadingParticipationConfirmation"
              @click="sendParticipationConfirmation()"
              >{{
                confirmParticipationConfirmation ? 'Sicher?' : 'Starten'
              }}</v-btn
            >
          </v-col>
        </v-row>
      </v-alert>
      <v-alert
        prominent
        :color="confirmClose ? 'red lighten-2' : 'blue lighten-4'"
        dense
      >
        <v-row align="center">
          <v-col class="grow">Event abschließen</v-col>
          <v-col class="shrink">
            <v-btn
              :loading="loadingClose"
              :disabled="loadingClose"
              @click="closeEvent()"
              >{{ confirmClose ? 'Sicher?' : 'Starten' }}</v-btn
            >
          </v-col>
        </v-row>
      </v-alert>
    </v-col>
  </v-row>
</template>

<script>
import axios from 'axios'

export default {
  props: {
    event: {
      type: Object,
      required: true,
    },
    updateEventURL: {
      type: String,
      required: true,
    },
    sendParticipationConfirmationURL: {
      type: String,
      required: true,
    },
    eventImageNodes: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      confirmClose: false,
      loadingClose: false,
      confirmParticipationConfirmation: false,
      loadingParticipationConfirmation: false,
    }
  },
  methods: {
    async sendParticipationConfirmation() {
      if (!this.confirmParticipationConfirmation) {
        this.confirmParticipationConfirmation = true
        return
      }
      this.confirmParticipationConfirmation = false
      this.loadingParticipationConfirmation = true
      try {
        await axios.get(this.sendParticipationConfirmationURL + this.event.id)
        this.$emit(
          'success',
          this.event,
          'Die Teilnahmebestätigungen wurden erfolgreich versandt.'
        )
      } catch (error) {
        console.error(error)
        this.$emit(
          'error',
          'Teilnahmebestätigungen senden ist fehlgeschlagen. Details siehe Console'
        )
      } finally {
        this.loadingParticipationConfirmation = false
      }
    },
    async closeEvent() {
      if (!this.confirmClose) {
        this.confirmClose = true
        return
      }
      this.confirmClose = false
      this.loadingClose = true
      try {
        await axios.post(this.updateEventURL, {
          id: this.event.id,
          status: 'Closed',
        })
        this.$emit('success', null, 'Das Event wurde erfolgreich geschlossen.')
      } catch (error) {
        console.error(error)
        this.$emit(
          'error',
          'Event schließen ist fehlgeschlagen. Details siehe Console'
        )
      } finally {
        this.loadingClose = false
      }
    },
  },
}
</script>
