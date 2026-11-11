<script setup lang="ts">
import { loadEvents, sendParticipationConfirmation, updateEvent } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { EventType, LifecycleStatus, type Event, type EventSubscriber } from '@/types'
import { mdiClose, mdiPlus } from '@mdi/js'
import { format, parseISO } from 'date-fns'
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  event: Event
}>()

const emit = defineEmits<{
  success: [event?: Event]
}>()

const notify = useNotifyStore()

const subscribers = ref<EventSubscriber[]>([])
const managerRecipients = ref([...(props.event.manager_recipients ?? [])])
const managerRecipientsEventId = ref(props.event.id)
const loading = ref(false)

watch(
  () => props.event.id,
  (eventId) => {
    managerRecipients.value = [...(props.event.manager_recipients ?? [])]
    managerRecipientsEventId.value = eventId
  },
  { flush: 'sync' }
)

const emailAddressPattern =
  /^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i

function isValidEmailAddress(value: string) {
  return value.length <= 254 && emailAddressPattern.test(value)
}

const managerRecipientsValid = computed(() => managerRecipients.value.every(isValidEmailAddress))

const rules = {
  managerRecipientEmail: [
    (value: string) => isValidEmailAddress(value) || 'Bitte gib eine gültige E-Mail-Adresse ein'
  ]
}

function addManagerRecipient() {
  managerRecipients.value.push('')
}

function updateManagerRecipient(index: number, value: string) {
  managerRecipients.value[index] = value
}

function removeManagerRecipient(index: number) {
  managerRecipients.value.splice(index, 1)
}

const participants = computed(() => subscribers.value.filter((s) => s.enrolled))
const participantCount = computed(() => participants.value.length)
const allPaid = computed(
  () => participants.value.length > 0 && participants.value.every((s) => s.payment_confirmed_at)
)
const lastTermin = computed(() => {
  if (props.event.custom_date) {
    return props.event.custom_date
  }
  if (props.event.dates.length > 0) {
    return formatDate(props.event.dates[props.event.dates.length - 1])
  }
  return undefined
})

onMounted(async () => {
  try {
    const events = await loadEvents([LifecycleStatus.Finished], true)
    const found = events.find((e) => e.id === props.event.id)
    if (found?.subscribers) {
      subscribers.value = found.subscribers
    }
    if (props.event.type === EventType.Events && found?.manager_recipients !== undefined) {
      managerRecipients.value = [...found.manager_recipients]
    }
  } catch (error) {
    if (error !== null) {
      console.error(error)
    }
  }
})

function formatDate(value: string) {
  const date = parseISO(value)
  const timezoneOffset = date.getTimezoneOffset() * 60000
  return format(new Date(date.getTime() + timezoneOffset), 'dd-MM-yyyy HH:mm')
}

async function sendConfirmation(onFinish: () => void) {
  try {
    await sendParticipationConfirmation(props.event.id)
    notify.showSuccess('Die Teilnahmebestätigungen wurden erfolgreich versandt.')
    emit('success', props.event)
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Teilnahmebestätigungen senden ist fehlgeschlagen. Details siehe Console')
    }
  } finally {
    onFinish()
  }
}

async function closeEvent(onFinish: () => void) {
  try {
    let update: Partial<Event> = { status: LifecycleStatus.Closed }
    await updateEvent(props.event.id, update)
    notify.showSuccess('Das Event wurde erfolgreich geschlossen.')
    emit('success')
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Event schließen ist fehlgeschlagen. Details siehe Console')
    }
  } finally {
    onFinish()
  }
}

async function saveManagerRecipients() {
  const eventId = props.event.id
  if (
    !managerRecipientsValid.value ||
    props.event.type !== EventType.Events ||
    managerRecipientsEventId.value !== eventId
  ) {
    return
  }

  const recipients = [...managerRecipients.value]
  loading.value = true
  try {
    const savedEvent = await updateEvent(eventId, {
      manager_recipients: recipients
    })
    notify.showSuccess('Die Empfänger für Event-Manager-Erinnerungen wurden gespeichert.')
    if (props.event.id === eventId) {
      emit('success', savedEvent)
    }
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Speichern der Empfänger ist fehlgeschlagen. Details siehe Console')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <v-row class="mb-6 justify-center">
      <v-col cols="12" sm="8">
        <v-card variant="outlined">
          <v-card-text>
            <div class="d-flex flex-wrap ga-6">
              <div>
                <div class="text-caption text-medium-emphasis">Teilnehmer</div>
                <div class="text-h6">{{ participantCount }} / {{ event.max_subscribers }}</div>
              </div>
              <div v-if="lastTermin">
                <div class="text-caption text-medium-emphasis">Letzter Termin</div>
                <div class="text-h6">{{ lastTermin }}</div>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Bezahlung</div>
                <div class="text-h6" :class="allPaid ? 'text-success' : 'text-error'">
                  {{ allPaid ? 'Alle bezahlt' : 'Offene Zahlungen' }}
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row class="my-5 justify-center">
      <ActionColumn text="Teilnahmebestätigungen senden" @action="sendConfirmation" />
      <ActionColumn text="Event abschließen" @action="closeEvent" />
    </v-row>
    <v-form v-if="event.type === EventType.Events">
      <v-row>
        <v-col cols="12">
          <div class="text-subtitle-1 mb-1">Empfänger für Event-Manager-Erinnerungen</div>
          <div class="text-body-2 text-medium-emphasis mb-3">
            Diese Adressen sind unabhängig von der alternativen Versand-E-Mailadresse.
          </div>
          <div v-for="(email, index) in managerRecipients" :key="index" class="d-flex align-start">
            <v-text-field
              :model-value="email"
              :label="`E-Mail-Adresse ${index + 1}`"
              type="email"
              variant="outlined"
              density="compact"
              :rules="rules.managerRecipientEmail"
              @update:model-value="updateManagerRecipient(index, $event)"
            />
            <v-btn
              icon
              variant="text"
              color="primary"
              :aria-label="`Empfänger ${index + 1} entfernen`"
              @click="removeManagerRecipient(index)"
            >
              <v-icon>{{ mdiClose }}</v-icon>
            </v-btn>
          </div>
          <v-btn variant="text" color="primary" @click="addManagerRecipient">
            <v-icon start>{{ mdiPlus }}</v-icon>
            Adresse hinzufügen
          </v-btn>
        </v-col>
        <v-col cols="12" class="d-flex justify-end">
          <v-btn
            variant="elevated"
            color="primary"
            :disabled="!managerRecipientsValid || loading"
            :loading="loading"
            @click="saveManagerRecipients"
          >
            Speichern
          </v-btn>
        </v-col>
      </v-row>
    </v-form>
  </div>
</template>
