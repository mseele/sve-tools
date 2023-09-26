import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useNotifyStore = defineStore('notify', () => {
  const _message = ref()
  const _type = ref<'success' | 'error'>('success')

  function showSuccess(message: string) {
    _type.value = 'success'
    _message.value = message
  }

  function showError(message: string) {
    _type.value = 'error'
    _message.value = message
  }

  function hideMessage() {
    _message.value = undefined
  }

  const message = computed(() => _message.value)
  const type = computed(() => _type.value)

  return { showSuccess, showError, hideMessage, message, type }
})
