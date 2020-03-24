# Base Image Scans

This folder contains the necessary CircleCI config to set up cron jobs for regular anchore-cli image scans on our base images.

Currently, the images we scan are:

- node:12.16.0-alpine
- node:12.16.1-alpine

And the resulting files are added to the relevant s3 folder [todo]

## Adding other images

