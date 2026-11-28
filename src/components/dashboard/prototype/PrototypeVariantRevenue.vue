<script setup lang="ts">
// PROTOTYPE Variante C — Einnahmen zuerst: ein großer Gesamtblock über alle
// beworbenen Events, Zahlart-Übersicht, dann Rennen pro Event.
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
  startsOn
} from './prototypeData'
import { deriveDashboardModel } from '@/dashboard/model'
import { PaymentMethod as PM, type Event } from '@/types'

interface RaceRow {
  event: Event
  chip?: { color: string; text: string }
  money: ReturnType<typeof eventMoney>
  widthPct: number
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

const rows = computed<RaceRow[]>(() => {
  const promoted = props.events.filter(isPromoted)
  const max = Math.max(1, ...promoted.map((e) => eventMoney(e).expected))
  return promoted
    .map((event) => {
      const start = startsOn(event, props.now)
      const money = eventMoney(event)
      return {
        event,
        chip: start ? countdown(dayDiff(start, props.now), 'startet') : undefined,
        money,
        widthPct: Math.max(6, Math.round((money.expected / max) * 100)),
        trend: enrollmentTrend(event, props.now)
      }
    })
    .sort((a, b) => b.money.expected - a.money.expected)
})

const total = computed(() => {
  const acc = {
    expected: 0,
    confirmed: 0,
    sepaOpen: 0,
    transferOpen: 0,
    sepaNotExported: 0,
    transferOpenBookings: 0
  }
  for (const r of rows.value) {
    acc.expected += r.money.expected
    acc.confirmed += r.money.confirmed
    if (r.money.method === PM.SepaDirectDebit) {
      acc.sepaOpen += r.money.open
      acc.sepaNotExported += r.money.sepaNotExported
    } else {
      acc.transferOpen += r.money.open
      if (r.money.open > 0) acc.transferOpenBookings += 1
    }
  }
  return acc
})

const segments = computed(() => [
  { label: 'bestätigt', value: total.value.confirmed, color: 'success' },
  { label: 'SEPA offen', value: total.value.sepaOpen, color: 'primary' },
  { label: 'Überweisung offen', value: total.value.transferOpen, color: 'error' }
])

const running = computed(() =>
  props.events
    .filter(isRunning)
    .flatMap((event) => {
      // Abgelaufene laufende Events sind Straggler — Aufmerksamkeitsliste.
      const end = endsOn(event)
      if (!end || dayDiff(end, props.now) < 0) return []
      return [{ event, chip: countdown(dayDiff(end, props.now), 'endet') }]
    })
    .sort((a, b) => (a.chip?.text ?? '').localeCompare(b.chip?.text ?? ''))
)

function segWidth(value: number): number {
  return total.value.expected > 0 ? Math.round((value / total.value.expected) * 100) : 0
}
</script>

<template>
  <div>
    <v-row v-if="props.demo" dense>
      <v-col cols="12">
        <v-chip size="small" color="secondary" variant="tonal">
          Demo-Daten — echter Endpunkt liefert gerade nichts
        </v-chip>
      </v-col>
    </v-row>

    <v-row dense>
      <v-col cols="12" md="7">
        <v-card variant="outlined" height="100%">
          <v-card-item>
            <v-card-subtitle class="pl-0">
              Erwartete Einnahmen — {{ rows.length }} beworbene Events
            </v-card-subtitle>
            <v-card-title class="text-h4 font-weight-bold pa-0">
              {{ euro(total.expected) }}
            </v-card-title>
          </v-card-item>
          <v-card-text>
            <div class="d-flex rounded overflow-hidden" style="height: 18px">
              <div
                v-for="(s, i) in segments"
                :key="i"
                :class="`bg-${s.color}`"
                :style="{ width: `${segWidth(s.value)}%` }"
              />
            </div>
            <div class="d-flex flex-wrap ga-3 mt-2 text-body-2">
              <span v-for="(s, i) in segments" :key="i">
                <span
                  :class="`bg-${s.color}`"
                  class="d-inline-block rounded mr-1"
                  style="width: 10px; height: 10px"
                />
                {{ s.label }} <b>{{ euro(s.value) }}</b>
              </span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="5">
        <v-row dense>
          <v-col cols="12">
            <v-card variant="tonal" color="primary" to="/actions/events">
              <v-card-text class="py-3">
                <div class="text-body-2 font-weight-bold">SEPA-Lastschrift</div>
                <div class="text-body-2">
                  {{ euro(total.sepaOpen) }} offen
                  <span v-if="total.sepaNotExported > 0" class="text-medium-emphasis">
                    · {{ total.sepaNotExported }} Buchungen noch zu exportieren
                  </span>
                  <span v-else class="text-medium-emphasis">· alles exportiert</span>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12">
            <v-card
              variant="tonal"
              :color="total.transferOpen > 0 ? 'error' : 'success'"
              to="/actions/payments"
            >
              <v-card-text class="py-3">
                <div class="text-body-2 font-weight-bold">Überweisung</div>
                <div class="text-body-2">
                  <template v-if="total.transferOpen > 0">
                    {{ euro(total.transferOpen) }} offen in {{ total.transferOpenBookings }} Events
                    · Mahnungen laufen über Zahlungen
                  </template>
                  <template v-else>keine offenen Überweisungen</template>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <v-row dense>
      <v-col cols="12">
        <v-card variant="outlined">
          <v-card-item>
            <v-card-subtitle class="pl-0"
              >Nach Event — Balkenlänge = erwartete Einnahmen</v-card-subtitle
            >
          </v-card-item>
          <div v-for="row in rows" :key="row.event.id" class="px-4 pb-3">
            <div class="d-flex align-center flex-wrap ga-2 mb-1">
              <span class="text-body-2 font-weight-medium" style="min-width: 200px">
                {{ row.event.name }}
              </span>
              <v-chip v-if="row.chip" size="x-small" :color="row.chip.color">
                {{ row.chip.text }}
              </v-chip>
              <v-spacer />
              <span class="text-caption text-medium-emphasis">{{ row.event.type }}</span>
            </div>
            <div class="d-flex align-center ga-3">
              <div
                class="rounded overflow-hidden d-flex"
                :style="{ width: `${row.widthPct}%`, height: '14px', minWidth: '60px' }"
              >
                <div
                  class="bg-success"
                  :style="{
                    width: `${row.money.expected > 0 ? Math.round((row.money.confirmed / row.money.expected) * 100) : 0}%`
                  }"
                />
                <div
                  :class="row.money.method === PM.SepaDirectDebit ? 'bg-primary' : 'bg-error'"
                  :style="{
                    width: `${row.money.expected > 0 ? Math.round((row.money.open / row.money.expected) * 100) : 0}%`
                  }"
                />
              </div>
              <span class="text-body-2 text-no-wrap">
                <b>{{ euro(row.money.expected) }}</b>
                <span v-if="row.money.open > 0" class="text-error ml-1">
                  {{ euro(row.money.open) }} offen
                </span>
              </span>
              <PrototypeTrend :values="row.trend" :width="90" :height="20" />
            </div>
          </div>
          <div v-if="rows.length === 0" class="pa-4 text-medium-emphasis">
            Keine beworbenen Events
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="running.length > 0" dense>
      <v-col cols="12">
        <v-card variant="tonal">
          <v-card-text class="d-flex align-center flex-wrap ga-2">
            <span class="text-body-2 font-weight-bold">Laufende Events:</span>
            <v-chip
              v-for="r in running"
              :key="r.event.id"
              size="small"
              to="/actions/bookings"
              :color="r.chip?.color"
            >
              {{ r.event.name }} · {{ r.chip?.text }}
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <AttentionList
      :entries="model.attention"
      :unpaid-status="props.demo ? 'ok' : props.unpaidStatus"
      :events-status="props.demo ? 'ok' : props.eventsStatus"
    />
  </div>
</template>
