<script setup lang="ts">
// PROTOTYPE Variante E v12 — Karten sind der Hauptinhalt.
//
// UX-Grundlage weiterhin Few (Monitoring-Sequenz), NN/g (Farbe nur als
// Ausnahme-Signal), PatternFly (Ausnahmen nur wenn > 0). Der Kopf-Kasten
// zeigt Events, Buchungen (7 Tage) und die Geldwerte erwartet/offen
// plus Gesamtergebnis — bestätigt ist erwartet − offen und entfällt.
// Jede Karte folgt einer festen Bänderung: Identität + Zeit (Titel-
// zeile), Auslastung (Balken + X / Y), Geld (Wert-Label-Paare erwartet
// → offen → Ergebnis; das Ergebnis ist Einnahmen − Termine × Preis pro
// Einheit wie auf der Buchungsseite, plus grün / minus rot, Über-
// fälliges rot im offen-Label), Fußzeile (Zahlart · SEPA-Export-
// Rückstand; keine Kurven-Grafik). Laufende Events schließen als
// Zeilen-Liste in derselben Anatomie wie die Problemzeilen, nur
// neutral. Unbegrenzte Events: statischer Schraffur-Balken,
// X / ∞ in derselben Form.
import { computed } from 'vue'
import type { PrototypeProps } from './prototypeData'
import {
  countdown,
  dayDiff,
  endsOn,
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
  type EventAvailability,
  type StragglerAttentionEntry
} from '@/dashboard/model'
import { formatIsoDay } from '@/utils'
import { mdiBellOutline, mdiCalendar, mdiCalendarRemove } from '@mdi/js'
import { PaymentMethod as PM, type Event } from '@/types'

interface CampaignCard {
  event: Event
  startDays: number
  startText: string
  terms: number
  avail: EventAvailability
  money: EventMoney
  overdue: number
}

interface RunningRow {
  event: Event
  days: number
  text: string
}

interface StatusValue {
  value: string
  label: string
  colorClass?: string
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
        terms: event.custom_date ? 1 : event.dates.length,
        avail: readEventAvailability(event),
        money: eventMoney(event),
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
      acc.open += card.money.open
      return acc
    },
    { expected: 0, confirmed: 0, open: 0 }
  )
)

// Neue Buchungen der letzten 7 Tage über alle veröffentlichten Events
// — „was ist passiert, seit ich zuletzt geschaut habe?" (Eversports
// „Recent bookings", Eventbrite „recent orders").
const newBookings = computed(() => {
  const cutoff = props.now.getTime() - 7 * 24 * 60 * 60 * 1000
  return cards.value.reduce((count, card) => {
    const subs = card.event.subscribers ?? []
    return count + subs.filter((sub) => new Date(sub.created).getTime() >= cutoff).length
  }, 0)
})

// Gesamtergebnis aller veröffentlichten Events mit gepflegtem Preis
// pro Einheit — die Summe der Karten-Ergebnisse.
const totalResult = computed(() =>
  cards.value.reduce((sum, card) => sum + (card.money.result ?? 0), 0)
)

const stats = computed<StatusValue[]>(() => [
  { value: String(cards.value.length), label: 'Events' },
  { value: String(newBookings.value), label: 'Buchungen (7 Tage)' },
  { value: euro(money.value.expected), label: 'erwartet' },
  { value: euro(money.value.open), label: 'offen' },
  {
    value: resultText(totalResult.value),
    label: 'Ergebnis',
    colorClass: resultClass(totalResult.value)
  }
])

// Ergebnis mit Vorzeichen wie von der Buchungsseite vertraut
// (Einnahmen − Termine × Preis pro Einheit), Farbe wie dort:
// plus grün, minus rot.
function resultText(result: number | undefined): string {
  if (result == undefined || result === 0) return euro(0)
  return result > 0 ? `+ ${euro(result)}` : `- ${euro(-result)}`
}

/** Plus grün, Minus rot — wie das Ergebnis auf der Buchungsseite. */
function resultClass(result: number | undefined): string {
  if (result == undefined || result === 0) return ''
  return result < 0 ? 'text-error' : 'text-success'
}

// Überfällige Zahlungen nur als Zählzeile — bei 10, 20 Stück wäre eine
// Einzelliste zu lang. Details stehen im Zahlungen-Tab.
const overdue = computed(() => {
  let count = 0
  let total = 0
  for (const list of Object.values(props.unpaidBookings)) {
    for (const booking of list) {
      if (booking.due_in_days < 0) {
        count += 1
        total += parseFloat(booking.price) || 0
      }
    }
  }
  return { count, total }
})

// Straggler einzeln: laufende Events mit zurückliegendem Termin müssen
// je Event abgeschlossen werden. Noch nicht fällige offene Zahlungen
// sind Information auf den Karten, kein Alarm hier.
const stragglers = computed(() =>
  model.value.attention.filter(
    (entry): entry is StragglerAttentionEntry => entry.kind === 'lifecycle_straggler'
  )
)

function stragglerText(entry: StragglerAttentionEntry): string {
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
    <p v-if="props.demo" class="text-caption text-medium-emphasis mb-2">
      Demo-Daten (Stand v12) — der echte Endpunkt liefert gerade nichts.
    </p>

    <!-- Kopf-Kasten: Statuswerte mit Separatoren, darunter — nur wenn
         vorhanden — die Probleme als ausgerichtete Liste. -->
    <v-card
      v-if="cards.length > 0 || stragglers.length > 0 || overdue.count > 0"
      variant="outlined"
      class="mb-3"
    >
      <v-card-text v-if="cards.length > 0" class="pb-2">
        <div class="d-flex flex-wrap align-center">
          <template v-for="(stat, i) in stats" :key="stat.label">
            <v-divider v-if="i > 0" vertical class="mx-4 my-1 align-self-stretch" />
            <div>
              <div class="text-h6" :class="stat.colorClass">{{ stat.value }}</div>
              <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
            </div>
          </template>
        </div>
      </v-card-text>
      <template v-if="overdue.count > 0 || stragglers.length > 0">
        <v-divider v-if="cards.length > 0" class="mx-4" />
        <v-list density="compact" class="py-1">
          <v-list-item v-if="overdue.count > 0" to="/actions/payments" lines="one">
            <template #prepend>
              <v-icon color="error">{{ mdiBellOutline }}</v-icon>
            </template>
            <v-list-item-title class="text-error font-weight-medium">
              {{ overdue.count }}
              {{ overdue.count === 1 ? 'überfällige Zahlung' : 'überfällige Zahlungen' }}
              ({{ euro(overdue.total) }})
            </v-list-item-title>
          </v-list-item>
          <v-list-item
            v-for="entry in stragglers"
            :key="entry.eventId"
            :to="entry.link"
            lines="one"
          >
            <template #prepend>
              <v-icon color="error">{{ mdiCalendarRemove }}</v-icon>
            </template>
            <v-list-item-title class="text-error font-weight-medium">
              {{ stragglerText(entry) }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </template>
    </v-card>
    <p v-else class="text-body-2 text-medium-emphasis mb-2">Keine veröffentlichten Events</p>

    <!-- Hauptinhalt: eine einheitliche Karte pro Event — gleiche Anatomie,
         gleiche Positionen, gleiche Größen. Sortiert nach Startdatum. -->
    <template v-if="cards.length > 0">
      <v-row density="compact">
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
              <v-card-subtitle class="pl-0">
                {{ card.event.type
                }}<template v-if="card.terms > 1"> · {{ card.terms }} Termine</template>
              </v-card-subtitle>
            </v-card-item>
            <v-card-text class="pt-0">
              <div class="d-flex align-center ga-3 mb-2">
                <template v-if="card.avail.unlimited">
                  <!-- Statische Schraffur statt Animation: gleicher Slot
                       wie die Auslastungsbalken, aber keine Bewegung. -->
                  <div
                    class="flex-grow-1 rounded"
                    title="Unbegrenzte Plätze"
                    style="
                      height: 6px;
                      background: repeating-linear-gradient(
                        45deg,
                        rgba(var(--v-theme-primary), 0.35) 0 6px,
                        transparent 6px 12px
                      );
                    "
                  />
                  <span class="text-body-2 text-no-wrap text-medium-emphasis">
                    {{ card.avail.enrolled }} / ∞<template v-if="card.avail.waitingList > 0">
                      · {{ card.avail.waitingList }} WL</template
                    >
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

              <!-- Geld: ausgerichtete Wert-Label-Paare wie im Kopf-Kasten,
                   Reihenfolge erwartet → offen → Ergebnis. Bestätigt ist
                   erwartet − offen und bleibt nur im Kopf-Kasten. Das
                   Ergebnis trägt plus grün / minus rot wie auf der
                   Buchungsseite; Überfälliges bleibt rot im Label unter
                   offen. -->
              <div class="d-flex flex-wrap align-center">
                <div>
                  <div class="text-body-1 font-weight-medium">{{ euro(card.money.expected) }}</div>
                  <div class="text-caption text-medium-emphasis">erwartet</div>
                </div>
                <v-divider vertical class="mx-3 my-1 align-self-stretch" />
                <div>
                  <div class="text-body-1 font-weight-medium">{{ euro(card.money.open) }}</div>
                  <div class="text-caption text-medium-emphasis">
                    offen<template v-if="card.overdue > 0">
                      <span class="text-error font-weight-medium">
                        · {{ card.overdue }} überfällig</span
                      >
                    </template>
                  </div>
                </div>
                <template v-if="card.money.result != undefined">
                  <v-divider vertical class="mx-3 my-1 align-self-stretch" />
                  <div>
                    <div
                      :class="['text-body-1 font-weight-medium', resultClass(card.money.result)]"
                    >
                      {{ resultText(card.money.result) }}
                    </div>
                    <div class="text-caption text-medium-emphasis">Ergebnis</div>
                  </div>
                </template>
              </div>

              <!-- Fußzeile: Zahlart (+ SEPA-Export-Rückstand) — fester
                   Slot auf jeder Karte. -->
              <v-divider class="mt-3 mb-2" />
              <span class="text-caption text-medium-emphasis">
                {{ methodLabel(card.money.method)
                }}<template v-if="card.money.sepaNotExported > 0">
                  · {{ card.money.sepaNotExported }} n. exportiert</template
                >
              </span>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Laufende Events als Abschluss: dieselbe Zeilen-Anatomie wie die
         Problemzeilen im Kopf-Kasten (Icon + Text + Link), nur neutral —
         Information, kein Alarm. -->
    <v-card v-if="running.length > 0" variant="outlined" class="mt-3">
      <v-list density="compact" class="py-1">
        <v-list-item v-for="row in running" :key="row.event.id" to="/actions/bookings" lines="one">
          <template #prepend>
            <v-icon class="text-medium-emphasis">{{ mdiCalendar }}</v-icon>
          </template>
          <v-list-item-title>{{ row.event.name }}: {{ row.text }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>
  </div>
</template>
