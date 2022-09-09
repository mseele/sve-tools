<template>
  <Layout>
    <v-container>
      <action-header
        title="Pre-Booking Email"
        subtitle="Kursbuchung Email"
        :help="[
          'Alle benötigten Spalten (siehe oben) zusammen aus der Tabelle kopieren',
          'Es können nur Events/Kurse ausgewählt werden die intern als Beta bezeichnet sind (nicht öffentlich, nur über next.sv-eutingen.de erreichbar)',
          'Zur Linkerzeugung <b>${link}</b> in der Email nutzen',
          'Zur Event-Nameserzeugung <b>${name}</b> in der Email nutzen',
          'Zur Terminerzeugung <b>${dates}</b> in der Email nutzen',
          'Zur Preisanzeige <b>${cost_member}</b> und <b>${cost_non_member}</b> in der Email nutzen',
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
              label="Vorname, Nachname, Straße &amp; Nr, PLZ &amp; Ort, Email, Telefon u. SVE-Mitglied aus Excel kopieren"
              @paste="paste"
            ></v-text-field>
            <people-field v-else :disabled="disabled" v-model="people" />
            <v-autocomplete
              v-model="event"
              :items="events"
              outlined
              label="Event auswählen"
            ></v-autocomplete>
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
import { Base64 } from 'js-base64'
import axios from 'axios'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

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
      allEvents: [],
      events: [],
      event: null,
      subject: '',
      content: '',
      disabled: false,
    }
  },
  async mounted() {
    try {
      this.allEvents = await this.loadEvents()
      this.initEvents()
    } catch (error) {
      console.log(error)
      this.$refs.notify.showError(
        'Fehler beim Laden der Events. Details siehe Console'
      )
    }
  },
  methods: {
    async loadEvents() {
      const result = await axios.get(
        this.$page.metadata.loadEventsURL + '?status=review,published'
      )
      return result.data
    },
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
        if (parts.length !== 7) {
          console.log('Line could not be splitted into 7 parts: ' + parts)
          this.$refs.notify.showError(
            'Zeile ' +
              line +
              ' konnte nicht gelesen werden. Details siehe Console'
          )
          return
        }
        const email = parts[4]
        if (!validateEmail(email)) {
          console.log('Email address is not valid: ' + email)
          this.$refs.notify.showError(
            'Email Adresse ' + email + ' ist inkorrekt. Details siehe Console'
          )
          return
        }

        items.push({
          firstName: parts[0],
          lastName: parts[1],
          street: parts[2],
          city: parts[3],
          email: email,
          phone: parts[5],
          member: parts[6],
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
      this.initEvents()
    },
    reset() {
      this.$refs.from.reset()
      this.people = []
      this.attachments = []
      this.initEvents()
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
          content: this.createAndReplaceLink(
            replace(this.content, person),
            person
          ),
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
    initEvents() {
      this.event = null
      this.events = []
      const items = this.allEvents.filter((e) => e.type === this.from)
      for (const item of items) {
        this.events.push({ value: item.id, text: item.name })
      }
    },
    createAndReplaceLink(content, person) {
      const items = [
        this.event,
        person.firstName,
        person.lastName,
        person.street,
        person.city,
        person.email,
        person.phone,
        person.member,
      ]
      const hash = Base64.encode(items.join('#'))
      let url = 'https://www.sv-eutingen.de/'
      if (this.from === 'Fitness') {
        url += 'fitness/buchung'
      } else {
        url += 'events/buchung'
      }
      url += '?code=' + hash
      content = content.replace('${link}', url)

      // get all event properties
      const event = this.allEvents.find((e) => e.id === this.event)
      content = content.replace('${name}', event.name)
      content = content.replace(
        '${cost_member}',
        event.costMember.toLocaleString('de-DE', {
          style: 'currency',
          currency: 'EUR',
        })
      )
      content = content.replace(
        '${cost_non_member}',
        event.costNonMember.toLocaleString('de-DE', {
          style: 'currency',
          currency: 'EUR',
        })
      )

      if (event.dates != undefined && event.dates.length > 0) {
        content = content.replace(
          '${dates}',
          event.dates
            .map((d) =>
              format(parseISO(d), "'-' EE, dd. MMMM yyyy, H:mm 'Uhr'", {
                locale: de,
              })
            )
            .join('\n')
        )
      }

      return content
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
