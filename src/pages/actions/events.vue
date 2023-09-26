<route lang="json">
{ "name": "default_action" }
</route>

<script setup lang="ts">
import { deleteEvent } from '@/api'
import EventSelection from '@/components/EventSelection.vue'
import { useNotifyStore } from '@/stores/notify'
import { EventType, LifecycleStatus, type Event } from '@/types'
import { mdiDelete } from '@mdi/js'
import { useHead } from '@unhead/vue'
import { nextTick, ref, watch } from 'vue'

const title = 'Manage Events'
useHead({ title })

const notify = useNotifyStore()

const eventType = ref(EventType.Fitness)
const selection = ref<Event>()
const deleteDialog = ref(false)
const deleteLoading = ref(false)
const eventSelection = ref<InstanceType<typeof EventSelection> | null>(null)

watch(eventType, () => (selection.value = undefined))

const eventStatus = [
  LifecycleStatus.Draft,
  LifecycleStatus.Review,
  LifecycleStatus.Published,
  LifecycleStatus.Running,
  LifecycleStatus.Finished
]

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
    console.log(error)
    notify.showError('Fehler beim Löschen des Events. Details siehe Console')
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
      'In der Beschreibung kann mit HTML-Tags z.B. für eine Liste oder eine fettgedruckte Schrift gerarbeitet werden'
    ]"
  >
    <v-row>
      <v-col cols="12">
        <EventTypeSelection v-model="eventType" />
        <div class="d-flex align-center">
          <EventSelection
            ref="eventSelection"
            :eventType="eventType"
            :eventStatus="eventStatus"
            label="Event auswählen"
            @change="onEventSelection"
          />
          <CreateNew :eventType="eventType" :eventStatus="eventStatus" @new="onNew" />
          <v-dialog v-model="deleteDialog" persistent max-width="400">
            <template v-slot:activator="{ props }">
              <v-btn
                icon
                variant="text"
                color="primary"
                :disabled="selection == null || selection.status != LifecycleStatus.Draft"
                v-bind="props"
              >
                <v-icon>{{ mdiDelete }}</v-icon>
              </v-btn>
            </template>
            <v-card>
              <v-card-title class="text-h5">Event löschen</v-card-title>
              <v-card-text
                >Willst du das Event
                <span class="font-weight-bold">{{
                  selection != null ? selection.name : selection
                }}</span>
                wirklich löschen?</v-card-text
              >
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="primary" variant="text" @click="deleteDialog = false">
                  Abbrechen
                </v-btn>
                <v-btn color="error" variant="text" :loading="deleteLoading" @click="onDelete()">
                  Löschen
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </div>
      </v-col>
    </v-row>
    <template v-if="selection != undefined">
      <EditFinished
        v-if="selection.status === LifecycleStatus.Finished"
        :event="selection"
        @success="onUpdate"
        class="mt-8"
      />
      <EditAttributes
        v-else
        :event="selection"
        @success="onUpdate"
        :key="selection.id"
        class="mt-8"
      />
    </template>
  </ActionsLayout>
</template>
