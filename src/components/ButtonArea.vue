<script setup lang="ts">
import { ref } from 'vue'

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
  <div class="d-flex align-center">
    <v-progress-circular
      v-if="props.disabled"
      size="32"
      rotate="-90"
      indeterminate
      color="primary"
    ></v-progress-circular>
    <v-spacer />
    <v-btn depressed :disabled="props.disabled" @click="reset()">Zurücksetzen</v-btn>
    <v-btn
      v-if="props.sendVisible"
      depressed
      :color="confirmSend ? 'red' : 'primary'"
      :disabled="disabled"
      class="ml-2"
      @click="send()"
    >
      {{ confirmSend ? 'Sicher?' : props.sendText }}
    </v-btn>
  </div>
</template>
