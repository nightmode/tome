'use strict'

//----------------
// Includes: Self
//----------------
const functions = require('../functions.js')

//-----------
// Functions
//-----------
async function flowContentSecurityPolicy(obj, next) {
    /*
    If a content security policy is enabled for a host, set the correct response headers.

    @param   {Object}    obj   Reusable object created by the "flow.control" function.
    @param   {Function}  next  Function that must be called in order for other flow functions to proceed.
    @return  {Promise}
    */

    if (functions.responseTakenCareOf(obj.response)) {
        // this response has already been taken care of
    } else {
        const option = obj.host.option

        if (option.contentSecurityPolicy.enable === true) {
            const contentSecurityPolicy = option.contentSecurityPolicy.policy

            if (option.contentSecurityPolicy.production === true) {
                // set the content security policy
                obj.response.setHeader(
                    'Content-Security-Policy', contentSecurityPolicy
                )
            } else {
                // set the content security policy to report only
                obj.response.setHeader(
                    'Content-Security-Policy-Report-Only', contentSecurityPolicy
                )
            } // if
        } // if
    } // if

    await next()
} // flowContentSecurityPolicy

//---------
// Exports
//---------
module.exports = flowContentSecurityPolicy