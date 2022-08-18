'use strict'

//----------------
// Includes: Self
//----------------
const functions = require('../functions.js')

//----------
// Includes
//----------
const path = require('path')
const url  = require('url')

//---------
// Aliases
//---------
const flowThrow = functions.flowThrow
const log       = functions.log

//-----------
// Functions
//-----------
async function flowDirectLink(obj, next) {
    /*
    Allow or disallow direct links.

    @param   {Object}    obj   Reusable object created by the "flow.control" function.
    @param   {Function}  next  Function that must be called in order for other flow functions to proceed.
    @return  {Promise}
    */

    if (functions.responseTakenCareOf(obj.response)) {
        // this response has already been taken care of
    } else {
        const option = obj.host.option

        if (option.directLink.allow === true) {
            // do nothing
        } else {
            // direct links are not allowed so check other direct link options

            let allowLink = false

            // allow domains
            if (allowLink === false) {
                let referer = obj.request.headers['referer'] || ''
                referer = url.parse(referer).host || ''

                if (referer === '') {
                    log('flowDirectLink -> no referer')
                } else {
                    log('flowDirectLink -> referer = \'' + referer + '\'')
                } // if

                if (option.domains.includes(referer) || option.directLink.allowDomain.includes(referer)) {
                    // our own domain or allowed domains
                    log('flowDirectLink -> allow domain', referer)
                    allowLink = true
                } // if
            } // if

            // allow folders
            if (allowLink === false) {
                let checkFolder = path.dirname(obj.share.filePath)

                // relative path
                checkFolder = checkFolder.replace(option.sitePath, '')

                // trim leading slash, if any
                checkFolder = (checkFolder[0] === '/') ? checkFolder.slice(1) : checkFolder

                const matches = option.directLink.allowFolders.filter(function(folder) {
                    if (folder === '' || checkFolder === '') {
                        // only allow the root folder if both variables are empty
                        return folder === checkFolder
                    } else {
                        return checkFolder.indexOf(folder) === 0
                    } // if
                }) // filter

                if (matches.length) {
                    log('flowDirectLink -> allow folder', checkFolder)
                    allowLink = true
                } // if
            } // if

            // allow file extensions
            if (allowLink === false) {
                if (option.directLink.allowFileExt.includes(obj.share.fileExt)) {
                    log('flowDirectLink -> allow file extension', obj.share.fileExt)
                    allowLink = true
                } // if
            } // if

            // allow files
            if (allowLink === false) {
                let filePathRelative = obj.share.filePath.replace(option.sitePath, '')

                // trim leading slash, if any
                filePathRelative = (filePathRelative[0] === '/') ? filePathRelative.slice(1) : filePathRelative

                if (option.directLink.allowFiles.includes(filePathRelative)) {
                    log('flowDirectLink -> allow file')
                    allowLink = true
                } // if
            } // if

            if (allowLink === false) {
                flowThrow(403, 'Direct linking is not allowed to this resource.')
            } // if
        } // if
    } // if

    await next()
} // flowDirectLink

//---------
// Exports
//---------
module.exports = flowDirectLink