const lint  = require('@commitlint/lint').default
const format = require('@commitlint/format').default
const load = require('@commitlint/load').default
const conventional = require('@commitlint/config-conventional')
const Logger = require('@mojaloop/central-services-logger')
const { getPRTitle } = require('./lib')


async function main(config) {
  const PULL_REQUEST_URL = config.PULL_REQUEST_URL
  if (!PULL_REQUEST_URL) {
    if (config.FAIL_SILENTLY_WHEN_MISSING_CIRCLE_PULL_REQUEST) {
      Logger.info('No `CIRCLE_PULL_REQUEST` variable found')
      Logger.info('No PR is associated with this build. Failing silently as `FAIL_SILENTLY_WHEN_MISSING_CIRCLE_PULL_REQUEST` is `true`')
      return
    }
    Logger.error('No `CIRCLE_PULL_REQUEST` variable found')
    throw new Error(`No PR is associated with this build.`)
  }

  Logger.info(`prUrl is: ${PULL_REQUEST_URL}`)

  // e.g. https://github.com/mojaloop/ml-operator/pull/7
  const [pullNumber, _, repo, owner] = PULL_REQUEST_URL.split('/').reverse().slice(0, 4)
  const title = await getPRTitle(owner, repo, pullNumber)
  Logger.info(`PR title is: ${title}`)
  const loadedRules = await load({
    extends: [ '@commitlint/config-conventional' ], 
    rules: conventional.rules
  })
  // console.log('loadedRules', loadedRules)
  // console.log('conventional.rules', conventional.rules)
  const lintResult = await lint(title, loadedRules.rules)
  Logger.debug(`lintResult title is: ${lintResult}`)
  const output = format(
    {
      valid: lintResult.valid,
      errorCount: lintResult.errors.length,
      warningCount: lintResult.warnings.length,
      results: [lintResult]
    },
    {
      color: true,
      helpUrl: config.GET_HELP_URL
    }
  );

  process.stdout.write(output);
  if (!lintResult.valid) {
    throw new Error(`PR title: '${title}' is invalid.`)
  }

  Logger.info('PR Title is valid')
}

module.exports = {
  main
}