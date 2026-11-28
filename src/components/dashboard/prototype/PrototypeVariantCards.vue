<script setup lang="ts">
// PROTOTYPE Variante A — Kampagnen-Karten, v3.
// Farbenregel: rot nur für echte Probleme (Aufmerksamkeitsliste oben),
// primary als einzige Strukturfarbe, Geld ist Information, kein Alarm.
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

interface CardRow {
  event: Event
  start?: { color: string; text: string }
  startDays?: number
  avail: EventAvailability
  money: EventMoney
  trend: number[]
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

const rows = computed<CardRow[]>(() =>
  props.events
    .filter(isPromoted)
    .map((event) => {
      const start = startsOn(event, props.now)
      const startDays = start === undefined ? undefined : dayDiff(start, props.now)
      return {
        event,
        start: start === undefined ? undefined : countdown(startDays ?? 0, 'startet'),
        startDays,
        avail: readEventAvailability(event),
        money: eventMoney(event),
        trend: enrollmentTrend(event, props.now)
      }
    })
    .sort((a, b) => (a.startDays ?? 9999) - (b.startDays ?? 9999))
)

const running = computed(() =>
  props.events.filter(isRunning).flatMap((event) => {
    // Abgelaufene laufende Events sind Straggler — Aufmerksamkeitsliste.
    const end = endsOn(event)
    if (!end || dayDiff(end, props.now) < 0) return []
    return [{ event, end: countdown(dayDiff(end, props.now), 'endet') }]
  })
)

const total = computed(() =>
  rows.value.reduce(
    (acc, r) => {
      acc.expected += r.money.expected
      acc.confirmed += r.money.confirmed
      if (r.money.method === PM.SepaDirectDebit) acc.sepaOpen += r.money.open
      else acc.transferOpen += r.money.open
      return acc
    },
    { expected: 0, confirmed: 0, sepaOpen: 0, transferOpen: 0 }
  )
)
</script>

<template>
  <div>
    <p v-if="props.demo" class="text-caption text-medium-emphasis mb-2">
      Demo-Daten — der echte Endpunkt liefert gerade nichts.
    </p>

    <!-- Probleme zuerst — das einzige Rot auf der Seite -->
    <AttentionList
      :entries="model.attention"
      :unpaid-status="props.demo ? 'ok' : props.unpaidStatus"
      :events-status="props.demo ? 'ok' : props.eventsStatus"
    />

    <p v-if="rows.length > 0" class="text-body-2 text-medium-emphasis mt-4 mb-2">
      <b class="text-high-emphasis">{{ rows.length }}</b> beworben · erwartet
      <b class="text-high-emphasis">{{ euro(total.expected) }}</b> · bestätigt
      <b class="text-high-emphasis">{{ euro(total.confirmed) }}</b
      ><template v-if="total.sepaOpen > 0">
        · SEPA offen <b class="text-high-emphasis">{{ euro(total.sepaOpen) }}</b></template
      ><template v-if="total.transferOpen > 0">
        · Überweisung offen
        <b class="text-high-emphasis">{{ euro(total.transferOpen) }}</b></template
      >
    </p>

    <v-row dense>
      <v-col v-for="row in rows" :key="row.event.id" cols="12" sm="6" lg="4">
        <v-card variant="outlined" to="/actions/bookings" class="fill-height">
          <v-card-item>
            <v-card-title class="text-body-1 font-weight-bold">
              {{ row.event.name }}
            </v-card-title>
            <template #append>
              <v-chip
                v-if="row.start && (row.startDays ?? 99) <= 7"
                size="x-small"
                variant="tonal"
                :color="row.start.color"
              >
                {{ row.start.text }}
              </v-chip>
            </template>
            <v-card-subtitle class="pl-0">
              {{ row.event.type
              }}<template v-if="row.start && (row.startDays ?? 99) > 7">
                · {{ row.start.text }}</template
              >
            </v-card-subtitle>
          </v-card-item>
          <v-card-text class="pt-0">
            <div class="d-flex align-center mb-2">
              <template v-if="row.avail.unlimited">
                <span class="text-body-2 text-medium-emphasis">
                  Unbegrenzt · {{ row.avail.enrolled }} gebucht
                </span>
              </template>
              <template v-else>
                <v-progress-linear
                  :model-value="row.avail.fillPercent"
                  color="primary"
                  height="6"
                  rounded
                  class="flex-grow-1 mr-3"
                />
                <span class="text-body-2 text-no-wrap text-medium-emphasis">
                  {{ row.avail.enrolled }} / {{ row.avail.maxSubscribers
                  }}<template v-if="row.avail.waitingList > 0">
                    · {{ row.avail.waitingList }} Warteliste</template
                  >
                </span>
              </template>
            </div>

            <div class="d-flex align-baseline ga-2">
              <span class="text-h6">{{ euro(row.money.expected) }}</span>
              <span class="text-body-2 text-medium-emphasis">erwartet</span>
            </div>
            <div class="text-body-2 text-medium-emphasis mt-1">
              <template v-if="row.money.open > 0">
                {{ euro(row.money.confirmed) }} bestätigt · {{ euro(row.money.open) }} offen ·
                {{ methodLabel(row.money.method)
                }}<template v-if="row.money.sepaNotExported > 0">
                  · {{ row.money.sepaNotExported }} noch nicht exportiert</template
                >
              </template>
              <template v-else>komplett bezahlt</template>
            </div>

            <div class="mt-3 d-flex align-center ga-2">
              <PrototypeTrend
                :values="row.trend"
                :width="140"
                :height="24"
                color="rgba(0, 0, 0, 0.25)"
              />
              <span class="text-caption text-medium-emphasis">Buchungen (8 Wochen)</span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <p v-if="running.length > 0" class="text-body-2 text-medium-emphasis mt-2 mb-0">
      <span class="font-weight-medium">Laufende Events:</span>
      <template v-for="(r, i) in running" :key="r.event.id"
        ><template v-if="i > 0"> · </template>
        <router-link to="/actions/bookings" class="text-decoration-none">
          {{ r.event.name }}
        </router-link>
        {{ r.end.text }}
      </template>
    </p>
  </div>
</template>
