#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

circleci orb validate deployment/orb.yaml
version=`cat ./deployment/version`
circleci orb publish ./deployment/orb.yaml mojaloop/deployment@${version}