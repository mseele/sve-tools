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
import { useRoute, useRouter } from 'vue-router'
import {
  demoEvents,
  demoNewsletter,
  demoUnpaid
} from '@/components/dashboard/prototype/prototypeData'

const title = 'Dashboard'
useHead({ title })

const notify = useNotifyStore()

const route = useRoute()
const router = useRouter()

// PROTOTYPE: Varianten nur im Dev-Build, schaltbar via ?variant=A|B|C.
const prototypeEnabled = import.meta.env.DEV
const prototypeVariants = [
  { key: '', label: 'Aktueller Stand (PR #200)' },
  { key: 'A', label: 'Kampagnen-Karten' },
  { key: 'B', label: 'Verdichtete Tabelle' },
  { key: 'C', label: 'Einnahmen zuerst' }
]

const variant = computed<string>(() => {
  if (!prototypeEnabled) return ''
  const raw = route.query.variant
  const key = Array.isArray(raw) ? raw[0] : raw
  return key === 'A' || key === 'B' || key === 'C' ? key : ''
})

function selectVariant(key: string) {
  const query = { ...route.query }
  if (key) query.variant = key
  else delete query.variant
  router.replace({ query })
}

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

// PROTOTYPE: Demo-Fixtures, wenn im Varianten-Modus echte Daten fehlen.
const demoRequested = computed(() => {
  const raw = route.query.demo
  return raw === '1' || (Array.isArray(raw) && raw[0] === '1')
})
const protoActive = computed(() => prototypeEnabled && variant.value !== '')
const protoDemo = computed(
  () =>
    protoActive.value &&
    (demoRequested.value ||
      eventsStatus.value !== 'ok' ||
      unpaidStatus.value !== 'ok' ||
      events.value.length === 0)
)
const protoEvents = computed(() =>
  protoDemo.value && !demoRequested.value ? demoEvents(fetchedAt.value) : events.value
)
const protoUnpaid = computed(() =>
  protoDemo.value && !demoRequested.value ? demoUnpaid(fetchedAt.value) : unpaidBookings.value
)

onMounted(refresh)

async function refresh() {
  eventsStatus.value = 'loading'
  unpaidStatus.value = 'loading'
  newsletterStatus.value = 'loading'
  fetchedAt.value = new Date()

  // PROTOTYPE: ?demo=1 lädt Fixtures statt echter Endpunkte — für den
  // geteilten Demo-Link ohne Login.
  if (demoRequested.value) {
    events.value = demoEvents(fetchedAt.value)
    unpaidBookings.value = demoUnpaid(fetchedAt.value)
    newsletterSubscribers.value = demoNewsletter()
    eventsStatus.value = 'ok'
    unpaidStatus.value = 'ok'
    newsletterStatus.value = 'ok'
    return
  }

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
    <PrototypeVariantCards
      v-if="variant === 'A'"
      :events="protoEvents"
      :unpaid-bookings="protoUnpaid"
      :newsletter-subscribers="newsletterSubscribers"
      :events-status="eventsStatus"
      :unpaid-status="unpaidStatus"
      :now="fetchedAt"
      :demo="protoDemo"
    />
    <PrototypeVariantTable
      v-else-if="variant === 'B'"
      :events="protoEvents"
      :unpaid-bookings="protoUnpaid"
      :newsletter-subscribers="newsletterSubscribers"
      :events-status="eventsStatus"
      :unpaid-status="unpaidStatus"
      :now="fetchedAt"
      :demo="protoDemo"
    />
    <PrototypeVariantRevenue
      v-else-if="variant === 'C'"
      :events="protoEvents"
      :unpaid-bookings="protoUnpaid"
      :newsletter-subscribers="newsletterSubscribers"
      :events-status="eventsStatus"
      :unpaid-status="unpaidStatus"
      :now="fetchedAt"
      :demo="protoDemo"
    />
    <template v-else>
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
    </template>
    <PrototypeSwitcher
      v-if="prototypeEnabled"
      :variants="prototypeVariants"
      :current="variant"
      @select="selectVariant"
    />
  </ActionsLayout>
</template>
