#!/usr/bin/env bash

set -eo pipefail
set -o nounset

########################
### GLOBAL VARIABLES ###
########################
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ANCHORE_URL="http://localhost:8228"
INLINE_SCAN_IMAGE="${INLINE_SCAN_IMAGE:-docker.io/anchore/inline-scan:v0.6.1}"

# ANCHORE_USER="admin"
# ANCHORE_PASS="foobar"
# TODO: allow for scanning multiple images?
IMAGE="${IMAGE:-node:12.16.0-alpine}"
ANCHORE_CLI_USER=admin
ANCHORE_CLI_PASS=foobar
RESULT_DIR="${RESULT_DIR:-/tmp/anchore_results/}"
POLICY_BUNDLE="${POLICY_BUNDLE:-./policy_bundle.json}"
POLICY_NAME="${POLICY_NAME:-default_policy}"
# WORKING_DIR="${WORKING_DIR:-/tmp/test-ci-config}"
WORKING_DIR="${WORKING_DIR:-/tmp/ci-config}"



main() {
  mkdir -p ${WORKING_DIR}
  cd ${WORKING_DIR}
  mkdir -p ${RESULT_DIR}
  
  prepare_inline_container

}


### Testing out as a replacement to the broken Anchore CLI Orb

#TODO: check and install:
# pip, docker-compose

# pip install --user anchorecli


# # Start Anchore Engine with docker-compose
# docker pull docker.io/anchore/anchore-engine:latest
# docker create --name ae docker.io/anchore/anchore-engine:latest
# docker cp ae:/docker-compose.yaml ./docker-compose.yaml
# docker rm ae


# Copied from anchore engine inline scanner
prepare_inline_container() {
    # Check if env var is overriding which inline-scan image to utilize.
    # if [[ -z "${ANCHORE_CI_IMAGE}" ]]; then
        # printf '\n%s\n' "Pulling ${INLINE_SCAN_IMAGE}"
        docker pull "${INLINE_SCAN_IMAGE}"
    # else
    #     printf '\n%s\n' "Using local image for scanning -- ${INLINE_SCAN_IMAGE}"
    # fi

    # setup command arrays to eval & run after adding all required options
    CREATE_CMD=('docker create --name "${DOCKER_NAME}"')
    RUN_CMD=('docker run -i --name "${DOCKER_NAME}"')

    # if [[ "${t_flag}" ]]; then
    #     CREATE_CMD+=('-e TIMEOUT="${TIMEOUT}"')
    #     RUN_CMD+=('-e TIMEOUT="${TIMEOUT}"')
    # fi
    # if [[ "${V_flag}" ]]; then
    #     CREATE_CMD+=('-e VERBOSE=true')
    #     RUN_CMD+=('-e VERBOSE=true')
    # fi

    CREATE_CMD+=('"${INLINE_SCAN_IMAGE}"')
    RUN_CMD+=('"${INLINE_SCAN_IMAGE}"')
}


# docker-compose pull
# docker-compose up -d
# # TODO: wait for docker-compose somehow?
# docker-compose ps


# ## Configure Anchore Policies
# anchore-cli policy add ${POLICY_BUNDLE}
# anchore-cli policy activate ${POLICY_NAME}

# ## Run the scan(s)
# anchore-cli image add ${IMAGE}
# anchore-cli image wait ${IMAGE}
# anchore-cli image list
# anchore-cli image get ${IMAGE}
# anchore-cli --json image vuln ${IMAGE} all > ${RESULT_DIR}${IMAGE//\//_}-vuln.json
# anchore-cli --json evaluate check ${IMAGE} --detail > ${RESULT_DIR}${IMAGE//\//_}-eval.json

# ## Cleanup
# docker-compose rm -f



main "$@"