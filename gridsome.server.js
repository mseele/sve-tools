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
  })

  api.chainWebpack((config, { isServer }) => {
    config.plugin('vuetify-loader').use(VuetifyLoaderPlugin)
  })
}
