<script setup lang="ts">
import { updateEvent } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { LifecycleStatus, type Event } from '@/types'
import { mdiPlus } from '@mdi/js'
import { addDays, format, isBefore, isValid, parseISO } from 'date-fns'
import { isEqual, transform } from 'lodash-es'
import { computed, ref } from 'vue'

interface Image {
  name: string
  light: boolean
  url: string
}

const images: Image[] = []
for (const url of Object.values(
  import.meta.glob('@/assets/events/*.jpg', { eager: true, as: 'url' })
)) {
  let text = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.jpg'))
  const name = text.substring(0, text.lastIndexOf('_')) + '.jpg'
  images.push({ name, light: text.endsWith('_light'), url })
}

const props = defineProps<{
  event: Event
}>()

const emit = defineEmits<{
  success: [event?: Event]
}>()

const notify = useNotifyStore()

const selection = ref<Event>(JSON.parse(JSON.stringify(props.event)))
const valid = ref(false)
const dateSelection = ref<'dates' | 'free_date'>(
  selection.value.custom_date != undefined ? 'free_date' : 'dates'
)
const dateToAdd = ref<string>('')
const confirmSave = ref(false)
const loading = ref(false)

const isDateToAddValid = computed(() => isValid(parseISO(dateToAdd.value)))

const costPerDate = computed({
  get: () => selection.value.cost_per_date,
  set: (value) => (selection.value.cost_per_date = typeof value === 'number' ? value : undefined)
})

function itemsStatus() {
  const all = [
    { value: LifecycleStatus.Draft, title: 'Entwurf (Unsichtbar)' },
    { value: LifecycleStatus.Review, title: 'Überprüfung (Beta)' },
    { value: LifecycleStatus.Published, title: 'Veröffentlicht (Sichtbar)' },
    { value: LifecycleStatus.Running, title: 'Laufend (Unsichtbar)' },
    { value: LifecycleStatus.Finished, title: 'Fertiggestellt (Unsichtbar)' },
    { value: LifecycleStatus.Closed, title: 'Abgeschlossen (Unsichtbar)' }
  ]
  let allowed: LifecycleStatus[] = [LifecycleStatus.Draft]
  switch (props.event.status) {
    case LifecycleStatus.Draft:
      allowed = [LifecycleStatus.Draft, LifecycleStatus.Review]
      break
    case LifecycleStatus.Review:
      allowed = [LifecycleStatus.Draft, LifecycleStatus.Review, LifecycleStatus.Published]
      break
    case 'Published':
      allowed = [LifecycleStatus.Published, LifecycleStatus.Running]
      break
    case 'Running':
      allowed = [LifecycleStatus.Running, LifecycleStatus.Finished]
      break
    case 'Finished':
      allowed = [LifecycleStatus.Finished, LifecycleStatus.Closed]
      break
    case 'Closed':
      allowed = [LifecycleStatus.Closed]
      break
  }
  return all.filter((v) => allowed.indexOf(v.value) != -1)
}

const eventImage = computed({
  get: () => images.find((v) => v.name == selection.value.image),
  set: (value?: Image) => {
    const eventImage = images.find((v) => v.name === value?.name)
    if (eventImage !== undefined) {
      selection.value.image = eventImage.name
      selection.value.light = eventImage.light
    }
  }
})

function formatDate(value: string) {
  const date = parseISO(value)
  const timezoneOffset = date.getTimezoneOffset() * 60000
  return format(new Date(date.getTime() + timezoneOffset), 'dd-MM-yyyy HH:mm')
}

function addDate() {
  const newDate = parseISO(dateToAdd.value)
  let index = 0
  for (const current of selection.value.dates) {
    if (isBefore(newDate, parseISO(current))) {
      break
    }
    index++
  }
  const dateString = format(newDate, "yyyy-MM-dd'T'HH:mm':00Z'")
  selection.value.dates.splice(index, 0, dateString)
  dateToAdd.value = format(addDays(newDate, 7), "yyyy-MM-dd'T'HH:mm")
}

function onReset() {
  emit('success', props.event.id !== undefined ? props.event : undefined)
  notify.showSuccess('Die Änderungen wurden erfolgreich zurückgesetzt')
}

async function onSave() {
  if (!confirmSave.value) {
    confirmSave.value = true
    return
  }
  loading.value = true
  try {
    if (dateSelection.value == 'dates') {
      selection.value.custom_date = undefined
    } else if (dateSelection.value == 'free_date') {
      selection.value.dates = []
    }
    let objectToSave
    if (props.event.id != null) {
      objectToSave = diff(selection.value, props.event)
      objectToSave.id = props.event.id
    } else {
      objectToSave = selection.value
    }
    const savedEvent = (await updateEvent(objectToSave.id, objectToSave)).data
    notify.showSuccess('Das Event wurde erfolgreich gespeichert')
    emit('success', savedEvent)
  } catch (error) {
    console.log(error)
    notify.showError('Fehler beim Speichern des Events. Details siehe Console')
  } finally {
    loading.value = false
  }
}

function diff<T extends object>(object: T, base: T) {
  function changes(object: T, base: T) {
    return transform(object, function (result: T, value, key) {
      if (!isEqual(value, base[key])) {
        result[key] = value
      }
    })
  }
  return changes(object, base)
}

const rules = {
  required: [(val: string) => (val || '').length > 0 || 'Ein Wert wird benötigt'],
  requiredPositiveNumber: [
    (val: any) => (val != '' && Number(val) >= 0) || 'Eine positive Nummer wird benötigt'
  ],
  positiveNumber: [
    (val: number) => val === undefined || val >= 0 || 'Eine positive Nummer wird benötigt'
  ],
  maxSubscribers: [
    (val: number) => {
      if (val == -1 || val > 0) {
        return true
      }
      return '-1 oder eine positive Nummer wird benötigt'
    }
  ],
  newEvent: [
    (val: any) => {
      if ((val || '').length == 0) {
        return 'Bitte wähle ein Event aus'
      }
      return true
    }
  ],
  altEmailAddress: [
    (val: any) => {
      if ((val || '').length > 0 && val !== 'jugendturnier@sv-eutingen.de') {
        return "Als alternative Email Adresse ist aktuell nur 'jugendturnier@sv-eutingen.de' möglich"
      }
      return true
    }
  ]
}
</script>

<template>
  <v-form v-model="valid">
    <v-row dense>
      <v-col cols="12">
        <v-text-field
          label="Name"
          variant="outlined"
          density="compact"
          v-model="selection.name"
          :rules="rules.required"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          label="Sortier-Index"
          variant="outlined"
          density="compact"
          type="number"
          v-model.number="selection.sort_index"
          :rules="rules.requiredPositiveNumber"
        />
      </v-col>
      <v-col cols="12" sm="5">
        <v-select
          :items="images"
          :item-value="(v) => v"
          item-title="name"
          label="Bild"
          variant="outlined"
          density="compact"
          v-model="eventImage"
        >
          <template v-slot:item="{ props, item }">
            <v-list-item v-bind="props" title="">
              <div class="d-flex align-center my-2">
                <img :src="item.raw.url" class="event-img" />
                <div class="ml-2">{{ item.raw.name }}</div>
              </div>
            </v-list-item>
          </template>
        </v-select>
      </v-col>
      <v-col cols="12" sm="5">
        <v-select
          :items="itemsStatus()"
          label="Status"
          variant="outlined"
          density="compact"
          v-model="selection.status"
        ></v-select>
      </v-col>
      <v-col cols="12">
        <v-textarea
          label="Kurze Beschreibung"
          variant="outlined"
          density="compact"
          rows="3"
          v-model="selection.short_description"
          :rules="rules.required"
        ></v-textarea>
      </v-col>
      <v-col cols="12">
        <v-textarea
          label="Beschreibung"
          variant="outlined"
          density="compact"
          rows="7"
          v-model="selection.description"
          :rules="rules.required"
        ></v-textarea>
      </v-col>
      <v-col cols="12">
        <v-tabs class="mb-2" v-model="dateSelection">
          <v-tab value="dates">Termine ({{ selection.dates.length }})</v-tab>
          <v-tab vvalue="free_date">Individuelles Datum (Freitext)</v-tab>
        </v-tabs>
        <v-window v-model="dateSelection">
          <v-window-item class="mt-2" value="dates">
            <div class="d-flex align-center mb-4">
              <v-text-field
                variant="outlined"
                density="compact"
                hide-details
                label="Datum hinzufügen"
                type="datetime-local"
                v-model="dateToAdd"
              ></v-text-field>
              <v-btn
                variant="text"
                size="small"
                icon
                color="primary"
                :disabled="!isDateToAddValid"
                @click="addDate"
              >
                <v-icon>{{ mdiPlus }}</v-icon>
              </v-btn>
            </div>
            <v-card class="pa-1 mb-6 colored-border" variant="outlined">
              <div
                v-if="selection.dates === undefined || selection.dates.length === 0"
                style="height: 40px"
              >
                &nbsp;
              </div>
              <v-chip
                v-for="(date, index) in selection.dates"
                class="ma-2"
                size="small"
                label
                closable
                color="primary"
                @click:close="selection.dates.splice(index, 1)"
                :key="date"
              >
                {{ formatDate(date) }}
              </v-chip>
            </v-card>
          </v-window-item>
          <v-window-item class="mt-2" value="free_date">
            <v-text-field
              variant="outlined"
              density="compact"
              rows="1"
              v-model="selection.custom_date"
            ></v-text-field>
          </v-window-item>
        </v-window>
      </v-col>
      <v-col cols="12">
        <v-text-field
          label="Ort"
          variant="outlined"
          density="compact"
          v-model="selection.location"
          :rules="rules.required"
        ></v-text-field>
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field
          label="Preis Mitglied €"
          variant="outlined"
          density="compact"
          type="number"
          v-model.number="selection.price_member"
          :rules="rules.requiredPositiveNumber"
        ></v-text-field>
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field
          label="Preis Nicht-Mitglied €"
          variant="outlined"
          density="compact"
          type="number"
          v-model.number="selection.price_non_member"
          :rules="rules.requiredPositiveNumber"
        ></v-text-field>
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field
          label="Kosten pro Einheit €"
          variant="outlined"
          density="compact"
          type="number"
          v-model.number="costPerDate"
          :rules="rules.positiveNumber"
        ></v-text-field>
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field
          label="Maximale Teilnehmer"
          variant="outlined"
          density="compact"
          type="number"
          v-model.number="selection.max_subscribers"
          :rules="rules.maxSubscribers"
        ></v-text-field>
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field
          label="Maximale Warteliste"
          variant="outlined"
          density="compact"
          type="number"
          v-model.number="selection.max_waiting_list"
          :rules="rules.requiredPositiveNumber"
        ></v-text-field>
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field
          label="Dauer in Minuten"
          variant="outlined"
          density="compact"
          type="number"
          v-model.number="selection.duration_in_minutes"
          :rules="rules.requiredPositiveNumber"
        ></v-text-field>
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          label="Alternativer Button Text"
          variant="outlined"
          density="compact"
          v-model="selection.alt_booking_button_text"
        ></v-text-field>
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          label="Alternative Versand-Emailadresse"
          variant="outlined"
          density="compact"
          v-model="selection.alt_email_address"
          :rules="rules.altEmailAddress"
        ></v-text-field>
      </v-col>
      <v-col cols="12">
        <v-checkbox
          label="Durchführung durch den Förderverein"
          density="compact"
          v-model="selection.external_operator"
        ></v-checkbox>
      </v-col>
      <v-col cols="12">
        <v-textarea
          label="Kontodaten"
          variant="outlined"
          density="compact"
          rows="3"
          v-model="selection.payment_account"
        ></v-textarea>
      </v-col>
      <v-col cols="12">
        <v-textarea
          label="Buchungsemail"
          variant="outlined"
          density="compact"
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

<style>
.colored-border {
  border-color: rgba(0, 0, 0, 0.42) !important;
}

.event-img {
  width: 120px;
  height: 70px;
  object-fit: cover;
}
</style>
