#!/usr/bin/env node

/**
 * anchore-result-diff is a tool for diffing the evaluated results from 2 anchore image scans.
 * This is useful for comparing a base image's vulnerabilities vs. a derived image's vulnerabilities
 * It helps answer the question: 'Did I add anything in my Dockerfile that compromised this image?'
 *
 * Usage:
 *  ./anchore-result-diff.js <base-image-results.json> <derived-image-results.json>
 */


const fs = require('fs')
const util = require('util')


/**
 * @function getRowsAndFormat
 * @param {string} fileName - The path of the file to inspect
 * @returns {Object} rowsAndFormat
 * @returns {Array<string>} rowsAndFormat.rowFormat - The format of the following rows. 
 *   Use to ensure the files we compare are of the same format
 * @returns {Array<Array<string>>} rowsAndFormat.rows - A list of csv rows that conform 
 *   to rowFormat, describing the vulnerabilities
 */
function getRowsAndFormat(fileName) {
  const baseFile = fs.readFileSync(fileName)
  const base = JSON.parse(baseFile.toString())

  // This assumes only one image and digest, should be fine for now
  const imageDigest = Object.keys(getOrError(base, [0]))[0]
  const fullImageName = Object.keys(getOrError(base, [0, imageDigest]))[0]

  const anchoreImageId = getOrError(base, [0, imageDigest, fullImageName, 0, 'detail', 'result', 'image_id'])
  const baseRows = getOrError(base, [0, imageDigest, fullImageName, 0, 'detail', 'result', 'result', anchoreImageId])
  const rowFormat = getOrError(baseRows, ['result', 'header'])
  const rows = getOrError(baseRows, ['result', 'rows'])

  return {
    rowFormat,
    rows
  }
}

function main() {
  if (process.argv.length !== 4) {
    console.warn('Usage: ./anchore-result-diff.js <base-image-results.json> <derived-image-results.json>')
    process.exit(1)
  }

  const baseRowsAndFormat = getRowsAndFormat(process.argv[2])
  const baseFormat = baseRowsAndFormat.rowFormat
  const baseRows = baseRowsAndFormat.rows

  const derivedRowsAndFormat = getRowsAndFormat(process.argv[3])
  const derivedFormat = derivedRowsAndFormat.rowFormat
  const derivedRows = derivedRowsAndFormat.rows
  
  // Get the image format, and ensure it is consistent between files
  if (!arrayEquals(baseFormat, derivedFormat)) {
    console.error(`2 result formats don't match. Check the output and try again.`)
    process.exit(1)
    return;
  }

  const checkOutputIndex = baseFormat.indexOf('Check_Output')
  const triggerIdIndex = baseFormat.indexOf('Trigger_Id')
  const gateActionIndex = baseFormat.indexOf('Gate_Action')

  // Find the rows present in the derived image that aren't in the base image
  const derivedRemainingRows = arraySubtract(derivedRows, baseRows, (row) => `${row[triggerIdIndex]}`)

  //Print out the difference //TODO: format as json if --json is in params?
  console.log(JSON.stringify({
    header: derivedFormat,
    rows: derivedRemainingRows
  }, null, 2))

  //Exit with an error if: 
  //  - There are 1 or more than 0 rows in the derivedRemainingRows that have a "stop" action

  const stopCount = derivedRemainingRows.reduce((acc, curr) => (curr[gateActionIndex].toLowerCase() === 'stop') ? acc + 1 : acc , 0)
  if (stopCount > 0) {
    console.error(`Found ${stopCount} rows present in derived image with "STOP" direction. Exiting with error status.`)
    process.exit(1)
  }

  process.exit(0)
}

main();


/* Util Functions */

function arrayEquals(arr1, arr2) {
  if (arr1.length == arr2.length && arr1.every((v) => arr2.indexOf(v) >= 0)) {
    return true
  }

  return false
}

/**
 * @function get
 * @param {any} obj - The object to get from
 * @param {Array<any>} path - An array of numbers or strings to follow
 */
function get(obj, path) {
  return path.reduce((xs, x) => (xs && xs[x]) ? xs[x] : undefined, obj)
}

function getOrError(obj, path) {
  const unsafeResult = get(obj, path)
  if (unsafeResult === undefined) {
    throw new Error(`Could not find ${path} on given object: ${util.inspect(obj)}`)
  }

  return unsafeResult;
}


/**
 * @function arraySubtract
 * @description
 *   Find the LEFT difference between 2 arrays
 * 
 *   If value is found in both arrays, it will be removed.
 *   If a value is found in arr1 (left), it will be returned
 *   If a value is in arr2, but not arr 1 it will be _ignored_
 * 
 * @example:
 *  arraySubtract([1, 2, 3, 4, 5], [1, 3, 5, 6], (row) => row)
 *  returns: [2, 4]
 */
function arraySubtract(arr1, arr2, uniqueAccessorFunc) {
  const finalArray = []

  const arr1Dict = {}
  arr1.forEach(row => {
    const key = uniqueAccessorFunc(row)
    arr1Dict[key] = row
  })

  const arr2Dict = {}
  arr2.forEach(row => {
    const key = uniqueAccessorFunc(row)
    arr2Dict[key] = row
  })

  Object.keys(arr1Dict).forEach(key => {
    //if not found in arr2, then it is the difference!
    if (!arr2Dict[key]) {
      finalArray.push(arr1Dict[key])
    }
  })

  return finalArray
}