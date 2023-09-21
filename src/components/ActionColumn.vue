<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    text: string
    button?: string
  }>(),
  { button: 'Starten' }
)

const emit = defineEmits<{
  action: [onFinish: () => void]
}>()

const confirm = ref(false)
const loading = ref(false)

async function apply() {
  if (!confirm.value) {
    confirm.value = true
    return
  }
  confirm.value = false
  loading.value = true

  emit('action', () => {
    confirm.value = false
    loading.value = false
  })
}
</script>

<template>
  <v-col cols="12" sm="8">
    <v-sheet rounded :color="confirm ? 'red' : 'primary'" class="d-flex pa-3">
      <div class="me-auto align-self-center pr-2" v-html="props.text"></div>
      <v-btn
        class="align-self-center"
        :loading="loading"
        :disabled="loading"
        color="white"
        @click="apply"
        >{{ confirm ? 'Sicher?' : props.button }}</v-btn
      >
    </v-sheet>
  </v-col>
</template>
