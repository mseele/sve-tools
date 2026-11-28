<script setup lang="ts">
// PROTOTYPE Variante E v2 — Karten sind der Hauptinhalt.
//
// UX-Grundlage weiterhin Few (Monitoring-Sequenz), NN/g (Mengen über
// Länge/Position, Farbe nur als Ausnahme-Signal), PatternFly (Ausnahmen
// nur wenn > 0), Turas/REN (Zusammenfassung vor Detail). Neu gewichtet
// nach Feedback: Der große KPI-Block mit Balken drückte die Karten unter
// den sichtbaren Bereich. Jetzt beantwortet eine schmale Statuszeile
// Plus/Minus, darunter stehen rote Problemzeilen (nur echte Probleme:
// überfällige Zahlungen, abgelaufene laufende Events), dann folgen die
// Karten als Hauptinhalt, laufende Events schließen ab.
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
  type AttentionEntry,
  type EventAvailability
} from '@/dashboard/model'
import { formatIsoDay, formatPrice } from '@/utils'
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

interface StatusPart {
  text: string
  emphasis: 'high' | 'medium' | 'error'
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
      acc.sepaNotExported += card.money.sepaNotExported
      return acc
    },
    { expected: 0, confirmed: 0, sepaOpen: 0, transferOpen: 0, sepaNotExported: 0 }
  )
)

const openTotal = computed(() => money.value.sepaOpen + money.value.transferOpen)

/** «SEPA 602 €, 3 n. exportiert · Überweisung 270 €» — nur offene Teile. */
const openSplit = computed(() => {
  const parts: string[] = []
  if (money.value.sepaOpen > 0) {
    let sepa = `SEPA ${euro(money.value.sepaOpen)}`
    if (money.value.sepaNotExported > 0) sepa += `, ${money.value.sepaNotExported} n. exportiert`
    parts.push(sepa)
  }
  if (money.value.transferOpen > 0) parts.push(`Überweisung ${euro(money.value.transferOpen)}`)
  return parts.join(' · ')
})

const statusParts = computed<StatusPart[]>(() => {
  const grey = (text: string): StatusPart => ({ text, emphasis: 'medium' })
  const parts: StatusPart[] = [
    grey(`${cards.value.length} beworbene Events`),
    { text: `erwartet ${euro(money.value.expected)}`, emphasis: 'high' },
    { text: `bestätigt ${euro(money.value.confirmed)}`, emphasis: 'high' },
    openTotal.value > 0
      ? { text: `offen ${euro(openTotal.value)}`, emphasis: 'high' }
      : grey('komplett bestätigt')
  ]
  if (openTotal.value > 0) {
    parts.push(grey(openSplit.value))
    if (overduePromoted.value.count > 0) {
      parts.push({
        text: `${overduePromoted.value.count} ${
          overduePromoted.value.count === 1 ? 'Zahlung' : 'Zahlungen'
        } überfällig`,
        emphasis: 'error'
      })
    }
  }
  return parts
})

// Echte Probleme für den roten Block: überfällige Zahlungen und
// abgelaufene laufende Events. Noch nicht fällige offene Zahlungen sind
// Information auf den Karten, kein Alarm hier.
const problems = computed(() =>
  model.value.attention.filter((entry) =>
    entry.kind === 'unpaid_booking' ? entry.dueInDays < 0 : true
  )
)

function problemKey(entry: AttentionEntry): string {
  return entry.kind === 'unpaid_booking' ? entry.bookingId : entry.eventId
}

function problemText(entry: AttentionEntry): string {
  if (entry.kind === 'unpaid_booking') {
    const due = entry.dueInDays === -1 ? '1 Tag überfällig' : `${-entry.dueInDays} Tage überfällig`
    const base = `${entry.name} — ${entry.eventName}: ${due} (${formatPrice(entry.price)})`
    return entry.reminderSent ? `${base} · Erinnerung gesendet` : base
  }
  return `${entry.eventName}: letzter Termin ${formatIsoDay(entry.lastDate)} — abschließen`
}

const running = computed<RunningRow[]>(() =>
  props.events
    .filter(isRunning)
    .flatMap((event): RunningRow[] => {
      const end = endsOn(event)
      if (!end) return []
      const days = dayDiff(end, props.now)
      // Abgelaufene laufende Events sind Straggler — roter Problem-Block.
      if (days < 0) return []
      return [{ event, days, text: countdown(days, 'endet').text }]
    })
    .sort((a, b) => a.days - b.days)
)
</script>

<template>
  <div>
    <p v-if="props.demo" class="text-caption text-medium-emphasis mb-1">
      Demo-Daten — der echte Endpunkt liefert gerade nichts.
    </p>

    <!-- Statuszeile: Plus/Minus in einer Zeile, direkt gefolgt von den Karten. -->
    <p v-if="cards.length > 0" class="text-body-2 mb-1">
      <template v-for="(part, i) in statusParts" :key="`${i}-${part.text}`"
        ><template v-if="i > 0"> · </template>
        <span
          :class="
            part.emphasis === 'high'
              ? ''
              : part.emphasis === 'error'
                ? 'text-error font-weight-medium'
                : 'text-medium-emphasis'
          "
          >{{ part.text }}</span
        >
      </template>
    </p>
    <p v-else class="text-body-2 text-medium-emphasis mb-1">Keine beworbenen Events</p>

    <!-- Echte Probleme, rot, nur wenn es sie gibt. -->
    <router-link
      v-for="entry in problems"
      :key="problemKey(entry)"
      :to="entry.link"
      class="d-block text-body-2 text-error text-decoration-none mb-1"
    >
      {{ problemText(entry) }}
    </router-link>

    <!-- Hauptinhalt: eine einheitliche Karte pro Event — gleiche Anatomie,
         gleiche Positionen, gleiche Größen. Sortiert nach Startdatum. -->
    <template v-if="cards.length > 0">
      <p class="text-caption text-medium-emphasis mb-2">
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
                  <v-progress-linear
                    indeterminate
                    color="primary"
                    height="6"
                    rounded
                    class="flex-grow-1"
                  />
                  <span class="text-body-2 text-no-wrap text-medium-emphasis">
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
    </template>

    <!-- Laufende Events als Abschluss. -->
    <p v-if="running.length > 0" class="text-body-2 text-medium-emphasis mt-4 mb-0">
      <span class="font-weight-medium text-high-emphasis">Laufende Events:</span>
      <template v-for="(row, i) in running" :key="row.event.id"
        ><template v-if="i > 0"> · </template>
        <router-link to="/actions/bookings" class="text-decoration-none">
          {{ row.event.name }}
        </router-link>
        {{ row.text }}
      </template>
    </p>
  </div>
</template>
