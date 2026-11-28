<script setup lang="ts">
import type { DashboardKpis } from '@/dashboard/model'
import { EventType, NewsTopic, type FetchStatus } from '@/types'
import { computed } from 'vue'

const props = defineProps<{
  kpis: DashboardKpis
  eventsStatus: FetchStatus
  unpaidStatus: FetchStatus
  newsletterStatus: FetchStatus
}>()

const topicLabels: Record<NewsTopic, string> = {
  General: 'Allgemein',
  Events: 'Events',
  Fitness: 'Fitness'
}

const topicCounts = computed(() =>
  (Object.values(NewsTopic) as NewsTopic[]).map((topic) => ({
    topic,
    label: topicLabels[topic],
    count: props.kpis.newsletterSubscribers[topic] ?? 0
  }))
)

function paymentCount(type: EventType) {
  return props.kpis.openPayments[type] ?? 0
}
</script>

<template>
  <v-row dense>
    <v-col cols="12" sm="6" md="3">
      <v-card variant="outlined" height="100%">
        <v-card-item>
          <v-card-title>Aktive Events</v-card-title>
        </v-card-item>
        <v-card-text>
          <v-skeleton-loader v-if="eventsStatus === 'loading'" type="heading" />
          <p v-else-if="eventsStatus === 'error'" class="text-h6 text-medium-emphasis">
            Nicht verfügbar
          </p>
          <template v-else>
            <p class="text-h4">{{ props.kpis.activeEvents }}</p>
            <p class="text-caption text-medium-emphasis mb-0">Veröffentlicht &amp; Laufend</p>
          </template>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" sm="6" md="3">
      <v-card variant="outlined" height="100%">
        <v-card-item>
          <v-card-title>Offene Zahlungen</v-card-title>
        </v-card-item>
        <v-card-text>
          <v-skeleton-loader v-if="unpaidStatus === 'loading'" type="paragraph" />
          <p v-else-if="unpaidStatus === 'error'" class="text-h6 text-medium-emphasis">
            Nicht verfügbar
          </p>
          <template v-else>
            <div
              v-for="type in Object.values(EventType)"
              :key="type"
              class="d-flex align-center justify-space-between"
            >
              <span>{{ type }}</span>
              <v-chip
                size="small"
                :color="paymentCount(type) > 0 ? 'error' : 'success'"
                class="my-1"
              >
                {{ paymentCount(type) }} offen
              </v-chip>
            </div>
          </template>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" sm="6" md="3">
      <v-card variant="outlined" height="100%">
        <v-card-item>
          <v-card-title>Warteliste</v-card-title>
        </v-card-item>
        <v-card-text>
          <v-skeleton-loader v-if="eventsStatus === 'loading'" type="heading" />
          <p v-else-if="eventsStatus === 'error'" class="text-h6 text-medium-emphasis">
            Nicht verfügbar
          </p>
          <template v-else>
            <p class="text-h4">{{ props.kpis.waitingListTotal }}</p>
            <p class="text-caption text-medium-emphasis mb-0">Über aktive Events</p>
          </template>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" sm="6" md="3">
      <v-card variant="outlined" height="100%">
        <v-card-item>
          <v-card-title>Newsletter</v-card-title>
        </v-card-item>
        <v-card-text>
          <v-skeleton-loader v-if="newsletterStatus === 'loading'" type="paragraph" />
          <p v-else-if="newsletterStatus === 'error'" class="text-h6 text-medium-emphasis">
            Nicht verfügbar
          </p>
          <p v-else v-for="topic in topicCounts" :key="topic.topic" class="mb-2">
            {{ topic.label }}: {{ topic.count }}
          </p>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>
