<script setup lang="ts">
import { loadEvents, sendParticipationConfirmation, updateEvent } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { LifecycleStatus, type Event, type EventSubscriber } from '@/types'
import { format, parseISO } from 'date-fns'
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{
  event: Event
}>()

const emit = defineEmits<{
  success: [event?: Event]
}>()

const notify = useNotifyStore()

const subscribers = ref<EventSubscriber[]>([])

const participants = computed(() => subscribers.value.filter((s) => s.enrolled))
const participantCount = computed(() => participants.value.length)
const allPaid = computed(
  () => participants.value.length > 0 && participants.value.every((s) => s.payment_confirmed_at),
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
  </div>
</template>
