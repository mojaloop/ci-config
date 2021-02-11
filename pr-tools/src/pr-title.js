#!/usr/bin/env node

const { Octokit } = require("@octokit/rest");
const lint  = require('@commitlint/lint').default
const format = require('@commitlint/format').default
const conventional = require('@commitlint/config-conventional')
const Logger = require('@mojaloop/central-services-logger')

const { config } = require('./config')

const octokit = new Octokit({})

async function main() {
  const PULL_REQUEST_URL = config.PULL_REQUEST_URL
  if (!PULL_REQUEST_URL && config.FAIL_SILENTLY_WHEN_MISSING_CIRCLE_PULL_REQUEST) {
    Logger.info('No `CIRCLE_PULL_REQUEST` variable found')
    Logger.info('No PR is associated with this build. Failing silently.')
    process.exit(0)
  }

  Logger.info(`prUrl is: ${PULL_REQUEST_URL}`)

  // e.g. https://github.com/mojaloop/ml-operator/pull/7
  const [pull_number, _, repo, owner] = PULL_REQUEST_URL.split('/').reverse().slice(0, 4)
  const result = await octokit.pulls.get({
    owner,
    repo,
    pull_number,
  });

  const title = result.data.title
  Logger.info(`PR title is: ${title}`)
  const lintResult = await lint(title, conventional.rules)
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
    }
  );

  process.stdout.write(output);
  if (!lintResult.valid) {
    process.exit(1)
  }

  Logger.info('PR Title is valid')
}

main()
  .catch(err => {
    console.log('Error', err)
    process.exit(1)
  })

module.exports = {
  main
}