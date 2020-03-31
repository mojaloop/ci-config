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


### Debugging container scans:

Still getting this issue

```
Error: Policy bundle null not found in DB
HTTP Code: 404
Detail: {'error_codes': []}


Unable to activate policy bundle - /anchore-engine/policy.json -- using default policy bundle.

```


So it looks like this issue is with the actual inline image itself...
Let's see if we can hack it 