<script setup lang="ts">
import { triggerDeploy } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { useHead } from '@unhead/vue'

const title = 'Re-Deploy Website'
useHead({ title })

const notify = useNotifyStore()

async function redeployNext(onFinish: () => void) {
  try {
    await triggerDeploy(false)
    notify.showSuccess('Re-Deploy von next.sv-eutingen.de wurde erfolgreich gestartet')
  } catch (error) {
    console.error(error)
    notify.showError('Re-Deploy fehlgeschalgen. Details siehe Console')
  } finally {
    onFinish()
  }
}

async function redeployRelease(onFinish: () => void) {
  try {
    await triggerDeploy(true)
    notify.showSuccess('Re-Deploy von www.sv-eutingen.de wurde erfolgreich gestartet')
  } catch (error) {
    console.error(error)
    notify.showError('Re-Deploy fehlgeschalgen. Details siehe Console')
  } finally {
    onFinish()
  }
}
</script>

<template>
  <ActionsLayout :title="title" :help="['Webseite nach Event-Änderung neu bauen und ausrollen']">
    <v-row class="my-5 mx-1" justify="center">
      <ActionColumn
        text="<b>next.sv-eutingen.de</b> neu bauen und ausrollen"
        @action="redeployNext"
      />
      <ActionColumn
        text="<b>www.sv-eutingen.de</b> neu bauen und ausrollen"
        @action="redeployRelease"
      />
    </v-row>
  </ActionsLayout>
</template>
