<script setup lang="ts">
import { loadEvents, sendParticipationConfirmation, updateEvent } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { LifecycleStatus, type Event, type EventSubscriber } from '@/types'
import { format, parseISO } from 'date-fns'
import Button from 'primevue/button'
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
    if (found?.manager_recipients !== undefined) {
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
  if (managerRecipientsEventId.value !== eventId) {
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
    <div class="summary-row">
      <div class="summary-card">
        <div class="summary-items">
          <div>
            <div class="summary-caption">Teilnehmer</div>
            <div class="summary-value">{{ participantCount }} / {{ event.max_subscribers }}</div>
          </div>
          <div v-if="lastTermin">
            <div class="summary-caption">Letzter Termin</div>
            <div class="summary-value">{{ lastTermin }}</div>
          </div>
          <div>
            <div class="summary-caption">Bezahlung</div>
            <div class="summary-value" :class="allPaid ? 'paid' : 'unpaid'">
              {{ allPaid ? 'Alle bezahlt' : 'Offene Zahlungen' }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="action-columns">
      <ActionColumn text="Teilnahmebestätigungen senden" @action="sendConfirmation" />
      <ActionColumn text="Event abschließen" @action="closeEvent" />
    </div>
    <div class="manager-recipients">
      <ManagerRecipients v-model="managerRecipients" />
      <div class="save-row">
        <Button
          label="Speichern"
          :loading="loading"
          :disabled="loading"
          @click="saveManagerRecipients"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-row {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.summary-card {
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.42);
  border-radius: 4px;
  padding: 16px;
}

/* 600px matches Vuetify's sm breakpoint; cols=12 sm=8 becomes 2/3 width. */
@media (min-width: 600px) {
  .summary-card {
    width: 66.6667%;
  }
}

.summary-items {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.summary-caption {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}

.summary-value {
  font-size: 1.25rem;
  font-weight: 500;
}

.summary-value.paid {
  color: var(--p-green-500, #4caf50);
}

.summary-value.unpaid {
  color: var(--p-red-500, #f44336);
}

.action-columns {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
}

.action-columns > * {
  width: 100%;
}

@media (min-width: 600px) {
  .action-columns > * {
    width: 66.6667%;
  }
}

.manager-recipients {
  margin-top: 16px;
}

.save-row {
  display: flex;
  justify-content: flex-end;
}
</style>
