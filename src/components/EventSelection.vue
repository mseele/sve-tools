<script setup lang="ts">
import { loadEvents as loadRequiredEvents } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { EventType, LifecycleStatus, type Event } from '@/types'
import { statusIndex } from '@/utils'
import { format, parseISO } from 'date-fns'
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue'
import AutoComplete, { type AutoCompleteCompleteEvent } from 'primevue/autocomplete'
import Checkbox from 'primevue/checkbox'

const props = withDefaults(
  defineProps<{
    eventType: EventType
    eventStatus?: LifecycleStatus[]
    label?: string
    showBookingGroups?: boolean
    disabled?: boolean
    showDate?: boolean
  }>(),
  {
    label: 'Event auswählen',
    showBookingGroups: false,
    disabled: false,
    showDate: false
  }
)

const emit = defineEmits<{
  change: [{ event: Event; bookingList?: boolean; waitingList?: boolean }]
}>()

defineExpose({ reset, addEvent, selectEvent, loadEvents })

const notify = useNotifyStore()
const uid = useId()

onMounted(loadEvents)

const allEvents = ref<Event[]>([])
const event = ref<Event>()
const bookingList = ref(true)
const waitingList = ref(false)
const suggestions = ref<Event[]>([])

const events = computed(() => {
  return allEvents.value
    .filter((e) => e.type === props.eventType)
    .sort((a, b) => {
      const value = statusIndex(a.status) - statusIndex(b.status)
      if (value != 0) {
        return value
      }
      return a.sort_index - b.sort_index
    })
})

watch(events, () => (event.value = undefined))
watch(event, onEventChange)
watch(bookingList, emitChanges)
watch(waitingList, emitChanges)

// PrimeVue AutoComplete binds the raw typed query to the model until a
// suggestion is picked and clears the model on blur when nothing matches
// (forceSelection). Parents expect either a real event or an empty selection,
// so the transient string state is ignored and a cleared value is normalized
// to undefined.
function onEventChange(value: Event | string | null | undefined) {
  if (typeof value === 'string') {
    return
  }
  if (value === null) {
    event.value = undefined
    return
  }
  emitChanges()
}

function eventName(event: Event) {
  let visibility
  switch (event.status) {
    case LifecycleStatus.Draft:
      visibility = 'Entwurf - Unsichtbar'
      break
    case LifecycleStatus.Review:
      visibility = 'Überprüfung - Beta'
      break
    case LifecycleStatus.Published:
      visibility = 'Sichtbar'
      break
    case LifecycleStatus.Running:
      visibility = 'Laufend - Unsichtbar'
      break
    case LifecycleStatus.Finished:
      visibility = 'Fertiggestellt - Unsichtbar'
      break
    case LifecycleStatus.Closed:
      visibility = 'Abgeschlossen - Unsichtbar'
      break
  }
  let name = event.name
  if (props.showDate) {
    if (event.custom_date != undefined) {
      name += ' ' + event.custom_date
    } else if (event.dates != undefined) {
      name += ' ' + formatDate(event.dates[event.dates.length - 1])
    }
  }
  return name + ' (' + visibility + ')'
}

function formatDate(value: string) {
  const date = parseISO(value)
  const timezoneOffset = date.getTimezoneOffset() * 60000
  return format(new Date(date.getTime() + timezoneOffset), 'dd-MM-yyyy HH:mm')
}

function onComplete({ query }: AutoCompleteCompleteEvent) {
  const search = query.trim().toLowerCase()
  suggestions.value = events.value.filter((item) => {
    return eventName(item).toLowerCase().includes(search)
  })
}

function emitChanges() {
  if (typeof event.value === 'string') {
    return
  }
  const data: { event: Event; bookingList?: boolean; waitingList?: boolean } = {
    event: event.value!
  }
  if (props.showBookingGroups) {
    data.bookingList = bookingList.value
    data.waitingList = waitingList.value
  }
  emit('change', data)
}

async function loadEvents() {
  try {
    allEvents.value = await loadRequiredEvents(props.eventStatus)
    emitChanges()
  } catch (error) {
    if (error !== null) {
      console.log(error)
      notify.showError('Fehler beim Laden der Events. Details siehe Console')
    }
  }
}

function reset() {
  event.value = undefined
  bookingList.value = true
  waitingList.value = false
}

function addEvent(eventToAdd: Event) {
  allEvents.value.push(eventToAdd)
  nextTick(() => selectEvent(eventToAdd))
}

function selectEvent(e: Event) {
  event.value = e
  emitChanges()
}
</script>

<template>
  <div class="event-selection">
    <AutoComplete
      v-model="event"
      class="event-picker"
      :suggestions="suggestions"
      :optionLabel="eventName"
      :placeholder="label"
      :disabled="disabled"
      :forceSelection="true"
      :completeOnFocus="true"
      dropdown
      fluid
      @complete="onComplete"
    >
      <template #option="{ option }">
        <EventListItem :status="option.status" :text="eventName(option)" />
      </template>
    </AutoComplete>
    <div v-if="showBookingGroups" class="booking-groups">
      <div class="booking-group">
        <Checkbox
          v-model="bookingList"
          binary
          :inputId="`${uid}-booking-list`"
          :disabled="event == null"
        />
        <label :for="`${uid}-booking-list`">Email an Buchungen</label>
      </div>
      <div class="booking-group">
        <Checkbox
          v-model="waitingList"
          binary
          :inputId="`${uid}-waiting-list`"
          :disabled="event == null"
        />
        <label :for="`${uid}-waiting-list`">Email an Warteliste</label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.event-selection {
  width: 100%;
}

.booking-groups {
  display: flex;
}

.booking-group {
  flex: 0 0 50%;
  display: flex;
  align-items: center;
}

.booking-group label {
  margin-left: 8px;
}
</style>
