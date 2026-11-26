import { defineStore } from 'pinia'
import type { ToastMessageOptions } from 'primevue/toast'
import type { ToastServiceMethods } from 'primevue/toastservice'
import { useToast } from 'primevue/usetoast'

export interface NotifyAction {
  actionLabel?: string
  onAction?: () => void
}

interface NotifyToastMessage extends ToastMessageOptions, NotifyAction {}

let toast: ToastServiceMethods | undefined

// Captures useToast() once during App.vue setup so notifications work from
// anywhere, including non-component modules like api/index.ts.
export function bindToast() {
  toast = useToast()
}

function add(message: NotifyToastMessage) {
  if (toast === undefined) {
    // Dev-time signal: without the bound toast service the notification
    // would silently vanish.
    console.warn('notify: toast service is not bound, call bindToast() during app setup')
    return
  }
  toast.add(message)
}

function showSuccess(message: string) {
  add({ group: 'notify', severity: 'success', summary: message, life: 4000 })
}

function showError(message: string, options: NotifyAction = {}) {
  add({
    group: 'notify',
    severity: 'error',
    summary: message,
    life: 4000,
    actionLabel: options.actionLabel,
    onAction: options.onAction
  })
}

export const useNotifyStore = defineStore('notify', () => {
  return { showSuccess, showError }
})
