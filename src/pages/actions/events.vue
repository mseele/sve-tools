<route lang="json">
{ "name": "default_action" }
</route>

<script setup lang="ts">
import { deleteEvent, loadCustomFields } from '@/api'
import EventSelection from '@/components/EventSelection.vue'
import { useNotifyStore } from '@/stores/notify'
import { EventType, LifecycleStatus, type Event, type EventCustomField } from '@/types'
import { mdiDelete } from '@mdi/js'
import { useHead } from '@unhead/vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { nextTick, onMounted, ref, watch } from 'vue'

const title = 'Manage Events'
useHead({ title })

const notify = useNotifyStore()

const eventType = ref(EventType.Fitness)
const selection = ref<Event>()
const deleteDialog = ref(false)
const deleteLoading = ref(false)
const eventSelection = ref<InstanceType<typeof EventSelection> | null>(null)
const customFields = ref<EventCustomField[]>([])

watch(eventType, () => (selection.value = undefined))

const eventStatus = [
  LifecycleStatus.Draft,
  LifecycleStatus.Review,
  LifecycleStatus.Published,
  LifecycleStatus.Running,
  LifecycleStatus.Finished
]

onMounted(async () => {
  try {
    customFields.value = await loadCustomFields()
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Laden der benutzerdefinierten Felder fehlgeschlagen. Details siehe Console')
    }
  }
})

function onEventSelection(data: { event: Event }) {
  selection.value = data.event
}

function onNew(event: Event) {
  eventSelection.value?.addEvent(event)
}

async function onUpdate(event?: Event) {
  await eventSelection.value?.loadEvents()
  nextTick(() => {
    if (event !== undefined) {
      eventSelection.value?.selectEvent(event)
    }
    window.scrollTo(0, 0)
  })
}
async function onDelete() {
  if (selection.value === undefined) {
    notify.showError('Ein Event ist nicht ausgewählt')
    return
  }

  deleteLoading.value = true
  try {
    if (selection.value.id !== undefined) {
      await deleteEvent(selection.value.id)
    }
    await eventSelection.value?.loadEvents()
    notify.showSuccess('Das Event wurde erfolgreich gelöscht')
  } catch (error) {
    if (error !== null) {
      console.log(error)
      notify.showError('Fehler beim Löschen des Events. Details siehe Console')
    }
  } finally {
    deleteDialog.value = false
    deleteLoading.value = false
  }
}
</script>

<template>
  <ActionsLayout
    :title="title"
    :help="[
      'Hier können Events & Fitnesskurse bearbeitet werden',
      'In der Beschreibung kann Text fettgedruckt und als Liste formatiert werden'
    ]"
  >
    <div>
      <EventTypeSelection v-model="eventType" />
      <div class="picker-row">
        <div class="event-selection-wrapper">
          <EventSelection
            ref="eventSelection"
            :eventType="eventType"
            :eventStatus="eventStatus"
            label="Event auswählen"
            @change="onEventSelection"
          />
        </div>
        <CreateNew :eventType="eventType" :eventStatus="eventStatus" @new="onNew" />
        <Button
          text
          rounded
          aria-label="Event löschen"
          :disabled="selection == null || selection.status != LifecycleStatus.Draft"
          @click="deleteDialog = true"
        >
          <MdiIcon :path="mdiDelete" :size="20" />
        </Button>
      </div>
    </div>
    <Dialog
      v-model:visible="deleteDialog"
      modal
      header="Event löschen"
      :closable="false"
      :closeOnEscape="false"
      :style="{ width: '400px' }"
    >
      <p class="delete-text">
        Willst du das Event
        <span class="bold">{{ selection != null ? selection.name : selection }}</span>
        wirklich löschen?
      </p>
      <template #footer>
        <Button label="Abbrechen" text @click="deleteDialog = false" />
        <Button
          label="Löschen"
          text
          severity="danger"
          :loading="deleteLoading"
          @click="onDelete()"
        />
      </template>
    </Dialog>
    <template v-if="selection != undefined">
      <EditFinished
        v-if="selection.status === LifecycleStatus.Finished"
        :event="selection"
        @success="onUpdate"
        class="edit-area"
      />
      <EditAttributes
        v-else
        :event="selection"
        :custom-fields="customFields"
        @success="onUpdate"
        :key="selection.id"
        class="edit-area"
      />
    </template>
  </ActionsLayout>
</template>

<style scoped>
.picker-row {
  display: flex;
  align-items: center;
}

.event-selection-wrapper {
  flex: 1 1 auto;
  min-width: 0;
}

.delete-text {
  margin: 0;
}

.bold {
  font-weight: bold;
}

.edit-area {
  margin-top: 32px;
}
</style>
