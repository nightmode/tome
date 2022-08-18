'use strict'

//----------------
// Includes: Self
//----------------
const color     = require('../color.js')
const functions = require('../functions.js')

//----------
// Includes
//----------
const stream = require('stream')
const util   = require('util')

//-----------
// Promisify
//-----------
const streamPipeline = util.promisify(stream.pipeline)

//---------
// Aliases
//---------
const flowThrow = functions.flowThrow
const log       = functions.log
const logError  = functions.logError

//-----------
// Functions
//-----------
async function flowStaticFile(obj, next) {
    /*
    Handle files that do NOT support range requests. Files may be served from memory or disk.

    @param   {Object}    obj   Reusable object created by the "flow.control" function.
    @param   {Function}  next  Function that must be called in order for other flow functions to proceed.
    @return  {Promise}
    */

    const option = obj.host.option

    if (functions.responseTakenCareOf(obj.response)) {
        // this response has already been taken care of
    } else {
        try {
            // add cache-control headers
            // more info at https://www.keycdn.com/blog/http-cache-headers
            if (functions.cacheControlPrivate(obj.share.fileExt, option)) {
                obj.response.setHeader('Cache-Control', 'private, no-cache')
            } else {
                obj.response.setHeader('Cache-Control', 'public, max-age=31536000') // one year in seconds
            } // if

            const stats = await functions.fileStat(obj.share.filePath, option)

            const etag = functions.hash(obj.share.filePath + '-' + stats.modified)

            obj.response.setHeader('ETag', etag) // serve the same etag for both 200 and 304 status codes

            if (etag === obj.request.headers['if-none-match']) {
                // serve a 304 not modified
                obj.response.statusCode = 304
            } else {
                // serve the file
                obj.response.statusCode = 200
                obj.response.setHeader('Content-Type', functions.fileExtToMime(obj.share.fileExt, option))

                let compressFileSent = false

                if (functions.fileExtSupportCompress(obj.share.fileExt, option)) {
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
                    functions.fileExtSupportCompress(obj.share.fileExt, option) &&
                    clientCompressFileExt !== '') {
                    // we want to serve compressed files AND the file extension should be compressed AND the client accepts compressed files

                    let clientCompressEncode = ''

                    if (clientCompressFileExt === 'br') {
                        clientCompressEncode = 'br'
                    } else {
                        clientCompressEncode = 'gzip'
                    } // if

                    try {
                        const compressFile = obj.share.filePath + '.' + clientCompressFileExt
                        const stats_compressFile = await functions.fileStat(compressFile, option)

                        obj.response.setHeader('Content-Length', stats_compressFile.size)

                        obj.response.setHeader('Content-Encoding', clientCompressEncode)

                        if (obj.request.method === 'HEAD') {
                            log('flowStaticFile -> HEAD request')
                        } else if (obj.request.method === 'GET') {
                            const fileStream = await functions.fileStream(compressFile, option)

                            await streamPipeline(
                                fileStream,
                                obj.response
                            )

                            log('flowStaticFile -> compressed file served')
                        } // if

                        compressFileSent = true
                    } catch(error) {
                        if (error.code === 'ENOENT') {
                            log('flowStaticFile -> compressed file not found')
                        } else {
                            log(color.red('flowStaticFile -> compress try catch'))
                            logError(error)
                        } // if
                    } // catch
                } // if

                if (compressFileSent === false) {
                    // serve a non-compressed file
                    obj.response.setHeader('Content-Length', stats.size)

                    if (obj.request.method === 'HEAD') {
                        log('flowStaticFile -> HEAD request')
                    } else if (obj.request.method === 'GET') {
                        const fileStream = await functions.fileStream(obj.share.filePath, option)

                        await streamPipeline(
                            fileStream,
                            obj.response
                        )

                        log('flowStaticFile -> file served')
                    } // if
                } // if
            } // if
        } catch(error) {
            if (error.code === 'ERR_STREAM_PREMATURE_CLOSE') {
                // do nothing
                log('flowStaticFile -> file stream premature close')
            } else if (error.code === 'ENOENT') {
                log('flowStaticFile -> file not found')
                flowThrow(404, 'File not found.')
            } else {
                log(color.red('flowStaticFile -> try catch'))
                logError(error)
                flowThrow(500, 'Server error.')
            } // if
        } // catch
    } // if

    await next()
} // flowStaticFile

//---------
// Exports
//---------
module.exports = flowStaticFile