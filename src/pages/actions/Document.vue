<template>
  <Layout>
    <v-container>
      <action-header
        title="Batch Dokument"
        subtitle="Individuelles Dokument per Email"
        :help="[
          'Namenskonvention für Dokumente: Vorname#Nachname#Email.pdf. Z.B.: Michael#Seele#mseele@gmail.com.pdf',
          'Dokumentenname ist der Name der in der Email angezeigt wird. Z.B.: Teilnahmebescheinigung.pdf',
          'Für Individualisierung <b>${vorname}</b> oder <b>${firstname}</b> für den Vorname in der Email nutzen',
          'Für Individualisierung <b>${nachname}</b> oder <b>${lastname}</b> für den Nachname in der Email nutzen',
        ]"
      />
      <v-row>
        <v-col cols="12">
          <v-form :disabled="disabled">
            <EventTypeSelection
              ref="eventTypeSelection"
              v-model="eventType"
              :disabled="disabled"
              @change="onEventTypeChange"
            />
            <v-file-input
              v-if="people.length <= 0"
              outlined
              multiple
              @change="fileSelection"
              prepend-icon=""
              label="Dokumente auswählen"
            ></v-file-input>
            <people-field v-else :disabled="disabled" v-model="people" />
            <v-text-field
              v-model="filename"
              outlined
              label="Dokumentname in Email"
            ></v-text-field>
            <v-text-field
              v-model="subject"
              outlined
              label="Betreff"
            ></v-text-field>
            <v-textarea v-model="content" outlined label="Email"></v-textarea>
          </v-form>
          <button-area
            :disabled="disabled"
            :people="people"
            @send="send"
            @reset="reset"
          />
        </v-col>
      </v-row>
    </v-container>
    <notify ref="notify" />
  </Layout>
</template>

<script>
import ActionHeader from '~/components/ActionHeader.vue'
import Notify from '~/components/Notify.vue'
import PeopleField from '~/components/PeopleField.vue'
import ButtonArea from '~/components/ButtonArea.vue'
import EventTypeSelection from '~/components/EventTypeSelection.vue'
import { validateEmail, replace, readFile } from '~/utils/actions.js'
import axios from 'axios'

export default {
  components: {
    ActionHeader,
    Notify,
    PeopleField,
    ButtonArea,
    EventTypeSelection,
  },
  metaInfo: {
    title: 'Batch Dokument',
  },
  data() {
    return {
      eventType: 'Fitness',
      files: [],
      people: [],
      filename: '',
      subject: '',
      content: '',
      disabled: false,
    }
  },
  methods: {
    fileSelection(files) {
      const items = []
      for (const file of files) {
        const name = file.name.split('.').slice(0, -1).join('.')
        var parts = name.split('#')
        if (parts.length !== 3) {
          console.log('File could not be splitted into 3 parts: ' + parts)
          this.$refs.notify.showError(
            'Datei ' +
              file.name +
              ' konnte nicht gelesen werden. Details siehe Console'
          )
          return
        }
        if (!validateEmail(parts[2])) {
          console.log('Email address is not valid: ' + parts[2])
          this.$refs.notify.showError(
            'Email Adresse ' +
              parts[2] +
              ' ist inkorrekt. Details siehe Console'
          )
          return
        }
        items.push({
          firstName: parts[0],
          lastName: parts[1],
          email: parts[2],
          file: file,
        })
      }
      if (items.length == 0) {
        console.log('No items found in text: ' + text)
        this.$refs.notify.showError(
          'Der kopierte Text konnte nicht verarbeitet werden. Details siehe Console'
        )
        return
      }
      this.people = items
    },
    onEventTypeChange(preset) {
      this.subject = preset.subject
      this.content = preset.content
    },
    reset() {
      this.$refs.eventTypeSelection.reset()
      this.people = []
      this.disabled = false
    },
    async send() {
      this.disabled = true
      const emails = []
      for (const person of this.people) {
        const attachment = {
          name: this.filename,
          mime_type: person.file.type,
        }
        try {
          attachment.data = await readFile(person.file)
        } catch (error) {
          console.error(error)
          this.$refs.notify.showError(
            'Datei konnte nicht gelesen werden. Details siehe Console'
          )
          this.disabled = false
          return
        }
        emails.push({
          type: this.eventType,
          to: person.email,
          subject: this.subject,
          content: replace(this.content, person),
          attachments: [attachment],
        })
      }
      try {
        await axios.post(this.$page.metadata.sendEmailsURL, { emails: emails })
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
  }
}
</page-query>
