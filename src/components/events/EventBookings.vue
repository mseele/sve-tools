<script setup lang="ts">
import {
  cancelBooking,
  exportEventBookings,
  exportEventParticipantList,
  exportSepaXml,
  markEventBookingAsPayed
} from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { LifecycleStatus, PaymentMethod, type Event, type EventSubscriber } from '@/types'
import { formatPrice } from '@/utils'
import {
  mdiBankTransfer,
  mdiCash,
  mdiCheck,
  mdiClose,
  mdiDelete,
  mdiFilePdfBox,
  mdiMicrosoftExcel
} from '@mdi/js'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import { computed, ref } from 'vue'

const props = defineProps<{
  status: LifecycleStatus
  events: Event[]
}>()

const emit = defineEmits<{
  refresh: []
}>()

const notify = useNotifyStore()

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
  return subscriber.enrolled ? '' : 'waitlisted'
}

// PrimeVue DataTable cannot inject a second <tr> like Vuetify's item slot, so
// comments render through the expansion template. Rows with a comment are
// pre-expanded, which keeps them always visible below the subscriber row.
function expandedCommentRows(event: Event) {
  const rows: Record<string, boolean> = {}
  for (const subscriber of event.subscribers || []) {
    if (subscriber.comment) {
      rows[subscriber.id] = true
    }
  }
  return rows
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
    if (error !== null) {
      console.error(error)
      notify.showError('Als Bezahlt markieren is fehlgeschlagen. Details siehe Console')
    }
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
    if (error !== null) {
      console.error(error)
      notify.showError('Die Stornierung is fehlgeschlagen. Details siehe Console')
    }
  }
  cancelBookingDialog.value = false
  cancelBookingLoading.value = false
  refresh()
}

function refresh() {
  emit('refresh')
}

async function downloadParticipantList(event: Event) {
  try {
    await exportEventParticipantList(event)
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Download der Teilnehmerliste fehlgeschlagen. Details sie Console')
    }
  }
}

async function downloadBookings(event: Event) {
  try {
    await exportEventBookings(event)
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Download der Buchungen fehlgeschlagen. Details sie Console')
    }
  }
}

async function exportSepa(event: Event) {
  try {
    await exportSepaXml(event)
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('SEPA-XML Export fehlgeschlagen. Details siehe Console')
    }
  }
}
</script>

<template>
  <div v-if="filteredEvents.length > 0" class="event-bookings">
    <div class="section-title">
      <EventListItem :status="status" :text="titleText()" />
    </div>
    <div v-for="(event, index) of filteredEvents" :key="index" class="event">
      <DataTable
        :value="event.subscribers || []"
        dataKey="id"
        size="small"
        class="event-table"
        :rowClass="subscriberClasses"
        :expandedRows="expandedCommentRows(event)"
      >
        <template #header>
          <div class="table-header">
            <div class="table-header-left">
              <h3>{{ event.name }}</h3>
              <div>
                {{ freeBookings(event, true) }} freie Plätze /
                {{ freeBookings(event, false) }} freie Wartelistplätze
              </div>
            </div>
            <div class="table-header-right">
              <div
                v-if="finacialResult(event) != undefined"
                :class="finacialResult(event)! < 0 ? 'finacial negative' : 'finacial positive'"
              >
                {{ formatPrice(finacialResult(event)!.toString()) }}
              </div>
              <div v-else class="finacial missing">Preis pro Einheit fehlt</div>
              <Button
                v-tooltip.left="'Teilnehmerliste herunterladen'"
                text
                rounded
                aria-label="Teilnehmerliste herunterladen"
                @click="downloadParticipantList(event)"
              >
                <MdiIcon :path="mdiFilePdfBox" class="pdf" />
              </Button>
              <Button
                v-tooltip.left="'Buchungsliste herunterladen'"
                text
                rounded
                aria-label="Buchungsliste herunterladen"
                @click="downloadBookings(event)"
              >
                <MdiIcon :path="mdiMicrosoftExcel" class="excel" />
              </Button>
              <Button
                v-if="event.payment_method === PaymentMethod.SepaDirectDebit"
                v-tooltip.left="'SEPA-XML exportieren'"
                text
                rounded
                aria-label="SEPA-XML exportieren"
                @click="exportSepa(event)"
              >
                <MdiIcon :path="mdiBankTransfer" class="sepa" />
              </Button>
            </div>
          </div>
        </template>
        <template #empty>Bisher noch keine Buchungen</template>
        <Column>
          <template #body="{ data }">
            <div v-tooltip.bottom="data.enrolled ? 'Gebucht' : 'Warteliste'" class="enrolled">
              <svg xmlns="http://www.w3.org/2000/svg" width="16pt" height="21.333">
                <path
                  d="M15.625 10a5.625 5.625 0 11-11.25 0 5.625 5.625 0 0111.25 0z"
                  :fill="data.enrolled ? 'green' : 'red'"
                />
              </svg>
            </div>
          </template>
        </Column>
        <Column field="first_name" header="Name" sortable>
          <template #body="{ data }">{{ `${data.first_name} ${data.last_name}` }}</template>
        </Column>
        <Column field="email" header="Email" sortable />
        <Column field="member" header="Mgl." sortable>
          <template #body="{ data }">
            <MdiIcon v-if="data.member" :path="mdiCheck" />
          </template>
        </Column>
        <Column
          v-if="event.payment_method === PaymentMethod.SepaDirectDebit"
          field="sepa_exported_at"
          header="SEPA exportiert"
          sortable
        >
          <template #body="{ data }">
            <MdiIcon v-if="data.sepa_exported_at" :path="mdiCheck" class="icon-ok" />
          </template>
        </Column>
        <Column v-else field="payment_confirmed_at" header="Zahlung bestätigt" sortable>
          <template #body="{ data }">
            <div v-tooltip.bottom="price(event, data.member)" class="payment">
              <MdiIcon
                :path="data.payment_confirmed_at ? mdiCheck : mdiClose"
                :class="data.payment_confirmed_at ? 'icon-ok' : 'icon-failed'"
              />
              <span>{{ data.payment_id }}</span>
            </div>
          </template>
        </Column>
        <Column>
          <template #body="{ data }">
            <div class="actions">
              <Button
                v-if="
                  !data.payment_confirmed_at &&
                  event.payment_method !== PaymentMethod.SepaDirectDebit
                "
                v-tooltip.bottom="'Als Bezahlt markieren'"
                text
                rounded
                size="small"
                aria-label="Als Bezahlt markieren"
                @click="markPayed(data)"
              >
                <MdiIcon :path="mdiCash" :size="16" />
              </Button>
              <Button
                v-tooltip.bottom="'Buchung stornieren'"
                text
                rounded
                size="small"
                aria-label="Buchung stornieren"
                @click="displayCancelBookingDialog(data)"
              >
                <MdiIcon :path="mdiDelete" :size="16" />
              </Button>
            </div>
          </template>
        </Column>
        <template #expansion="{ data }">
          <div class="comment">{{ data.comment }}</div>
        </template>
      </DataTable>
    </div>
    <Dialog
      v-model:visible="cancelBookingDialog"
      modal
      :dismissableMask="true"
      header="Buchung stornieren"
      :style="{ width: '400px' }"
    >
      <div>Soll die Buchung wirklich storniert werden?</div>
      <template #footer>
        <div class="dialog-footer">
          <Button
            label="Abbrechen"
            text
            severity="secondary"
            @click="cancelBookingDialog = false"
          />
          <Button
            label="Stornieren"
            text
            severity="primary"
            :loading="cancelBookingLoading"
            @click="confirmCancelBooking"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.event-bookings {
  display: flex;
  flex-direction: column;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 1.25rem;
  font-weight: 500;
}

.event {
  margin-top: 16px;
}

.event-table {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.table-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.table-header-left h3 {
  margin: 4px 8px;
  font-size: 1.25rem;
  font-weight: 500;
}

.table-header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.finacial {
  font-size: 0.875rem;
}

.finacial.negative {
  color: #dc2626;
}

.finacial.positive {
  color: #65a30d;
}

.finacial.missing {
  color: #9e9e9e;
}

.pdf {
  color: #dc2626;
}

.excel {
  color: #65a30d;
}

.sepa {
  color: #1976d2;
}

.payment {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.payment span {
  margin-left: 4px;
}

.icon-ok {
  color: #4caf50;
}

.icon-failed {
  color: #f44336;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.comment {
  font-size: 0.75rem;
  white-space: pre-wrap;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(tr.waitlisted > td) {
  color: #9e9e9e;
}
</style>
