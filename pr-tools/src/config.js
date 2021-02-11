import Convict from 'convict'

export const ConvictConfig = Convict({
  PULL_REQUEST_URL: {
    doc: 'The URL of the pull request to check',
    format: String,
    default: null,
    env: 'CIRCLE_PULL_REQUEST'
  }
})

ConvictConfig.validate({ allowed: 'strict' })

const config = {
  PULL_REQUEST_URL: ConvictConfig.get('PULL_REQUEST_URL')
}