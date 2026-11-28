<script setup lang="ts">
// PROTOTYPE Variante E — Klare Übersicht.
//
// UX-Recherche, eingearbeitet in drei Regeln:
//   1. Monitoring-Sequenz nach Stephen Few («Rich Data, Poor Data»):
//      konsolidierter Überblick zuerst, markierte Details danach,
//      Drill-down über Links.
//   2. NN/g («Dashboards», Preattentive Processing): Mengen über Länge
//      und Position (Balken), Farbe nur als Ausnahme-Signal, nie für
//      Größenordnungen.
//   3. PatternFly (Aggregate Status Card: Ausnahmen nur wenn > 0) und
//      NHS Turas / REN Layout-Guides: KPI-Zeile einheitlich gebaut,
//      Zusammenfassung vor Detail, Karten nur für gleichartige
//      Vergleichsobjekte, wiederholte Label entfernen.
// Zonen: Status (Plus/Minus) → Aufmerksamkeit (nur wenn nötig) →
// laufende Events → eine einheitliche Karte pro beworbenem Event.
import { computed } from 'vue'
import type { PrototypeProps } from './prototypeData'
import {
  countdown,
  dayDiff,
  endsOn,
  enrollmentTrend,
  euro,
  eventMoney,
  isPromoted,
  isRunning,
  methodLabel,
  startsOn,
  type EventMoney
} from './prototypeData'
import {
  deriveDashboardModel,
  readEventAvailability,
  type EventAvailability
} from '@/dashboard/model'
import { PaymentMethod as PM, type Event } from '@/types'

interface CampaignCard {
  event: Event
  startDays: number
  startText: string
  avail: EventAvailability
  money: EventMoney
  trend: number[]
  overdue: number
}

interface RunningRow {
  event: Event
  days: number
  text: string
}

const props = defineProps<PrototypeProps>()

const model = computed(() =>
  deriveDashboardModel({
    now: props.now,
    events: props.events,
    unpaidBookings: props.unpaidBookings,
    newsletterSubscribers: props.newsletterSubscribers
  })
)

const promotedIds = computed(() => new Set(props.events.filter(isPromoted).map((ev) => ev.id)))

/** Überfällige Zahlungen pro Event — das einzige Rot auf einer Karte. */
const overdueByEvent = computed(() => {
  const map = new Map<string, number>()
  for (const list of Object.values(props.unpaidBookings)) {
    for (const booking of list) {
      if (booking.due_in_days < 0) {
        map.set(booking.event_id, (map.get(booking.event_id) ?? 0) + 1)
      }
    }
  }
  return map
})

const overduePromoted = computed(() => {
  let count = 0
  let total = 0
  for (const list of Object.values(props.unpaidBookings)) {
    for (const booking of list) {
      if (booking.due_in_days < 0 && promotedIds.value.has(booking.event_id)) {
        count += 1
        total += parseFloat(booking.price) || 0
      }
    }
  }
  return { count, total }
})

const cards = computed<CampaignCard[]>(() =>
  props.events
    .filter(isPromoted)
    .map((event): CampaignCard => {
      const start = startsOn(event, props.now)
      const startDays = start === undefined ? Number.POSITIVE_INFINITY : dayDiff(start, props.now)
      return {
        event,
        startDays,
        startText: start === undefined ? '' : countdown(Math.max(0, startDays), 'startet').text,
        avail: readEventAvailability(event),
        money: eventMoney(event),
        trend: enrollmentTrend(event, props.now),
        overdue: overdueByEvent.value.get(event.id) ?? 0
      }
    })
    .sort((a, b) => a.startDays - b.startDays)
)

const money = computed(() =>
  cards.value.reduce(
    (acc, card) => {
      acc.expected += card.money.expected
      acc.confirmed += card.money.confirmed
      if (card.money.method === PM.SepaDirectDebit) acc.sepaOpen += card.money.open
      else acc.transferOpen += card.money.open
      return acc
    },
    { expected: 0, confirmed: 0, sepaOpen: 0, transferOpen: 0 }
  )
)

const confirmedPercent = computed(() =>
  money.value.expected > 0 ? (money.value.confirmed / money.value.expected) * 100 : 100
)

const kpis = computed(() => [
  { value: euro(money.value.expected), label: `erwartet · ${cards.value.length} Events` },
  { value: euro(money.value.confirmed), label: 'bestätigt' },
  { value: euro(money.value.sepaOpen), label: 'SEPA offen' },
  { value: euro(money.value.transferOpen), label: 'Überweisung offen' }
])

const running = computed<RunningRow[]>(() =>
  props.events
    .filter(isRunning)
    .flatMap((event): RunningRow[] => {
      const end = endsOn(event)
      if (!end) return []
      const days = dayDiff(end, props.now)
      // Abgelaufene laufende Events sind Straggler — Aufmerksamkeitsliste.
      if (days < 0) return []
      return [{ event, days, text: countdown(days, 'endet').text }]
    })
    .sort((a, b) => a.days - b.days)
)

// Die Aufmerksamkeitskarte erscheint nur, wenn es etwas zu sehen gibt —
// oder solange geladen wird / ein Endpunkt fehlschlägt.
const showAttention = computed(
  () =>
    model.value.attention.length > 0 ||
    props.eventsStatus === 'loading' ||
    props.unpaidStatus === 'loading' ||
    props.eventsStatus === 'error' ||
    props.unpaidStatus === 'error'
)
</script>

<template>
  <div>
    <p v-if="props.demo" class="text-caption text-medium-emphasis mb-2">
      Demo-Daten — der echte Endpunkt liefert gerade nichts.
    </p>

    <!-- Zone 1: Status — «stehen wir im Plus oder Minus?» auf einen Blick. -->
    <div v-if="cards.length > 0" class="mb-2">
      <div class="text-overline text-medium-emphasis">Status beworbener Events</div>
      <div class="d-flex flex-wrap ga-6 mt-1">
        <div v-for="kpi in kpis" :key="kpi.label">
          <div class="text-h5 font-weight-bold">{{ kpi.value }}</div>
          <div class="text-caption text-medium-emphasis">{{ kpi.label }}</div>
        </div>
      </div>
      <div v-if="money.expected > 0" class="d-flex align-center ga-3 mt-3">
        <div
          class="flex-grow-1 rounded"
          style="height: 8px; overflow: hidden; background: rgba(0, 0, 0, 0.12)"
        >
          <div
            :style="{ width: `${confirmedPercent}%` }"
            style="height: 100%; background: rgb(var(--v-theme-primary))"
          />
        </div>
        <span class="text-caption text-medium-emphasis text-no-wrap">
          bestätigt {{ Math.round(confirmedPercent) }} %
        </span>
      </div>
      <p
        v-if="overduePromoted.count > 0"
        class="text-body-2 text-error font-weight-medium mt-2 mb-0"
      >
        {{ overduePromoted.count }}
        {{ overduePromoted.count === 1 ? 'Zahlung' : 'Zahlungen' }} überfällig ({{
          euro(overduePromoted.total)
        }}) — Details unten
      </p>
    </div>
    <p v-else class="text-body-2 text-medium-emphasis mb-2">Keine beworbenen Events</p>

    <!-- Zone 2: Aufmerksamkeit — nur wenn es etwas zu erledigen gibt. -->
    <AttentionList
      v-if="showAttention"
      class="mb-2"
      :entries="model.attention"
      :unpaid-status="props.demo ? 'ok' : props.unpaidStatus"
      :events-status="props.demo ? 'ok' : props.eventsStatus"
    />

    <!-- Zone 3: Laufende Events — eine Zeile, runtergezählt. -->
    <p v-if="running.length > 0" class="text-body-2 text-medium-emphasis mb-2">
      <span class="font-weight-medium text-high-emphasis">Laufende Events:</span>
      <template v-for="(row, i) in running" :key="row.event.id"
        ><template v-if="i > 0"> · </template>
        <router-link to="/actions/bookings" class="text-decoration-none">
          {{ row.event.name }}
        </router-link>
        {{ row.text }}
      </template>
    </p>

    <!-- Zone 4: Eine einheitliche Karte pro Event — gleiche Anatomie,
         gleiche Positionen, gleiche Größen. Sortiert nach Startdatum. -->
    <div v-if="cards.length > 0">
      <div class="text-overline text-medium-emphasis">Beworbene Events</div>
      <p class="text-caption text-medium-emphasis mt-1 mb-2">
        Nach Startdatum sortiert · Mini-Kurve: Buchungen der letzten 8 Wochen
      </p>
      <v-row dense>
        <v-col v-for="card in cards" :key="card.event.id" cols="12" sm="6" lg="4">
          <v-card variant="outlined" to="/actions/bookings" class="fill-height">
            <v-card-item>
              <v-card-title class="text-body-1 font-weight-bold text-truncate">
                {{ card.event.name }}
              </v-card-title>
              <template #append>
                <span
                  class="text-body-2 text-no-wrap"
                  :class="
                    card.startDays <= 0 ? 'text-primary font-weight-bold' : 'text-medium-emphasis'
                  "
                >
                  {{ card.startText }}
                </span>
              </template>
              <v-card-subtitle class="pl-0">{{ card.event.type }}</v-card-subtitle>
            </v-card-item>
            <v-card-text class="pt-0">
              <div class="d-flex align-center ga-3 mb-2">
                <template v-if="card.avail.unlimited">
                  <span class="text-body-2 text-medium-emphasis">
                    Unbegrenzt · {{ card.avail.enrolled }} gebucht
                  </span>
                </template>
                <template v-else>
                  <v-progress-linear
                    :model-value="card.avail.fillPercent"
                    color="primary"
                    height="6"
                    rounded
                    class="flex-grow-1"
                  />
                  <span class="text-body-2 text-no-wrap text-medium-emphasis">
                    {{ card.avail.enrolled }} / {{ card.avail.maxSubscribers
                    }}<template v-if="card.avail.waitingList > 0">
                      · {{ card.avail.waitingList }} WL</template
                    >
                  </span>
                </template>
              </div>

              <div class="d-flex align-baseline flex-wrap ga-2">
                <span class="text-h6">{{ euro(card.money.expected) }}</span>
                <span class="text-body-2 text-medium-emphasis">
                  <template v-if="card.money.open > 0">
                    {{ euro(card.money.confirmed) }} bestätigt · {{ euro(card.money.open) }} offen ·
                    {{ methodLabel(card.money.method)
                    }}<template v-if="card.money.sepaNotExported > 0">
                      · {{ card.money.sepaNotExported }} n. exportiert</template
                    >
                  </template>
                  <template v-else>komplett bezahlt</template>
                </span>
                <span v-if="card.overdue > 0" class="text-body-2 text-error font-weight-medium">
                  {{ card.overdue }} überfällig
                </span>
              </div>

              <div class="mt-2 d-flex align-center">
                <PrototypeTrend
                  :values="card.trend"
                  :width="130"
                  :height="22"
                  color="rgba(0, 0, 0, 0.25)"
                />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </div>
</template>
