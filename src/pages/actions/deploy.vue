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
    if (error !== null) {
      console.error(error)
      notify.showError('Re-Deploy fehlgeschalgen. Details siehe Console')
    }
  } finally {
    onFinish()
  }
}

async function redeployRelease(onFinish: () => void) {
  try {
    await triggerDeploy(true)
    notify.showSuccess('Re-Deploy von www.sv-eutingen.de wurde erfolgreich gestartet')
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Re-Deploy fehlgeschalgen. Details siehe Console')
    }
  } finally {
    onFinish()
  }
}
</script>

<template>
  <ActionsLayout :title="title" :help="['Webseite nach Event-Änderung neu bauen und ausrollen']">
    <div class="deploy-actions">
      <ActionColumn
        text="<b>next.sv-eutingen.de</b> neu bauen und ausrollen"
        @action="redeployNext"
      />
      <ActionColumn
        text="<b>www.sv-eutingen.de</b> neu bauen und ausrollen"
        @action="redeployRelease"
      />
    </div>
  </ActionsLayout>
</template>

<style scoped>
.deploy-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin: 32px 4px;
}

.deploy-actions > * {
  width: 100%;
}

/* 600px matches Vuetify's sm breakpoint; cols=12 sm=8 becomes 2/3 width. */
@media (min-width: 600px) {
  .deploy-actions > * {
    width: 66.6667%;
  }
}
</style>
