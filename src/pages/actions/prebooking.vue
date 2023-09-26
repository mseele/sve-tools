<script setup lang="ts">
import { sendEmails } from '@/api'
import EventSelection from '@/components/EventSelection.vue'
import { useNotifyStore } from '@/stores/notify'
import { EventType, LifecycleStatus, type Event, type EventEmail } from '@/types'
import { defaultEmailBody, defaultEmailSubject, readFile } from '@/utils'
import { useHead } from '@unhead/vue'
import { ref, watch } from 'vue'

const title = 'Pre-Booking Email'
useHead({ title })

const notify = useNotifyStore()

const eventType = ref(EventType.Fitness)
const attachments = ref<File[]>([])
const fromEvent = ref<Event>()
const toEvent = ref<Event>()
const subject = ref(defaultEmailSubject(eventType.value))
const content = ref(defaultEmailBody(eventType.value))
const bookingList = ref(false)
const waitingList = ref(false)
const disabled = ref(false)
const fromEventSelection = ref<InstanceType<typeof EventSelection> | null>(null)
const toEventSelection = ref<InstanceType<typeof EventSelection> | null>(null)

watch(eventType, (value) => {
  subject.value = defaultEmailSubject(value)
  content.value = defaultEmailBody(value)
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
    console.error(error)
    notify.showError('Senden fehlgeschlafen. Details siehe Console')
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
    <v-row>
      <v-col cols="12">
        <v-form :disabled="disabled">
          <EventTypeSelection v-model="eventType" :disabled="disabled" />
          <EventSelection
            label="Historisches Event auswählen"
            ref="fromEventSelection"
            :eventType="eventType"
            :eventStatus="[
              LifecycleStatus.Running,
              LifecycleStatus.Finished,
              LifecycleStatus.Closed
            ]"
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
            @change="onToEventSelection"
            class="mb-6"
          />
          <v-text-field v-model="subject" variant="outlined" label="Betreff"></v-text-field>
          <v-textarea v-model="content" variant="outlined" label="Email"></v-textarea>
          <v-file-input
            variant="outlined"
            multiple
            v-model="attachments"
            prepend-icon=""
            clearable
            label="Anhänge auswählen"
          >
            <template v-slot:selection="{ fileNames }">
              <template v-for="fileName in fileNames" :key="fileName">
                <v-chip size="small" label class="me-2" :color="!disabled ? 'primary' : ''">
                  {{ fileName }}
                </v-chip>
              </template>
            </template>
          </v-file-input>
        </v-form>
        <ButtonArea :disabled="disabled" @send="send" @reset="reset" />
      </v-col>
    </v-row>
  </ActionsLayout>
</template>
