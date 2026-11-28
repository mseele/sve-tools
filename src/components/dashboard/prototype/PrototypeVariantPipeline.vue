<script setup lang="ts">
// PROTOTYPE Variante D — Fokus-Pipeline: Probleme zuerst (das einzige Rot),
// dann die nächste startende Kampagne als großer Fokus, der Rest als
// schlanke Textzeilen. Typografie statt Chips und Balken-Wald.
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

interface PipeRow {
  event: Event
  chip?: { color: string; text: string }
  days?: number
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

const rows = computed<PipeRow[]>(() =>
  props.events
    .filter(isPromoted)
    .map((event) => {
      const start = startsOn(event, props.now)
      const days = start === undefined ? undefined : dayDiff(start, props.now)
      return {
        event,
        chip: start === undefined ? undefined : countdown(days ?? 0, 'startet'),
        days,
        avail: readEventAvailability(event),
        money: eventMoney(event),
        trend: enrollmentTrend(event, props.now)
      }
    })
    .sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999))
)

const hero = computed(() => rows.value[0])
const rest = computed(() => rows.value.slice(1))

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

    <v-card v-if="hero" variant="outlined" class="mb-2">
      <v-card-item>
        <v-card-title class="text-h5 font-weight-bold">{{ hero.event.name }}</v-card-title>
        <template #append>
          <v-chip
            v-if="hero.days !== undefined && hero.days <= 0"
            size="small"
            variant="tonal"
            color="warning"
          >
            {{ hero.chip?.text }}
          </v-chip>
          <span v-else-if="hero.chip" class="text-h6 text-medium-emphasis">{{
            hero.chip.text
          }}</span>
        </template>
        <v-card-subtitle class="pl-0">
          {{ hero.event.type }} · {{ methodLabel(hero.money.method) }}
        </v-card-subtitle>
      </v-card-item>
      <v-card-text>
        <div class="d-flex align-center mb-2">
          <template v-if="hero.avail.unlimited">
            <span class="text-body-2 text-medium-emphasis">
              Unbegrenzt · {{ hero.avail.enrolled }} gebucht
            </span>
          </template>
          <template v-else>
            <v-progress-linear
              :model-value="hero.avail.fillPercent"
              color="primary"
              height="8"
              rounded
              class="flex-grow-1 mr-3"
            />
            <span class="text-body-2 text-no-wrap text-medium-emphasis">
              {{ hero.avail.enrolled }} / {{ hero.avail.maxSubscribers
              }}<template v-if="hero.avail.waitingList > 0">
                · {{ hero.avail.waitingList }} Warteliste</template
              >
            </span>
          </template>
        </div>

        <div class="d-flex align-baseline flex-wrap ga-2">
          <span class="text-h5">{{ euro(hero.money.expected) }}</span>
          <span class="text-body-1 text-medium-emphasis">erwartet</span>
          <span class="text-body-1 text-medium-emphasis">
            <template v-if="hero.money.open > 0">
              · {{ euro(hero.money.confirmed) }} bestätigt ·
              {{ euro(hero.money.open) }} offen<template v-if="hero.money.sepaNotExported > 0">
                · {{ hero.money.sepaNotExported }} noch nicht exportiert</template
              >
            </template>
            <template v-else>· komplett bezahlt</template>
          </span>
        </div>

        <div class="mt-4 d-flex align-center ga-3">
          <PrototypeTrend
            :values="hero.trend"
            :width="260"
            :height="32"
            color="rgba(0, 0, 0, 0.25)"
          />
          <span class="text-caption text-medium-emphasis">Buchungen (8 Wochen)</span>
        </div>
      </v-card-text>
    </v-card>

    <div v-for="row in rest" :key="row.event.id" class="d-flex align-center flex-wrap ga-2 py-2">
      <router-link
        to="/actions/bookings"
        class="text-body-2 font-weight-medium text-decoration-none"
        style="min-width: 220px"
      >
        {{ row.event.name }}
      </router-link>
      <span class="text-body-2 text-medium-emphasis" style="min-width: 150px">{{
        row.chip?.text
      }}</span>
      <span class="text-body-2 text-medium-emphasis" style="min-width: 130px">
        <template v-if="row.avail.unlimited">Unbegrenzt · {{ row.avail.enrolled }}</template>
        <template v-else>
          {{ row.avail.enrolled }} / {{ row.avail.maxSubscribers
          }}<template v-if="row.avail.waitingList > 0"> · {{ row.avail.waitingList }} WL</template>
        </template>
      </span>
      <v-spacer />
      <span class="text-body-2 text-no-wrap">
        <b>{{ euro(row.money.expected) }}</b>
        <span class="text-medium-emphasis">
          <template v-if="row.money.open > 0">
            · {{ euro(row.money.confirmed) }} bestätigt · {{ euro(row.money.open) }} offen<template
              v-if="row.money.sepaNotExported > 0"
            >
              · {{ row.money.sepaNotExported }} n. exp.</template
            >
          </template>
          <template v-else> · bezahlt</template>
        </span>
      </span>
    </div>

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
