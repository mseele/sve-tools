<script setup lang="ts">
import { sendEmails } from '@/api'
import { batchEmailTemplates, type EmailTemplate } from '@/data/emailTemplates'
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
import { computed, ref, watch } from 'vue'

const title = 'Batch Email'
useHead({ title })

const notify = useNotifyStore()

const eventType = ref(EventType.Fitness)
const attachments = ref<File[]>([])
const event = ref<Event>()
const selectedTemplate = ref<EmailTemplate>(batchEmailTemplates[eventType.value][0])
const subject = ref(selectedTemplate.value.subject)
const content = ref(selectedTemplate.value.body)
const bookingList = ref(false)
const waitingList = ref(false)
const disabled = ref(false)
const eventSelection = ref<InstanceType<typeof EventSelection> | null>(null)

const editable = computed(() => event.value !== undefined)

watch(eventType, (value) => {
  selectedTemplate.value = batchEmailTemplates[value][0]
  subject.value = selectedTemplate.value.subject
  content.value = selectedTemplate.value.body
})

function onEventSelection(data: { event: Event; bookingList?: boolean; waitingList?: boolean }) {
  event.value = data.event
  bookingList.value = data.bookingList || false
  waitingList.value = data.waitingList || false
}

function onTemplateSelect(template: EmailTemplate) {
  subject.value = template.subject
  content.value = template.body
}

// PrimeVue FileUpload has no v-model; it reports each selection via @select
// (the component's internal list is replaced on every pick, while the batch
// email flow accumulates attachments, so files are merged into the page state).
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
  eventSelection.value?.reset()
  attachments.value = []
  disabled.value = false
}

async function send() {
  if (event.value === undefined) {
    notify.showError('Es ist kein Event ausgewählt.')
    return
  }
  disabled.value = true

  const data: EventEmail = {
    event_id: event.value.id,
    bookings: bookingList.value,
    waiting_list: waitingList.value,
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
      'Event auswählen',
      'Personengruppe auswählen (Buchungen und/oder Warteliste)',
      'Für Individualisierung <b>{{firstname}}</b> für den Vorname in der Email nutzen',
      'Für Individualisierung <b>{{lastname}}</b> für den Nachname in der Email nutzen',
      'Für Individualisierung <b>{{name}}</b> für den Event Name in der Email nutzen',
      'Für Individualisierung <b>{{location}}</b> für den Ort in der Email nutzen',
      'Für Individualisierung <b>{{price}}</b> für den Preis in der Email nutzen',
      'Für Individualisierung <b>{{dates}}</b> für die Termine in der Email nutzen',
      'Für Individualisierung <b>{{payment_id}}</b> für die Zahlungsnummer in der Email nutzen'
    ]"
  >
    <EventTypeSelection v-model="eventType" :disabled="disabled" />
    <EventSelection
      ref="eventSelection"
      :eventType="eventType"
      :eventStatus="[
        LifecycleStatus.Review,
        LifecycleStatus.Published,
        LifecycleStatus.Running,
        LifecycleStatus.Finished
      ]"
      :disabled="disabled"
      :showBookingGroups="true"
      @change="onEventSelection"
    />
    <IftaLabel class="field">
      <Select
        inputId="email-template"
        v-model="selectedTemplate"
        :options="batchEmailTemplates[eventType]"
        optionLabel="label"
        fluid
        :disabled="disabled"
        @update:modelValue="onTemplateSelect"
      />
      <label for="email-template">Vorlage</label>
    </IftaLabel>
    <IftaLabel class="field">
      <InputText
        inputId="email-subject"
        v-model="subject"
        fluid
        :disabled="disabled || !editable"
      />
      <label for="email-subject">Betreff</label>
    </IftaLabel>
    <IftaLabel class="field">
      <Textarea
        inputId="email-content"
        v-model="content"
        rows="5"
        fluid
        :disabled="disabled || !editable"
      />
      <label for="email-content">Email</label>
    </IftaLabel>
    <FileUpload
      mode="basic"
      customUpload
      multiple
      chooseLabel="Anhänge auswählen"
      class="field"
      :disabled="disabled || !editable"
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
.field {
  margin-bottom: 16px;
}
</style>
