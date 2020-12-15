#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

circleci orb validate ./orb.yaml
version=`cat ./version`
circleci orb publish ./orb.yaml mojaloop/deployment@${version}