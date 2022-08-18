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
async function flowRangeFile(obj, next) {
    /*
    Handle files that support range requests like GIF, MP4, and WEBM.
    Files may be served from memory or disk.

    @param   {Object}    obj   Reusable object created by the "flow.control" function.
    @param   {Function}  next  Function that must be called in order for other flow functions to proceed.
    @return  {Promise}
    */

    const option = obj.host.option

    if (functions.responseTakenCareOf(obj.response)) {
        // this response has already been taken care of
    } else {
        if (functions.fileExtAcceptRanges(obj.share.fileExt, option)) {
            log('flowRangeFile -> range supported file')

            if (obj.request.headers['range'] === undefined) {
                obj.response.setHeader('Accept-Ranges', 'bytes')
                log('flowRangeFile -> accept-ranges header set')
            } else {
                try {
                    const stats = await functions.fileStat(obj.share.filePath, option)

                    const range = functions.validRange(obj.request.headers['range'], stats.size)

                    if (range === false) {
                        flowThrow(416, 'Range Not Satisfiable')
                    }

                    // add cache-control headers
                    // more info at https://www.keycdn.com/blog/http-cache-headers
                    if (functions.cacheControlPrivate(obj.share.fileExt, option)) {
                        obj.response.setHeader('Cache-Control', 'private, no-cache')
                    } else {
                        obj.response.setHeader('Cache-Control', 'public, max-age=31536000') // one year in seconds
                    } // if

                    const etag = functions.hash(obj.share.filePath + '-' + stats.modified)

                    obj.response.setHeader('ETag', etag) // serve the same etag for both 200 and 304 status codes

                    if (etag === obj.request.headers['if-none-match']) {
                        // serve a 304 not modified
                        obj.response.statusCode = 304
                    } else {
                        obj.response.statusCode = 206
                        obj.response.setHeader('Content-Type', functions.fileExtToMime(obj.share.fileExt, option))
                        obj.response.setHeader('Content-Range', 'bytes ' + range[0] + '-' + range[1] + '/' + stats.size)
                        obj.response.setHeader('Content-Length', range[1] - range[0] + 1) // the length of the response


                        if (obj.request.method === 'HEAD') {
                            log('flowRangeFile -> HEAD request')
                        } else if (obj.request.method === 'GET') {
                            const fileStream = await functions.fileStream(obj.share.filePath, option, {
                                start: range[0],
                                end: range[1]
                            })

                            await streamPipeline(
                                fileStream,
                                obj.response
                            )

                            log('flowRangeFile -> range request served')
                        } // if
                    } // if
                } catch(error) {
                    if (error.code === 'ERR_STREAM_PREMATURE_CLOSE') {
                        // chrome will frequently drop and create new range requests as it buffers
                        // do nothing
                        log('flowRangeFile -> file stream premature close')
                    } else if (error.code === 'ENOENT') {
                        log('flowRangeFile -> file not found')
                        flowThrow(404, 'File not found.')
                    } else {
                        log(color.red('flowRangeFile -> try catch'))
                        logError(error)
                        flowThrow(500, 'Server error.')
                    } // if
                } // catch
            } // if
        } // if
    } // if

    await next()
} // flowRangeFile

//---------
// Exports
//---------
module.exports = flowRangeFile