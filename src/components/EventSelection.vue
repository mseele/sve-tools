<script setup lang="ts">
import { loadEvents as loadRequiredEvents } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { EventType, LifecycleStatus, type Event } from '@/types'
import { statusIndex } from '@/utils'
import { format, parseISO } from 'date-fns'
import { computed, nextTick, onMounted, ref, watch } from 'vue'

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

onMounted(loadEvents)

const allEvents = ref<Event[]>([])
const event = ref<Event>()
const bookingList = ref(true)
const waitingList = ref(false)

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
watch(event, emitChanges)
watch(bookingList, emitChanges)
watch(waitingList, emitChanges)

// any is needed to make vuetify happy
function eventName(event: any) {
  let visibility
  switch ((event as Event).status) {
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

function emitChanges() {
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
    console.log(error)
    notify.showError('Fehler beim Laden der Events. Details siehe Console')
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
  <div style="width: 100%">
    <v-autocomplete
      v-model="event"
      :items="events"
      :item-value="(v: any) => v"
      :item-title="eventName"
      variant="outlined"
      hide-details
      :label="label"
      :disabled="disabled"
    >
      <template v-slot:item="{ props, item }">
        <v-list-item v-bind="props" title="">
          <EventListItem :status="item.raw.status" :text="eventName(item.raw)" />
        </v-list-item>
      </template>
    </v-autocomplete>
    <v-row v-if="showBookingGroups">
      <v-col cols="6">
        <v-checkbox
          label="Email an Buchungen"
          v-model="bookingList"
          :disabled="event == null"
        ></v-checkbox>
      </v-col>
      <v-col cols="6">
        <v-checkbox
          label="Email an Warteliste"
          v-model="waitingList"
          :disabled="event == null"
        ></v-checkbox>
      </v-col>
    </v-row>
  </div>
</template>
