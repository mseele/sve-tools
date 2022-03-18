<template>
  <Layout>
    <v-container>
      <action-header
        title="Zahlungen prüfen"
        subtitle="Automatische Zahlungsverifizierung"
        :help="[
          'Google Sheet ID eintragen',
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
            <v-text-field
              v-model="sheet_id"
              outlined
              label="Sheet-ID"
            ></v-text-field>
            <v-file-input
              outlined
              v-model="csv"
              prepend-icon
              truncate-length="50"
              label="CSV Datei auswählen"
            ></v-file-input>
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
import ActionHeader from '~/components/ActionHeader.vue'
import Notify from '~/components/Notify.vue'
import ButtonArea from '~/components/ButtonArea.vue'
import { readFile } from '~/utils/actions.js'
import axios from 'axios'

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
      sheet_id: '',
      csv: undefined,
      result: undefined,
      disabled: false,
    }
  },
  methods: {
    reset() {
      this.sheet_id = ''
      this.csv = undefined
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
            sheet_id: this.sheet_id,
            csv: attachment,
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
