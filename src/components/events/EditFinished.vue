<script setup lang="ts">
import { sendParticipationConfirmation, updateEvent } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { LifecycleStatus, type Event } from '@/types'

const props = defineProps<{
  event: Event
}>()

const emit = defineEmits<{
  success: [event?: Event]
}>()

const notify = useNotifyStore()

async function sendConfirmation(onFinish: () => void) {
  try {
    await sendParticipationConfirmation(props.event.id)
    notify.showSuccess('Die Teilnahmebestätigungen wurden erfolgreich versandt.')
    emit('success', props.event)
  } catch (error) {
    console.error(error)
    notify.showError('Teilnahmebestätigungen senden ist fehlgeschlagen. Details siehe Console')
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
    console.error(error)
    notify.showError('Event schließen ist fehlgeschlagen. Details siehe Console')
  } finally {
    onFinish()
  }
}
</script>

<template>
  <v-row class="my-5" justify="center">
    <ActionColumn text="Teilnahmebestätigungen senden" @action="sendConfirmation" />
    <ActionColumn text="Event abschließen" @action="closeEvent" />
  </v-row>
</template>
