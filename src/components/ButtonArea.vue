<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    sendText?: string
    sendVisible?: boolean
  }>(),
  {
    disabled: false,
    sendText: 'Senden',
    sendVisible: true
  }
)

const emit = defineEmits<{
  send: []
  reset: []
}>()

const confirmSend = ref(false)

function reset() {
  confirmSend.value = false
  emit('reset')
}

async function send() {
  if (!confirmSend.value) {
    confirmSend.value = true
    return
  }
  confirmSend.value = false
  emit('send')
}
</script>

<template>
  <div class="button-area">
    <ProgressSpinner
      v-if="props.disabled"
      class="spinner"
      style="width: 32px; height: 32px"
      strokeWidth="4"
    />
    <Button
      label="Zurücksetzen"
      class="reset-button uppercase"
      :disabled="props.disabled"
      @click="reset()"
    />
    <Button
      v-if="props.sendVisible"
      :label="confirmSend ? 'Sicher?' : props.sendText"
      class="send-button uppercase"
      :severity="confirmSend ? 'danger' : 'primary'"
      :disabled="disabled"
      @click="send()"
    />
  </div>
</template>

<style scoped>
.button-area {
  display: flex;
  align-items: center;
}

.reset-button {
  margin-left: auto;
}

.send-button {
  margin-left: 8px;
}

.uppercase {
  text-transform: uppercase;
}
</style>
