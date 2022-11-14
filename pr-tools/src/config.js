const Convict = require('convict')


const ConvictConfig = Convict({
  PULL_REQUEST_URL: {
    doc: 'The URL of the pull request to check',
    format: String,
    default: '',
    env: 'CIRCLE_PULL_REQUEST'
  },
  FAIL_SILENTLY_WHEN_MISSING_CIRCLE_PULL_REQUEST: {
    doc: 'If true, will fail silently if missing the pr url',
    format: Boolean,
    default: true,
    env: 'FAIL_SILENTLY_WHEN_MISSING_CIRCLE_PULL_REQUEST'
  },
  GET_HELP_URL: {
    doc: 'The url to a help document',
    format: String,
    default: 'https://docs.mojaloop.io/community/standards/creating-new-features.html',
    env: 'GET_HELP_URL'
  }
})

ConvictConfig.validate({ allowed: 'strict' })

const config = {
  PULL_REQUEST_URL: ConvictConfig.get('PULL_REQUEST_URL'),
  FAIL_SILENTLY_WHEN_MISSING_CIRCLE_PULL_REQUEST: ConvictConfig.get('FAIL_SILENTLY_WHEN_MISSING_CIRCLE_PULL_REQUEST'),
  GET_HELP_URL: ConvictConfig.get('GET_HELP_URL'),
}

module.exports = {
  config,
  ConvictConfig
}