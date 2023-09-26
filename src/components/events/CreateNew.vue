<script setup lang="ts">
import { EventType, LifecycleStatus, type Event } from '@/types'
import { mdiPlus } from '@mdi/js'
import { cloneDeep } from 'lodash-es'
import { computed, ref } from 'vue'

const props = defineProps<{
  eventType: EventType
}>()

const emit = defineEmits<{
  new: [event: Event]
}>()

const show = ref(false)
const selection = ref<Event>()

const valid = computed(() => selection.value !== undefined)

function onEventSelection(data: { event: Event }) {
  selection.value = data.event
}

function onCancel() {
  selection.value = undefined
  show.value = false
}

function onApply() {
  if (selection.value === undefined) {
    return
  }
  const duplicate = cloneDeep(selection.value)
  duplicate.id = undefined as any // id is normaly required
  duplicate.status = LifecycleStatus.Draft
  duplicate.closed = undefined
  emit('new', duplicate)
  onCancel()
}
</script>

<template>
  <v-dialog v-model="show" persistent max-width="500">
    <template v-slot:activator="{ props }">
      <v-btn icon variant="text" color="primary" v-bind="props">
        <v-icon>{{ mdiPlus }}</v-icon>
      </v-btn>
    </template>
    <v-card>
      <v-card-title class="text-h5">Neues Event</v-card-title>
      <v-card-text class="pb-0">
        Wähle ein Vorlage-Event aus:<br />
        <div class="mt-2 mb-4">
          <EventSelection :eventType="props.eventType" @change="onEventSelection" />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" @click="onCancel()">Abbrechen</v-btn>
        <v-btn color="primary" variant="text" @click="onApply()" :disabled="!valid">Starten</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
