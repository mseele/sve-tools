<route lang="json">
{ "name": "default_action" }
</route>

<script setup lang="ts">
import { getUnpaidBookings, loadEvents } from '@/api'
import { deriveDashboardModel, type DashboardModel } from '@/dashboard/model'
import { useNotifyStore } from '@/stores/notify'
import {
  EventType,
  LifecycleStatus,
  type Event,
  type FetchStatus,
  type UnpaidBooking
} from '@/types'
import { mdiRefresh } from '@mdi/js'
import { useHead } from '@unhead/vue'
import { computed, onMounted, ref } from 'vue'

const title = 'Dashboard'
useHead({ title })

const notify = useNotifyStore()

const eventsStatus = ref<FetchStatus>('loading')
const unpaidStatus = ref<FetchStatus>('loading')

const events = ref<Event[]>([])
const unpaidBookings = ref<Record<EventType, UnpaidBooking[]>>({
  [EventType.Fitness]: [],
  [EventType.Events]: []
})
const fetchedAt = ref(new Date())

const model = computed<DashboardModel>(() =>
  deriveDashboardModel({
    now: fetchedAt.value,
    events: events.value,
    unpaidBookings: unpaidBookings.value
  })
)

const loading = computed(() => eventsStatus.value === 'loading' || unpaidStatus.value === 'loading')

onMounted(refresh)

async function refresh() {
  eventsStatus.value = 'loading'
  unpaidStatus.value = 'loading'
  fetchedAt.value = new Date()

  await Promise.all([loadEventsData(), loadUnpaidData()])
}

async function loadEventsData() {
  try {
    events.value = await loadEvents(
      [LifecycleStatus.Review, LifecycleStatus.Published, LifecycleStatus.Running],
      true
    )
    eventsStatus.value = 'ok'
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Fehler beim Laden der Events. Details siehe Console')
    }
    eventsStatus.value = 'error'
  }
}

async function loadUnpaidData() {
  try {
    const [fitness, eventBookings] = await Promise.all([
      getUnpaidBookings(EventType.Fitness),
      getUnpaidBookings(EventType.Events)
    ])
    unpaidBookings.value = {
      [EventType.Fitness]: fitness,
      [EventType.Events]: eventBookings
    }
    unpaidStatus.value = 'ok'
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Laden unbezahlter Buchungen fehlgeschlagen. Details siehe Console')
    }
    unpaidStatus.value = 'error'
  }
}
</script>

<template>
  <ActionsLayout
    :title="title"
    :help="[
      'Übersicht nach dem Login: Karten für veröffentlichte Events und Vorbuchungen, laufende Events als Zeilen am Ende',
      'Rote Zeilen brauchen Handlung: überfällige Zahlungen und abzuschließende Events verlinken direkt in die Aktionsseiten',
      'Das Ergebnis je Event rechnet wie die Buchungsseite: Einnahmen − Termine × Preis pro Einheit'
    ]"
  >
    <v-row dense>
      <v-col cols="12" class="d-flex justify-end">
        <v-btn
          icon
          variant="text"
          color="primary"
          title="Daten aktualisieren"
          :loading="loading"
          @click="refresh"
        >
          <v-icon>{{ mdiRefresh }}</v-icon>
        </v-btn>
      </v-col>
    </v-row>
    <DashboardOverview :model="model" :events-status="eventsStatus" :unpaid-status="unpaidStatus" />
  </ActionsLayout>
</template>
