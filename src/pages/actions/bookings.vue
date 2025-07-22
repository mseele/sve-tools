<script setup lang="ts">
import { loadEvents } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { EventType, LifecycleStatus, type Event } from '@/types'
import { statusIndex } from '@/utils'
import { mdiRefresh } from '@mdi/js'
import { useHead } from '@unhead/vue'
import { computed, onMounted, ref, watch } from 'vue'

const title = 'Manage Bookings'
useHead({ title })

const notify = useNotifyStore()

onMounted(refresh)

const eventType = ref(EventType.Fitness)
const allEvents = ref<Event[]>([])

watch(eventType, refresh)

const events = computed(() => {
  return allEvents.value
    .filter((e) => e.type === eventType.value)
    .sort((a, b) => {
      const value = statusIndex(a.status) - statusIndex(b.status)
      if (value != 0) {
        return value
      }
      return a.sort_index - b.sort_index
    })
})

async function refresh() {
  try {
    allEvents.value = (
      await loadEvents(
        [LifecycleStatus.Review, LifecycleStatus.Published, LifecycleStatus.Running],
        true
      )
    )
  } catch (error) {
    console.error(error)
    notify.showError('Fehler beim Laden der Events. Details siehe Console')
    allEvents.value = []
  }
}
</script>

<template>
  <ActionsLayout :title="title" :help="['Anzeige und Bearbeitung aller aktuellen Buchungen']">
    <v-row>
      <v-col cols="12" class="d-flex align-center justify-space-between pb-0">
        <EventTypeSelection v-model="eventType" />
        <v-btn variant="text" icon color="primary" @click="refresh()">
          <v-icon>{{ mdiRefresh }}</v-icon>
        </v-btn>
      </v-col>
    </v-row>
    <template v-if="allEvents.length > 0">
      <EventBookings status="Review" :events="events" @refresh="refresh" />
      <EventBookings status="Published" :events="events" @refresh="refresh" />
      <EventBookings status="Running" :events="events" @refresh="refresh" />
      <v-row v-if="events.length == 0" class="text-center">
        <v-col cols="12">
          Keine aktiven {{ eventType == EventType.Fitness ? 'Kurse' : 'Events' }}
        </v-col>
      </v-row>
    </template>
  </ActionsLayout>
</template>
