<route lang="json">
{ "name": "default_action" }
</route>

<script setup lang="ts">
import { getNewsletterSubscribers, getUnpaidBookings, loadEvents } from '@/api'
import { deriveDashboardModel, type DashboardModel } from '@/dashboard/model'
import { useNotifyStore } from '@/stores/notify'
import {
  EventType,
  LifecycleStatus,
  NewsTopic,
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
const newsletterStatus = ref<FetchStatus>('loading')

const events = ref<Event[]>([])
const unpaidBookings = ref<Record<EventType, UnpaidBooking[]>>({
  [EventType.Fitness]: [],
  [EventType.Events]: []
})
const newsletterSubscribers = ref<Record<NewsTopic, string[]>>({
  [NewsTopic.General]: [],
  [NewsTopic.Events]: [],
  [NewsTopic.Fitness]: []
})
const fetchedAt = ref(new Date())

const model = computed<DashboardModel>(() =>
  deriveDashboardModel({
    now: fetchedAt.value,
    events: events.value,
    unpaidBookings: unpaidBookings.value,
    newsletterSubscribers: newsletterSubscribers.value
  })
)

const loading = computed(
  () =>
    eventsStatus.value === 'loading' ||
    unpaidStatus.value === 'loading' ||
    newsletterStatus.value === 'loading'
)

onMounted(refresh)

async function refresh() {
  eventsStatus.value = 'loading'
  unpaidStatus.value = 'loading'
  newsletterStatus.value = 'loading'
  fetchedAt.value = new Date()

  await Promise.all([loadEventsData(), loadUnpaidData(), loadNewsletterData()])
}

async function loadEventsData() {
  try {
    events.value = await loadEvents([LifecycleStatus.Published, LifecycleStatus.Running], true)
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

async function loadNewsletterData() {
  try {
    const [general, eventTopic, fitness] = await Promise.all([
      getNewsletterSubscribers([NewsTopic.General]),
      getNewsletterSubscribers([NewsTopic.Events]),
      getNewsletterSubscribers([NewsTopic.Fitness])
    ])
    newsletterSubscribers.value = {
      [NewsTopic.General]: general,
      [NewsTopic.Events]: eventTopic,
      [NewsTopic.Fitness]: fitness
    }
    newsletterStatus.value = 'ok'
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Abholen der Newsletter-Abonnenten fehlgeschlagen. Details siehe Console')
    }
    newsletterStatus.value = 'error'
  }
}
</script>

<template>
  <ActionsLayout
    :title="title"
    :help="[
      'Übersicht nach dem Login: alles, was Aufmerksamkeit braucht',
      'Karten, Auslastung und Aufmerksamkeitsliste verlinken direkt in die Aktionsseiten',
      'Die drei Zonen laden unabhängig voneinander'
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
    <KpiCards
      :kpis="model.kpis"
      :events-status="eventsStatus"
      :unpaid-status="unpaidStatus"
      :newsletter-status="newsletterStatus"
    />
    <v-row dense class="mt-4">
      <v-col cols="12" lg="6">
        <FillList :fill="model.fill" :status="eventsStatus" />
      </v-col>
      <v-col cols="12" lg="6">
        <AttentionList
          :entries="model.attention"
          :unpaid-status="unpaidStatus"
          :events-status="eventsStatus"
        />
      </v-col>
    </v-row>
  </ActionsLayout>
</template>
