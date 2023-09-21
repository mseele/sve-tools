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
      resolve(base64)
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
