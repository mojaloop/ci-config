const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({})

async function getPRTitle(owner, repo, pullNumber) {
  const result = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber
  });

  const title = result.data.title
  return title;
}

module.exports = {
  getPRTitle
}