<script setup lang="ts">
import { sendEmails } from '@/api'
import { prebookingEmailTemplates, type EmailTemplate } from '@/data/emailTemplates'
import EventSelection from '@/components/EventSelection.vue'
import { useNotifyStore } from '@/stores/notify'
import { EventType, LifecycleStatus, type Event, type EventEmail } from '@/types'
import { readFile } from '@/utils'
import { useHead } from '@unhead/vue'
import Chip from 'primevue/chip'
import FileUpload, { type FileUploadSelectEvent } from 'primevue/fileupload'
import IftaLabel from 'primevue/iftalabel'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import { ref, watch } from 'vue'

const title = 'Pre-Booking Email'
useHead({ title })

const notify = useNotifyStore()

const eventType = ref(EventType.Fitness)
const attachments = ref<File[]>([])
const fromEvent = ref<Event>()
const toEvent = ref<Event>()
const selectedTemplate = ref<EmailTemplate>(prebookingEmailTemplates[eventType.value][0])
const subject = ref(selectedTemplate.value.subject)
const content = ref(selectedTemplate.value.body)
const bookingList = ref(false)
const waitingList = ref(false)
const disabled = ref(false)
const fromEventSelection = ref<InstanceType<typeof EventSelection> | null>(null)
const toEventSelection = ref<InstanceType<typeof EventSelection> | null>(null)

watch(eventType, (value) => {
  selectedTemplate.value = prebookingEmailTemplates[value][0]
  subject.value = selectedTemplate.value.subject
  content.value = selectedTemplate.value.body
})

function onFromEventSelection(data: {
  event: Event
  bookingList?: boolean
  waitingList?: boolean
}) {
  fromEvent.value = data.event
  bookingList.value = data.bookingList || false
  waitingList.value = data.waitingList || false
}

function onToEventSelection(data: { event: Event }) {
  toEvent.value = data.event
}

function onTemplateSelect(template: EmailTemplate) {
  subject.value = template.subject
  content.value = template.body
}

// PrimeVue FileUpload has no v-model; it reports each selection via @select
// (the component's internal list is replaced on every pick, while the prebooking
// flow accumulates attachments, so files are merged into the page state).
function onAttachmentsSelect(event: FileUploadSelectEvent) {
  const selected = Array.isArray(event.files) ? event.files : [event.files]
  for (const file of selected) {
    if (!attachments.value.some((f) => f.name === file.name && f.size === file.size)) {
      attachments.value.push(file)
    }
  }
}

function removeAttachment(file: File) {
  attachments.value = attachments.value.filter((f) => f !== file)
}

function reset() {
  eventType.value = EventType.Fitness
  fromEventSelection.value?.reset()
  toEventSelection.value?.reset()
  attachments.value = []
  disabled.value = false
}

async function send() {
  if (fromEvent.value === undefined) {
    notify.showError('Historisches Event ist nicht ausgewählt.')
    return
  }
  if (toEvent.value === undefined) {
    notify.showError('Prebooking Event ist nicht ausgewählt.')
    return
  }

  disabled.value = true

  const data: EventEmail = {
    event_id: fromEvent.value.id,
    bookings: bookingList.value,
    waiting_list: waitingList.value,
    prebooking_event_id: toEvent.value.id,
    subject: subject.value,
    body: content.value
  }
  if (attachments.value.length > 0) {
    data.attachments = []
    for (const file of attachments.value) {
      try {
        const content = await readFile(file)
        data.attachments.push({
          name: file.name,
          mime_type: file.type,
          data: content
        })
      } catch (error) {
        console.error(error)
        notify.showError('Datei konnte nicht gelesen werden. Details siehe Console')
        disabled.value = false
        return
      }
    }
  }

  try {
    await sendEmails(data)
    notify.showSuccess('Alle Emails wurden erfolgreich versandt')
    reset()
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Senden fehlgeschlafen. Details siehe Console')
    }
    disabled.value = false
  }
}
</script>

<template>
  <ActionsLayout
    :title="title"
    :help="[
      'Historisches Event und deren Personengruppe  (Buchungen und/oder Warteliste) auswählen',
      'Prebooking Event auswählen (für dieses Event werden Prebooking Links erstellt)',
      'Zur Linkerzeugung <b>{{link}}</b> in der Email nutzen',
      'Für Individualisierung <b>{{firstname}}</b> für den Vorname in der Email nutzen',
      'Für Individualisierung <b>{{lastname}}</b> für den Nachname in der Email nutzen',
      'Für Individualisierung <b>{{name}}</b> für den Event Name in der Email nutzen',
      'Für Individualisierung <b>{{location}}</b> für den Ort in der Email nutzen',
      'Für Individualisierung <b>{{price}}</b> für den Preis in der Email nutzen',
      'Für Individualisierung <b>{{dates}}</b> für die Termine in der Email nutzen'
    ]"
  >
    <EventTypeSelection v-model="eventType" :disabled="disabled" />
    <EventSelection
      label="Historisches Event auswählen"
      ref="fromEventSelection"
      :eventType="eventType"
      :eventStatus="[LifecycleStatus.Running, LifecycleStatus.Finished, LifecycleStatus.Closed]"
      :disabled="disabled"
      showBookingGroups
      showDate
      @change="onFromEventSelection"
    />
    <EventSelection
      label="Prebooking Event auswählen"
      ref="toEventSelection"
      :eventType="eventType"
      :eventStatus="[LifecycleStatus.Review, LifecycleStatus.Published]"
      :disabled="disabled"
      class="to-selection"
      @change="onToEventSelection"
    />
    <IftaLabel class="field">
      <Select
        inputId="prebooking-template"
        v-model="selectedTemplate"
        :options="prebookingEmailTemplates[eventType]"
        optionLabel="label"
        fluid
        :disabled="disabled"
        @update:modelValue="onTemplateSelect"
      />
      <label for="prebooking-template">Vorlage</label>
    </IftaLabel>
    <IftaLabel class="field">
      <InputText inputId="prebooking-subject" v-model="subject" fluid :disabled="disabled" />
      <label for="prebooking-subject">Betreff</label>
    </IftaLabel>
    <IftaLabel class="field">
      <Textarea
        inputId="prebooking-content"
        v-model="content"
        rows="5"
        fluid
        :disabled="disabled"
      />
      <label for="prebooking-content">Email</label>
    </IftaLabel>
    <FileUpload
      mode="basic"
      customUpload
      multiple
      chooseLabel="Anhänge auswählen"
      class="field"
      :disabled="disabled"
      @select="onAttachmentsSelect"
    >
      <template #filelabel>
        <Chip
          v-for="file in attachments"
          :key="file.name + file.size"
          :label="file.name"
          removable
          class="attachment-chip"
          @remove="removeAttachment(file)"
        />
      </template>
    </FileUpload>
    <ButtonArea :disabled="disabled" @send="send" @reset="reset" />
  </ActionsLayout>
</template>

<style scoped>
/* 24px keeps the gap between pickers and compose area */
.to-selection {
  margin-bottom: 24px;
}

.field {
  margin-bottom: 16px;
}
</style>
