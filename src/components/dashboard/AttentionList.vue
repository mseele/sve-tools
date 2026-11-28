<script setup lang="ts">
import type {
  AttentionEntry,
  StragglerAttentionEntry,
  UnpaidAttentionEntry
} from '@/dashboard/model'
import { format, parseISO } from 'date-fns'
import { computed } from 'vue'
import { formatPrice } from '@/utils'
import type { FetchStatus } from '@/types'
import { mdiBellOutline, mdiCalendarRemove } from '@mdi/js'

const props = defineProps<{
  entries: AttentionEntry[]
  unpaidStatus: FetchStatus
  eventsStatus: FetchStatus
}>()

const payments = computed(() =>
  props.entries.filter((entry): entry is UnpaidAttentionEntry => entry.kind === 'unpaid_booking')
)

const stragglers = computed(() =>
  props.entries.filter(
    (entry): entry is StragglerAttentionEntry => entry.kind === 'lifecycle_straggler'
  )
)

const nothingToDo = computed(
  () =>
    props.unpaidStatus === 'ok' &&
    props.eventsStatus === 'ok' &&
    payments.value.length === 0 &&
    stragglers.value.length === 0
)

function dueText(entry: UnpaidAttentionEntry) {
  if (entry.dueInDays < 0) {
    return entry.dueInDays === -1 ? '1 Tag überfällig' : `${-entry.dueInDays} Tage überfällig`
  }
  if (entry.dueInDays === 0) {
    return 'heute fällig'
  }
  if (entry.dueInDays === 1) {
    return 'morgen fällig'
  }
  return `in ${entry.dueInDays} Tagen fällig`
}

function formatDate(date: string) {
  return format(parseISO(date.slice(0, 10)), 'dd-MM-yyyy')
}
</script>

<template>
  <v-card variant="outlined">
    <v-card-item>
      <v-card-title>Braucht Aufmerksamkeit</v-card-title>
    </v-card-item>
    <v-card-text>
      <template v-if="unpaidStatus === 'loading' || eventsStatus === 'loading'">
        <v-skeleton-loader type="list-item-two-line@3" />
      </template>
      <template v-else>
        <p v-if="unpaidStatus === 'error'" class="text-h6 text-medium-emphasis mb-4">
          Zahlungen nicht verfügbar
        </p>
        <p v-else-if="payments.length > 0" class="text-subtitle-1 font-weight-bold mb-2">
          Offene Zahlungen
        </p>
        <v-list v-if="unpaidStatus === 'ok' && payments.length > 0" lines="one" class="py-0">
          <v-list-item v-for="entry in payments" :key="entry.bookingId" :to="entry.link">
            <template v-slot:prepend>
              <v-icon color="error">{{ mdiBellOutline }}</v-icon>
            </template>
            <v-list-item-title>
              {{ entry.name }} — {{ entry.eventName }} ({{ formatPrice(entry.price) }})
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ dueText(entry) }}
            </v-list-item-subtitle>
            <template v-slot:append>
              <v-chip v-if="entry.reminderSent" size="small" color="warning">
                Erinnerung gesendet
              </v-chip>
            </template>
          </v-list-item>
        </v-list>

        <p v-if="eventsStatus === 'error'" class="text-h6 text-medium-emphasis mb-0">
          Event-Status nicht verfügbar
        </p>
        <v-list
          v-else-if="stragglers.length > 0"
          lines="two"
          class="py-0"
          :class="payments.length > 0 ? 'mt-2' : ''"
        >
          <v-list-item v-for="entry in stragglers" :key="entry.eventId" :to="entry.link">
            <template v-slot:prepend>
              <v-icon color="warning">{{ mdiCalendarRemove }}</v-icon>
            </template>
            <v-list-item-title>
              {{ entry.eventName }} (letzter Termin {{ formatDate(entry.lastDate) }})
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ entry.hint }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>

        <p v-if="nothingToDo" class="text-h6 text-medium-emphasis mb-0">
          Nichts braucht Aufmerksamkeit
        </p>
      </template>
    </v-card-text>
  </v-card>
</template>
