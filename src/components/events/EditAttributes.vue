<template>
  <v-form v-if="selection != null" v-model="valid">
    <v-row dense>
      <v-col cols="12">
        <v-text-field
          label="Name"
          outlined
          dense
          v-model="selection.name"
          :rules="rules.required"
        ></v-text-field>
      </v-col>
      <v-col cols="4">
        <v-text-field
          label="Sortier-Index"
          outlined
          dense
          type="number"
          v-model.number="selection.sort_index"
          :rules="rules.requiredPositiveNumber"
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
          v-model="selection.status"
        ></v-select>
      </v-col>
      <v-col cols="12">
        <v-textarea
          label="Kurze Beschreibung"
          outlined
          dense
          rows="3"
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
          v-model="selection.description"
          :rules="rules.required"
        ></v-textarea>
      </v-col>
      <v-col cols="12">
        <v-tabs class="mb-2" v-model="dateSelection">
          <v-tab>Termine ({{ selection.dates.length }})</v-tab>
          <v-tab>Individuelles Datum (Freitext)</v-tab>
        </v-tabs>
        <v-tabs-items v-model="dateSelection">
          <v-tab-item>
            <div class="d-flex align-center">
              <v-text-field
                label="Datum hinzufügen (DD-MM-YYYY HH:MM)"
                v-model="dateToAdd"
              ></v-text-field>
              <v-btn
                icon
                color="primary"
                :disabled="!isDateToAddValid"
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
                close
                color="primary"
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
          v-model="selection.location"
          :rules="rules.required"
        ></v-text-field>
      </v-col>
      <v-col cols="4">
        <v-text-field
          label="Preis Mitglied €"
          outlined
          dense
          type="number"
          v-model.number="selection.price_member"
          :rules="rules.requiredPositiveNumber"
        ></v-text-field>
      </v-col>
      <v-col cols="4">
        <v-text-field
          label="Preis Nicht-Mitglied €"
          outlined
          dense
          type="number"
          v-model.number="selection.price_non_member"
          :rules="rules.requiredPositiveNumber"
        ></v-text-field>
      </v-col>
      <v-col cols="4">
        <v-text-field
          label="Kosten pro Einheit €"
          outlined
          dense
          type="number"
          :value="selection.cost_per_date"
          @input="
            selection.cost_per_date = $event !== '' ? parseFloat($event) : null
          "
          :rules="rules.positiveNumber"
        ></v-text-field>
      </v-col>
      <v-col cols="4">
        <v-text-field
          label="Maximale Teilnehmer"
          outlined
          dense
          type="number"
          v-model.number="selection.max_subscribers"
          :rules="rules.maxSubscribers"
        ></v-text-field>
      </v-col>
      <v-col cols="4">
        <v-text-field
          label="Maximale Warteliste"
          outlined
          dense
          type="number"
          v-model.number="selection.max_waiting_list"
          :rules="rules.requiredPositiveNumber"
        ></v-text-field>
      </v-col>
      <v-col cols="4">
        <v-text-field
          label="Dauer in Minuten"
          outlined
          dense
          type="number"
          v-model.number="selection.duration_in_minutes"
          :rules="rules.requiredPositiveNumber"
        ></v-text-field>
      </v-col>
      <v-col cols="6">
        <v-text-field
          label="Alternativer Button Text"
          outlined
          dense
          v-model="selection.alt_booking_button_text"
        ></v-text-field>
      </v-col>
      <v-col cols="6">
        <v-text-field
          label="Alternative Versand-Emailadresse"
          outlined
          dense
          v-model="selection.alt_email_address"
          :rules="rules.altEmailAddress"
        ></v-text-field>
      </v-col>
      <v-col cols="12">
        <v-checkbox
          label="Durchführung durch den Förderverein"
          dense
          v-model="selection.external_operator"
        ></v-checkbox>
      </v-col>
      <v-col cols="12">
        <v-textarea
          label="Kontodaten"
          outlined
          dense
          rows="3"
          v-model="selection.payment_account"
        ></v-textarea>
      </v-col>
      <v-col cols="12">
        <v-textarea
          label="Buchungsemail"
          outlined
          dense
          rows="10"
          v-model="selection.booking_template"
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
          <v-btn depressed class="mr-2" :disabled="loading" @click="onReset()">
            Zurücksetzen
          </v-btn>
          <v-btn
            depressed
            :color="confirmSave ? 'red' : 'primary'"
            :disabled="!valid || loading"
            @click="onSave()"
          >
            {{ confirmSave ? 'Sicher?' : 'Speichern' }}
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </v-form>
</template>

<script>
import { mdiPencil, mdiPlus } from '@mdi/js'
import axios from 'axios'
import { addDays, format, isBefore, isValid, parse, parseISO } from 'date-fns'
import { isEqual, transform } from 'lodash-es'

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
    eventImageNodes: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      selection: null,
      mdiPlus,
      mdiPencil,
      valid: false,
      dateSelection: 0,
      dateToAdd: null,
      confirmSave: false,
      loading: false,
      rules: {
        required: [(val) => (val || '').length > 0 || 'Ein Wert wird benötigt'],
        requiredPositiveNumber: [
          (val) =>
            (val != undefined && val != '' && val >= 0) ||
            'Eine positive Nummer wird benötigt',
        ],
        positiveNumber: [
          (val) => val >= 0 || 'Eine positive Nummer wird benötigt',
        ],
        maxSubscribers: [
          (val) => {
            if (val == -1 || val > 0) {
              return true
            }
            return '-1 oder eine positive Nummer wird benötigt'
          },
        ],
        subscribers: [
          (val) => {
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
        newEvent: [
          (val) => {
            if ((val || '').length == 0) {
              return 'Bitte wähle ein Event aus'
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
  mounted() {
    this.selection = JSON.parse(JSON.stringify(this.event))
    if (this.selection.custom_date != undefined) {
      this.dateSelection = 1
    }
  },
  computed: {
    eventImages() {
      return this.eventImageNodes.edges.map((edge) => edge.node)
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
      if (this.event == undefined) {
        return all
      }
      let allowed
      switch (this.event.status) {
        case 'Draft':
          allowed = ['Draft', 'Review']
          break
        case 'Review':
          allowed = ['Draft', 'Review', 'Published']
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
        return this.eventImages.find((v) => v.image == this.selection.image)
      },
      set(value) {
        const eventImage = this.eventImages.find((v) => v.image == value)
        this.selection.image = eventImage.image
        this.selection.light = eventImage.light
      },
    },
  },
  methods: {
    formatDate(value) {
      const date = parseISO(value)
      const timezoneOffset = date.getTimezoneOffset() * 60000
      return format(
        new Date(date.getTime() + timezoneOffset),
        'dd-MM-yyyy HH:mm'
      )
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
      const dateString = format(newDate, "yyyy-MM-dd'T'HH:mm:ss'Z")
      this.selection.dates.splice(index, 0, dateString)
      this.dateToAdd = format(addDays(newDate, 7), 'dd-MM-yyyy HH:mm')
    },
    onReset() {
      const message = 'Die Änderungen wurden erfolgreich zurückgesetzt'
      if (this.event.id != null) {
        this.$emit('success', this.event, message)
      } else {
        this.$emit('success', null, message)
      }
    },
    async onSave() {
      if (!this.confirmSave) {
        this.confirmSave = true
        return
      }
      this.loading = true
      try {
        if (this.dateSelection == 0) {
          this.selection.custom_date = undefined
        } else if (this.dateSelection == 1) {
          this.selection.dates = []
        }
        let objectToSave
        if (this.event.id != null) {
          objectToSave = this.diff(this.selection, this.event)
          objectToSave.id = this.event.id
        } else {
          objectToSave = this.selection
        }
        const savedEvent = (await axios.post(this.updateEventURL, objectToSave))
          .data
        this.$emit(
          'success',
          savedEvent,
          'Das Event wurde erfolgreich gespeichert'
        )
      } catch (error) {
        console.log(error)
        this.$emit(
          'error',
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
