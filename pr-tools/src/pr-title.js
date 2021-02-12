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
  Logger.info(`PR title is: ${JSON.stringify(title)}`)

  // hack - for 0.1.9 backwards compatibility
  let loadedRules
  let options = {}
  try {
    loadedRules = await load({
      extends: ['@commitlint/config-conventional' ], 
      rules: conventional.rules
    })
    options = {
      parserOpts: loadedRules.parserPreset.parserOpts
    }
  } catch (err) {
    console.log('loaded rules error:', err)
    // fallback to not handling breaking change syntax
    // this is because 0.1.9 modules are installed funnily
    loadedRules = await load({
      rules: conventional.rules
    })
  }

  const lintResult = await lint(title, loadedRules.rules, options)
  
  Logger.debug(`loaded rules are: ${JSON.stringify(loadedRules, null, 2)}`)
  Logger.debug(`lintResult title is: ${JSON.stringify(lintResult, null, 2)}`)

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