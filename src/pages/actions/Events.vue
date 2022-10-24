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
            <CreateNew :eventType="eventType" @error="showError" @new="onNew" />
            <v-btn
              icon
              color="primary"
              :disabled="selection == null || !readonly"
              @click="onEdit(false)"
            >
              <v-icon>{{ mdiPencil }}</v-icon>
            </v-btn>
            <v-dialog v-model="deleteDialog" persistent max-width="400">
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  color="primary"
                  :disabled="
                    selection == null ||
                    selection.status != 'Draft' ||
                    !readonly
                  "
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
                    :loading="loading"
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
      <v-form v-if="selection != null" v-model="editValid" class="mt-8">
        <v-row dense>
          <v-col cols="12">
            <v-text-field
              label="Name"
              outlined
              dense
              :readonly="readonly"
              v-model="selection.name"
              :rules="rules.required"
            ></v-text-field>
          </v-col>
          <v-col cols="4">
            <v-text-field
              label="Sortier-Index"
              outlined
              dense
              :readonly="readonly"
              type="number"
              v-model.number="selection.sort_index"
              :rules="rules.positiveNumber"
            ></v-text-field>
          </v-col>
          <v-col cols="4">
            <v-select
              :items="eventImages"
              item-value="image"
              item-text="image"
              label="Bild"
              outlined
              dense
              :readonly="readonly"
              v-model="eventImage"
            >
              <template v-slot:item="data">
                <div class="d-flex align-center my-2">
                  <img
                    :src="require('~/assets/events/' + data.item.name)"
                    class="event-img"
                  />
                  <div class="ml-2">{{ data.item.image }}</div>
                </div>
              </template>
            </v-select>
          </v-col>
          <v-col cols="4">
            <v-select
              :items="itemsStatus"
              label="Status"
              outlined
              dense
              :readonly="readonly"
              v-model="selection.status"
            ></v-select>
          </v-col>
          <v-col cols="12">
            <v-textarea
              label="Kurze Beschreibung"
              outlined
              dense
              rows="3"
              :readonly="readonly"
              v-model="selection.short_description"
              :rules="rules.required"
            ></v-textarea>
          </v-col>
          <v-col cols="12">
            <v-textarea
              label="Beschreibung"
              outlined
              dense
              rows="7"
              :readonly="readonly"
              v-model="selection.description"
              :rules="rules.required"
            ></v-textarea>
          </v-col>
          <v-col cols="12">
            <v-tabs class="mb-2" v-model="dateSelection">
              <v-tab :disabled="readonly"
                >Termine ({{ selection.dates.length }})</v-tab
              >
              <v-tab :disabled="readonly">Individuelles Datum (Freitext)</v-tab>
            </v-tabs>
            <v-tabs-items v-model="dateSelection">
              <v-tab-item>
                <div class="d-flex align-center">
                  <v-text-field
                    label="Datum hinzufügen (DD-MM-YYYY HH:MM)"
                    v-model="dateToAdd"
                    :readonly="readonly"
                  ></v-text-field>
                  <v-btn
                    icon
                    color="primary"
                    :disabled="readonly || !isDateToAddValid"
                    @click="addDate()"
                  >
                    <v-icon>{{ mdiPlus }}</v-icon>
                  </v-btn>
                </div>
                <v-card class="pa-1 mb-6 colored-border" outlined>
                  <div
                    v-if="selection.dates && selection.dates.length == 0"
                    style="height: 40px"
                  >
                    &nbsp;
                  </div>
                  <v-chip
                    v-for="(date, index) in selection.dates"
                    class="ma-2"
                    small
                    label
                    :class="{ primary: !readonly }"
                    :close="!readonly"
                    @click:close="selection.dates.splice(index, 1)"
                    :key="index"
                  >
                    {{ formatDate(date) }}
                  </v-chip>
                </v-card>
              </v-tab-item>
              <v-tab-item>
                <v-text-field
                  outlined
                  dense
                  rows="1"
                  :readonly="readonly"
                  v-model="selection.custom_date"
                ></v-text-field>
              </v-tab-item>
            </v-tabs-items>
          </v-col>
          <v-col cols="12">
            <v-text-field
              label="Ort"
              outlined
              dense
              :readonly="readonly"
              v-model="selection.location"
              :rules="rules.required"
            ></v-text-field>
          </v-col>
          <v-col cols="4">
            <v-text-field
              label="Dauer in Minuten"
              outlined
              dense
              :readonly="readonly"
              type="number"
              v-model.number="selection.duration_in_minutes"
              :rules="rules.positiveNumber"
            ></v-text-field>
          </v-col>
          <v-col cols="4">
            <v-text-field
              label="Kosten Mitglied €"
              outlined
              dense
              :readonly="readonly"
              type="number"
              v-model.number="selection.cost_member"
              :rules="rules.positiveNumber"
            ></v-text-field>
          </v-col>
          <v-col cols="4">
            <v-text-field
              label="Kosten Nicht-Mitglied €"
              outlined
              dense
              :readonly="readonly"
              type="number"
              v-model.number="selection.cost_non_member"
              :rules="rules.positiveNumber"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              label="Maximale Teilnehmer"
              outlined
              dense
              :readonly="readonly"
              type="number"
              v-model.number="selection.max_subscribers"
              :rules="rules.maxSubscribers"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              label="Maximale Warteliste"
              outlined
              dense
              :readonly="readonly"
              type="number"
              v-model.number="selection.max_waiting_list"
              :rules="rules.positiveNumber"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              label="Alternativer Button Text"
              outlined
              dense
              :readonly="readonly"
              v-model="selection.alt_booking_button_text"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              label="Alternative Versand-Emailadresse"
              outlined
              dense
              :readonly="readonly"
              v-model="selection.alt_email_address"
              :rules="rules.altEmailAddress"
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-checkbox
              label="Durchführung durch den Förderverein"
              :readonly="readonly"
              dense
              v-model="selection.external_operator"
            ></v-checkbox>
          </v-col>
          <v-col cols="12">
            <v-textarea
              label="Buchungsemail"
              outlined
              dense
              rows="10"
              :readonly="readonly"
              v-model="selection.booking_template"
              :rules="rules.required"
            ></v-textarea>
          </v-col>
          <v-col cols="12">
            <v-textarea
              label="Wartelistenemail"
              outlined
              dense
              rows="10"
              :readonly="readonly"
              v-model="selection.waiting_template"
              :rules="rules.required"
            ></v-textarea>
          </v-col>
          <v-col cols="12">
            <div class="d-flex align-center">
              <v-progress-circular
                v-if="loading"
                size="32"
                rotate="-90"
                indeterminate
                color="light-blue"
              ></v-progress-circular>
              <v-spacer />
              <v-btn
                depressed
                class="mr-2"
                :disabled="readonly || loading"
                @click="onCancel()"
              >
                Abbrechen
              </v-btn>
              <v-btn
                depressed
                :color="confirmSave ? 'red' : 'primary'"
                :disabled="readonly || !editValid || loading"
                @click="onSave()"
              >
                {{ confirmSave ? 'Sicher?' : 'Speichern' }}
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-form>
    </v-container>
    <notify ref="notify" />
  </Layout>
</template>

<script>
import {
  mdiCheckboxBlankOutline,
  mdiCheckboxMarked,
  mdiDelete,
  mdiFileDocumentMultiple,
  mdiPencil,
  mdiPencilBoxMultiple,
  mdiPlus,
} from '@mdi/js'
import axios from 'axios'
import { addDays, format, isBefore, isValid, parse, parseISO } from 'date-fns'
import { isEqual, transform } from 'lodash-es'
import ActionHeader from '~/components/ActionHeader.vue'
import EventListItem from '~/components/EventListItem.vue'
import CreateNew from '~/components/events/CreateNew.vue'
import EventSelection from '~/components/EventSelection.vue'
import EventTypeSelection from '~/components/EventTypeSelection.vue'
import Notify from '~/components/Notify.vue'

// TODO: status finished needs another ui

export default {
  components: {
    ActionHeader,
    Notify,
    EventTypeSelection,
    EventSelection,
    EventListItem,
    CreateNew,
  },
  metaInfo: {
    title: 'Edit Events',
  },
  data() {
    return {
      eventType: 'Fitness',
      allEvents: [],
      closedEvents: [],
      selection: null,
      deleteDialog: false,
      trueFalse: [
        { value: true, text: 'Ja' },
        { value: false, text: 'Nein' },
      ],
      mdiPlus,
      mdiPencil,
      mdiFileDocumentMultiple,
      mdiDelete,
      mdiPencilBoxMultiple,
      mdiCheckboxMarked,
      mdiCheckboxBlankOutline,
      editOriginal: null,
      editNew: false,
      editValid: false,
      dateSelection: 0,
      dateToAdd: null,
      confirmSave: false,
      loading: false,
      rules: {
        required: [
          (val) =>
            this.readonly || (val || '').length > 0 || 'Ein Wert wird benötigt',
        ],
        positiveNumber: [
          (val) =>
            this.readonly || val >= 0 || 'Eine positive Nummer wird benötigt',
        ],
        maxSubscribers: [
          (val) => {
            if (this.readonly) {
              return true
            }
            if (val == -1 || val > 0) {
              return true
            }
            return '-1 oder eine positive Nummer wird benötigt'
          },
        ],
        subscribers: [
          (val) => {
            if (this.readonly) {
              return true
            }
            if (
              !this.selection.maxSubscribers ||
              (val >= 0 &&
                (this.selection.maxSubscribers == -1 ||
                  val <= this.selection.maxSubscribers))
            ) {
              return true
            }
            if (this.selection.maxSubscribers == -1) {
              return 'Ein Wert größer/gleich 0 wird benötigt'
            }
            return (
              'Ein Wert zwischen 0 und ' +
              this.selection.maxSubscribers +
              ' wird benötigt'
            )
          },
        ],
        waitingList: [
          (val) => {
            if (this.readonly) {
              return true
            }
            if (
              !this.selection.maxWaitingList ||
              (val >= 0 &&
                (this.selection.maxWaitingList == -1 ||
                  val <= this.selection.maxWaitingList))
            ) {
              return true
            }
            if (this.selection.maxWaitingList == -1) {
              return 'Ein Wert größer/gleich 0 wird benötigt'
            }
            return (
              'Ein Wert zwischen 0 und ' +
              this.selection.maxWaitingList +
              ' wird benötigt'
            )
          },
        ],
        altEmailAddress: [
          (val) => {
            if (
              (val || '').length > 0 &&
              val !== 'jugendturnier@sv-eutingen.de'
            ) {
              return "Als alternative Email Adresse ist aktuell nur 'jugendturnier@sv-eutingen.de' möglich"
            }
            return true
          },
        ],
      },
    }
  },
  computed: {
    eventsURL() {
      return (
        this.$page.metadata.loadEventsURL +
        '?status=draft,review,published,running,finished'
      )
    },
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
    eventImages() {
      return this.$page.eventImages.edges.map((edge) => edge.node)
    },
    readonly() {
      return this.editOriginal == null
    },
    isDateToAddValid() {
      return isValid(parse(this.dateToAdd, 'dd-MM-yyyy HH:mm', new Date()))
    },
    itemsStatus() {
      const all = [
        { value: 'Draft', text: 'Entwurf (Unsichtbar)' },
        { value: 'Review', text: 'Überprüfung (Beta)' },
        { value: 'Published', text: 'Veröffentlicht (Sichtbar)' },
        { value: 'Running', text: 'Laufend (Unsichtbar)' },
        { value: 'Finished', text: 'Fertiggestellt (Unsichtbar)' },
        { value: 'Closed', text: 'Abgeschlossen (Unsichtbar)' },
      ]
      if (this.selection == undefined) {
        return all
      }
      let allowed
      switch (this.selection.status) {
        case 'Draft':
          allowed = ['Draft', 'Review']
          break
        case 'Review':
          allowed = ['Review', 'Published']
          break
        case 'Published':
          allowed = ['Published', 'Running']
          break
        case 'Running':
          allowed = ['Running', 'Finished']
          break
        case 'Finished':
          allowed = ['Finished', 'Closed']
          break
        case 'Closed':
          allowed = ['Closed']
          break
      }
      if (allowed == undefined) {
        allowed = ['Draft']
      }
      return all.filter((v) => allowed.indexOf(v.value) != -1)
    },
    eventImage: {
      get() {
        if (this.selection != null) {
          return this.eventImages.find((v) => v.image == this.selection.image)
        }
        return undefined
      },
      set(value) {
        const eventImage = this.eventImages.find((v) => v.image == value)
        this.selection.image = eventImage.image
        this.selection.light = eventImage.light
      },
    },
  },
  watch: {
    eventType() {
      this.selection = null
    },
    dateSelection() {
      this.selection.custom_date = ''
    },
  },
  methods: {
    onEventSelection(data) {
      this.selection = data.event
    },
    async loadClosedEvents() {
      const result = await axios.get(this.$page.metadata.loadEventsURL)
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
    formatDate(value) {
      return format(parseISO(value), 'dd-MM-yyyy HH:mm')
    },
    addDate() {
      const newDate = parse(this.dateToAdd, 'dd-MM-yyyy HH:mm', new Date())
      let index = 0
      for (const current of this.selection.dates) {
        if (isBefore(newDate, parseISO(current))) {
          break
        }
        index++
      }
      const dateString = format(newDate, "yyyy-MM-dd'T'HH:mm:ss")
      this.selection.dates.splice(index, 0, dateString)
      this.dateToAdd = format(addDays(newDate, 7), 'dd-MM-yyyy HH:mm')
    },
    onNew(event) {
      this.$refs.eventSelection.addEvent(event)
    },
    onEdit(isNew) {
      this.editNew = isNew
      this.editOriginal = JSON.parse(JSON.stringify(this.selection))
    },
    async onDelete() {
      this.loading = true
      try {
        await axios.post(this.$page.metadata.deleteEventURL, this.selection)
        this.allEvents = await this.loadEvents()
        this.selection = null
        this.confirmSave = false
        this.editNew = false
        this.editOriginal = null
        this.dateToAdd = null
        this.$refs.notify.showSuccess('Das Event wurde erfolgreich gelöscht')
      } catch (error) {
        console.log(error)
        this.showError('Fehler beim Löschen des Events. Details siehe Console')
      } finally {
        this.deleteDialog = false
        this.loading = false
      }
    },
    onCancel() {
      if (this.editNew) {
        const index = this.allEvents.indexOf(this.selection)
        this.allEvents.splice(index, 1)
        this.selection = null
      } else {
        this.selection = this.editOriginal
      }
      this.confirmSave = false
      this.editNew = false
      this.editOriginal = null
      this.dateToAdd = null
    },
    async onSave() {
      if (!this.confirmSave) {
        this.confirmSave = true
        return
      }
      this.loading = true
      try {
        let objectToSave
        if (this.editNew) {
          objectToSave = this.selection
        } else {
          objectToSave = this.diff(this.selection, this.editOriginal)
          objectToSave.id = this.selection.id
        }
        const savedEvent = (
          await axios.post(this.$page.metadata.updateEventURL, objectToSave)
        ).data
        const fetchedEvents = await this.loadEvents()
        const index = fetchedEvents.findIndex((e) => e.id == savedEvent.id)
        this.allEvents = fetchedEvents
        this.selection = fetchedEvents[index]
        this.confirmSave = false
        this.editNew = false
        this.editOriginal = null
        this.dateToAdd = null
        this.$refs.notify.showSuccess('Das Event wurde erfolgreich gespeichert')
      } catch (error) {
        console.log(error)
        this.showError(
          'Fehler beim Speichern des Events. Details siehe Console'
        )
      } finally {
        this.loading = false
      }
    },
    showError(error) {
      this.$refs.notify.showError(error)
    },
    diff(object, base) {
      function changes(object, base) {
        return transform(object, function (result, value, key) {
          if (!isEqual(value, base[key])) {
            result[key] = value
          }
        })
      }
      return changes(object, base)
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
  },
}
</script>

<style lang="scss">
.colored-border {
  border-color: rgba(0, 0, 0, 0.42) !important;
}
.event-img {
  width: 120px;
  height: 70px;
  object-fit: cover;
}
</style>

<page-query>
query {
  metadata {
    loadEventsURL
    updateEventURL
    deleteEventURL
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
