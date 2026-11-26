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
/* Global base styles: the app previously got its reset, font stack and background
   from the Vuetify stylesheet that #193 removed. PrimeVue only styles its own
   components, so these rules restore the baseline the UI was built against. */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: #fff;
}

body {
  font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Pages render bare h3/h4 headings without their own margin styles,
   so keep the heading margin reset that the UI was built against. */
h1,
h2,
h3,
h4,
h5,
h6 {
  margin: 0;
}
</style>
