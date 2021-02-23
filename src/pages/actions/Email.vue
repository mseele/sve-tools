<template>
  <Layout>
    <v-container>
      <action-header
        title="Batch Email"
        subtitle="Individuelle Email"
        :help="[
          'Vorname, Nachname und Email-Adresse Spalten zusammen aus der Tabelle kopieren',
          'Für Individualisierung <b>${vorname}</b> oder <b>${firstname}</b> für den Vorname in der Email nutzen',
          'Für Individualisierung <b>${nachname}</b> oder <b>${lastname}</b> für den Nachname in der Email nutzen',
        ]"
      />
      <v-row>
        <v-col cols="12">
          <v-form :disabled="disabled">
            <from-select ref="from" v-model="from" @preset="preset" />
            <v-text-field
              v-if="people.length <= 0"
              outlined
              label="Vorname, Nachname u. Email Spalten aus Excel kopieren"
              @paste="paste"
            ></v-text-field>
            <people-field v-else :disabled="disabled" v-model="people" />
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

<style lang="scss">
.colored-border {
  border-color: rgba(0, 0, 0, 0.42) !important;
}
</style>

<script>
import ActionHeader from '~/components/ActionHeader.vue'
import Notify from '~/components/Notify.vue'
import PeopleField from '~/components/PeopleField.vue'
import ButtonArea from '~/components/ButtonArea.vue'
import FromSelect from '~/components/FromSelect.vue'
import { validateEmail, replace, readFile } from '~/utils/actions.js'
import axios from 'axios'

export default {
  components: {
    ActionHeader,
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
      people: [],
      attachments: [],
      subject: '',
      content: '',
      disabled: false,
    }
  },
  methods: {
    paste(event) {
      var clipboardData =
        event.clipboardData ||
        event.originalEvent.clipboardData ||
        window.clipboardData
      const text = clipboardData.getData('text')
      const items = []
      const lines = text.match(/[^\r\n]+/g)
      for (const line of lines) {
        var parts = line.split('\t')
        if (parts.length !== 3) {
          console.log('Line could not be splitted into 3 parts: ' + parts)
          this.$refs.notify.showError(
            'Zeile ' +
              line +
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
    preset(preset) {
      this.subject = preset.subject
      this.content = preset.content
    },
    reset() {
      this.$refs.from.reset()
      this.people = []
      this.attachments = []
      this.disabled = false
    },
    async send() {
      this.disabled = true
      const emails = []
      for (const person of this.people) {
        const data = {
          type: this.from,
          to: person.email,
          subject: this.subject,
          content: replace(this.content, person),
        }
        if (this.attachments.length > 0) {
          data.attachments = []
          for (const file of this.attachments) {
            const attachment = {
              name: file.name,
              mimeType: file.type,
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
        emails.push(data)
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
