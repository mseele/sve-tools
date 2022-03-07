<template>
  <Layout>
    <v-container>
      <action-header
        title="Manage Events"
        subtitle="Events &amp; Fitnesskurse bearbeiten"
        :help="[
          'Hier können Events & Fitnesskurse bearbeitet werden',
          'Sheet ID & GID sind die Werte des Google Sheet Dokuments in welches die Buchungen gespeichert werden',
          'In der Beschreibung kann mit HTML-Tags z.B. für eine Liste oder eine fettgedruckte Schrift gerarbeitet werden',
        ]"
      />
      <v-row>
        <v-col cols="12">
          <from-select ref="from" v-model="from" />
          <div class="d-flex align-center">
            <v-autocomplete
              v-model="selection"
              :items="events"
              :item-value="eventValue"
              :item-text="eventName"
              outlined
              label="Event auswählen"
              hide-details
              :disabled="!readonly"
            >
              <template v-slot:item="data">
                <div class="d-flex align-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16pt"
                    height="21.333"
                  >
                    <path
                      d="M15.625 10a5.625 5.625 0 11-11.25 0 5.625 5.625 0 0111.25 0z"
                      :fill="
                        data.item.visible
                          ? data.item.beta
                            ? '#FBBF24'
                            : '#65A30D'
                          : '#DC2626'
                      "
                    />
                  </svg>
                  <div class="ml-2">{{ eventName(data.item) }}</div>
                </div>
              </template>
            </v-autocomplete>
            <v-dialog v-model="newDialog" persistent max-width="400">
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  color="primary"
                  :disabled="!readonly"
                  v-bind="attrs"
                  v-on="on"
                >
                  <v-icon>{{ mdiPlus }}</v-icon>
                </v-btn>
              </template>
              <v-card>
                <v-card-title class="text-h5">Neues Event</v-card-title>
                <v-card-text class="pb-0">
                  Bitte gib eine ID für das neue Event an:<br />
                  <v-form v-model="newDialogValid" class="mt-2">
                    <v-text-field
                      label="ID"
                      outlined
                      dense
                      v-model="dialogID"
                      :rules="rules.dialogID"
                    ></v-text-field>
                  </v-form>
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn
                    color="primary"
                    text
                    @click="
                      () => {
                        dialogID = null
                        newDialog = false
                      }
                    "
                  >
                    Abbrechen
                  </v-btn>
                  <v-btn
                    color="primary"
                    text
                    @click="onNew()"
                    :disabled="!newDialogValid"
                    >Starten</v-btn
                  >
                </v-card-actions>
              </v-card>
            </v-dialog>
            <v-btn
              icon
              color="primary"
              :disabled="selection == null || !readonly"
              @click="onEdit(false)"
            >
              <v-icon>{{ mdiPencil }}</v-icon>
            </v-btn>
            <v-dialog v-model="dupDialog" persistent max-width="400">
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  color="primary"
                  :disabled="selection == null || !readonly"
                  v-bind="attrs"
                  v-on="on"
                >
                  <v-icon>{{ mdiFileDocumentMultiple }}</v-icon>
                </v-btn>
              </template>
              <v-card>
                <v-card-title class="text-h5">Event duplizieren</v-card-title>
                <v-card-text class="pb-0">
                  Bitte gib eine ID für das zu duplizierende Event
                  <span class="font-weight-bold">{{
                    selection != null ? selection.name : selection
                  }}</span>
                  an:<br />
                  <v-form v-model="dupDialogValid" class="mt-2">
                    <v-text-field
                      label="ID"
                      outlined
                      dense
                      v-model="dialogID"
                      :rules="rules.dialogID"
                    ></v-text-field>
                  </v-form>
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn
                    color="primary"
                    text
                    @click="
                      () => {
                        dialogID = null
                        dupDialog = false
                      }
                    "
                  >
                    Abbrechen
                  </v-btn>
                  <v-btn
                    color="primary"
                    text
                    @click="onDuplicate()"
                    :disabled="!dupDialogValid"
                    >Duplizieren</v-btn
                  >
                </v-card-actions>
              </v-card>
            </v-dialog>
            <v-dialog v-model="deleteDialog" persistent max-width="400">
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  color="primary"
                  :disabled="selection == null || !readonly"
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
          <v-col cols="6">
            <v-text-field
              label="ID"
              outlined
              dense
              readonly
              v-model="selection.id"
            ></v-text-field>
          </v-col>
          <v-col cols="2">
            <v-text-field
              label="Sortier-Index"
              outlined
              dense
              :readonly="readonly"
              type="number"
              v-model.number="selection.sortIndex"
              :rules="rules.positiveNumber"
            ></v-text-field>
          </v-col>
          <v-col cols="4">
            <v-select
              :items="itemsVisibility"
              label="Sichtbarkeit"
              outlined
              dense
              :readonly="readonly"
              v-model="visibility"
            ></v-select>
          </v-col>
          <v-col cols="8">
            <v-text-field
              label="Sheet ID"
              outlined
              dense
              :readonly="readonly"
              v-model="selection.sheetId"
              :rules="rules.required"
            ></v-text-field>
          </v-col>
          <v-col cols="4">
            <v-text-field
              label="GID"
              outlined
              dense
              :readonly="readonly"
              type="number"
              v-model.number="selection.gid"
              :rules="rules.positiveNumber"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
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
            <v-select
              :items="eventImages"
              item-value="name"
              item-text="name"
              label="Bild"
              outlined
              dense
              :readonly="readonly"
              v-model="selection.image"
            >
              <template v-slot:item="data">
                <div class="d-flex align-center my-2">
                  <img
                    :src="require('~/assets/events/' + data.item.name)"
                    class="event-img"
                  />
                  <div class="ml-2">{{ data.item.name }}</div>
                </div>
              </template>
            </v-select>
          </v-col>
          <v-col cols="2">
            <v-select
              :items="trueFalse"
              label="Helle Schrift"
              outlined
              dense
              :readonly="readonly"
              v-model="selection.light"
            ></v-select>
          </v-col>
          <v-col cols="12">
            <v-textarea
              label="Kurze Beschreibung"
              outlined
              dense
              rows="3"
              :readonly="readonly"
              v-model="selection.shortDescription"
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
                  v-model="selection.customDate"
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
              v-model.number="selection.durationInMinutes"
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
              v-model.number="selection.costMember"
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
              v-model.number="selection.costNonMember"
              :rules="rules.positiveNumber"
            ></v-text-field>
          </v-col>
          <v-col cols="3">
            <v-text-field
              label="Maximale Teilnehmer"
              outlined
              dense
              :readonly="readonly"
              type="number"
              v-model.number="selection.maxSubscribers"
              :rules="rules.maxSubscribers"
            ></v-text-field>
          </v-col>
          <v-col cols="3">
            <v-text-field
              label="Teilnehmer"
              outlined
              dense
              :readonly="readonly"
              type="number"
              v-model.number="selection.subscribers"
              :rules="rules.subscribers"
            ></v-text-field>
          </v-col>
          <v-col cols="3"
            ><v-text-field
              label="Maximale Warteliste"
              outlined
              dense
              :readonly="readonly"
              type="number"
              v-model.number="selection.maxWaitingList"
              :rules="rules.positiveNumber"
            ></v-text-field>
          </v-col>
          <v-col cols="3">
            <v-text-field
              label="Warteliste"
              outlined
              dense
              :readonly="readonly"
              type="number"
              v-model.number="selection.waitingList"
              :rules="rules.waitingList"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              label="Alternativer Button Text"
              outlined
              dense
              :readonly="readonly"
              v-model="selection.altBookingButtonText"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              label="Alternative Versand-Emailadresse"
              outlined
              dense
              :readonly="readonly"
              v-model="selection.altEmailAddress"
              :rules="rules.altEmailAddress"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-checkbox
              label="Durchführung durch den Förderverein"
              :readonly="readonly"
              dense
              v-model="selection.externalOperator"
            ></v-checkbox>
          </v-col>
          <v-col cols="12">
            <v-textarea
              label="Buchungsemail"
              outlined
              dense
              rows="10"
              :readonly="readonly"
              v-model="selection.bookingTemplate"
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
              v-model="selection.waitingTemplate"
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
import { mdiPlus, mdiPencil, mdiDelete, mdiFileDocumentMultiple } from '@mdi/js'
import ActionHeader from '~/components/ActionHeader.vue'
import Notify from '~/components/Notify.vue'
import FromSelect from '~/components/FromSelect.vue'
import axios from 'axios'
import { parse, parseISO, format, isBefore, isValid, addDays } from 'date-fns'
import { isEqual, transform, cloneDeep } from 'lodash-es'

export default {
  components: {
    ActionHeader,
    Notify,
    FromSelect,
  },
  metaInfo: {
    title: 'Edit Events',
  },
  data() {
    return {
      from: 'Fitness',
      allEvents: [],
      selection: null,
      deleteDialog: false,
      newDialog: false,
      newDialogValid: false,
      dupDialog: false,
      dupDialogValid: false,
      dialogID: null,
      trueFalse: [
        { value: true, text: 'Ja' },
        { value: false, text: 'Nein' },
      ],
      itemsVisibility: [
        { value: 'visible', text: 'Sichtbar' },
        { value: 'beta', text: 'Beta' },
        { value: 'invisible', text: 'Unsichtbar' },
      ],
      mdiPlus,
      mdiPencil,
      mdiFileDocumentMultiple,
      mdiDelete,
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
            this.readonly || val > 0 || 'Eine positive Nummer wird benötigt',
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
        dialogID: [
          (val) => {
            if ((val || '').length == 0) {
              return 'Ein Wert wird benötigt'
            }
            if (this.events.findIndex((e) => e.id == val.trim()) >= 0) {
              return 'Diese ID existiert bereits'
            }
            if (val.trim().indexOf(' ') >= 0) {
              return 'Die ID darf keine Leerzeichen enthalten'
            }
            return true
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
  async mounted() {
    try {
      const res = await axios.get(this.$page.metadata.loadAllEventsURL)
      this.allEvents = res.data
    } catch (error) {
      console.log(error)
      this.$refs.notify.showError(
        'Fehler beim Laden der Events. Details siehe Console'
      )
    }
  },
  computed: {
    events() {
      return this.allEvents
        .filter((e) => e.type === this.from)
        .sort((a, b) => {
          if (a.visible && !b.visible) {
            return -1
          } else if (!a.visible && b.visible) {
            return 1
          }
          if (a.beta && !b.beta) {
            return 1
          } else if (!a.beta && b.beta) {
            return -1
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
    visibility: {
      get() {
        if (this.selection != null) {
          if (this.selection.visible && !this.selection.beta) {
            return 'visible'
          } else if (this.selection.visible && this.selection.beta) {
            return 'beta'
          }
          return 'invisible'
        }
        return undefined
      },
      set(value) {
        switch (value) {
          case 'visible':
            this.selection.visible = true
            this.selection.beta = false
            break
          case 'beta':
            this.selection.visible = true
            this.selection.beta = true
            break
          case 'invisible':
            this.selection.visible = false
            this.selection.beta = false
            break
        }
      },
    },
  },
  watch: {
    from() {
      this.selection = null
    },
    dateSelection() {
      this.selection.customDate = ''
    },
  },
  methods: {
    eventName(event) {
      let visibility
      if (event.visible && !event.beta) {
        visibility = 'Sichtbar'
      } else if (event.visible && event.beta) {
        visibility = 'Beta'
      } else {
        visibility = 'Unsichtbar'
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
    onNew() {
      this.newDialog = false
      this.selection = {
        id: this.dialogID,
        type: this.from,
        visible: false,
        beta: true,
        name: 'Neues Event',
        dates: [],
        light: false,
        subscribers: 0,
        waitingList: 0,
        externalOperator: false,
      }
      this.allEvents.push(this.selection)
      this.dialogID = null
      this.onEdit(true)
    },
    onEdit(isNew) {
      this.editNew = isNew
      this.editOriginal = JSON.parse(JSON.stringify(this.selection))
    },
    onDuplicate() {
      this.dupDialog = false
      const duplicate = cloneDeep(this.selection)
      duplicate.id = this.dialogID
      this.selection = duplicate
      this.allEvents.push(this.selection)
      this.dialogID = null
      this.onEdit(true)
      this.$refs.notify.showSuccess('Das Event wurde erfolgreich dupliziert')
    },
    async onDelete() {
      this.loading = true
      try {
        await axios.post(this.$page.metadata.deleteEventURL, this.selection)
        this.allEvents = (
          await axios.get(this.$page.metadata.loadAllEventsURL)
        ).data
        this.selection = null
        this.confirmSave = false
        this.editNew = false
        this.editOriginal = null
        this.dateToAdd = null
        this.$refs.notify.showSuccess('Das Event wurde erfolgreich gelöscht')
      } catch (error) {
        console.log(error)
        this.$refs.notify.showError(
          'Fehler beim Löschen des Events. Details siehe Console'
        )
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
      let objectToSave
      if (this.editNew) {
        objectToSave = this.selection
      } else {
        objectToSave = this.diff(this.selection, this.editOriginal)
        objectToSave.id = this.selection.id
      }
      this.loading = true
      try {
        const savedEvent = (
          await axios.post(this.$page.metadata.updateEventURL, objectToSave)
        ).data
        const fetchedEvents = (
          await axios.get(this.$page.metadata.loadAllEventsURL)
        ).data
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
        this.$refs.notify.showError(
          'Fehler beim Speichern des Events. Details siehe Console'
        )
      } finally {
        this.loading = false
      }
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
    loadAllEventsURL
    updateEventURL
    deleteEventURL
  }
  eventImages: allEventImages(sortBy: "name", order: ASC) {
    edges {
      node {
        name
      }
    }
  }
}
</page-query>
