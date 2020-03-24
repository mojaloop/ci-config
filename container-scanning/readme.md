# Container-Scanning

Reference guide for using the shared container-scanning tools. These tools are intended to be used as a part of the CI/CD process, along with the anchore-cli image scanning.

## Export the mojaloop policy

Instead of storing a static `.json` file in this repo, we have a `.js` file which will dynamically generate a new policy `.json` file which `anchore-cli` can understand. The primary reason for this is so we can include comments on the complicated policy file which will evolve over time.

```bash
./mojaloop-policy-generator.js mojaloop-policy.json
```

## Run the Result Diff tool

`anchore-result-diff.js` is a tool for comparing the anchore issues found between a *base image* and a *derived image* (an image that is based on the base image). For example, in Mojaloop, a base image might be `node:12.16.1-alpine`, and a derived image `central-ledger:v9.2.2`

The result diff tool compares the anchore results for the two fails if: **there are issues found in the derived image that aren't found in the base image**. These issues must also have an "action" of *stop*.

You can use the example files in this directory to test out the Result Diff tool:
```bash
./anchore-result-diff.js example-base-result.json example-derived-result.json
```

Will produce an output similar to the following:
```
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

## Testing Locally

You can also test these tools locally along with Anchore engine. 
This setup uses a locally installed `anchorecli` along with the docker version of anchore engine.

> ***Note**You must have `docker`, `docker-compose` and `pip` installed to get this working.*

### Scratch setup for playing around with anchore image scanning

```bash
pip install --user anchorecli

docker pull docker.io/anchore/anchore-engine:latest
docker create --name ae docker.io/anchore/anchore-engine:latest
docker cp ae:/docker-compose.yaml ./docker-compose.yaml
docker rm ae

docker-compose pull
docker-compose up -d

docker-compose ps
```


### Run on a given image
```bash
export IMAGE=node:12.16.0-alpine
export ANCHORE_CLI_USER=admin
export ANCHORE_CLI_PASS=foobar

anchore-cli image add ${IMAGE}
anchore-cli image wait ${IMAGE}
anchore-cli image list
anchore-cli image get ${IMAGE}
anchore-cli --json image vuln ${IMAGE} all > ${IMAGE//\//_}-vuln.json
anchore-cli --json evaluate check ${IMAGE} --detail > ${IMAGE//\//_}-eval.json
```

### Configuring policies

Anchore-cli uses a policy-based approach to analyzing images (hence the `mojaloop-policy-generator` in this directory). It comes bundled with some default policies, but you can also add your own.

```bash
./mojaloop-policy-generator.js /tmp/mojaloop-policy-bundle.json
anchore-cli policy add /tmp/mojaloop-policy-bundle.json
anchore-cli policy activate mojaloop-policy
```


## CI Evaluation Pseudocode
```bash
# TODO clone mojaloop/ci-config to /tmp/ci-config
# TODO copy the daily base image eval file to /tmp/node:12.16.0-alpine-eval.json

# Generate the anchore policy document
./mojaloop-policy-generator.js /tmp/mojaloop-policy-bundle.json
anchore-cli policy add /tmp/mojaloop-policy-bundle.json
anchore-cli policy activate mojaloop-policy


# TODO: run the image scan, result with a file called ${CIRCLE_REPO...}-eval.json

# Compare the 2 eval files. If there are issues in the derived, but not the base, then we have a problem
./anchore-result-diff.js /tmp/node:12.16.0-alpine-eval.json ${CIRCLE_REPO...}-eval.json

# TODO: if failed (regardless of the anchore-result-diff results) stop the build, alert on slack!

anchore-cli policy activate anchore_cis_1.13.0_base
anchore-cli policy del mojaloop-policy

```