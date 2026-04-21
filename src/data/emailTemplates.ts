import { EventType } from '@/types'

export interface EmailTemplate {
  id: string
  label: string
  subject: string
  body: string
}

export const batchEmailTemplates: Record<EventType, EmailTemplate[]> = {
  [EventType.Fitness]: [
    {
      id: 'standard',
      label: 'Standard',
      subject: '[Fitness@SVE] ',
      body: '\n\nHerzliche Grüße\nTeam Fitness@SVE'
    },
    {
      id: 'course-cancellation',
      label: 'Kursabsage',
      subject: '[Fitness@SVE] Information zum Fitnesskurs',
      body: `Hallo {{firstname}},

leider kann der von dir gebuchte Fitnesskurs "{{name}}" aufgrund zu geringer Teilnehmerzahl nicht stattfinden.

Solltest du den Kurs bereits bezahlt haben, werden wir dir das Geld selbstverständlich umgehend zurücküberweisen.

Wir entschuldigen uns nochmals für die Absage und hoffen, dass in Zukunft wieder ein passender Kurs für dich dabei ist.

Herzliche Grüße
Team Fitness@SVE`
    }
  ],
  [EventType.Events]: [
    {
      id: 'standard',
      label: 'Standard',
      subject: '[Events@SVE] ',
      body: '\n\nHerzliche Grüße\nTeam Events@SVE'
    }
  ]
}

export const prebookingEmailTemplates: Record<EventType, EmailTemplate[]> = {
  [EventType.Fitness]: [
    {
      id: 'standard',
      label: 'Standard',
      subject: '[Fitness@SVE] ',
      body: '\n\nHerzliche Grüße\nTeam Fitness@SVE'
    },
    {
      id: 'prebooking-invitation',
      label: 'Pre-Booking Einladung',
      subject: '[Fitness@SVE] Information zum Fitnesskurs',
      body: `Hallo {{firstname}},

wir werden deinen gebuchten Fitnesskurs "{{name}}" in Kürze zu folgenden Terminen erneut anbieten:

{{dates}}

Der kommende Kurs kostet {{price}}.
Als bisheriger Kursteilnehmer möchten wir es Dir ermöglichen, den Kurs vor der offiziellen Veröffentlichung exklusiv zu buchen.

Möchtest du wieder mit dabei sein? Dann klicke einfach auf deinen individuellen Buchungslink, um den Kurs zu buchen:
{{link}}

Achtung: Wir werden den Fitnesskurs in Kürze öffentlich ausschreiben. Ab diesem Zeitpunkt ist eine Buchung nur noch über die Webseite möglich, und ein Platz ist nicht mehr garantiert.

Herzliche Grüße
Team Fitness@SVE`
    }
  ],
  [EventType.Events]: [
    {
      id: 'standard',
      label: 'Standard',
      subject: '[Events@SVE] ',
      body: '\n\nHerzliche Grüße\nTeam Events@SVE'
    }
  ]
}
