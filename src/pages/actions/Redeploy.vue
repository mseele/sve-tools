<template>
  <Layout>
    <v-container>
      <action-header
        title="Re-Deploy Website"
        subtitle="Webseite neu bauen"
        :help="['Webseite nach Event-Änderung neu bauen und ausrollen']"
      />
      <v-row class="my-5" justify="center">
        <v-col cols="8">
          <v-alert
            :color="confirmNext ? 'red lighten-2' : 'blue lighten-4'"
            dense
          >
            <v-row align="center">
              <v-col class="grow">
                <b>next.sv-eutingen.de</b> neu bauen und ausrollen
              </v-col>
              <v-col class="shrink">
                <v-btn
                  :loading="loadingNext"
                  :disabled="loadingNext"
                  @click="redeployNext()"
                  >{{ confirmNext ? 'Sicher?' : 'Starten' }}</v-btn
                >
              </v-col>
            </v-row>
          </v-alert>
        </v-col>
        <v-col cols="8">
          <v-alert
            prominent
            :color="confirmRelease ? 'red lighten-2' : 'blue lighten-4'"
            dense
          >
            <v-row align="center">
              <v-col class="grow">
                <b>www.sv-eutingen.de</b> neu bauen und ausrollen
              </v-col>
              <v-col class="shrink">
                <v-btn
                  :loading="loadingRelease"
                  :disabled="loadingRelease"
                  @click="redeployRelease()"
                  >{{ confirmRelease ? 'Sicher?' : 'Starten' }}</v-btn
                >
              </v-col>
            </v-row>
          </v-alert>
        </v-col>
      </v-row>
    </v-container>
    <notify ref="notify" />
  </Layout>
</template>

<script>
import ActionHeader from '~/components/ActionHeader.vue'
import Notify from '~/components/Notify.vue'
import axios from 'axios'

export default {
  components: {
    ActionHeader,
    Notify,
  },
  metaInfo: {
    title: 'Re-Deploy Website',
  },
  data() {
    return {
      confirmNext: false,
      loadingNext: false,
      confirmRelease: false,
      loadingRelease: false,
    }
  },
  methods: {
    preset(preset) {
      this.subject = preset.subject
      this.content = preset.content
      this.initEvents()
    },
    reset() {
      this.confirmNext = false
      this.loadingNext = false
      this.confirmRelease = false
      this.loadingRelease = false
    },
    async redeployNext() {
      if (!this.confirmNext) {
        this.confirmNext = true
        return
      }
      this.confirmNext = false
      this.loadingNext = true
      try {
        await axios.post(this.$page.metadata.deployURL_sveNext)
      } catch (error) {
        console.error(error)
        this.$refs.notify.showError(
          'Re-Deploy fehlgeschalgen. Details siehe Console'
        )
        return
      }
      this.$refs.notify.showSuccess(
        'Re-Deploy von next.sv-eutingen.de wurde erfolgreich gestartet'
      )
      this.reset()
    },
    async redeployRelease() {
      if (!this.confirmRelease) {
        this.confirmRelease = true
        return
      }
      this.confirmRelease = false
      this.loadingRelease = true
      try {
        await axios.post(this.$page.metadata.deployURL_sveRelease)
      } catch (error) {
        console.error(error)
        this.$refs.notify.showError(
          'Re-Deploy fehlgeschalgen. Details siehe Console'
        )
        return
      }
      this.$refs.notify.showSuccess(
        'Re-Deploy von www.sv-eutingen.de wurde erfolgreich gestartet'
      )
      this.reset()
    },
  },
}
</script>

<page-query>
query {
  metadata {
    deployURL_sveNext
    deployURL_sveRelease
  }
}
</page-query>
