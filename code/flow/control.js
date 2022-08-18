'use strict'

//----------------
// Includes: Self
//----------------
const color     = require('../color.js')
const functions = require('../functions.js')
const host      = require('../host.js')
const shared    = require('../shared.js')

//----------
// Includes
//----------
const fs          = require('fs')
const path        = require('path')
const querystring = require('querystring')
const stream      = require('stream')
const url         = require('url')
const util        = require('util')

//-----------
// Promisify
//-----------
const fsAppendFile   = util.promisify(fs.appendFile)
const fsClose        = util.promisify(fs.close)
const fsOpen         = util.promisify(fs.open)
const streamPipeline = util.promisify(stream.pipeline)

//---------
// Aliases
//---------
const log       = functions.log
const logAlways = functions.logAlways
const logError  = functions.logError

//-----------
// Functions
//-----------
async function flowControl(request, response) {
    /*
    Unlike other flow functions, this function does not use (obj, next) as its parameters.
    This function will create the parameters that all other flow functions depend on.
    This function will also figure out domains, logging, and headers for each request and response.

    @param   {Object}   request   Request object from http or "https.createServer".
    @param   {Object}   response  Response object from http or "https.createServer".
    @return  {Promise}
    */

    log()
    log('flowControl -> begin')

    //------------------
    // Logging Variable
    //------------------
    const bytesStart = request.socket.bytesWritten

    //------------------
    // Setup Log Object
    //------------------
    const logObject = {
        'request': {
            'headers': request.headers,
            'method': request.method,
            'port': request.socket.localPort,
            'url': request.url
        },
        'response': {
            'headers': {},
            'statusCode': 0
        },
        'stats': {
            'bytes': {
                'sent': 0
            },
            'time': {
                'begin': new Date().getTime(),
                'total': 0
            }
        }
    } // logObject

    //--------
    // Domain
    //--------
    let domain = request.headers.host

    //----------------
    // Available Host
    //----------------
    if (host[domain] === undefined) {
        if (shared.serveUnknownDomains) {
            // default to the first host
            domain = Object.keys(host)[0]
        } else {
            // do not serve unknown domains
            // this also stops direct to IP requests
            response.statusCode = 403
            response.setHeader('Content-Type', 'text/plain')
            response.end('Specify a valid domain name.')

            return 'early'
        } // if
    } // if

    //-----------------------
    // Setup Reusable Object
    //-----------------------
    const obj = {
        'host': host[domain],
        'post': '', // the body of a POST request
        'request': request,
        'response': response,
        'share': {
            'fileExt' : '', // will be a file extension like 'html'
            'filePath': '', // will be full path to a file like '/web/publish/index.html'
            'url'     : ''  // will be a normalized version of request.url but without a querystring and with a default document, a request for '/archive/?show=all' would become '/archive/index.html'
        }
    } // obj

    //---------------------
    // Default Status Code
    //---------------------
    obj.response.statusCode = 404

    //--------------------
    // Remove Date Header
    //--------------------
    obj.response.removeHeader('Date')

    //-----------
    // Share URL
    //-----------
    try {
        obj.share.url = url.parse(obj.request.url).pathname // remove querystring
        obj.share.url = decodeURI(obj.share.url).toLowerCase()
    } catch (error) {
        response.statusCode = 400 // client error, bad request
        response.setHeader('Content-Type', 'text/plain')
        response.end('Error in client request.')

        return 'early'
    } // catch

    //-------
    // Alias
    //-------
    const option = obj.host.option

    //----------------------
    // Accept POST Requests
    //----------------------
    await new Promise(function(resolve, reject) {
        request.on('data', function(chunk) {
            obj.post += chunk
        })

        request.on('end', function() {
            if (obj.post.length) {
                try {
                    obj.post = querystring.parse(obj.post)
                } catch (error) {
                    // do nothing
                } // catch
            } // if

            resolve()
        })

        request.on('error', function(error) {
            reject(error)
        })
    }) // promise

    //---------------------------------------
    // HTTP Strict Transport Security (HSTS)
    //---------------------------------------
    if (option.https.enable && option.https.require && option.https.requireStrict) {
        // more info at...
        // https://https.cio.gov/guide/#do-i-need-to-shut-off-port-80
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
        response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    } // if

    //---------------
    // Flow Sequence
    //---------------
    function flowSequence(index) {
        // index will start out as 0 and increment every time flowSequence is called until option.flow[index] is undefined
        const flowFunction = option.flow[index]

        if (flowFunction === undefined) {
            return Promise.resolve()
        } // if

        return Promise.resolve(flowFunction(obj, function next() {
            return flowSequence(index + 1)
        }))
    } // flowSequence

    try {
        await flowSequence(0)
    } catch (error) {
        // expect errors to always use the following format
        // { 'statusCode': 404, 'content': 'text' }

        if (error.statusCode !== 404 && error.statusCode !== 403) {
            log(color.red('flowControl -> flowSequence try catch'))
            logError(error)
        } // if

        let statusCode = error.statusCode
        let content = error.content

        if (Number.isInteger(statusCode) === false || statusCode === undefined) {
            statusCode = 500
        } // if

        if (content === undefined || content === '') {
            content = "Server error."
        } // if

        obj.response.statusCode = statusCode

        const customErrorExists = option.customError.hasOwnProperty(statusCode)

        if (statusCode === 403 || statusCode === 404 || statusCode === 500 || customErrorExists) {
            obj.response.setHeader('Cache-Control', 'private, no-cache')

            if (customErrorExists) {
                // try to use a custom error page

                try {
                    const filePath = path.join(option.sitePath, option.customError[statusCode])
                    const fileExt = path.extname(filePath).replace('.', '').toLowerCase()

                    obj.response.setHeader('Content-Type', functions.fileExtToMime(fileExt, option))

                    let compressFileSent = false

                    if (functions.fileExtSupportCompress(fileExt, option)) {
                        // More info https://blog.stackpath.com/accept-encoding-vary-important
                        obj.response.setHeader('Vary', 'Accept-Encoding')
                    } // if

                    let clientCompressFileExt = ''

                    if (obj.request.headers['accept-encoding']) {
                        if (obj.request.headers['accept-encoding'].indexOf('br') >= 0) {
                            clientCompressFileExt = 'br'
                        } else if (obj.request.headers['accept-encoding'].indexOf('gzip') >= 0) {
                            clientCompressFileExt = 'gz'
                        } // if
                    } // if

                    if (option.compress &&
                        functions.fileExtSupportCompress(fileExt, option) &&
                        clientCompressFileExt !== '') {
                        // we want to serve compressed files AND the file extension should be compressed AND the client accepts compressed files

                        let clientCompressEncode = ''

                        if (clientCompressFileExt === 'br') {
                            clientCompressEncode = 'br'
                        } else {
                            clientCompressEncode = 'gzip'
                        } // if

                        try {
                            const compressFile = filePath + '.' + clientCompressFileExt
                            const stats_compressFile = await functions.fileStat(compressFile, option)

                            obj.response.setHeader('Content-Length', stats_compressFile.size)

                            obj.response.setHeader('Content-Encoding', clientCompressEncode)

                            const fileStream = await functions.fileStream(compressFile, option)

                            await streamPipeline(
                                fileStream,
                                obj.response
                            )

                            log('flowControl -> compressed custom error file served')

                            compressFileSent = true
                        } catch(error) {
                            if (error.code === 'ENOENT') {
                                log('flowControl -> compressed custom error file not found')
                            } else {
                                log(color.red('flowControl -> compress try catch'))
                                logError(error)
                            } // if
                        } // catch
                    } // if

                    if (compressFileSent === false) {
                        // serve a non-compressed file

                        const stats = await functions.fileStat(filePath, option)

                        obj.response.setHeader('Content-Length', stats.size)

                        const fileStream = await functions.fileStream(filePath, option)

                        await streamPipeline(
                            fileStream,
                            obj.response
                        )
                    } // if

                    log('flowControl -> custom ' + statusCode + ' page')
                } catch(error) {
                    if (error.code === 'ERR_STREAM_PREMATURE_CLOSE') {
                        log('flowControl -> file stream premature close')
                    } else if (error.code === 'ENOENT') {
                        log('flowControl -> custom ' + statusCode + ' file not found')
                    } else {
                        log(color.red('flowControl -> try catch'))
                        logError(error)
                    } // if
                } // catch
            }

            if (obj.response.finished === false) {
                obj.response.setHeader('Content-Type', 'text/plain')
                obj.response.end(content)
            } // if
        } // if
    } // catch

    if (obj.response.finished === false) {
        if (functions.responseTakenCareOf(obj.response) === true) {
            // do nothing
        } else {
            obj.response.statusCode = 200
            obj.response.setHeader('Content-Type', 'text/plain')
            obj.response.write('WARNING:\nResponse was not taken care of.\n')
        } // if
    } // if

    //--------------
    // Response End
    //--------------
    if (obj.response.finished === false) {
        obj.response.end()
    } // if

    //--------------
    // Log Finalize
    //--------------
    const deleteRequestHeaderKeys = Object.keys(logObject.request.headers).filter(header => header !== 'referer')

    deleteRequestHeaderKeys.forEach(function(header) {
        // remove any unneeded request headers
        delete logObject.request.headers[header]
    })

    // response headers
    const responseHeaders = obj.response.getHeaders()

    // this loop avoids [Object: null prototype] {} from being shown when displaying console logs
    for (const item in responseHeaders) {
        logObject.response.headers[item] = responseHeaders[item]
    } // for

    const deleteResponseHeaderKeys = Object.keys(logObject.response.headers).filter(header => header === 'strict-transport-security')

    deleteResponseHeaderKeys.forEach(function(header) {
        // remove any unneeded response headers
        delete logObject.response.headers[header]
    })

    // response status code
    logObject.response.statusCode = obj.response.statusCode

    // stats bytes
    logObject.stats.bytes.sent = request.socket.bytesWritten - bytesStart

    // stats time
    logObject.stats.time.total = (new Date().getTime()) - logObject.stats.time.begin

    //---------------
    // Log to Screen
    //---------------
    if (shared.debug === true) {
        if (logObject.response.statusCode !== 206) {
            // the response is not a partial content aka range request
            const logToScreen = option.logIgnoreFiles.indexOf(obj.share.url) < 0 ? true : false

            if (logToScreen === true) {
                logAlways(util.inspect(logObject, {
                    colors: true,
                    compact: false,
                    depth: null,
                    sorted: true
                }))
            } // if
        } // if
    } // shared.debug === true

    //-------------
    // Log to Disk
    //-------------
    if (option.log) {
        const logToDisk = option.logIgnoreFiles.indexOf(obj.share.url) < 0 ? true : false

        if (logToDisk) {
            const date  = new Date()
            const year  = date.getFullYear().toString()
            const month = ('0' + (date.getMonth() + 1).toString()).slice(-2)

            const logFileName       = year + '-' + month + '.log'
            const logFileNameChunks = year + '-' + month + '-' + 'chunks.log'
            const logFilePath       = path.join(option.logFolderPath, logFileName)
            const logFilePathChunks = path.join(option.logFolderPath, logFileNameChunks)

            if (shared.log[domain] === undefined) {
                // setup an object we can reuse next time
                shared.log[domain] = {
                    'fileDescriptor': 0,
                    'fileDescriptorChunks': 0,
                    'logFilePath': logFilePath,
                    'logFilePathChunks': logFilePathChunks
                }
            } // if

            if (shared.log[domain].logFilePath !== logFilePath) {
                // log file path has changed

                shared.log[domain].logFilePath = logFilePath
                shared.log[domain].logFilePathChunks = logFilePathChunks

                if (shared.log[domain].fileDescriptor !== 0) {
                    // try to close a previous fileDescriptor
                    try {
                        await fsClose(shared.log[domain].fileDescriptor)
                    } catch (error) {
                        // do nothing
                    } // catch

                    shared.log[domain].fileDescriptor = 0
                } // if

                if (shared.log[domain].fileDescriptorChunks !== 0) {
                    // try to close a previous fileDescriptor
                    try {
                        await fsClose(shared.log[domain].fileDescriptorChunks)
                    } catch (error) {
                        // do nothing
                    } // catch

                    shared.log[domain].fileDescriptorChunks = 0
                } // if
            } // if

            if (shared.log[domain].fileDescriptor === 0) {
                // open a file once so we can use it again next time
                shared.log[domain].fileDescriptor = await fsOpen(shared.log[domain].logFilePath, 'a') // a for appending
            } // if

            if (shared.log[domain].fileDescriptorChunks === 0) {
                // open a file once so we can use it again next time
                shared.log[domain].fileDescriptorChunks = await fsOpen(shared.log[domain].logFilePathChunks, 'a') // a for appending
            } // if

            const logData = functions.logCompress(logObject) + '\n'

            if (logObject.response.statusCode === 206) {
                // log to chunks log file
                if (typeof(shared.log[domain].fileDescriptorChunks) === 'number') {
                    if (shared.log[domain].fileDescriptorChunks > 0) {
                        await fsAppendFile(shared.log[domain].fileDescriptorChunks, logData)
                    } // if
                } // if
            } else {
                // log to regular log file
                if (typeof(shared.log[domain].fileDescriptor) === 'number') {
                    if (shared.log[domain].fileDescriptor > 0) {
                        await fsAppendFile(shared.log[domain].fileDescriptor, logData)
                    } // if
                } // if
            } // if
        } // if
    } // if

    log('flowControl -> end')
} // flowControl

//---------
// Exports
//---------
module.exports = flowControl