import { EventType, LifecycleStatus } from '@/types'

export function validateEmail(email: string) {
  return email
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    )
}

export function readFile(inputFile: File): Promise<string> {
  const reader = new FileReader()

  return new Promise((resolve, reject) => {
    reader.onerror = () => {
      reader.abort()
      reject(new DOMException('Error reading file: ' + reader.error))
    }

    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      if (base64) {
        resolve(base64)
      }
    }
    reader.readAsDataURL(inputFile)
  })
}

export function defaultEmailSubject(eventType: EventType) {
  return eventType === EventType.Fitness ? '[Fitness@SVE] ' : '[Events@SVE] '
}

export function defaultEmailBody(eventType: EventType) {
  if (eventType === EventType.Fitness) {
    return `

Herzliche Grüße
Team Fitness@SVE`
  }
  return `

Herzliche Grüße
Team Events@SVE`
}

export function statusIndex(status: LifecycleStatus) {
  switch (status) {
    case LifecycleStatus.Draft:
      return 2
    case LifecycleStatus.Review:
      return 1
    case LifecycleStatus.Published:
      return 0
    case LifecycleStatus.Running:
      return 3
    case LifecycleStatus.Finished:
      return 4
    case LifecycleStatus.Closed:
      return 5
    case LifecycleStatus.Archived:
    default:
      return 6
  }
}

export function formatPrice(price: string) {
  return price.replace('.', ',') + '  €'
}

// A form validation rule: it receives the current field value and either
// accepts it (true) or rejects it with an error message.
export interface Rule {
  (value: unknown): boolean | string
}

// Returns the message of the first failing rule, or undefined when every
// rule accepts the value. A rule that rejects without a message yields a
// generic one. PrimeVue has no form-level rule evaluation, so the old
// per-field rules are checked manually through this helper.
export function firstRuleError(rules: readonly Rule[], value: unknown): string | undefined {
  for (const rule of rules) {
    const result = rule(value)
    if (result !== true) {
      return typeof result === 'string' ? result : 'Ungültiger Wert'
    }
  }
  return undefined
}
