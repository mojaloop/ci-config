# CI-Config

CI-Config is a repo for shared CI/CD config for the Mojaloop Project.

To begin with, this will host CircleCI orbs we author and publish, but this could expand to other shared config in the future

## CircleCI Orb: mojaloop-deployment

CirlceCI orbs are a way to share common config between CircleCI environment. In Mojaloop we use both external orbs in `anchore-cli` and this internally developed orb, `mojaloop-deployment`

download your access token etc: https://circleci.com/docs/2.0/local-cli/#configuring-the-cli
```bash
# setup your env
circleci setup

# validate the orb
circleci orb validate deployment/orb.yaml

# publish a new version - make sure to increment the version in ./deveopment/version
version=`cat ./deployment/version`
circleci orb publish ./deployment/orb.yaml mojaloop/deployment@${version}
```

### Initial setup notes (this should only be done once)

```bash 
circleci namespace create mojaloop github mojaloop #this can only be done once per org
circleci orb create mojaloop/deployment
```


## Container Scanning

We use anchore-cli for scanning our docker containers. Under `./container-scanning/` we have a bunch of scripts and config files which help us to evaluate the container scan output and automatically pass or fail our CI/CD pipelines accordingly.


### Running Container Scans Locally 
>Useful for debugging issues with the container scan, or updating the policy file


#### Setup

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

#### Scanning

```bash
export ANCHORE_CLI_USER=admin
export ANCHORE_CLI_PASS=foobar
# export IMAGE="node:12.16.0-alpine"
# export IMAGE="mojaloop/quoting-service:latest"
export IMAGE="ldaly/quoting-service:latest"
export POLICY_BUNDLE="test-policy.json"
export POLICY_NAME="mojaloop-default"
# IMAGE="${IMAGE:-node:12.16.0-alpine}"

cd ./container-scanning
./mojaloop-policy-generator.js test-policy.json

# This step will fail here if your policy file is invalid
anchore-cli policy add $POLICY_BUNDLE && anchore-cli policy activate $POLICY_NAME

anchore-cli image add $IMAGE && anchore-cli image wait $IMAGE
anchore-cli image list
anchore-cli image get $IMAGE
anchore-cli --json image vuln $IMAGE all > ${RESULT_DIR}${IMAGE//\//_}-vuln.json
anchore-cli --json evaluate check $IMAGE --detail > ${IMAGE//\//_}-eval.json
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


