<script setup lang="ts">
import { updateEvent } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { LifecycleStatus, PaymentMethod, type Event, type EventCustomField } from '@/types'
import { firstRuleError } from '@/utils'
import { format, parseISO } from 'date-fns'
import { isEqual, transform } from 'lodash-es'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Chip from 'primevue/chip'
import DatePicker from 'primevue/datepicker'
import IftaLabel from 'primevue/iftalabel'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import MultiSelect from 'primevue/multiselect'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Textarea from 'primevue/textarea'
import { computed, ref, useId } from 'vue'

interface Image {
  name: string
  light: boolean
  url: string
}

// The number inputs model an emptied field as null and edit the string-typed
// prices numerically, while the event object uses undefined for absent values
// and carries the prices as strings. The editable draft widens those fields
// so the null normalization stays type-safe; the draft is assignable to the
// Partial<Event> that updateEvent() accepts, which is the boundary where it
// flows back into the event.
interface EventDraftFields {
  sort_index?: number
  price_member?: string
  price_non_member?: string
  max_subscribers?: number
  max_waiting_list?: number
  duration_in_minutes?: number
}

type EventDraft = Omit<Event, keyof EventDraftFields> & EventDraftFields

const images: Image[] = []
for (const url of Object.values(
  import.meta.glob('@/assets/events/*.jpg', { eager: true, query: '?url', import: 'default' })
) as string[]) {
  let text = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.jpg'))
  const name = text.substring(0, text.lastIndexOf('_')) + '.jpg'
  images.push({ name, light: text.endsWith('_light'), url })
}

const props = defineProps<{
  event: Event
  customFields: EventCustomField[]
}>()

const emit = defineEmits<{
  success: [event?: Event]
}>()

const notify = useNotifyStore()
const uid = useId()

const selection = ref<EventDraft>(JSON.parse(JSON.stringify(props.event)))
selection.value.manager_recipients ??= []
const dateSelection = ref<'dates' | 'free_date'>(
  selection.value.custom_date != undefined ? 'free_date' : 'dates'
)
const confirmSave = ref(false)
const loading = ref(false)

// InputNumber models an emptied field as null while the event object uses
// undefined for absent numbers, which the rule functions treat as invalid.
// Normalize null back on write.
const sortIndex = computed<number | null>({
  get: () => selection.value.sort_index ?? null,
  set: (value) => (selection.value.sort_index = value ?? undefined)
})

// The event carries the prices as strings; the number input edits them
// numerically, so convert at the boundary. A cleared input becomes an
// absent value exactly like the number fields above.
const priceMember = computed<number | null>({
  get: () => {
    const value = Number(selection.value.price_member)
    return Number.isNaN(value) ? null : value
  },
  set: (value) => (selection.value.price_member = value === null ? undefined : String(value))
})

const priceNonMember = computed<number | null>({
  get: () => {
    const value = Number(selection.value.price_non_member)
    return Number.isNaN(value) ? null : value
  },
  set: (value) => (selection.value.price_non_member = value === null ? undefined : String(value))
})

const costPerDate = computed<number | null>({
  get: () => selection.value.cost_per_date ?? null,
  set: (value) => (selection.value.cost_per_date = typeof value === 'number' ? value : undefined)
})

const maxSubscribers = computed<number | null>({
  get: () => selection.value.max_subscribers ?? null,
  set: (value) => (selection.value.max_subscribers = value ?? undefined)
})

const maxWaitingList = computed<number | null>({
  get: () => selection.value.max_waiting_list ?? null,
  set: (value) => (selection.value.max_waiting_list = value ?? undefined)
})

const durationInMinutes = computed<number | null>({
  get: () => selection.value.duration_in_minutes ?? null,
  set: (value) => (selection.value.duration_in_minutes = value ?? undefined)
})

// The stored dates are local wall-clock strings with a literal Z suffix; the
// DatePicker works with real Date objects, so convert at the boundary exactly
// like the display formatting below does.
const dateModel = computed<Date[]>({
  get: () => selection.value.dates.map(toModelDate),
  set: (value) => {
    selection.value.dates = value.map((date) => format(date, "yyyy-MM-dd'T'HH:mm':00Z'")).sort()
  }
})

function toModelDate(value: string) {
  const date = parseISO(value)
  const timezoneOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() + timezoneOffset)
}

function removeDate(index: number) {
  selection.value.dates.splice(index, 1)
}

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

function itemsPaymentMethod() {
  return [
    { value: PaymentMethod.BankTransfer, title: 'Überweisung' },
    { value: PaymentMethod.SepaDirectDebit, title: 'SEPA-Lastschrift' }
  ]
}

function itemsCustomFields() {
  return props.customFields.map((field) => ({
    value: field,
    title: field.name
  }))
}

const customFields = computed<EventCustomField[]>({
  get: () =>
    props.customFields.filter((field) =>
      selection.value.custom_fields.map((v) => v.id).includes(field.id)
    ),
  set: (value) => {
    if (Array.isArray(value)) {
      selection.value.custom_fields = value
    } else {
      selection.value.custom_fields = []
    }
  }
})

const eventImage = computed<Image | undefined>({
  get: () => images.find((v) => v.name == selection.value.image),
  set: (value) => {
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
    const savedEvent = await updateEvent(objectToSave.id, objectToSave)
    notify.showSuccess('Das Event wurde erfolgreich gespeichert')
    emit('success', savedEvent)
  } catch (error) {
    if (error !== null) {
      console.log(error)
      notify.showError('Fehler beim Speichern des Events. Details siehe Console')
    }
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
  required: [
    (val: unknown) => (typeof val === 'string' && val.length > 0) || 'Ein Wert wird benötigt'
  ],
  requiredPositiveNumber: [
    (val: unknown) =>
      val === 0 || (val != '' && Number(val) >= 0) || 'Eine positive Nummer wird benötigt'
  ],
  positiveNumber: [
    (val: unknown) =>
      val === undefined ||
      (typeof val === 'number' && val >= 0) ||
      'Eine positive Nummer wird benötigt'
  ],
  maxSubscribers: [
    (val: unknown) => {
      if (val == -1 || (typeof val === 'number' && val > 0)) {
        return true
      }
      return '-1 oder eine positive Nummer wird benötigt'
    }
  ],
  newEvent: [
    (val: unknown) => {
      if (typeof val !== 'string' || val.length == 0) {
        return 'Bitte wähle ein Event aus'
      }
      return true
    }
  ],
  altEmailAddress: [
    (val: unknown) => {
      if (typeof val === 'string' && val.length > 0 && val !== 'jugendturnier@sv-eutingen.de') {
        return "Als alternative Email Adresse ist aktuell nur 'jugendturnier@sv-eutingen.de' möglich"
      }
      return true
    }
  ],
  customFields: [
    (val: unknown) =>
      (Array.isArray(val) && val.length <= 4) || 'Bitte wähle maximal 4 Zusatzfelder aus'
  ]
}

// PrimeVue has no form-level rules, so the rule functions above are
// evaluated manually to reproduce the previous form validity exactly.
const errors = computed(() => ({
  name: firstRuleError(rules.required, selection.value.name),
  sortIndex: firstRuleError(rules.requiredPositiveNumber, selection.value.sort_index),
  shortDescription: firstRuleError(rules.required, selection.value.short_description),
  description: firstRuleError(rules.required, selection.value.description),
  location: firstRuleError(rules.required, selection.value.location),
  priceMember: firstRuleError(rules.requiredPositiveNumber, selection.value.price_member),
  priceNonMember: firstRuleError(rules.requiredPositiveNumber, selection.value.price_non_member),
  costPerDate: firstRuleError(rules.positiveNumber, selection.value.cost_per_date),
  maxSubscribers: firstRuleError(rules.maxSubscribers, selection.value.max_subscribers),
  maxWaitingList: firstRuleError(rules.requiredPositiveNumber, selection.value.max_waiting_list),
  duration: firstRuleError(rules.requiredPositiveNumber, selection.value.duration_in_minutes),
  altEmailAddress: firstRuleError(rules.altEmailAddress, selection.value.alt_email_address),
  customFields: firstRuleError(rules.customFields, customFields.value),
  bookingTemplate: firstRuleError(rules.required, selection.value.booking_template)
}))

const valid = computed(() => Object.values(errors.value).every((error) => error === undefined))
</script>

<template>
  <div class="form-grid">
    <div>
      <IftaLabel>
        <InputText
          :id="`${uid}-name`"
          v-model="selection.name"
          fluid
          :invalid="errors.name !== undefined"
        />
        <label :for="`${uid}-name`">Name</label>
      </IftaLabel>
      <div v-if="errors.name" class="field-error">{{ errors.name }}</div>
    </div>
    <div class="col-sm-2">
      <IftaLabel>
        <InputNumber
          :inputId="`${uid}-sort-index`"
          v-model="sortIndex"
          fluid
          :useGrouping="false"
          :invalid="errors.sortIndex !== undefined"
        />
        <label :for="`${uid}-sort-index`">Sortier-Index</label>
      </IftaLabel>
      <div v-if="errors.sortIndex" class="field-error">{{ errors.sortIndex }}</div>
    </div>
    <div class="col-sm-5">
      <IftaLabel>
        <Select
          :inputId="`${uid}-image`"
          v-model="eventImage"
          :options="images"
          optionLabel="name"
          placeholder="Bild"
          fluid
        >
          <template #option="{ option }">
            <div class="image-option">
              <img :src="option.url" class="event-img" />
              <span>{{ option.name }}</span>
            </div>
          </template>
        </Select>
        <label :for="`${uid}-image`">Bild</label>
      </IftaLabel>
    </div>
    <div class="col-sm-5">
      <IftaLabel>
        <Select
          :inputId="`${uid}-status`"
          v-model="selection.status"
          :options="itemsStatus()"
          optionLabel="title"
          optionValue="value"
          fluid
        />
        <label :for="`${uid}-status`">Status</label>
      </IftaLabel>
    </div>
    <div>
      <IftaLabel>
        <Textarea
          :id="`${uid}-short-description`"
          v-model="selection.short_description"
          rows="3"
          fluid
          :invalid="errors.shortDescription !== undefined"
        />
        <label :for="`${uid}-short-description`">Kurze Beschreibung</label>
      </IftaLabel>
      <div v-if="errors.shortDescription" class="field-error">{{ errors.shortDescription }}</div>
    </div>
    <div>
      <DescriptionEditor
        label="Beschreibung"
        v-model="selection.description"
        :rules="rules.required"
      />
    </div>
    <div>
      <Tabs v-model:value="dateSelection" class="date-tabs">
        <TabList>
          <Tab value="dates">Termine ({{ selection.dates.length }})</Tab>
          <Tab value="free_date">Individuelles Datum (Freitext)</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="dates" class="date-tab-panel">
            <DatePicker
              v-model="dateModel"
              selectionMode="multiple"
              showTime
              hourFormat="24"
              dateFormat="dd.mm.yy"
              placeholder="Datum hinzufügen"
              fluid
            />
            <div class="chips-box">
              <div
                v-if="selection.dates === undefined || selection.dates.length === 0"
                class="chips-empty"
              >
                &nbsp;
              </div>
              <Chip
                v-for="(date, index) in selection.dates"
                :key="date"
                class="date-chip"
                :label="formatDate(date)"
                removable
                @remove="removeDate(index)"
              />
            </div>
          </TabPanel>
          <TabPanel value="free_date" class="date-tab-panel">
            <InputText
              :id="`${uid}-custom-date`"
              v-model="selection.custom_date"
              placeholder="Individuelles Datum"
              fluid
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
    <div>
      <IftaLabel>
        <InputText
          :id="`${uid}-location`"
          v-model="selection.location"
          fluid
          :invalid="errors.location !== undefined"
        />
        <label :for="`${uid}-location`">Ort</label>
      </IftaLabel>
      <div v-if="errors.location" class="field-error">{{ errors.location }}</div>
    </div>
    <div>
      <IftaLabel>
        <Select
          :inputId="`${uid}-payment-method`"
          v-model="selection.payment_method"
          :options="itemsPaymentMethod()"
          optionLabel="title"
          optionValue="value"
          fluid
        />
        <label :for="`${uid}-payment-method`">Zahlungsmethode</label>
      </IftaLabel>
    </div>
    <div class="col-sm-4">
      <IftaLabel>
        <InputNumber
          :inputId="`${uid}-price-member`"
          v-model="priceMember"
          fluid
          :useGrouping="false"
          :invalid="errors.priceMember !== undefined"
        />
        <label :for="`${uid}-price-member`">Preis Mitglied €</label>
      </IftaLabel>
      <div v-if="errors.priceMember" class="field-error">{{ errors.priceMember }}</div>
    </div>
    <div class="col-sm-4">
      <IftaLabel>
        <InputNumber
          :inputId="`${uid}-price-non-member`"
          v-model="priceNonMember"
          fluid
          :useGrouping="false"
          :invalid="errors.priceNonMember !== undefined"
        />
        <label :for="`${uid}-price-non-member`">Preis Nicht-Mitglied €</label>
      </IftaLabel>
      <div v-if="errors.priceNonMember" class="field-error">{{ errors.priceNonMember }}</div>
    </div>
    <div class="col-sm-4">
      <IftaLabel>
        <InputNumber
          :inputId="`${uid}-cost-per-date`"
          v-model="costPerDate"
          fluid
          :useGrouping="false"
          :invalid="errors.costPerDate !== undefined"
        />
        <label :for="`${uid}-cost-per-date`">Kosten pro Einheit €</label>
      </IftaLabel>
      <div v-if="errors.costPerDate" class="field-error">{{ errors.costPerDate }}</div>
    </div>
    <div class="col-sm-4">
      <IftaLabel>
        <InputNumber
          :inputId="`${uid}-max-subscribers`"
          v-model="maxSubscribers"
          fluid
          :useGrouping="false"
          :invalid="errors.maxSubscribers !== undefined"
        />
        <label :for="`${uid}-max-subscribers`">Maximale Teilnehmer</label>
      </IftaLabel>
      <div v-if="errors.maxSubscribers" class="field-error">{{ errors.maxSubscribers }}</div>
    </div>
    <div class="col-sm-4">
      <IftaLabel>
        <InputNumber
          :inputId="`${uid}-max-waiting-list`"
          v-model="maxWaitingList"
          fluid
          :useGrouping="false"
          :invalid="errors.maxWaitingList !== undefined"
        />
        <label :for="`${uid}-max-waiting-list`">Maximale Warteliste</label>
      </IftaLabel>
      <div v-if="errors.maxWaitingList" class="field-error">{{ errors.maxWaitingList }}</div>
    </div>
    <div class="col-sm-4">
      <IftaLabel>
        <InputNumber
          :inputId="`${uid}-duration`"
          v-model="durationInMinutes"
          fluid
          :useGrouping="false"
          :invalid="errors.duration !== undefined"
        />
        <label :for="`${uid}-duration`">Dauer in Minuten</label>
      </IftaLabel>
      <div v-if="errors.duration" class="field-error">{{ errors.duration }}</div>
    </div>
    <div class="col-sm-6">
      <IftaLabel>
        <InputText
          :id="`${uid}-alt-button-text`"
          v-model="selection.alt_booking_button_text"
          fluid
        />
        <label :for="`${uid}-alt-button-text`">Alternativer Button Text</label>
      </IftaLabel>
    </div>
    <div class="col-sm-6">
      <IftaLabel>
        <InputText
          :id="`${uid}-alt-email`"
          v-model="selection.alt_email_address"
          fluid
          :invalid="errors.altEmailAddress !== undefined"
        />
        <label :for="`${uid}-alt-email`">Alternative Versand-Emailadresse</label>
      </IftaLabel>
      <div v-if="errors.altEmailAddress" class="field-error">{{ errors.altEmailAddress }}</div>
    </div>
    <div>
      <ManagerRecipients v-model="selection.manager_recipients" />
    </div>
    <div>
      <IftaLabel>
        <MultiSelect
          :inputId="`${uid}-custom-fields`"
          v-model="customFields"
          :options="itemsCustomFields()"
          optionLabel="title"
          optionValue="value"
          :maxSelectedLabels="4"
          placeholder="Zusatzfelder"
          fluid
          :invalid="errors.customFields !== undefined"
        />
        <label :for="`${uid}-custom-fields`">Zusatzfelder</label>
      </IftaLabel>
      <div v-if="errors.customFields" class="field-error">{{ errors.customFields }}</div>
    </div>
    <div class="checkbox-row">
      <Checkbox
        v-model="selection.external_operator"
        binary
        :inputId="`${uid}-external-operator`"
      />
      <label :for="`${uid}-external-operator`">Durchführung durch den Förderverein</label>
    </div>
    <div>
      <IftaLabel>
        <Textarea
          :id="`${uid}-payment-account`"
          v-model="selection.payment_account"
          rows="3"
          fluid
        />
        <label :for="`${uid}-payment-account`">Kontodaten</label>
      </IftaLabel>
    </div>
    <div>
      <IftaLabel>
        <Textarea
          :id="`${uid}-booking-template`"
          v-model="selection.booking_template"
          rows="10"
          fluid
          :invalid="errors.bookingTemplate !== undefined"
        />
        <label :for="`${uid}-booking-template`">Buchungsemail</label>
      </IftaLabel>
      <div v-if="errors.bookingTemplate" class="field-error">{{ errors.bookingTemplate }}</div>
    </div>
    <div class="actions">
      <ProgressSpinner v-if="loading" style="width: 32px; height: 32px" strokeWidth="4" />
      <Button
        label="Zurücksetzen"
        class="reset-button uppercase"
        :disabled="loading"
        @click="onReset()"
      />
      <Button
        :label="confirmSave ? 'Sicher?' : 'Speichern'"
        class="save-button uppercase"
        :severity="confirmSave ? 'danger' : 'primary'"
        :disabled="!valid || loading"
        @click="onSave()"
      />
    </div>
  </div>
</template>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  column-gap: 16px;
  row-gap: 12px;
}

.form-grid > * {
  grid-column: 1 / -1;
}

/* 600px is the sm breakpoint for the old column split layout. */
@media (min-width: 600px) {
  .col-sm-2 {
    grid-column: span 2;
  }

  .col-sm-4 {
    grid-column: span 4;
  }

  .col-sm-5 {
    grid-column: span 5;
  }

  .col-sm-6 {
    grid-column: span 6;
  }
}

.field-error {
  color: var(--p-red-500, #f44336);
  font-size: 0.75rem;
  padding: 2px 12px 0;
}

.date-tabs {
  margin-bottom: 8px;
}

.date-tab-panel {
  padding-top: 8px;
}

.chips-box {
  border: 1px solid rgba(0, 0, 0, 0.42);
  border-radius: 4px;
  padding: 4px;
  margin-top: 16px;
  margin-bottom: 24px;
}

.chips-empty {
  height: 40px;
}

.date-chip {
  margin: 8px;
}

.image-option {
  display: flex;
  align-items: center;
  margin: 8px 0;
}

.image-option span {
  margin-left: 8px;
}

.event-img {
  width: 120px;
  height: 70px;
  object-fit: cover;
}

.checkbox-row {
  display: flex;
  align-items: center;
}

.checkbox-row label {
  margin-left: 8px;
}

.actions {
  display: flex;
  align-items: center;
}

.actions .reset-button {
  margin-left: auto;
}

.actions .save-button {
  margin-left: 8px;
}

.uppercase {
  text-transform: uppercase;
}
</style>
