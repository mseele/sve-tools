import type { PrimeVueLocaleOptions } from 'primevue/config'

// German locale for the date pickers: month and day names, week start on
// Monday and the date format used across the app.
export const locale: PrimeVueLocaleOptions = {
  fileSizeTypes: ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
  dayNames: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  dayNamesShort: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  dayNamesMin: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  monthNames: [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember'
  ],
  monthNamesShort: [
    'Jan',
    'Feb',
    'Mär',
    'Apr',
    'Mai',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Okt',
    'Nov',
    'Dez'
  ],
  firstDayOfWeek: 1,
  dateFormat: 'dd.mm.yy',
  today: 'Heute',
  weekHeader: 'Wo',
  chooseDate: 'Datum wählen',
  chooseMonth: 'Monat wählen',
  chooseYear: 'Jahr wählen',
  prevDecade: 'Vorheriges Jahrzehnt',
  nextDecade: 'Nächstes Jahrzehnt',
  prevYear: 'Vorheriges Jahr',
  nextYear: 'Nächstes Jahr',
  prevMonth: 'Vorheriger Monat',
  nextMonth: 'Nächster Monat',
  prevHour: 'Vorherige Stunde',
  nextHour: 'Nächste Stunde',
  prevMinute: 'Vorherige Minute',
  nextMinute: 'Nächste Minute',
  prevSecond: 'Vorherige Sekunde',
  nextSecond: 'Nächste Sekunde'
}
