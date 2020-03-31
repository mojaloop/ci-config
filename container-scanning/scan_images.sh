#!/usr/bin/env bash

set -eo pipefail
# set -o nounset

########################
### GLOBAL VARIABLES ###
########################
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ANCHORE_URL="http://localhost:8228"
# TODO: this is really hacky and lazy naming
INLINE_SCAN_IMAGE="${INLINE_SCAN_IMAGE:-anchore/inline-scan:v0.6.1}"
FULL_INLINE_SCAN_IMAGE="${FULL_INLINE_SCAN_IMAGE:-docker.io/anchore/inline-scan:v0.6.1}"
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
IMAGE_NAMES=()
SCAN_IMAGES=()
FAILED_IMAGES=()


main() {
    mkdir -p ${WORKING_DIR}
    cd ${WORKING_DIR}
    mkdir -p ${RESULT_DIR}
    
    get_and_validate_images "$@"
    prepare_inline_container
    
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
    # remove existing container if exists
    docker rm -f "${DOCKER_NAME}"

    IMAGE_EXISTS=$(docker images "${INLINE_SCAN_IMAGE}" --format '{{.ID}}: {{.Repository}}' 2> /dev/null)

    if [ -z "$IMAGE_EXISTS" ]; then
        docker pull "${INLINE_SCAN_IMAGE}"
    fi
    
    # setup command arrays to eval & run after adding all required options
    CREATE_CMD=('docker create --name "${DOCKER_NAME}"')
    RUN_CMD=('docker run -i --name "${DOCKER_NAME}"')

    # TODO: add timeout or other features?

    CREATE_CMD+=('"${INLINE_SCAN_IMAGE}"')
    RUN_CMD+=('"${INLINE_SCAN_IMAGE}"')
}

start_vuln_scan() {
    echo 'starting vuln scan'
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
    
    echo "CREATE_CMD: ${CREATE_CMD}"
    echo "COPY_CMDS: ${COPY_CMDS}"
    DOCKER_ID=$(eval "${CREATE_CMD[*]}")
    eval "${COPY_CMDS[*]}"
    save_and_copy_images

    echo 'starting image'
    docker start -ia "${DOCKER_NAME}"
    # fi
}

get_and_validate_images() {
    # Add all unique positional input params to IMAGE_NAMES array
    for i in $@; do
        if [[ ! "${IMAGE_NAMES[@]}" =~ "$i" ]]; then
            IMAGE_NAMES+=("$i")
        fi
    done
    
    # Make sure all images are available locally, add to FAILED_IMAGES array if not
    for i in "${IMAGE_NAMES[@]}"; do
        if ([[ "${p_flag}" == true ]] && [[ "${VULN_SCAN}" == true ]]) || [[ "${P_flag}" == true ]]; then
            echo "Pulling image -- $i"
            docker pull $i || true
        fi
        
        docker inspect "$i" &> /dev/null || FAILED_IMAGES+=("$i")
        
        if [[ ! "${FAILED_IMAGES[@]}" =~ "$i" ]]; then
            SCAN_IMAGES+=("$i")
        fi
    done
    
    # Give error message on any invalid image names
    if [[ "${#FAILED_IMAGES[@]}" -gt 0 ]]; then
        printf '\n%s\n\n' "WARNING - Please pull remote image, or build/tag all local images before attempting analysis again" >&2
        
        if [[ "${#FAILED_IMAGES[@]}" -ge "${#IMAGE_NAMES[@]}" ]]; then
            printf '\n\t%s\n\n' "ERROR - no local docker images specified in script input: ${0##*/} ${IMAGE_NAMES[*]}" >&2
            display_usage >&2
            exit 1
        fi
        
        for i in "${FAILED_IMAGES[@]}"; do
            printf '\t%s\n' "Could not find image locally -- $i" >&2
        done
    fi
    
    echo "Images are: ${IMAGE_NAMES}"
}


save_and_copy_images() {
    echo 'save_and_copy_images'

    # Save all image files to /tmp and copy to created container
    for image in "${SCAN_IMAGES[@]}"; do
        local base_image_name="${image##*/}"
        echo "Saving ${image} for local analysis"
        local save_file_name="${base_image_name}.tar"
        # IMAGE_FILES is used for storing temp image paths for cleanup at end of script
        IMAGE_FILES+=("$save_file_name")
        
        mkdir -p /tmp/anchore
        local save_file_path="/tmp/anchore/${save_file_name}"
        
        # If image is passed without a tag, append :latest to docker save to prevent skopeo manifest error
        if [[ ! "${image}" =~ [:]+ ]]; then
            docker save "${image}:latest" -o "${save_file_path}"
        else
            docker save "${image}" -o "${save_file_path}"
        fi
        
        if [[ -f "${save_file_path}" ]]; then
            chmod +r "${save_file_path}"
            printf '%s' "Successfully prepared image archive -- ${save_file_path}"
        else
            printf '\n\t%s\n\n' "ERROR - unable to save docker image to ${save_file_path}." >&2
            display_usage >&2
            exit 1
        fi
        
        docker cp "${save_file_path}" "${DOCKER_NAME}:/anchore-engine/${save_file_name}"
        rm -f "${save_file_path}"
    done
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