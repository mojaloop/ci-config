# [DRAFT] Base Image Scans

> Note: this work is incomplete. It was originally going to be carried out in [#1233](https://github.com/mojaloop/project/issues/1223), but we found another way to get this running without requiring pre-caching the container scan results.
>
> We should still come back and revist this however, and focus more on providing daily or weekly container scans to the base images so we can be assured they are free from vulnerabilities


This folder contains the necessary CircleCI config to set up cron jobs for regular anchore-cli image scans on our base images.

Currently, the images we scan are:

- node:12.16.0-alpine
- node:12.16.1-alpine

And the resulting files are added to the relevant s3 folder [todo]

## Adding other images



