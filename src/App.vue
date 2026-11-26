<script setup lang="ts">
import { mdiCheckCircle, mdiCloseCircle } from '@mdi/js'
import { useHead } from '@unhead/vue'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import { RouterView } from 'vue-router'
import { bindToast } from '@/stores/notify'

bindToast()

useHead({
  titleTemplate: (title?: string) => (!title ? 'SVE Tools' : `${title} - SVE Tools`)
})
</script>

<template>
  <Toast group="notify" position="bottom-center">
    <template #message="slotProps">
      <MdiIcon v-if="slotProps.message.severity === 'success'" :path="mdiCheckCircle" />
      <MdiIcon v-else :path="mdiCloseCircle" />
      <div class="p-toast-message-text">
        <div class="p-toast-summary">{{ slotProps.message.summary }}</div>
        <Button
          v-if="slotProps.message.actionLabel"
          size="small"
          variant="text"
          severity="contrast"
          :label="slotProps.message.actionLabel"
          @click="slotProps.message.onAction?.()"
        />
      </div>
    </template>
  </Toast>
  <RouterView />
</template>

<style>
@layer vuetify-core.reset {
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 0;
  }
}
</style>
