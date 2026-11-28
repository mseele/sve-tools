<script setup lang="ts">
// PROTOTYPE Variante A — Kampagnen-Karten: ein Karte pro beworbenem Event,
// Countdown + Auslastung + Einnahmen + Zahlungsart + Buchungstrend im Fokus.
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
      return {
        event,
        start: start ? countdown(dayDiff(start, props.now), 'startet') : undefined,
        avail: readEventAvailability(event),
        money: eventMoney(event),
        trend: enrollmentTrend(event, props.now)
      }
    })
    .sort((a, b) => (a.start?.text ?? '').localeCompare(b.start?.text ?? ''))
)

const running = computed(() =>
  props.events.filter(isRunning).flatMap((event) => {
    const end = endsOn(event)
    // Abgelaufene laufende Events sind Straggler — die stehen in der
    // Aufmerksamkeitsliste, nicht im Countdown-Streifen.
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

function fillColor(avail: EventAvailability): string {
  if (avail.unlimited) return 'primary'
  if (avail.waitingList > 0) return 'warning'
  if ((avail.maxSubscribers ?? 0) <= avail.enrolled) return 'error'
  return 'success'
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
      <v-col cols="12">
        <v-chip-group>
          <v-chip size="small"> <b>{{ rows.length }}</b>&nbsp;beworben </v-chip>
          <v-chip size="small" color="primary" variant="tonal">
            Erwartet&nbsp;<b>{{ euro(total.expected) }}</b>
          </v-chip>
          <v-chip size="small" color="success" variant="tonal">
            Bestätigt&nbsp;<b>{{ euro(total.confirmed) }}</b>
          </v-chip>
          <v-chip v-if="total.sepaOpen > 0" size="small" color="primary">
            SEPA offen&nbsp;<b>{{ euro(total.sepaOpen) }}</b>
          </v-chip>
          <v-chip v-if="total.transferOpen > 0" size="small" color="error">
            Überweisung offen&nbsp;<b>{{ euro(total.transferOpen) }}</b>
          </v-chip>
          <v-chip size="small"> Warteliste&nbsp;<b>{{ model.kpis.waitingListTotal }}</b> </v-chip>
        </v-chip-group>
      </v-col>
    </v-row>

    <v-row dense>
      <v-col v-for="row in rows" :key="row.event.id" cols="12" sm="6" lg="4">
        <v-card variant="outlined" to="/actions/bookings" class="fill-height">
          <v-card-item>
            <v-card-title class="text-body-1 font-weight-bold">
              {{ row.event.name }}
            </v-card-title>
            <template #append>
              <v-chip v-if="row.start" size="small" :color="row.start.color">
                {{ row.start.text }}
              </v-chip>
            </template>
            <v-card-subtitle class="pl-0">{{ row.event.type }}</v-card-subtitle>
          </v-card-item>
          <v-card-text class="pt-0">
            <div class="d-flex align-center mb-1">
              <template v-if="row.avail.unlimited">
                <v-chip size="x-small" color="primary" variant="tonal">Unbegrenzt</v-chip>
                <span class="ml-2 text-body-2">{{ row.avail.enrolled }} gebucht</span>
              </template>
              <template v-else>
                <v-progress-linear
                  :model-value="row.avail.fillPercent"
                  :color="fillColor(row.avail)"
                  height="8"
                  rounded
                  class="flex-grow-1 mr-2"
                />
                <span class="text-body-2 text-no-wrap">
                  {{ row.avail.enrolled }} / {{ row.avail.maxSubscribers }}
                  <span v-if="row.avail.waitingList > 0" class="text-warning">
                    · {{ row.avail.waitingList }} WL
                  </span>
                </span>
              </template>
            </div>

            <div class="d-flex align-baseline ga-2">
              <span class="text-h6">{{ euro(row.money.expected) }}</span>
              <span class="text-body-2 text-medium-emphasis">erwartet</span>
              <v-spacer />
              <span class="text-body-2" :class="row.money.open > 0 ? 'text-error' : 'text-success'">
                {{ euro(row.money.confirmed) }} bestätigt
              </span>
            </div>
            <div v-if="row.money.open > 0" class="text-body-2 mt-1">
              <v-chip
                size="x-small"
                :color="row.money.method === PM.SepaDirectDebit ? 'primary' : 'error'"
                variant="tonal"
              >
                {{ methodLabel(row.money.method) }}
              </v-chip>
              {{ euro(row.money.open) }} offen
              <span v-if="row.money.sepaNotExported > 0" class="text-medium-emphasis">
                · {{ row.money.sepaNotExported }} noch nicht exportiert
              </span>
            </div>
            <div v-else class="text-body-2 text-success mt-1">alles bestätigt</div>

            <div class="mt-3 d-flex align-center ga-2">
              <PrototypeTrend :values="row.trend" :width="140" :height="26" />
              <span class="text-caption text-medium-emphasis">Buchungen (8 Wochen)</span>
            </div>
          </v-card-text>
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
              :color="r.end?.color"
            >
              {{ r.event.name }} · {{ r.end?.text }}
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
