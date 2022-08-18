'use strict'

//----------------
// Includes: Self
//----------------
const functions = require('../functions.js')

//----------
// Includes
//----------
const path = require('path')

//---------
// Aliases
//---------
const flowThrow = functions.flowThrow
const log       = functions.log

//-----------
// Functions
//-----------
async function flowFilePath(obj, next) {
    /*
    Convert a URL to a file path and extension.

    @param   {Object}    obj   Reusable object created by the "flow.control" function.
    @param   {Function}  next  Function that must be called in order for other flow functions to proceed.
    @return  {Promise}
    */

    if (functions.responseTakenCareOf(obj.response)) {
        // this response has already been taken care of
    } else {
        const option = obj.host.option

        obj.share.filePath = path.join(option.sitePath, obj.share.url)

        log('flowFilePath -> obj.share.filePath = ' + obj.share.filePath)

        if (obj.share.filePath.substr(0, option.sitePath.length) === option.sitePath) {
            // good, no path shenanigans have taken place

            obj.share.fileExt = path.extname(obj.share.filePath).replace('.', '').toLowerCase()

            log('flowFilePath -> obj.share.fileExt = ' + obj.share.fileExt)
        } else {
            flowThrow(404, 'File not found.')
        } // if
    } // if

    await next()
} // flowFilePath

//---------
// Exports
//---------
module.exports = flowFilePath