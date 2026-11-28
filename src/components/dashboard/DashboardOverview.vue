<script setup lang="ts">
// Glance-status overview: one uniform card per published event is the
// main content.
//
// UX grounding: Few's monitoring sequence, NN/g (color only as an
// exception signal), PatternFly (exceptions only when > 0). The header
// box shows events, bookings of the last 7 days and the money values
// expected and open plus the summed result — confirmed is expected
// minus open and is not shown anywhere. Every card follows the same
// bands: identity and time (title row; prebooking cards carry a
// Vorbuchung marker in the subtitle), occupancy (bar plus X / Y),
// money (value and label pairs expected → open → result; the result is
// income minus dates times cost per date as on the bookings page,
// positive green / negative red, overdue red inside the open label),
// footer (payment method · SEPA export backlog). Running events close
// the page as list rows in the same anatomy as the problem rows, only
// neutral. Unlimited events: static hatched bar, X / ∞ in the same
// shape.
import { computed } from 'vue'
import type { DashboardModel, StragglerEntry } from '@/dashboard/model'
import { formatIsoDay } from '@/utils'
import { mdiBellOutline, mdiCalendar, mdiCalendarRemove } from '@mdi/js'
import { PaymentMethod, type FetchStatus } from '@/types'

interface StatusValue {
  value: string
  label: string
  colorClass?: string
}

const props = defineProps<{
  model: DashboardModel
  eventsStatus: FetchStatus
  unpaidStatus: FetchStatus
}>()

function euro(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

// Result signed as the bookings page presents it (income minus dates
// times cost per date), colored the same way: plus green, minus red.
function resultText(result: number): string {
  if (result === 0) return euro(0)
  return result > 0 ? `+ ${euro(result)}` : `- ${euro(-result)}`
}

function resultClass(result: number): string {
  if (result === 0) return ''
  return result < 0 ? 'text-error' : 'text-success'
}

function countdown(days: number, verb: 'startet' | 'endet'): string {
  if (days <= 0) return `${verb} heute`
  return `${verb} in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`
}

function methodLabel(method: PaymentMethod): string {
  return method === PaymentMethod.SepaDirectDebit ? 'SEPA' : 'Überweisung'
}

function stragglerText(entry: StragglerEntry): string {
  return `${entry.eventName}: letzter Termin ${formatIsoDay(entry.lastDate)} — abschließen`
}

const stats = computed<StatusValue[]>(() => [
  { value: String(props.model.cards.length), label: 'Events' },
  { value: String(props.model.stats.bookings), label: 'Buchungen (7 Tage)' },
  { value: euro(props.model.stats.expected), label: 'erwartet' },
  { value: euro(props.model.stats.open), label: 'offen' },
  {
    value: resultText(props.model.stats.result),
    label: 'Ergebnis',
    colorClass: resultClass(props.model.stats.result)
  }
])

// Red rows only when there is something to act on; a failed payments
// fetch keeps its own neutral placeholder instead of a false all-clear.
const problems = computed(
  () =>
    props.model.stragglers.length > 0 ||
    props.unpaidStatus === 'error' ||
    (props.unpaidStatus === 'ok' && props.model.overdue.count > 0)
)
</script>

<template>
  <div>
    <v-skeleton-loader v-if="props.eventsStatus === 'loading'" type="article@3" />
    <p v-else-if="props.eventsStatus === 'error'" class="text-body-2 text-medium-emphasis mb-0">
      Events nicht verfügbar
    </p>
    <template v-else>
      <!-- Header box: stat pairs with separators, below — only when
           present — the problems as aligned list rows. -->
      <v-card v-if="props.model.cards.length > 0 || problems" variant="outlined" class="mb-3">
        <v-card-text v-if="props.model.cards.length > 0" class="pb-2">
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
        <template v-if="problems">
          <v-divider v-if="props.model.cards.length > 0" class="mx-4" />
          <v-list density="compact" class="py-1">
            <v-list-item v-if="props.unpaidStatus === 'error'" lines="one">
              <template #prepend>
                <v-icon class="text-medium-emphasis">{{ mdiBellOutline }}</v-icon>
              </template>
              <v-list-item-title class="text-medium-emphasis">
                Zahlungen nicht verfügbar
              </v-list-item-title>
            </v-list-item>
            <v-list-item
              v-else-if="props.model.overdue.count > 0"
              to="/actions/payments"
              lines="one"
            >
              <template #prepend>
                <v-icon color="error">{{ mdiBellOutline }}</v-icon>
              </template>
              <v-list-item-title class="text-error font-weight-medium">
                {{ props.model.overdue.count }}
                {{
                  props.model.overdue.count === 1 ? 'überfällige Zahlung' : 'überfällige Zahlungen'
                }}
                ({{ euro(props.model.overdue.total) }})
              </v-list-item-title>
            </v-list-item>
            <v-list-item
              v-for="entry in props.model.stragglers"
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

      <!-- Main content: one uniform card per event — same anatomy, same
           positions, same sizes. Sorted by start date. -->
      <template v-if="props.model.cards.length > 0">
        <v-row density="compact">
          <v-col v-for="card in props.model.cards" :key="card.eventId" cols="12" sm="6" lg="4">
            <v-card variant="outlined" :to="card.link" class="fill-height">
              <v-card-item>
                <v-card-title class="text-body-1 font-weight-bold text-truncate">
                  {{ card.name }}
                </v-card-title>
                <template #append>
                  <span
                    class="text-body-2 text-no-wrap"
                    :class="
                      card.startDays != undefined && card.startDays <= 0
                        ? 'text-primary font-weight-bold'
                        : 'text-medium-emphasis'
                    "
                  >
                    {{ card.startDays == undefined ? '' : countdown(card.startDays, 'startet') }}
                  </span>
                </template>
                <v-card-subtitle class="pl-0">
                  {{ card.type
                  }}<template v-if="card.terms > 1"> · {{ card.terms }} Termine</template
                  ><template v-if="card.prebooking"> · Vorbuchung</template>
                </v-card-subtitle>
              </v-card-item>
              <v-card-text class="pt-0">
                <div class="d-flex align-center ga-3 mb-2">
                  <template v-if="card.availability.unlimited">
                    <!-- Static hatch instead of animation: same slot as
                         the occupancy bars, but no movement. -->
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
                      {{ card.availability.enrolled }} / ∞<template
                        v-if="card.availability.waitingList > 0"
                      >
                        · {{ card.availability.waitingList }} WL</template
                      >
                    </span>
                  </template>
                  <template v-else>
                    <v-progress-linear
                      :model-value="card.availability.fillPercent"
                      color="primary"
                      height="6"
                      rounded
                      class="flex-grow-1"
                    />
                    <span class="text-body-2 text-no-wrap text-medium-emphasis">
                      {{ card.availability.enrolled }} / {{ card.availability.maxSubscribers
                      }}<template v-if="card.availability.waitingList > 0">
                        · {{ card.availability.waitingList }} WL</template
                      >
                    </span>
                  </template>
                </div>

                <!-- Money: aligned value and label pairs as in the header
                     box, order expected → open → result. The result
                     carries plus green / minus red as on the bookings
                     page and appears only with a maintained cost per
                     date; overdue stays red inside the open label. -->
                <div class="d-flex flex-wrap align-center">
                  <div>
                    <div class="text-body-1 font-weight-medium">
                      {{ euro(card.money.expected) }}
                    </div>
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

                <!-- Footer: payment method (plus SEPA export backlog) — a
                     fixed slot on every card. -->
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

      <!-- Running events as the closing block: same row anatomy as the
           problem rows in the header box (icon + text + link), only
           neutral — information, not an alarm. -->
      <v-card v-if="props.model.running.length > 0" variant="outlined" class="mt-3">
        <v-list density="compact" class="py-1">
          <v-list-item
            v-for="row in props.model.running"
            :key="row.eventId"
            :to="row.link"
            lines="one"
          >
            <template #prepend>
              <v-icon class="text-medium-emphasis">{{ mdiCalendar }}</v-icon>
            </template>
            <v-list-item-title>
              {{ row.name }}: {{ countdown(row.endDays, 'endet') }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </template>
  </div>
</template>
