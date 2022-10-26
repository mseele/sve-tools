<template>
  <Layout>
    <v-container>
      <action-header
        title="Verify Payments"
        subtitle="Automatische Zahlungsverifizierung"
        :help="[
          'Kontoauszug als CVS Datei angeben',
          'Überprüfung starten und Auswertung abwarten',
        ]"
      />
      <v-row>
        <v-col cols="12">
          <div v-if="result">
            <div v-for="(item, index) in result" :key="index" class="mb-4">
              <h4>{{ item.title }}</h4>
              <ul v-if="item.values.length > 0">
                <li v-for="(value, idx) in item.values" :key="idx" class="my-1">
                  {{ value }}
                </li>
              </ul>
            </div>
          </div>
          <v-form :disabled="disabled" v-else>
            <v-file-input
              outlined
              v-model="csv"
              prepend-icon
              truncate-length="50"
              label="CSV Datei auswählen"
            ></v-file-input>
            <div class="d-flex">
              <v-checkbox v-model="with_start_date" hide-details></v-checkbox>
              <v-menu
                v-model="date_picker"
                :close-on-content-click="false"
                :nudge-right="40"
                transition="scale-transition"
                offset-y
                min-width="auto"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    :disabled="!with_start_date"
                    v-model="start_date"
                    label="CSV Start Date"
                    readonly
                    outlined
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-date-picker
                  v-model="start_date"
                  @input="date_picker = false"
                ></v-date-picker>
              </v-menu>
            </div>
          </v-form>
          <button-area
            :disabled="disabled"
            send-text="Starten"
            :send-visible="result == undefined"
            @send="send"
            @reset="reset"
          />
        </v-col>
      </v-row>
    </v-container>
    <notify ref="notify" />
  </Layout>
</template>

<script>
import axios from 'axios'
import ActionHeader from '~/components/ActionHeader.vue'
import ButtonArea from '~/components/ButtonArea.vue'
import Notify from '~/components/Notify.vue'
import { readFile } from '~/utils/actions.js'

export default {
  components: {
    ActionHeader,
    Notify,
    ButtonArea,
  },
  metaInfo: {
    title: 'Zahlungen überprüfen',
  },
  data() {
    return {
      csv: undefined,
      with_start_date: false,
      start_date: undefined,
      date_picker: false,
      result: undefined,
      disabled: false,
    }
  },
  methods: {
    reset() {
      this.csv = undefined
      this.with_start_date = false
      this.start_date = undefined
      this.result = undefined
      this.disabled = false
    },
    async send() {
      this.disabled = true
      let attachment
      try {
        attachment = await readFile(this.csv)
      } catch (error) {
        console.error(error)
        this.$refs.notify.showError(
          'Datei konnte nicht gelesen werden. Details siehe Console'
        )
        this.disabled = false
        return
      }

      try {
        const response = await axios.post(
          this.$page.metadata.verifyPaymentsURL,
          {
            csv: attachment,
            start_date:
              this.with_start_date && this.start_date
                ? this.start_date
                : undefined,
          }
        )
        this.result = response.data
      } catch (error) {
        console.error(error)
        this.$refs.notify.showError(
          'Überprüfung fehlgeschlafen. Details siehe Console'
        )
      } finally {
        this.disabled = false
      }
    },
  },
}
</script>

<page-query>
query {
  metadata {
    verifyPaymentsURL
  }
}
</page-query>
