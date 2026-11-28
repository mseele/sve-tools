<script setup lang="ts">
// PROTOTYPE Variante B — Verdichtete Tabelle: alle beworbenen Events als
// dichte, scannbare Matrix — Start, Auslastung, Einnahmen, Zahlart, Trend.
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
  startsOn
} from './prototypeData'
import { deriveDashboardModel, readEventAvailability } from '@/dashboard/model'
import { PaymentMethod as PM, type Event } from '@/types'

interface Row {
  event: Event
  startDay?: string
  startChip?: { color: string; text: string }
  avail: ReturnType<typeof readEventAvailability>
  money: ReturnType<typeof eventMoney>
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

const rows = computed<Row[]>(() =>
  props.events
    .filter(isPromoted)
    .map((event) => {
      const start = startsOn(event, props.now)
      return {
        event,
        startDay: start?.slice(0, 10),
        startChip: start ? countdown(dayDiff(start, props.now), 'startet') : undefined,
        avail: readEventAvailability(event),
        money: eventMoney(event),
        trend: enrollmentTrend(event, props.now)
      }
    })
    .sort((a, b) => (a.startDay ?? 'zzz').localeCompare(b.startDay ?? 'zzz'))
)

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
    <v-row v-if="props.demo" dense>
      <v-col cols="12">
        <v-chip size="small" color="secondary" variant="tonal">
          Demo-Daten — echter Endpunkt liefert gerade nichts
        </v-chip>
      </v-col>
    </v-row>

    <v-row dense>
      <v-col cols="12">
        <v-card variant="outlined">
          <v-card-text class="d-flex flex-wrap align-center ga-2 py-2">
            <span class="text-body-2 font-weight-bold"> {{ rows.length }} beworbene Events </span>
            <v-chip size="small" color="primary" variant="tonal">
              Erwartet {{ euro(total.expected) }}
            </v-chip>
            <v-chip size="small" color="success" variant="tonal">
              Bestätigt {{ euro(total.confirmed) }}
            </v-chip>
            <v-chip size="small" :color="total.transferOpen > 0 ? 'error' : 'default'">
              Überweisung offen {{ euro(total.transferOpen) }}
            </v-chip>
            <v-chip size="small" color="primary"> SEPA offen {{ euro(total.sepaOpen) }} </v-chip>
            <v-chip size="small">Warteliste {{ model.kpis.waitingListTotal }}</v-chip>
            <v-spacer />
            <span class="text-caption text-medium-emphasis">
              Newsletter: Allgemein {{ model.kpis.newsletterSubscribers.General }} · Events
              {{ model.kpis.newsletterSubscribers.Events }} · Fitness
              {{ model.kpis.newsletterSubscribers.Fitness }}
            </span>
          </v-card-text>

          <v-table density="compact" hover>
            <thead>
              <tr>
                <th>Event</th>
                <th>Start</th>
                <th>Auslastung</th>
                <th class="text-right">Erwartet</th>
                <th class="text-right">Bestätigt</th>
                <th class="text-right">Offen</th>
                <th>Zahlart</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.event.id">
                <td>
                  <router-link
                    :to="'/actions/bookings'"
                    class="text-decoration-none font-weight-medium"
                  >
                    {{ row.event.name }}
                  </router-link>
                  <div class="text-caption text-medium-emphasis">{{ row.event.type }}</div>
                </td>
                <td>
                  <v-chip v-if="row.startChip" size="x-small" :color="row.startChip.color">
                    {{ row.startChip.text }}
                  </v-chip>
                </td>
                <td>
                  <div v-if="row.avail.unlimited" class="d-flex align-center ga-2">
                    <v-chip size="x-small" color="primary" variant="tonal">Unbegrenzt</v-chip>
                    <span class="text-caption">{{ row.avail.enrolled }} gebucht</span>
                  </div>
                  <div v-else class="d-flex align-center ga-2" style="min-width: 130px">
                    <v-progress-linear
                      :model-value="row.avail.fillPercent"
                      :color="
                        row.avail.waitingList > 0
                          ? 'warning'
                          : (row.avail.maxSubscribers ?? 0) <= row.avail.enrolled
                            ? 'error'
                            : 'success'
                      "
                      height="6"
                      rounded
                      style="width: 80px"
                    />
                    <span class="text-caption text-no-wrap">
                      {{ row.avail.enrolled }}/{{ row.avail.maxSubscribers }}
                      <span v-if="row.avail.waitingList > 0">
                        ({{ row.avail.waitingList }} WL)
                      </span>
                    </span>
                  </div>
                </td>
                <td class="text-right text-body-2">{{ euro(row.money.expected) }}</td>
                <td class="text-right text-body-2 text-success">{{ euro(row.money.confirmed) }}</td>
                <td
                  class="text-right text-body-2"
                  :class="
                    row.money.open > 0 ? 'text-error font-weight-bold' : 'text-medium-emphasis'
                  "
                >
                  {{ row.money.open > 0 ? euro(row.money.open) : '—' }}
                </td>
                <td>
                  <v-chip
                    size="x-small"
                    :color="row.money.method === PM.SepaDirectDebit ? 'primary' : 'error'"
                    variant="tonal"
                  >
                    {{ methodLabel(row.money.method) }}
                  </v-chip>
                  <span v-if="row.money.sepaNotExported > 0" class="text-caption ml-1">
                    {{ row.money.sepaNotExported }} n. exp.
                  </span>
                </td>
                <td>
                  <PrototypeTrend :values="row.trend" :width="110" :height="22" />
                </td>
              </tr>
              <tr v-if="rows.length === 0">
                <td colspan="8" class="text-medium-emphasis">Keine beworbenen Events</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="running.length > 0" dense>
      <v-col cols="12">
        <v-card variant="outlined">
          <v-card-text class="py-2">
            <div class="text-body-2 font-weight-bold mb-1">Laufende Events</div>
            <div class="d-flex flex-wrap ga-2">
              <v-chip
                v-for="r in running"
                :key="r.event.id"
                size="small"
                to="/actions/bookings"
                :color="r.chip?.color"
              >
                {{ r.event.name }} · {{ r.chip?.text }}
              </v-chip>
            </div>
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
