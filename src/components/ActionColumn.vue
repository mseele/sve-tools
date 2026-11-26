<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'

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
  <div class="action-sheet" :class="confirm ? 'confirm' : 'primary'">
    <div class="action-text" v-html="props.text"></div>
    <Button
      class="uppercase"
      :label="confirm ? 'Sicher?' : props.button"
      severity="contrast"
      :loading="loading"
      :disabled="loading"
      @click="apply"
    />
  </div>
</template>

<style scoped>
.action-sheet {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 4px;
  color: #fff;
}

.action-sheet.primary {
  background: var(--p-primary-color, #c62828);
}

.action-sheet.confirm {
  background: var(--p-red-500, #f44336);
}

.action-text {
  margin-inline-end: auto;
  padding-right: 8px;
}

.uppercase {
  text-transform: uppercase;
}
</style>
