const VuetifyLoaderPlugin = require('vuetify-loader/lib/plugin')

module.exports = function (api) {
  api.loadSource((store) => {
    const backend_prefix = 'https://backend.sv-eutingen.de/api/'
    store.addMetadata('sendEmailsURL', backend_prefix + 'contact/emails')
    store.addMetadata('loadBetaEventsURL', backend_prefix + 'events?beta=true')
    store.addMetadata('loadAllEventsURL', backend_prefix + 'events?all=true')
    store.addMetadata('updateEventURL', backend_prefix + 'events/update')
    store.addMetadata('deleteEventURL', backend_prefix + 'events/delete')
    store.addMetadata(
      'verifyPaymentsURL',
      backend_prefix + 'events/verify_payments'
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
      eventImages.addNode({
        name: name,
      })
    }
    dir.closeSync()
  })

  api.chainWebpack((config, { isServer }) => {
    config.plugin('vuetify-loader').use(VuetifyLoaderPlugin)
  })
}
