#!/usr/bin/env node

const { main } = require('./pr-title')
const { config } = require('./config')

// TODO: proper cli - this is fine for now


main(config)
  .catch(err => {
    console.log('Error', err)
    process.exit(1)
  })