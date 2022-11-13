const VuetifyLoaderPlugin = require('vuetify-loader/lib/plugin')

module.exports = function (api) {
  api.loadSource((store) => {
    const backend_prefix = 'https://backend.sv-eutingen.de/api/'
    store.addMetadata('sendEmailsURL', backend_prefix + 'contact/emails')
    store.addMetadata('loadEventsURL', backend_prefix + 'events')
    store.addMetadata('updateEventURL', backend_prefix + 'events/update')
    store.addMetadata('deleteEventURL', backend_prefix + 'events/')
    store.addMetadata(
      'updateEventBookingURL',
      backend_prefix + 'events/booking/'
    )
    store.addMetadata(
      'exportEventBookingsURL',
      backend_prefix + 'events/booking/export/'
    )
    store.addMetadata(
      'verifyPaymentsURL',
      backend_prefix + 'events/payments/verify'
    )
    store.addMetadata(
      'unpaidBookingsURL',
      backend_prefix + 'events/payments/unpaid/'
    )
    store.addMetadata(
      'sendPaymentRemindersURL',
      backend_prefix + 'tasks/send_payment_reminders/'
    )
    store.addMetadata(
      'deployURL_sveNext',
      'https://api.netlify.com/build_hooks/6127d32c2032942b064c7947'
    )
    store.addMetadata(
      'deployURL_sveRelease',
      'https://api.netlify.com/build_hooks/6127d409612b8830aa05d286'
    )

    const eventImages = store.addCollection('eventImages')

    const fs = require('fs')
    const dir = fs.opendirSync('./src/assets/events/')
    while ((dirent = dir.readSync()) !== null) {
      const name = dirent.name
      const separator = name.lastIndexOf('_')
      const dot = name.lastIndexOf('.')
      const image =
        name.substring(0, separator) + name.substring(dot, name.length)
      const suffix = name.substring(separator + 1, dot)
      if ('light' !== suffix && 'dark' !== suffix) {
        throw (
          'Invalid event image suffix on ' +
          name +
          '. Only light or dark is supported.'
        )
      }
      const light = 'light' === suffix
      eventImages.addNode({
        name,
        image,
        light,
      })
    }
    dir.closeSync()
  })

  api.chainWebpack((config, { isServer }) => {
    config.plugin('vuetify-loader').use(VuetifyLoaderPlugin)
  })
}
