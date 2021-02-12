#!/usr/bin/env node

console.log("WARNING: this method of running pr-tools is deprecated")
console.log("please update your orb to a newer version")


const { main } = require('./src/pr-title')
const { config } = require('./src/config')

main(config)
  .catch(err => {
    console.log('Error', err)
    process.exit(1)
  })
