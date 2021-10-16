const VuetifyLoaderPlugin = require('vuetify-loader/lib/plugin')

module.exports = function (api) {
  api.loadSource((store) => {
    store.addMetadata(
      'sendEmailsURL',
      'https://backend.sv-eutingen.de/api/contact/emails'
    )
    store.addMetadata(
      'loadBetaEventsURL',
      'https://backend.sv-eutingen.de/api/events?beta=true'
    )
    store.addMetadata(
      'loadAllEventsURL',
      'https://backend.sv-eutingen.de/api/events?all=true'
    )
    store.addMetadata(
      'updateEventURL',
      'https://backend.sv-eutingen.de/api/events/update'
    )
    store.addMetadata(
      'deleteEventURL',
      'https://backend.sv-eutingen.de/api/events/delete'
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
        src: require.resolve('./src/assets/events/' + name),
      })
    }
    dir.closeSync()
  })

  api.chainWebpack((config, { isServer }) => {
    config.plugin('vuetify-loader').use(VuetifyLoaderPlugin)
  })
}
