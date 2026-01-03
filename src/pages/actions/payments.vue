<script setup lang="ts">
import { getUnpaidBookings, verifyPayments } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { EventType, type UnpaidBooking } from '@/types'
import { readFile } from '@/utils'
import { useHead } from '@unhead/vue'
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
    <v-row>
      <v-col cols="12">
        <div v-if="csvResult">
          <div v-for="(item, index) in csvResult" :key="index" class="mb-4">
            <h4>{{ item.title }}</h4>
            <ul v-if="item.values.length > 0">
              <li v-for="(value, idx) in item.values" :key="idx" class="my-1">
                {{ value }}
              </li>
            </ul>
          </div>
          <v-divider class="mb-4" />
          <UnpaidBookings
            :eventType="eventType"
            :bookings="unpaidBookings"
            @refresh="loadUnpaidBookings"
          />
        </div>
        <v-form :disabled="disabled" v-else>
          <EventTypeSelection v-model="eventType" />
          <UnpaidBookings
            :eventType="eventType"
            :bookings="unpaidBookings"
            @refresh="loadUnpaidBookings"
            class="mb-6"
          />
          <v-divider class="mb-6" />
          <v-file-input
            clearable
            variant="outlined"
            v-model="csv"
            truncate-length="50"
            label="CSV Datei auswählen"
          ></v-file-input>
          <v-text-field
            label="CSV Start Date"
            type="date"
            v-model="startDate"
            clearable
            variant="outlined"
          ></v-text-field>
        </v-form>
        <ButtonArea
          :disabled="disabled"
          send-text="Starten"
          :send-visible="csvResult == undefined"
          @send="send"
          @reset="reset"
        />
      </v-col>
    </v-row>
  </ActionsLayout>
</template>
