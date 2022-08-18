'use strict'

//-------------
// Description
//-------------
// Shared object for the entire server and individual hosts.

//----------
// Includes
//----------
const path = require('path')

//-----------
// Variables
//-----------
const shared = {
    'debug': false, // if true, log a lot more information to the console for each request
    'http': {
        'port': 80
    },
    'https': {
        'port': 443
    },
    'log': {
        // if logging for a host is enabled, a log file descriptor and path to a log file
        /*
        'local.test': {
            'fileDescriptor': 123,
            'logFilePath': '/path/to/yyyy-mm.log'
        }
        */
    },
    'memoryCacheCleanSeconds': 600, // how often functions.memoryCacheClean should run, in seconds
    'path': {
        'pwd': process.cwd(), // the present working directory tome was invoked from
        'self': path.dirname(__dirname) // full path to wherever tome is currently installed
    },
    'serveUnknownDomains': true, // If true, allow any domain name that does not match a host to use the first available host. Allows direct to IP requests.
    'troubleshoot': {} // generic troubleshooting object
} // shared

//---------
// Exports
//---------
module.exports = shared