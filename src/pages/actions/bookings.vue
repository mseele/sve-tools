<script setup lang="ts">
import { loadEvents } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { EventType, LifecycleStatus, type Event } from '@/types'
import { statusIndex } from '@/utils'
import { mdiRefresh } from '@mdi/js'
import { useHead } from '@unhead/vue'
import Button from 'primevue/button'
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
    allEvents.value = await loadEvents(
      [LifecycleStatus.Review, LifecycleStatus.Published, LifecycleStatus.Running],
      true
    )
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Fehler beim Laden der Events. Details siehe Console')
    }
    allEvents.value = []
  }
}
</script>

<template>
  <ActionsLayout :title="title" :help="['Anzeige und Bearbeitung aller aktuellen Buchungen']">
    <div class="header">
      <EventTypeSelection v-model="eventType" />
      <Button text rounded aria-label="Aktualisieren" @click="refresh()">
        <MdiIcon :path="mdiRefresh" />
      </Button>
    </div>
    <template v-if="allEvents.length > 0">
      <EventBookings status="Review" :events="events" @refresh="refresh" />
      <EventBookings status="Published" :events="events" @refresh="refresh" />
      <EventBookings status="Running" :events="events" @refresh="refresh" />
      <div v-if="events.length == 0" class="empty">
        Keine aktiven {{ eventType == EventType.Fitness ? 'Kurse' : 'Events' }}
      </div>
    </template>
  </ActionsLayout>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.empty {
  text-align: center;
}
</style>
