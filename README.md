# CI-Config

CI-Config is a repo for shared CI/CD config for the Mojaloop Project.

To begin with, this will host CircleCI orbs we author and publish, but this could expand to other shared config in the future

## CircleCI Orbs: 

CirlceCI orbs are a way to share common config between CircleCI environment. In this repo, we author and maintain the shared orbs for the Mojaloop project.

### `mojaloop/pr-tools`

pr-tools is a common set of utilities for checking PRs in the mojaloop community.

- `pr-tools/pr-title-check`: Check the title of the pull request. Fails if the title doesn't conform to the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) spec


#### Examples:

This example adds a `pr-title-check` step in the build's jobs. If the build is not a consequence of a Pull request (e.g. a `tag` or `master` branch build), the `CIRCLE_PULL_REQUEST` and `CIRCLE_PULL_REQUESTS` environment variables will not be set by CircleCI, and this step will fail silently.

```yaml
version: 2.1

orbs:
  pr-tools: mojaloop/pr-tools@0.1.9

workflows:
  version: 2.1
  build_and_test:
    jobs:
      - pr-tools/pr-title-check:
          context: org-global
```


### `mojaloop/deployment` [DEPRECATED]

`mojaloop/deployment` is an orb for automating common deployment functions. It was developed as a POC and is no longer maintained, since we are working on better approaches to deploying updated images to our dev environments. 


In Mojaloop we use both external orbs and this internally developed orb, `mojaloop-deployment`

download your access token etc: https://circleci.com/docs/2.0/local-cli/#configuring-the-cli
```bash
# setup your env
circleci setup

# update the version in ./development/version
vi ./development/version

# publish the updated orbs
./_publish.sh
```

### Initial setup notes (this should only be done once)

```bash 
circleci namespace create mojaloop github mojaloop #this can only be done once per org
circleci orb create mojaloop/deployment
circleci orb create mojaloop/pr-tools
```

### Publishing the orbs:

```bash
# download your access token etc: https://circleci.com/docs/2.0/local-cli/#configuring-the-cli
# setup your env
circleci setup

cd development

# update the version in ./development/version
vi ./version

# publish the updated orbs
./_publish.sh

cd ../pr-tools

# pr-tools is a node-js based orb, so we manage the version number in package.json
vi package.json
./_publish
```

## Container Scanning

We use anchore-cli for scanning our docker containers. Under `./container-scanning/` we scripts and config files which help us to evaluate the container scan output and automatically pass or fail our CI/CD pipelines accordingly.

These tools are intended to be used as a part of the CI/CD process, along with the anchore-cli image scanning.

## Mojaloop Policy exporter

Instead of storing a static `.json` file in this repo, we have a `.js` file which will dynamically generate a new policy `.json` file which `anchore-cli` can understand. The primary reason for this is so we can include comments on the complicated policy file which will evolve over time.

```bash
./mojaloop-policy-generator.js mojaloop-policy.json
```

## Anchore Result Diff

`anchore-result-diff.js` is a tool for comparing the anchore issues found between a *base image* and a *derived image* (an image that is based on the base image). For example, in Mojaloop, a base image might be `node:12.16.1-alpine`, and a derived image `central-ledger:v9.2.2`

The result diff tool compares the anchore results for the two fails if: **there are issues found in the derived image that aren't found in the base image**. These issues must also have an "action" of *stop*.

You can use the example files in this directory to test out the Result Diff tool:

```bash
./anchore-result-diff.js example-base-result.json example-derived-result.json
```

Will produce an output similar to the following:
```bash
$ ./anchore-result-diff.js example-base-result.json example-derived-result.json
{
  "header": [
    "Image_Id",
    "Repo_Tag",
    "Trigger_Id",
    "Gate",
    "Trigger",
    "Check_Output",
    "Gate_Action",
    "Whitelisted",
    "Policy_Id"
  ],
  "rows": [
    [
      "6f102056c09791caede44eefc0f630eac62a4a599482f39f840d8db121674dbb",
      "localhost:5000/account-lookup-service:v9.2.3",
      "deb3f1afb4ea0ddf587e6c62c341c6fa",
      "vulnerabilities",
      "stale_feed_data",
      "The vulnerability feed for this image distro is older than MAXAGE (2) days",
      "stop",
      false,
      "48e6f7d6-1765-11e8-b5f9-8b6f228548b6"
    ],
    ...
  ]
}
Found 1 rows present in derived image with "STOP" direction. Exiting with error status.
```

### Running Container Scans Locally 

You can also test these tools locally along with Anchore engine. 
This setup uses a locally installed `anchorecli` along with the docker version of anchore engine.

#### 0. Setup

Prerequisites:
- `docker`, `docker-compose`
- `pip`

```bash
pip install --user anchorecli

# install the anchore-cli docker-compose
docker pull docker.io/anchore/anchore-engine:latest
docker create --name ae docker.io/anchore/anchore-engine:latest
docker cp ae:/docker-compose.yaml ./docker-compose.yaml
docker rm ae

# Run. Note: this can take a while on the first run or after having destroyed the containers
docker-compose up
```

#### 1. Generating the and adding the policy
> This step alone is enough to verify that the policy created by the `./mojaloop-policy-generator.js` is valid.

```bash
export ANCHORE_CLI_USER=admin
export ANCHORE_CLI_PASS=foobar
# just an example image, you can pass in your own, such as `mojaloop/quoting-service:latest`
# note: this image MUST live in a docker registry somewhere, by default this is Docker Hub
export IMAGE="node:12.16.1-alpine"
export POLICY_BUNDLE="test-policy.json"
export POLICY_NAME="mojaloop-default"

cd ./container-scanning
# generate the mojaloop policy
./mojaloop-policy-generator.js test-policy.json

# This step will fail here if your policy file is invalid
anchore-cli policy add $POLICY_BUNDLE && anchore-cli policy activate $POLICY_NAME
```

#### 2. Scanning an Image
```bash
anchore-cli image add $IMAGE && anchore-cli image wait $IMAGE
anchore-cli image list
anchore-cli image get $IMAGE
anchore-cli --json image vuln $IMAGE all > ${RESULT_DIR}${IMAGE//\//_}-vuln.json
anchore-cli --json evaluate check $IMAGE --detail > ${IMAGE//\//_}-eval.json
```

From here you can open up the `*eval.json` file, and see the output to 


#### 3. Repeated Scanning with policy changes

Once you have an image added to anchore, you don't need to scan it again to run `anchore-cli evaluate`. Simply reload the policy file and go:

```bash
export ANCHORE_CLI_USER=admin
export ANCHORE_CLI_PASS=foobar
# just an example image, you can pass in your own, such as `mojaloop/quoting-service:latest`
# note: this image MUST live in a docker registry somewhere, by default this is Docker Hub
export IMAGE="node:12.16.0-alpine"
export POLICY_BUNDLE="test-policy.json"
export POLICY_NAME="mojaloop-default"

cd ./container-scanning
# generate the mojaloop policy
./mojaloop-policy-generator.js test-policy.json

# This step will fail here if your policy file is invalid
anchore-cli policy add $POLICY_BUNDLE && anchore-cli policy activate $POLICY_NAME
anchore-cli --json evaluate check $IMAGE --detail > ${IMAGE//\//_}-eval.json
```

#### 4. Testing the policy diff tool

For this step, we first have to scan 2 images, the BASE image and a DERIVED image. A DERIVED image is an image that is DERIVED from a given base image. 

For example, we can use a derived image of `mojaloop/quoting-service`, which as of `v9.4.0-snapshot` is based on `node:12.16.0-alpine`.

```bash
# Add the images and wait
anchore-cli image add "node:12.16.0-alpine" && anchore-cli image wait "node:12.16.0-alpine"
anchore-cli image add "mojaloop/quoting-service:v9.4.0-snapshot" && anchore-cli image wait "mojaloop/quoting-service:v9.4.0-snapshot"

# Add the images and wait
anchore-cli image list
anchore-cli --json evaluate check "node:12.16.0-alpine" --detail > base-eval.json
anchore-cli --json evaluate check "mojaloop/quoting-service:v9.4.0-snapshot" --detail > derived-eval.json


# Run the diff tool
cd ./container-scanning
./anchore-result-diff.js base-eval.json derived-eval.json
```


### Debugging container scans:

If you see an error similar to this in CircleCI:

```
Error: Policy bundle null not found in DB
HTTP Code: 404
Detail: {'error_codes': []}


Unable to activate policy bundle - /anchore-engine/policy.json -- using default policy bundle.
```

It likely means that the policy file is invalid. Use the steps above to ensure the policy file is valid before continuing.


