#!/usr/bin/env bash

set -eo pipefail
set -o nounset

########################
### GLOBAL VARIABLES ###
########################
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ANCHORE_URL="http://localhost:8228"
# ANCHORE_USER="admin"
# ANCHORE_PASS="foobar"
# TODO: allow for scanning multiple images?
IMAGE="${IMAGE:-node:12.16.0-alpine}"
ANCHORE_CLI_USER=admin
ANCHORE_CLI_PASS=foobar
RESULT_DIR="${RESULT_DIR:-/tmp/anchore_results/}"
POLICY_BUNDLE="${POLICY_BUNDLE:-./policy_bundle.json}"
POLICY_NAME="${POLICY_NAME:-default_policy}"


### Testing out as a replacement to the broken Anchore CLI Orb

#TODO: check and install:
# pip, docker-compose

pip install --user anchorecli


# Start Anchore Engine with docker-compose
docker pull docker.io/anchore/anchore-engine:latest
docker create --name ae docker.io/anchore/anchore-engine:latest
docker cp ae:/docker-compose.yaml ./docker-compose.yaml
docker rm ae

docker-compose pull
docker-compose up
docker-compose ps

mkdir -p ${RESULT_DIR}

## Configure Anchore Policies
anchore-cli policy add ${POLICY_BUNDLE}
anchore-cli policy activate ${POLICY_NAME}

## Run the scan(s)
anchore-cli image add ${IMAGE}
anchore-cli image wait ${IMAGE}
anchore-cli image list
anchore-cli image get ${IMAGE}
anchore-cli --json image vuln ${IMAGE} all > ${RESULT_DIR}${IMAGE//\//_}-vuln.json
anchore-cli --json evaluate check ${IMAGE} --detail > ${RESULT_DIR}${IMAGE//\//_}-eval.json

## Cleanup
docker-compose rm -f