#!/usr/bin/env node

'use strict'

//-------
// Notes
//-------
/*
    This software uses camel casing for variables.
*/

//----------------
// Includes: Self
//----------------
const color     = require('./color.js')
const flow      = require('./flow.js')
const functions = require('./functions.js')
const host      = require('./host.js')
const option    = require('./option.js')
const shared    = require('./shared.js')
const version   = require('../package.json').version

//----------
// Includes
//----------
const constants = require('constants')
const fs        = require('fs')
const http      = require('http')
const https     = require('https')
const path      = require('path')
const tls       = require('tls')

//---------
// Aliases
//---------
const logAlways = functions.logAlways
const logError  = functions.logError

//-----------
// Variables
//-----------
let httpServer  // will be an instance of http.createServer
let httpsServer // will be an instance of https.createServer

//------------------------
// Setup the Default Flow
//------------------------
option.flow.push(
    flow.redirect,
    flow.contentSecurityPolicy,
    flow.defaultDocument,
    flow.filePath,
    flow.directLink,
    flow.rangeFile,
    flow.staticFile
) // option.flow

//-------------
// Tome Object
//-------------
const tome = {
    'aliasHost': function(){}, // will be replaced by an actual function
    'flow'     : flow,         // reference to flow object
    'functions': functions,    // reference to functions object
    'host'     : host,         // reference to host object
    'newHost'  : function(){}, // will be replaced by an actual function
    'option'   : option,       // reference to option object
    'shared'   : shared,       // reference to shared object
    'version'  : version       // version string from package.json
} // tome

tome.aliasHost = function aliasHost(currentDomain, additionalDomain) {
    /*
    Alias an existing host by creating references for an additional domain.
    Also note the additional domain name in the domains list of an existing host.

    @param  {String}  currentDomain     Current host domain like "microsoft.com".
    @param  {String}  additionalDomain  Additional host domain like "www.microsoft.com".
    */

    tome.host[additionalDomain] = {
        'memory': tome.host[currentDomain].memory, // reference
        'option': tome.host[currentDomain].option  // reference
    }

    tome.host[currentDomain].option.domains.push(additionalDomain)
    tome.host[currentDomain].option.domains.sort()
} // aliasHost

tome.newHost = function newHost(domainStringOrArray) {
    /*
    Setup a new host with one or more domains.
    Setup shared memory and option objects.

    @param   {String,Object}  domainStringOrArray  Host domain string like "microsoft.com" or an array of strings like ["microsoft.com", "www.microsoft.com"]
    @return  {Object}                              Reference to the option object for this host.
    */

    let firstDomain = ''
    let aliasDomains = []

    if (Array.isArray(domainStringOrArray)) {
        firstDomain = domainStringOrArray.shift()
        aliasDomains = domainStringOrArray
    } else {
        firstDomain = domainStringOrArray
    } // if

    tome.host[firstDomain] = {
        'memory': {},
        'option': functions.cloneObj(option) // create a copy of option
    }

    tome.host[firstDomain].option.domains.push(firstDomain)

    aliasDomains.map(function(alias) {
        tome.aliasHost(firstDomain, alias)
    }) // map

    return tome.host[firstDomain].option // return an option reference for less verbose option setting inside a tome config file
} // newHost

//--------------------
// Console Log Spacer
//--------------------
logAlways('')

//----------------------
// Command Line Options
//----------------------
const commandLineOptions = process.argv.slice(2)

const inOptions = function inOptions(search) {
    /*
    Search the commandLineOptions array for one or more command line options.

    @param  {Object}  search  Array of strings like ['--init', '-i']
    */

    for (const item in search) {
        if (commandLineOptions.indexOf(search[item]) >= 0) {
            return true
        } // if
    } // for

    return false
} // inOptions

//----------------------------
// Command Line Options: Init
//----------------------------
if (inOptions(['--init', '-i'])) {
    // if needed, create a tome config file in the current directory
    functions.initTome()

    process.exit()
} // if

//-------------------
// Hosts and Options
//-------------------
let configFile = path.join(shared.path.pwd, 'tome.js')

try {
    require(configFile)(tome) // share our tome reference with this require
} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
        // do nothing
    } else {
        logAlways('Tome halted due to errors.\n')
        logAlways(color.red('Could not load a "tome.js" file in the current directory.\n'))
        logError(error)

        process.exit()
    } // if

    try {
        configFile = path.join(shared.path.pwd, 'tome-config.js')

        require(configFile)(tome) // share our tome reference with this require
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            logAlways('Could not find a "tome.js" or "tome-config.js" file in the current directory.\n')
            logAlways('Run "tome --init" to create a new config file.\n')
        } else {
            logError(error)
        } // if

        process.exit()
    } // catch
} // catch

//-----------------
// Preflight Check
//-----------------
let domainsDone = [] // array that can be wiped out and used multiple times to keep track of which hosts have had something done to them

const ready = {
    hosts      : Object.keys(host),
    hosts_http : [], // will be an array of hosts that are ready for http
    hosts_https: [], // will be an array of hosts that are ready for https
    http       : false,
    https      : false
} // ready

ready.hosts_http = ready.hosts.filter(function(domain) {
    return host[domain].option.http.enable === true
}) // filter

ready.hosts_https = ready.hosts.filter(function(domain) {
    let result = false

    if (host[domain].option.https.enable === true) {
        if (host[domain].option.https.key.length > 0 && host[domain].option.https.certificate.length > 0) {
            result = true
        } // if
    } // if

    return result
}) // filter

if (ready.hosts_http.length > 0) {
    ready.http = true
} // if

if (ready.hosts_https.length > 0) {
    ready.https = true
} // if

if (ready.hosts.length === 0) {
    // no hosts have been configured
    logAlways(color.gray('No hosts defined.\n'))
    logAlways(color.gray('Please check your ') + color.cyan(path.basename(configFile)) + color.gray(' file.\n'))

    process.exit()
} // if

if (ready.http === false && ready.https === false) {
    // no hosts have HTTP or HTTPS enabled
    logAlways(color.gray('Please set ') + color.cyan('option.http.enable') + color.gray(' or ') + color.cyan('option.https.enable') + color.gray(' to true for at least one host inside your ') + color.cyan(path.basename(configFile)) + color.gray(' file.\n'))

    process.exit()
} // if

//---------------------
// Default Log Folders
//---------------------
domainsDone = []

ready.hosts.map(function(domain) {
    if (domainsDone.includes(host[domain].option.domains) === false) {
        domainsDone.push[host[domain].option.domains]

        if (host[domain].option.log === true) {
            if (host[domain].option.logFolderPath === '') {
                // set default log folder
                host[domain].option.logFolderPath = path.join(host[domain].option.sitePath, '..', 'log')
            } // if

            // check if log folder exists
            if (fs.existsSync(host[domain].option.logFolderPath) === false) {
                // create path up to and including the log folder
                fs.mkdirSync(host[domain].option.logFolderPath, { recursive: true })
            } // if
        } // if
    } // if
}) // map

//---------------------
// Default SSL Folders
//---------------------
domainsDone = []

ready.hosts.map(function(domain) {
    if (domainsDone.includes(host[domain].option.domains) === false) {
        domainsDone.push[host[domain].option.domains]

        // SSL folder
        if (host[domain].option.https.enable) {
            if (host[domain].option.https.folderPath === '') {
                // set default ssl folder
                host[domain].option.https.folderPath = path.join(host[domain].option.sitePath, '..', 'ssl')
            } // if

            // check if ssl folder exists
            if (fs.existsSync(host[domain].option.https.folderPath) === false) {
                // create path up to and including the ssl folder
                fs.mkdirSync(host[domain].option.https.folderPath, { recursive: true })
            } // if
        } // if
    } // if
}) // map

//--------------------
// Memory Cache Clean
//--------------------
setInterval(functions.memoryCacheClean, shared.memoryCacheCleanSeconds * 1000) // every 10 minutes by default

//----------------------
// Display Tome Version
//----------------------
logAlways('Tome version ' + tome.version)

//---------------------------------------
// Encompassing Function for Async/Await
//---------------------------------------
;(async function() {
    //-------------------
    // Setup HTTP Server
    //-------------------
    if (ready.http) {
        await new Promise(function(resolve, reject) {
            httpServer = http.createServer(flow.control)

            httpServer.on('error', functions.serverListenError)

            httpServer.listen(shared.http.port, function() {
                logAlways(color.cyan('HTTP -> Listening on port ' + shared.http.port))
                resolve()
            })
        }) // promise
    } // if

    //--------------------
    // Setup HTTPS Server
    //--------------------
    if (ready.https) {
        const serverCerts = {
            // 'local.test': {
            //     key: fs.readFileSync(''),
            //     cert: fs.readFileSync('')
            // }
        } // serverCerts

        ready.hosts_https.map(function(domain) {
            serverCerts[domain] = {
                key: fs.readFileSync(host[domain].option.https.key),
                cert: fs.readFileSync(host[domain].option.https.certificate)
            }
        }) // map

        const secureContext = {
            // 'local.test': tls.createSecureContext({
            //     key: serverCerts[''].key,
            //     cert: serverCerts[''].cert
            // })
        } // secureContext

        ready.hosts_https.map(function(domain) {
            secureContext[domain] = tls.createSecureContext({
                key: serverCerts[domain].key,
                cert: serverCerts[domain].cert
            })
        }) // map

        const serverOptions = {
            honorCipherOrder: true,
            secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_TLSv1_1,
            SNICallback: function(domain, callback) {
                /*
                Callback to support having more than one SSL enabled host on an IP address.

                @param  {String}    domain    Domain string like "microsoft.com".
                @param  {Function}  callback  Callback which will require a secure context for the requested domain.
                */
                domain = domain.toLowerCase() // for rare, case sensitive domain requests

                if (secureContext[domain]) {
                    callback(null, secureContext[domain]);
                } // if
            },
            key: serverCerts[ready.hosts_https[0]].key,  // default key required, use first available
            cert: serverCerts[ready.hosts_https[0]].cert // default cert required, use first available
        } // serverOptions

        httpsServer = https.createServer(serverOptions, flow.control)

        httpsServer.on('error', functions.serverListenError)

        httpsServer.listen(shared.https.port, function() {
            logAlways(color.cyan('HTTPS -> Listening on port ' + shared.https.port))
        })
    } // if
})() // async function