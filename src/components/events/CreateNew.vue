<script setup lang="ts">
import { EventType, LifecycleStatus, type Event } from '@/types'
import { mdiPlus } from '@mdi/js'
import { cloneDeep } from 'lodash-es'
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

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
  <div class="create-new">
    <Button class="activator" text rounded aria-label="Neues Event" @click="show = true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <path :d="mdiPlus" fill="currentColor" />
      </svg>
    </Button>
    <Dialog
      v-model:visible="show"
      modal
      header="Neues Event"
      :closable="false"
      :closeOnEscape="false"
      :style="{ width: '500px' }"
    >
      <div class="intro">Wähle ein Vorlage-Event aus:</div>
      <div class="picker">
        <EventSelection :eventType="props.eventType" @change="onEventSelection" />
      </div>
      <template #footer>
        <Button label="Abbrechen" text @click="onCancel()" />
        <Button label="Starten" text :disabled="!valid" @click="onApply()" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* keeps the activator button as the effective flex item of parent rows */
.create-new {
  display: contents;
}

.intro {
  margin-bottom: 8px;
}

.picker {
  margin-bottom: 16px;
}
</style>
