#!/usr/bin/env node

console.log("WARNING: this method of running pr-tools is deprecated")
console.log("please update your orb to the latest version")


const { main } = require('./src/pr-title')
const { config } = require('./src/config')

// TODO: proper cli - this is fine for now


main(config)
  .catch(err => {
    console.log('Error', err)
    process.exit(1)
  })
