#!/usr/bin/env bash

set -eo pipefail
set -o nounset

########################
### GLOBAL VARIABLES ###
########################
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ANCHORE_URL="http://localhost:8228"
INLINE_SCAN_IMAGE="${INLINE_SCAN_IMAGE:-docker.io/anchore/inline-scan:v0.6.1}"
DOCKER_NAME="inline-anchore-engine"

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

CREATE_CMD=()
RUN_CMD=()
COPY_CMDS=()
DOCKER_ID=""



main() {
  mkdir -p ${WORKING_DIR}
  cd ${WORKING_DIR}
  mkdir -p ${RESULT_DIR}
  
  prepare_inline_container
  docker ps -a

  CREATE_CMD+=('scan')
  RUN_CMD+=('scan')
  start_vuln_scan


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

start_vuln_scan() {
    # if [[ "${f_flag}" ]]; then
    #     CREATE_CMD+=('-f')
    #     RUN_CMD+=('-f')
    # fi
    # if [[ "${r_flag}" ]]; then
    #     CREATE_CMD+=('-r')
    #     RUN_CMD+=('-r')
    # fi

    # If no files need to be copied to container, pipe docker save output to stdin of docker run command.
    # if [[ ! "${d_flag}" ]] && [[ ! "${b_flag}" ]] && [[ "${#SCAN_IMAGES[@]}" -eq 1 ]]; then
    #     RUN_CMD+=('-i "${SCAN_IMAGES[*]}"')

    #     # If image is passed without a tag, append :latest to docker save to prevent skopeo manifest error
    #     if [[ ! "${SCAN_IMAGES[*]}" =~ [:]+ ]]; then
    #         docker save "${SCAN_IMAGES[*]}:latest" | eval "${RUN_CMD[*]}"
    #     else
    #         docker save "${SCAN_IMAGES[*]}" | eval "${RUN_CMD[*]}"
    #     fi
    # else
        # Prepare commands for container creation & copying all files to container.
    # if [[ "${b_flag}" ]]; then
    CREATE_CMD+=('-b "${POLICY_BUNDLE}"')
    COPY_CMDS+=('docker cp "${POLICY_BUNDLE}" "${DOCKER_NAME}:/anchore-engine/$(basename ${POLICY_BUNDLE})";')
    # fi

    # if [[ "${d_flag}" ]] && [[ "${#SCAN_IMAGES[@]}" -eq 1 ]]; then
    #     CREATE_CMD+=('-d "${DOCKERFILE}" -i "${SCAN_IMAGES[*]}"')
    #     COPY_CMDS+=('docker cp "${DOCKERFILE}" "${DOCKER_NAME}:/anchore-engine/$(basename ${DOCKERFILE})";')
    # fi

    DOCKER_ID=$(eval "${CREATE_CMD[*]}")
    eval "${COPY_CMDS[*]}"
    save_and_copy_images
    echo
    docker start -ia "${DOCKER_NAME}"
    # fi
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