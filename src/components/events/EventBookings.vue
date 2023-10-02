<script setup lang="ts">
import {
  cancelBooking,
  exportEventBookingsURL,
  exportEventParticipantListURL,
  markEventBookingAsPayed
} from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { LifecycleStatus, type Event, type EventSubscriber } from '@/types'
import { formatPrice } from '@/utils'
import {
  mdiCash,
  mdiCheck,
  mdiClose,
  mdiComment,
  mdiDelete,
  mdiFilePdfBox,
  mdiMicrosoftExcel
} from '@mdi/js'
import { computed, ref } from 'vue'

const props = defineProps<{
  status: LifecycleStatus
  events: Event[]
}>()

const emit = defineEmits<{
  refresh: []
}>()

const notify = useNotifyStore()

const headers = [
  { title: '', key: 'enrolled' },
  { title: 'Name', key: 'first_name' },
  { title: 'Email', key: 'email' },
  { title: 'Mgl.', key: 'member' },
  { title: 'Bezahlt', key: 'payed' },
  { title: 'Komm.', key: 'comment' },
  { title: '', key: 'actions', sortable: false }
]
const cancelBookingDialog = ref(false)
const cancelBookingId = ref<string>()
const cancelBookingLoading = ref(false)

const filteredEvents = computed(() => props.events.filter((e) => e.status == props.status))

function titleText() {
  switch (props.status) {
    case LifecycleStatus.Draft:
      return 'Entwurf - Unsichtbar'
    case LifecycleStatus.Review:
      return 'Überprüfung - Beta'
    case LifecycleStatus.Published:
      return 'Sichtbar'
    case LifecycleStatus.Running:
      return 'Laufend - Unsichtbar'
    case LifecycleStatus.Finished:
      return 'Fertiggestellt - Unsichtbar'
    case LifecycleStatus.Closed:
      return 'Abgeschlossen - Unsichtbar'
  }
  return '-'
}

function subscriberClasses(subscriber: EventSubscriber) {
  return subscriber.enrolled ? '' : 'grey--text'
}

function price(event: Event, member: boolean) {
  return formatPrice(member ? event.price_member : event.price_non_member)
}

function freeBookings(event: Event, enrolled: boolean) {
  return Math.max(
    (enrolled ? event.max_subscribers : event.max_waiting_list) -
      (event.subscribers || []).filter((s) => s.enrolled == enrolled).length,
    0
  )
}

function finacialResult(event: Event) {
  if (event.cost_per_date != undefined) {
    let date_count = 0
    if (event.custom_date != undefined) {
      date_count = 1
    } else {
      date_count = event.dates.length
    }
    const event_cost = date_count * event.cost_per_date

    const income = (event.subscribers || [])
      .filter((s) => s.enrolled)
      .map((s) => Number(s.member ? event.price_member : event.price_non_member))
      .reduce((sum, curr) => sum + curr, 0)

    return -event_cost + income
  }
  return undefined
}

async function markPayed(subscriber: EventSubscriber) {
  try {
    await markEventBookingAsPayed(subscriber.id)
  } catch (error) {
    console.error(error)
    notify.showError('Als Bezahlt markieren is fehlgeschlagen. Details siehe Console')
  }
  refresh()
}

function displayCancelBookingDialog(subscriber: EventSubscriber) {
  cancelBookingId.value = subscriber.id
  cancelBookingLoading.value = false
  cancelBookingDialog.value = true
}

async function confirmCancelBooking() {
  if (cancelBookingId.value === undefined) {
    notify.showError('Es ist keine Buchung korrekt ausgewählt.')
    return
  }

  cancelBookingLoading.value = true
  try {
    await cancelBooking(cancelBookingId.value)
  } catch (error) {
    console.error(error)
    notify.showError('Die Stornierung is fehlgeschlagen. Details siehe Console')
  }
  cancelBookingDialog.value = false
  cancelBookingLoading.value = false
  refresh()
}

function refresh() {
  emit('refresh')
}
</script>

<template>
  <v-row v-if="filteredEvents.length > 0">
    <v-col cols="12" class="d-flex text-h6 pb-0">
      <EventListItem :status="status" :text="titleText()" />
    </v-col>
    <v-col cols="12" v-for="(event, index) of filteredEvents" :key="index">
      <v-data-table-virtual
        density="compact"
        :headers="headers"
        :items="event.subscribers"
        item-key="id"
        class="elevation-1"
        :item-class="subscriberClasses"
      >
        <template v-slot:top>
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <h3 class="px-2 py-1">{{ event.name }}</h3>
              <div>
                {{ freeBookings(event, true) }} freie Plätze /
                {{ freeBookings(event, false) }} freie Wartelistplätze
              </div>
            </div>
            <div class="d-flex align-center">
              <div
                v-if="finacialResult(event) != undefined"
                :class="['subtitle-2', finacialResult(event)! < 0 ? 'text-red' : 'text-green']"
              >
                {{ formatPrice(finacialResult(event)!.toString()) }}
              </div>
              <div v-else class="subtitle-2 text-grey">Preis pro Einheit fehlt</div>
              <v-tooltip left>
                <template v-slot:activator="{ props }">
                  <v-btn
                    icon
                    variant="text"
                    color="red darken-2"
                    :href="exportEventParticipantListURL(event.id)"
                    v-bind="props"
                  >
                    <v-icon>{{ mdiFilePdfBox }}</v-icon>
                  </v-btn>
                </template>
                <span>Teilnehmerliste herunterladen</span>
              </v-tooltip>
              <v-tooltip left>
                <template v-slot:activator="{ props }">
                  <v-btn
                    icon
                    variant="text"
                    color="green darken-2"
                    :href="exportEventBookingsURL(event.id)"
                    v-bind="props"
                  >
                    <v-icon>{{ mdiMicrosoftExcel }}</v-icon>
                  </v-btn>
                </template>
                <span>Buchungsliste herunterladen</span>
              </v-tooltip>
            </div>
          </div>
          <v-divider class="mb-1"></v-divider>
          <v-dialog v-model="cancelBookingDialog" max-width="400px">
            <v-card>
              <v-card-title class="text-h5">Buchung stornieren</v-card-title>
              <v-card-text> Soll die Buchung wirklich storniert werden? </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="red" variant="text" @click="cancelBookingDialog = false"
                  >Abbrechen</v-btn
                >
                <v-btn
                  color="primary"
                  variant="text"
                  @click="confirmCancelBooking"
                  :loading="cancelBookingLoading"
                >
                  Stornieren
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </template>
        <template v-slot:no-data>Bisher noch keine Buchungen</template>
        <template v-slot:item="{ item }">
          <tr>
            <td>
              <v-tooltip bottom>
                <template v-slot:activator="{ props }">
                  <div class="d-flex align-center" v-bind="props">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16pt" height="21.333">
                      <path
                        d="M15.625 10a5.625 5.625 0 11-11.25 0 5.625 5.625 0 0111.25 0z"
                        :fill="item.enrolled ? 'green' : 'red'"
                      />
                    </svg>
                  </div>
                </template>
                <span>{{ item.enrolled ? 'Gebucht' : 'Warteliste' }}</span>
              </v-tooltip>
            </td>
            <td>{{ `${item.first_name} ${item.last_name}` }}</td>
            <td>{{ item.email }}</td>
            <td>
              <v-icon v-if="item.member">{{ mdiCheck }}</v-icon>
            </td>
            <td>
              <v-tooltip bottom>
                <template v-slot:activator="{ props }">
                  <div class="d-flex align-center text-no-wrap" v-bind="props">
                    <v-icon :color="item.payed ? 'green' : 'red'">{{
                      item.payed ? mdiCheck : mdiClose
                    }}</v-icon>
                    <div>{{ item.payment_id }}</div>
                  </div>
                </template>
                <span>{{ price(event, item.member) }}</span>
              </v-tooltip>
            </td>
            <td>
              <v-tooltip bottom>
                <template v-slot:activator="{ props }">
                  <v-icon size="xs" v-if="item.comment != undefined" v-bind="props">{{
                    mdiComment
                  }}</v-icon>
                </template>
                <span>{{ item.comment }}</span>
              </v-tooltip>
            </td>
            <td>
              <div class="d-flex align-center justify-end">
                <template v-if="!item.payed">
                  <v-tooltip bottom>
                    <template v-slot:activator="{ props }">
                      <v-icon size="xs" class="mr-2" @click="markPayed(item)" v-bind="props">{{
                        mdiCash
                      }}</v-icon>
                    </template>
                    <span>Als Bezahlt markieren</span>
                  </v-tooltip>
                </template>
                <v-tooltip bottom>
                  <template v-slot:activator="{ props }">
                    <v-icon size="xs" @click="displayCancelBookingDialog(item)" v-bind="props">{{
                      mdiDelete
                    }}</v-icon>
                  </template>
                  <span>Buchung stornieren</span>
                </v-tooltip>
              </div>
            </td>
          </tr>
        </template>
      </v-data-table-virtual>
    </v-col>
  </v-row>
</template>
