# CI-Config

CI-Config is a repo for shared CI/CD config for the Mojaloop Project.

To begin with, this will host CircleCI orbs we author and publish, but this could expand to other shared config in the future

## CircleCI Orb: mojaloop-deployment

[todo: instructions for publishing]

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