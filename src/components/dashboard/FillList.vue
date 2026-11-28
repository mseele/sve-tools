<script setup lang="ts">
import type { EventFillEntry, EventPhase } from '@/dashboard/model'
import { format, parseISO } from 'date-fns'
import type { FetchStatus } from '@/types'

const props = defineProps<{
  fill: EventFillEntry[]
  status: FetchStatus
}>()

const phaseColors: Record<EventPhase, string> = {
  Unlimited: 'primary',
  Subscribing: 'success',
  WaitingList: 'warning',
  FullyBooked: 'error'
}

function formatDate(date: string) {
  return format(parseISO(date.slice(0, 10)), 'dd-MM-yyyy')
}
</script>

<template>
  <v-card variant="outlined">
    <v-card-item>
      <v-card-title>Auslastung</v-card-title>
    </v-card-item>
    <v-card-text>
      <template v-if="status === 'loading'">
        <v-skeleton-loader type="list-item-two-line@3" />
      </template>
      <p v-else-if="status === 'error'" class="text-h6 text-medium-emphasis mb-0">
        Nicht verfügbar
      </p>
      <p v-else-if="fill.length === 0" class="text-h6 text-medium-emphasis mb-0">
        Keine kommenden Termine
      </p>
      <div v-else>
        <v-list lines="two">
          <v-list-item v-for="entry in fill" :key="entry.eventId" :to="entry.link" lines="two">
            <v-list-item-title class="font-weight-bold">
              {{ entry.name }}
            </v-list-item-title>
            <v-list-item-subtitle>
              Nächster Termin: {{ formatDate(entry.nextDate) }}
            </v-list-item-subtitle>
            <template v-slot:append>
              <div class="d-flex align-center flex-column ga-1">
                <v-chip v-if="entry.availability.unlimited" size="small" color="primary">
                  Unbegrenzt
                </v-chip>
                <template v-else>
                  <span class="text-caption">
                    {{ entry.availability.enrolled }} / {{ entry.availability.maxSubscribers }}
                  </span>
                  <v-progress-linear
                    :model-value="entry.availability.fillPercent"
                    :color="phaseColors[entry.phase]"
                    height="8"
                    rounded
                    style="min-width: 96px"
                  />
                </template>
                <v-chip v-if="entry.availability.waitingList > 0" size="small" color="warning">
                  Warteliste: {{ entry.availability.waitingList }}
                </v-chip>
              </div>
            </template>
          </v-list-item>
        </v-list>
      </div>
    </v-card-text>
  </v-card>
</template>
