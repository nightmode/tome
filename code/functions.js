'use strict'

//----------------
// Includes: Self
//----------------
const color  = require('./color.js')
const memory = require('./memory.js')
const host   = require('./host.js')
const shared = require('./shared.js')

//----------
// Includes
//----------
const fs     = require('fs')
const http   = require('http')
const https  = require('https')
const path   = require('path')
const stream = require('stream')
const url    = require('url')
const util   = require('util')

//-----------
// Promisify
//-----------
const fsReadFile = util.promisify(fs.readFile)
const fsStat     = util.promisify(fs.stat)

//-----------
// Variables
//-----------
const functions = {
    // cacheControlPrivate

    // cloneObj

    // fileExtAcceptRanges
    // fileExtSupportCompress
    // fileExtToMime
    // fileStat
    // fileStream

    // flowThrow

    // hash

    // initTome

    // log
    // logAlways
    // logCompress
    // logError

    // memoryCacheClean
    // memoryCacheEnsure

    // request

    // responseTakenCareOf

    // serverListenError

    // validRange

    // wait
} // functions

//-----------
// Functions
//-----------
functions.cacheControlPrivate = function cacheControlPrivate(fileExt, option) {
    /*
    Figure out if a file extension should have its "Cache-Control" header set to private.

    @param   {String}   fileExt  File extension like "html".
    @param   {Object}   option   Host option object.
    @return  {Boolean}
    */

    return (option.cacheControlPrivate.indexOf(fileExt) >= 0) ? true : false
} // cacheControlPrivate

functions.cloneObj = function cloneObj(object) {
    /*
    Clone an object recursively so the return is not a reference to the original object.

    @param   {Object}  obj  Object like { number: 1, bool: true, array: [], subObject: {} }
    @return  {Object}
    */

    if (object === null || typeof object !== 'object') {
        // return early for boolean, function, null, number, string, symbol, undefined
        return object
    } // if

    const objectConstructor = object.constructor()

    for (const key in object) {
        // call self recursively
        objectConstructor[key] = functions.cloneObj(object[key])
    } // for

    return objectConstructor
} // cloneObj

functions.fileExtAcceptRanges = function fileExtAcceptRanges(fileExt, option) {
    /*
    Figure out if a file extension supports ranges.

    @param   {String}   fileExt  File extension like "mp4".
    @param   {Object}   option   Host option object.
    @return  {Boolean}
    */

    return (option.fileExtAcceptRanges.indexOf(fileExt) >= 0) ? true : false
} // fileExtAcceptRanges

functions.fileExtSupportCompress = function fileExtSupportCompress(fileExt, option) {
    /*
    Figure out if a file extension is intended to be served as a "br" or "gzip" compressed file.

    @param   {String}   fileExt  File extension like "css".
    @param   {Object}   option   Host option object.
    @return  {Boolean}
    */

    return (option.fileExtSupportCompress.indexOf(fileExt) >= 0) ? true : false
} // fileExtSupportCompress

functions.fileExtToMime = function fileExtToMime(fileExt, option) {
    /*
    Return the mime type for a file extension.

    @param   {String}  fileExt  File extension like "wav".
    @param   {Object}  option   Host option object.
    @return  {String}           Mime type like "audio/wav".
    */

    return option.mimeType[fileExt] || 'application/octet-stream'
} // fileExtToMime

functions.fileStat = async function fileStat(filePath, option) {
    /*
    Get statistics about a file.
    Statistics can come from memory or disk.

    @param   {String}  filePath  File path like "/path/to/file.txt".
    @param   {Object}  option    Host option object.
    @return  {Object}            Object like { modified: 123, size: 456 }
    */

    const stats = {
        // modified
        // size
    }

    if (option.memoryCache) {
        await functions.memoryCacheEnsure(filePath, option)

        const memCache = memory[option.domains[0]]

        // stats from memory
        stats.modified = memCache[filePath].modified,
        stats.size = memCache[filePath].size
    } else {
        // stats from disk
        const statsFromDisk = await fsStat(filePath)

        stats.modified = new Date(statsFromDisk.mtime).getTime(),
        stats.size = statsFromDisk.size
    } // if

    return stats
} // fileStat

functions.fileStream = async function fileStream(filePath, option, fileOptions = {}) {
    /*
    Return a readable file stream.
    Readable streams can be from memory or disk.

    @param   {String}  filePath       File path like "/web/video.mp4".
    @param   {Object}  option         Host option object.
    @param   {Object}  [fileOptions]  Optional. Object like { start: 0, end: 1024 }
    @return  {Object}                 A readable file stream.
    */

    let theStream

    let serveFromMemory = false // will be set to true if memory cache is being used and the filePath in question is cached in memory

    if (option.memoryCache) {
        const memCache = memory[option.domains[0]]

        if ((memCache[filePath] || {}).content !== undefined) {
            // serve from memory

            serveFromMemory = true

            log('functions.fileStream -> serve from memory')

            theStream = stream.Readable()

            const chunkSize = 65536

            let pos = 0
            let end = memCache[filePath].size

            if (fileOptions.start !== undefined) {
                pos = fileOptions.start
            } // if

            if (fileOptions.end !== undefined) {
                end = fileOptions.end
            } // if

            theStream._read = function() {
                if (pos >= end) {
                    theStream.push(null)
                    return
                }

                const chunk = memCache[filePath].content.slice(pos, pos + chunkSize)

                theStream.push(chunk)

                pos += chunkSize
            }
        } // if
    } // if

    if (serveFromMemory === false) {
        // serve from disk

        log('functions.fileStream -> serve from disk')

        theStream = fs.createReadStream(filePath, fileOptions)
    } // if

    return theStream
} // fileStream

functions.flowThrow = function flowThrow(statusCode = 500, content = 'Server error.') {
    /*
    Throw an error inside a flow function to release control back to the main "flow.control" function.

    @param  {Number}  [statusCode]  Optional. Defaults to the number "500".
    @param  {String}  [content]     Optional. Defaults to "Server error."
    */

    throw({
        'statusCode': statusCode,
        'content': content
    })
} // flowThrow

functions.hash = function hash(str) {
    /*
    Create a unique hash based on the input string.
    Used for setting "ETag" headers.

    @param   {String}  str  String to hash like "/file.txt-123".
    @return  {String}       Hashed string like "1139087527".
    */

    // from https://github.com/darkskyapp/string-hash/blob/master/index.js
    let hash = 5381
    let i = str.length

    while(i) {
        hash = (hash * 33) ^ str.charCodeAt(--i)
    } // while

    /*
    JavaScript does bitwise operations (like XOR, above) on 32-bit signed
    integers. Since we want the results to be always positive, convert the
    signed int to an unsigned by doing an unsigned bitshift.
    */
    return (hash >>> 0).toString()
} // hash

functions.initTome = function initTome() {
    /*
    If needed, create a tome config file in the current directory.
    */

    const destPath    = path.join(shared.path.pwd, 'tome.js')
    const destPathAlt = path.join(shared.path.pwd, 'tome-config.js')

    const statSyncOptions = {
        throwIfNoEntry: false
    }

    const destPathExists    = fs.statSync(destPath, statSyncOptions)
    const destPathAltExists = fs.statSync(destPathAlt, statSyncOptions)

    if (destPathExists === undefined && destPathAltExists === undefined) {
        // no tome config files found
        try {
            const sourcePath = path.join(shared.path.self, 'template', 'tome-config.js')

            fs.copyFileSync(sourcePath, destPathAlt, 1) // 1 means fail if the destination file already exists

            logAlways('Created a "tome-config.js" file.\n')
        } catch (error) {
            logAlways('Tome halted due to errors.\n')
            logError(error)

            process.exit()
        } // catch
    } else {
        logAlways('Tome halted due to errors.\n')

        const fileName = (destPathExists) ? 'tome.js' : 'tome-config.js'

        logAlways('A "' + fileName + '" file already exists in the current directory.\n')

        process.exit()
    } // if
} // initTome

functions.log = function log(info = '') {
    /*
    If shared.debug is true, log information to the console.

    @param  {*}  [info]  Optional. Anything that can be logged to the console. Defaults to an empty string.
    */

    if (shared.debug === true) {
        logAlways(info)
    } // if
} // log

functions.logAlways = function logAlways(info = '') {
    /*
    Log information to the console.

    @param  {*}  [info]  Optional. Anything that can be logged to the console. Defaults to an empty string.
    */

    if (typeof(info) === 'string') {
        if (info.indexOf(`\u001B`) < 0) { // unicode escape
            info = color.gray(info)
        } // if
    } // if

    console.log(info)
} // logAlways

functions.logCompress = function logCompress(obj) {
    /*
    Compress a log object before it is written to disk.

    @param   {Object}  obj   Log object made by "flow.control".
    @return  {String}
    */

    const compressObj = {
        request: {
            method: obj.request.method,
            port: obj.request.port,
            url: obj.request.url
        },
        response: {
            statusCode: obj.response.statusCode
        },
        stats: { // stats
            bytesSent: obj.stats.bytes.sent,
            timeBegin: obj.stats.time.begin,
            timeTotal: obj.stats.time.total
        }
    } // compressObj

    //-----------------
    // Request Headers
    //-----------------
    if (obj.request.headers.referer) {
        compressObj.request.referer = obj.request.headers.referer
    } // if

    //------------------
    // Response Headers
    //------------------
    if (obj.response.headers['cache-control']) {
        compressObj.response.cacheControl = obj.response.headers['cache-control'].replace(', ', ',')
    } // if

    if (obj.response.headers['content-encoding']) {
        compressObj.response.contentEncoding = obj.response.headers['content-encoding']
    } // if

    if (obj.response.headers['content-length']) {
        compressObj.response.contentLength = obj.response.headers['content-length']
    } // if

    if (obj.response.headers['content-type']) {
        compressObj.response.contentType = obj.response.headers['content-type'].replace('; ', ';')
    } // if

    if (obj.response.headers.etag) {
        compressObj.response.etag = obj.response.headers.etag
    } // if

    if (obj.response.headers.vary) {
        compressObj.response.vary = obj.response.headers.vary
    } // if

    return JSON.stringify(compressObj)
} // logCompress

functions.logError = function logError(error) {
    /*
    Log an error to the console.

    @param  {String,Object}  error  String or object to log to the console.
    */

    if (typeof(error) === 'object' && error instanceof Error === false) {
        logAlways(color.red(JSON.stringify(error, null, 2))) // indent 2 spaces
    } else {
        logAlways(color.red('Error ->'))
        logAlways(error)
    } // if
} // logError

functions.memoryCacheClean = async function memoryCacheClean() {
    /*
    Clean up files in memory that are no longer fresh or no longer on disk.

    @return  {Promise}
    */

    const domains = Object.keys(memory)

    const now = Date.now()

    domains.map(function(domain) {
        if (host[domain].option.memoryCache) {
            // this host is using a memoryCache

            const files = Object.keys(memory[domain])

            const filesCheckDisk = []

            const expireTime = now - ((host[domain].option.memoryCacheSeconds + 10) * 1000)

            files.forEach(function(filePath) {
                if (memory[domain][filePath].checked > expireTime) {
                    // file still fresh
                    filesCheckDisk.push(filePath)
                } else {
                    // file is no longer fresh
                    delete memory[domain][filePath]
                } // if
            }) // forEach

            if (filesCheckDisk.length) {
                filesCheckDisk.forEach(async function(filePath) {
                    try {
                        await fsStat(filePath)
                    } catch (error) {
                        // file no longer exists
                        delete memory[domain][filePath]
                    } // catch
                }) // forEach
            } // if
        } // if
    }) // map
} // memoryCacheClean

functions.memoryCacheEnsure = async function memoryCacheEnsure(filePath, option) {
    /*
    Ensure a cached file is fresh and in memory. Load or reload the file from disk if needed.

    @param   {String}   filePath  File path like "/path/to/file.txt".
    @param   {Object}   option    Host option object.
    @return  {Promise}
    */

    const now = Date.now()

    let loadFromDisk = true
    let stats

    if (typeof memory[option.domains[0]] === 'undefined') {
        memory[option.domains[0]] = {}
    } // if

    const memCache = memory[option.domains[0]]

    if (typeof(memCache[filePath]) === 'object') {
        // file in memory

        if ((memCache[filePath].checked + (option.memoryCacheSeconds * 1000)) > now) {
            // cache entry is still fresh since we last checked
            loadFromDisk = false
        } else {
            // cache entry is not too fresh
            // check if we need to update our cache from disk

            try {
                stats = await fsStat(filePath)

                const modified = new Date(stats.mtime).getTime()

                if (modified === memCache[filePath].modified) {
                    // cache is still fresh

                    memCache[filePath].checked = now

                    loadFromDisk = false
                } else {
                    // cache is out of date so re-read the file into memory
                } // if
            } catch(error) {
                delete memCache[filePath]
            } // catch
        } // if
    } // if

    if (loadFromDisk) {
        try {
            if (typeof(stats) !== 'object') {
                stats = await fsStat(filePath)
            } // if

            memCache[filePath] = {
                checked: now,
                content: null, // will only contain data if this file type is allowed to be cached
                modified: new Date(stats.mtime).getTime(),
                size: stats.size
            }

            const fileExt = path.extname(filePath).replace('.', '').toLowerCase()

            if (option.memoryDoNotCacheFileExt.indexOf(fileExt) < 0) {
                memCache[filePath].content = await fsReadFile(filePath)
            } // if
        } catch(error) {
            if (error.code === 'ENOENT') {
                log('functions.memoryCacheEnsure -> file not found')
            } else {
                logError('functions.memoryCacheEnsure -> error loading from disk')
            } // if

            throw(error)
        } // catch
    } // if
} // memoryCache

functions.request = async function request(link, options) {
    /*
    Request a URL using GET, POST, HTTP, or HTTPS.

    @param   {String}   link     String like "https://local.test/folder?a=1".
    @param   {Object}   options  Optional. Object like { method: 'POST', body: '...' }
    @return  {Promise}
    */

    link = link || ''

    if (link.toLowerCase().indexOf('http') !== 0) {
        link = 'http://' + link
    } // if

    link = url.parse(link)

    // Besides the optional BODY property, the option object below is the same as -> https://nodejs.org/api/http.html#http_http_request_url_options_callback
    options          = options         || {}
    options.body     = options.body    || null
    options.headers  = options.headers || {}
    options.hostname = link.hostname   || 'local.test'
    options.method   = options.method  || 'GET'
    options.path     = link.path       || '/'
    options.port     = link.port       || (link.protocol === 'https:' ? 443 : 80)

    if (options.method === 'POST') {
        if (options.headers['Content-Type'] === undefined) {
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
        } // if

        if (options.body) {
            options.headers['Content-Length'] = Buffer.byteLength(options.body)
        } // if
    } // if

    return new Promise(function(resolve, reject) {
        const library = (link.protocol === 'https:') ? https : http

        const clientRequest = library.request(options, function(incomingMessage) {

            const response = {
                statusCode: incomingMessage.statusCode,
                headers: incomingMessage.headers,
                body: []
            }

            incomingMessage.on('data', function(chunk) {
                // accumulate body data
                response.body.push(chunk)
            })

            incomingMessage.on('end', function() {
                response.body = response.body.join('')

                resolve(response)
            })
        })

        clientRequest.on('error', function(error) {
            reject(error)
        })

        if (options.body && options.method === 'POST') {
            clientRequest.write(options.body)
        } // if

        clientRequest.end()
    }) // promise
} // request

functions.responseTakenCareOf = function responseTakenCareOf(response) {
    /*
    Figure out if a node HTTP response like "obj.response" has been taken care of by any previous flow functions.

    @param   {Object}   response  Node HTTP response object within a reusable object created by "flow.control".
    @return  {Boolean}
    */

    if (response.statusCode === 200 ||
        response.statusCode === 206 ||
        response.statusCode === 301 ||
        response.statusCode === 304 ||
        response.statusCode === 403
    ) {
        return true
    } else {
        return false
    } // if
} // responseTakenCareOf

functions.serverListenError = function serverListenError(error) {
    /*
    Listener function for http and "https.createServer" error events.

    @param  {Object}  error  Error object.
    */

    if (error.port === shared.http.port) {
        logAlways(color.red('Error -> httpServer.listen(' + shared.http.port + ')'))
    } else {
        logAlways(color.red('Error -> httpsServer.listen(' + shared.https.port + ')'))
    } // if

    if (error.code === 'EACCES') {
        logAlways(color.red('Error -> Could not bind to port.'))
        logError(error)
        logAlways('Ports lower than 1024 may require additional privileges.')
    } else {
        logError(error)
    } // if

    logAlways()
} // serverListenError

functions.validRange = function validRange(range, fileSize) {
    /*
    Used by the range file flow function to determine if a requested range is satisfiable or not.

    @param   {String}          range     Range request string like "bytes=0-1023".
    @param   {Number}          fileSize  File size in bytes.
    @return  {Boolean,Object}            Boolean false or a valid range array like [0, 1023]
    */

    range = range.replace('bytes=', '').split('-')

    if (range.length !== 2) {
        return false
    } // if

    const rangeStart = parseInt(range[0], 10) || 0
    const rangeEnd = parseInt(range[1], 10) || fileSize - 1

    if (rangeStart >= fileSize ||
        rangeEnd >= fileSize ||
        rangeStart > rangeEnd) {
        return false
    } // if

    return [rangeStart, rangeEnd]
} // validRange

functions.wait = function wait(ms) {
    /*
    Promise that is useful for injecting delays and testing scenarios.

    @param   {Number}   ms  Number of milliseconds to wait before returning.
    @return  {Promise}
    */

    return new Promise(resolve => setTimeout(resolve, ms))
} // wait

//---------
// Aliases
//---------
const log       = functions.log
const logAlways = functions.logAlways
const logError  = functions.logError

//---------
// Exports
//---------
module.exports = functions