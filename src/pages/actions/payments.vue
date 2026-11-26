<script setup lang="ts">
import { getUnpaidBookings, verifyPayments } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { EventType, type UnpaidBooking } from '@/types'
import { readFile } from '@/utils'
import { useHead } from '@unhead/vue'
import Chip from 'primevue/chip'
import Divider from 'primevue/divider'
import FileUpload, { type FileUploadSelectEvent } from 'primevue/fileupload'
import IftaLabel from 'primevue/iftalabel'
import InputText from 'primevue/inputtext'
import { onMounted, ref, watch } from 'vue'

const title = 'Verify Payments'
useHead({ title })

const notify = useNotifyStore()

onMounted(loadUnpaidBookings)

const unpaidBookings = ref<UnpaidBooking[]>()
const eventType = ref(EventType.Fitness)
const disabled = ref(false)
const csv = ref<File>()
const csvResult = ref()
const startDate = ref()

watch(eventType, loadUnpaidBookings)

async function loadUnpaidBookings() {
  unpaidBookings.value = undefined
  try {
    const response = await getUnpaidBookings(eventType.value)
    unpaidBookings.value = response
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Abholen unbezahlter Buchungen fehlgeschlafen. Details siehe Console')
    }
  }
}

// PrimeVue FileUpload has no v-model, so the selected CSV file is kept in page
// state via the @select event. Long names are truncated as before.
function onCsvSelect(event: FileUploadSelectEvent) {
  const selected = Array.isArray(event.files) ? event.files : [event.files]
  csv.value = selected[0]
}

function removeCsv() {
  csv.value = undefined
}

function csvName(file: File) {
  return file.name.length > 50 ? file.name.slice(0, 50) + '…' : file.name
}

function reset() {
  csv.value = undefined
  startDate.value = undefined
  csvResult.value = undefined
  disabled.value = false
  loadUnpaidBookings()
}

async function send() {
  if (csv.value === undefined) {
    return
  }
  disabled.value = true
  let attachment
  try {
    attachment = await readFile(csv.value)
  } catch (error) {
    console.error(error)
    notify.showError('Datei konnte nicht gelesen werden. Details siehe Console')
    disabled.value = false
    return
  }
  try {
    const response = await verifyPayments(attachment, startDate.value)
    csvResult.value = response
    await loadUnpaidBookings()
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Überprüfung fehlgeschlafen. Details siehe Console')
    }
  } finally {
    disabled.value = false
  }
}
</script>

<template>
  <ActionsLayout
    :title="title"
    :help="['Kontoauszug als CVS Datei angeben', 'Überprüfung starten und Auswertung abwarten']"
  >
    <template v-if="csvResult">
      <div v-for="(item, index) in csvResult" :key="index" class="result">
        <h4>{{ item.title }}</h4>
        <ul v-if="item.values.length > 0">
          <li v-for="(value, idx) in item.values" :key="idx" class="result-value">
            {{ value }}
          </li>
        </ul>
      </div>
      <Divider class="result-divider" />
      <UnpaidBookings
        :eventType="eventType"
        :bookings="unpaidBookings"
        @refresh="loadUnpaidBookings"
      />
    </template>
    <template v-else>
      <EventTypeSelection v-model="eventType" :disabled="disabled" />
      <UnpaidBookings
        :eventType="eventType"
        :bookings="unpaidBookings"
        @refresh="loadUnpaidBookings"
        class="unpaid-bookings"
      />
      <Divider class="upload-divider" />
      <FileUpload
        mode="basic"
        customUpload
        chooseLabel="CSV Datei auswählen"
        class="csv-upload"
        :disabled="disabled"
        @select="onCsvSelect"
      >
        <template #filelabel>
          <Chip
            v-if="csv"
            :label="csvName(csv)"
            removable
            class="attachment-chip"
            @remove="removeCsv"
          />
        </template>
      </FileUpload>
      <IftaLabel class="field">
        <InputText
          inputId="csv-start-date"
          v-model="startDate"
          type="date"
          fluid
          :disabled="disabled"
        />
        <label for="csv-start-date">CSV Start Date</label>
      </IftaLabel>
    </template>
    <ButtonArea
      :disabled="disabled"
      send-text="Starten"
      :send-visible="csvResult == undefined"
      @send="send"
      @reset="reset"
    />
  </ActionsLayout>
</template>

<style scoped>
.result {
  margin-bottom: 16px;
}

.result-value {
  margin-block: 4px;
}

.result-divider {
  margin-bottom: 16px;
}

.unpaid-bookings {
  margin-bottom: 24px;
}

.upload-divider {
  margin-bottom: 24px;
}

.csv-upload {
  margin-bottom: 16px;
}
</style>
