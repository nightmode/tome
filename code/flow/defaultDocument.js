'use strict'

//----------------
// Includes: Self
//----------------
const functions = require('../functions.js')

//---------
// Aliases
//---------
const log = functions.log

//-----------
// Functions
//-----------
async function flowDefaultDocument(obj, next) {
    /*
    Figure out if the requested URL needs to have a default document appended to it.
    For example, "/" would become "/index.html".

    @param   {Object}    obj   Reusable object created by the "flow.control" function.
    @param   {Function}  next  Function that must be called in order for other flow functions to proceed.
    @return  {Promise}
    */

    if (functions.responseTakenCareOf(obj.response)) {
        // this response has already been taken care of
    } else {
        const option = obj.host.option
        const lastPiece = obj.share.url.split('/').slice(-1)[0]

        if (lastPiece === '' || lastPiece.indexOf('.') < 0) {
            // append the default document
            if (obj.share.url.substr(-1, 1) === '/') {
                obj.share.url += option.defaultDocument // "index.html" by default
            } else {
                obj.share.url += '/' + option.defaultDocument
            } // if

            log('flowDefaultDocument -> obj.share.url = ' + obj.share.url)
        } // if
    } // if

    await next()
} // flowDefaultDocument

//---------
// Exports
//---------
module.exports = flowDefaultDocument