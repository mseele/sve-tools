import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useNotifyStore = defineStore('notify', () => {
  const _message = ref<string | undefined>()
  const _type = ref<'success' | 'error'>('success')
  const _actionLabel = ref<string | undefined>()
  const _onAction = ref<(() => void) | undefined>()

  function showSuccess(message: string) {
    _type.value = 'success'
    _message.value = message
    _actionLabel.value = undefined
    _onAction.value = undefined
  }

  function showError(
    message: string,
    options: { actionLabel?: string; onAction?: () => void } = {}
  ) {
    _type.value = 'error'
    _message.value = message
    _actionLabel.value = options.actionLabel
    _onAction.value = options.onAction
  }

  function hideMessage() {
    _message.value = undefined
    _actionLabel.value = undefined
    _onAction.value = undefined
  }

  const message = computed(() => _message.value)
  const type = computed(() => _type.value)
  const actionLabel = computed(() => _actionLabel.value)
  const onAction = computed(() => _onAction.value)

  return { showSuccess, showError, hideMessage, message, type, actionLabel, onAction }
})
