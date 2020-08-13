const VuetifyLoaderPlugin = require('vuetify-loader/lib/plugin')

module.exports = function (api) {
  api.loadSource((store) => {
    store.addMetadata(
      'sendEmailsURL',
      'https://backend.sv-eutingen.de/api/contact/emails'
    )
    store.addMetadata(
      'loadEventsURL',
      'https://backend.sv-eutingen.de/api/events?beta=true'
    )
  })

  api.chainWebpack((config, { isServer }) => {
    config.plugin('vuetify-loader').use(VuetifyLoaderPlugin)
  })
}
