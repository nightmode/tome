'use strict'

//-------------
// Description
//-------------
// An collection of "flow" functions which handle request and response objects created by http or "https.createServer".
// Inspired by https://github.com/koajs/koa

//-----------
// Variables
//-----------
const flow = {
    // contentSecurityPolicy
    // control
    // defaultDocument
    // directLink
    // filePath
    // rangeFile
    // redirect
    // staticFile
} // flow

//----------------
// Includes: Flow
//----------------
flow.contentSecurityPolicy = require('./flow/contentSecurityPolicy.js')
flow.control               = require('./flow/control.js')
flow.defaultDocument       = require('./flow/defaultDocument.js')
flow.directLink            = require('./flow/directLink.js')
flow.filePath              = require('./flow/filePath.js')
flow.rangeFile             = require('./flow/rangeFile.js')
flow.redirect              = require('./flow/redirect.js')
flow.staticFile            = require('./flow/staticFile.js')

//---------
// Exports
//---------
module.exports = flow