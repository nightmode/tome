'use strict'

//----------------
// Includes: Self
//----------------
const functions = require('../functions.js')
const shared    = require('../shared.js')

//----------
// Includes
//----------
const path = require('path')
const url  = require('url')

//---------
// Aliases
//---------
const log = functions.log

//-----------
// Functions
//-----------
async function flowRedirect(obj, next) {
    /*
    Normalize and redirect requests, as needed.

    If certain options are set, redirect from HTTP to HTTPS.
    Redirect "www." sub domain requests to a non-prefixed version of the same domain.
    Enforce lowercase pathnames.
    Remove the default document from anywhere in the pathname.
    Remove trailing and/or duplicate slashes.
    Custom redirects.

    @param   {Object}    obj   Reusable object created by the "flow.control" function.
    @param   {Function}  next  Function that must be called in order for other flow functions to proceed.
    @return  {Promise}
    */

    if (functions.responseTakenCareOf(obj.response)) {
        // this response has already been taken care of
    } else {
        const urlFrom = url.parse('http' + (obj.request.connection.encrypted ? 's' : '') + '://' + obj.request.headers.host + obj.request.url)
        const urlTo   = url.parse('')

        urlTo.updated = false // set to true when updating a urlTo[...] property in order to trigger the redirect logic at the end of this function

        const option = obj.host.option

        if (option.https.enable) {
            if (option.https.require && obj.request.connection.encrypted === undefined) {
                // redirect to https
                urlTo.protocol = 'https:'

                if (shared.https.port !== 443) {
                    urlTo.port = shared.https.port
                } // if

                log('flowRedirect -> redirect to https')

                urlTo.updated = true
            } // if
        } // if

        if (urlFrom.hostname.indexOf('www.') === 0) {
            // Redirect "www." sub domain requests to a non-prefixed version of the same domain.
            urlTo.hostname = urlFrom.hostname.replace('www.', '')

            log('flowRedirect -> redirect away from www')

            urlTo.updated = true
        } // if

        if (urlFrom.pathname !== null) {
            let urlSource = urlFrom // will be a reference to urlFrom or urlTo depending on which one should be used as the source to update the urlTo object

            if (urlSource.pathname !== urlSource.pathname.toLowerCase()) {
                // enforce lowercase pathname

                urlTo.pathname = urlSource.pathname.toLowerCase()

                urlSource = urlTo

                log('flowRedirect -> enforce lowercase')

                urlTo.updated = true
            } // if

            if (urlSource.pathname.toLowerCase().indexOf(option.defaultDocument) >= 1) {
                // remove the default document from anywhere in the pathname

                urlTo.pathname = urlSource.pathname.replace(new RegExp(option.defaultDocument, 'g'), '')

                urlSource = urlTo

                log('flowRedirect -> hide default document')

                urlTo.updated = true
            } // if

            if (urlSource.pathname.length > 1) {
                if (urlSource.pathname.indexOf('//') >= 1 || urlSource.pathname.slice(-1) === '/') {
                    // remove trailing and/or duplicate slashes

                    urlTo.pathname = path.resolve(urlSource.pathname)

                    urlSource = urlTo

                    log('flowRedirect -> fix slashes')

                    urlTo.updated = true
                } // if
            } // if

            if (urlSource.pathname !== null && urlTo.pathname === null) {
                // set urlTo.pathname in case a redirect ends up being needed
                // do not set urlTo.updated to true since we are not updating anything here
                urlTo.pathname = urlSource.pathname
            } // if
        } // if

        // any custom redirects?
        if (option.redirect.length > 0) {
            // check for custom redirects

            let urlSource // will be a reference to urlFrom or urlTo

            if (urlTo !== null) {
                urlSource = urlTo
            } else {
                urlSource = urlFrom
            } // if

            const redirect = option.redirect.filter(redirectArray => redirectArray[0] === urlSource.pathname)

            if (redirect.length > 0) {
                urlTo.pathname = redirect[0][1]

                log('flowRedirect -> custom redirect')

                urlTo.updated = true

                urlFrom.search = null // empty the originating querystring so it is not re-applied in the final logic of this function
            } // if
        } // if

        if (urlTo.updated) {
            // do we have or need an http or https prefix?
            if (urlTo.protocol === null) {
                if (urlTo.hostname !== null || urlTo.port !== null) {
                    // add prefix
                    urlTo.protocol = urlFrom.protocol
                } // if
            } // if

            // do we have or need a host name?
            if (urlTo.hostname === null) {
                if (urlTo.protocol !== null || urlTo.port !== null) {
                    urlTo.hostname = urlFrom.hostname
                } // if
            } // if

            // do we have or need a port?
            if (urlTo.port !== null) {
                // leave it as is
            } else {
                if (urlFrom.port !== null &&
                    urlFrom.port !== 80 &&
                    urlFrom.port !== 443
                ) {
                    // some kind of non-typical port so keep on using it
                    urlTo.port = urlFrom.port
                } // if
            } // if

            // do we have or need a querystring?
            if (urlTo.search === null && urlFrom.search !== null) {
                // re-use the original querystring, if any
                urlTo.search = urlFrom.search
            } // if

            urlTo.combined = [
                 urlTo.protocol,
                (urlTo.protocol === null ? '' : '//'),
                 urlTo.hostname,
                (urlTo.port === null ? '' : ':' + urlTo.port),
                 urlTo.pathname,
                 urlTo.search
            ].join('')

            obj.response.statusCode = 301
            obj.response.setHeader('Cache-Control', 'private, no-cache')
            obj.response.setHeader('Location', urlTo.combined)
        } // if
    } // if

    await next()
} // flowRedirect

//---------
// Exports
//---------
module.exports = flowRedirect