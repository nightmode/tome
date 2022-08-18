'use strict'

//-------------
// Description
//-------------
// Default option object which can be customized for each host.

//-----------
// Variables
//-----------
const option = {
    cacheControlPrivate: [], // will be an array like ['html']
    contentSecurityPolicy: {
        enable: false,
        policy: '', // content security policy like "default-src 'none';"
        production: false // if false, serve report only headers
    },
    compress: false, // enable serving of gz and br files
    customError: {}, // object with http status codes as keys and filename strings as values, example object below
    /*
    {
        '404': '404.html', // filename will be prefixed by option.sitePath
        '500': '500.html'  // filename will be prefixed by option.sitePath
    }
    */
    defaultDocument: 'index.html', // a request for "/" will still look like "/" but be served by "/index.html"
    directLink: {
        allow: true, // allow direct links
        allowDomain: [''], // always allow direct links from these domains if an http referer is provided with the request
        // domains strings should be lowercase only
        allowFileExt: ['html'], // always allow direct links for these file extensions
        // file extensions should be lowercase only
        allowFiles: ['favicon.ico', 'robots.txt'], // always allow direct links to these files
        // file paths should be relative and not start with a leading slash
        allowFolders: [''] // always allow direct links to these folders
        // folder paths should be relative and not start with a leading slash
    },
    domains: [], // will be an array of domain names like ['local.test']
    fileExtAcceptRanges: [], // will be an array like ['mp4']
    fileExtSupportCompress: [], // will be an array like ['css']
    flow: [], // will be an array of functions for each request/response
    http: {
        enable: true,
    },
    https: {
        certificate: '', // full path to a certificate in PEM format
        enable: false,
        folderPath: '', // Defaults to '../ssl' from the sitePath folder if left empty.
        key: '', // full path to a private key for your certificate, also in PEM format
        require: false, // if set to true, requests to port 80 will be redirected to port 443
        requireStrict: false // warning, if you set this to true, a HSTS header will be served and then informed clients can refuse to talk to your host via port 80 for up to a year
    },
    log: false, // if true, log information about finished requests to disk
    logFolderPath: '', // Defaults to '../log' from the sitePath folder if left empty. Log files are saved using the 'YYYY-MM.log' naming format.
    logIgnoreFiles: ['/favicon.ico', '/robots.txt'], // array of forward slash prefixed files which will not have their requests logged to disk or display as much when debug settings are enabled
    memoryCache: false, // if true, serve certain file types from memory
    memoryCacheSeconds: 90, // a cache entry will be considered fresh for this many seconds after it has been created or checked
    memoryDoNotCacheFileExt: [], // will be an array like ['mp4']
    mimeType: {}, // will be an object like {'gif':'image/gif'}
    redirect: [], // will be an array of arrays like [['/from' , '/to']] without the default document in either string
    // redirects are only internal right now and only operate on the url.pathname part of a url object
    // consider adding more complex redirect support later
    sitePath: '' // full path to the folder that is the root of your site
} // option

option.cacheControlPrivate = [
    'html'
] // cacheControlPrivate

option.fileExtAcceptRanges = [
    'gif',
    'mp4',
    'webm'
] // fileExtAcceptRanges

option.fileExtSupportCompress = [
    'css',
    'eot',
    'html',
    'ico',
    'js',
    'm3u8',
    'mpd',
    'otf',
    'svg',
    'ttf',
    'txt',
    'xml'
] // fileExtSupportCompress

option.memoryDoNotCacheFileExt = [
    'm4a',
    'mov',
    'mp3',
    'mp4',
    'ogg',
    'wav',
    'webm',
    'zip'
] // memoryDoNotCacheFileExt

// more mime types at https://github.com/jshttp/mime-db/blob/master/db.json
option.mimeType = {
    'br'   : 'application/brotli',
    'css'  : 'text/css; charset=utf-8',
    'eot'  : 'application/vnd.ms-fontobject',
    'gif'  : 'image/gif',
    'gz'   : 'application/gzip',
    'html' : 'text/html; charset=utf-8',
    'ico'  : 'image/x-icon',
    'jpg'  : 'image/jpeg',
    'js'   : 'application/javascript; charset=utf-8',
    'json' : 'application/json; charset=utf-8',
    'm3u8' : 'application/vnd.apple.mpegurl',
    'm4a'  : 'audio/mp4',
    'mov'  : 'video/quicktime',
    'mp3'  : 'audio/mp3',
    'mp4'  : 'video/mp4',
    'mpd'  : 'application/dash+xml',
    'ogg'  : 'audio/ogg',
    'otf'  : 'font/opentype',
    'pdf'  : 'application/pdf',
    'png'  : 'image/png',
    'svg'  : 'image/svg+xml',
    'svgz' : 'image/svg+xml',
    'ttf'  : 'application/x-font-ttf',
    'txt'  : 'text/plain',
    'wasm' : 'application/wasm',
    'wav'  : 'audio/wav',
    'webm' : 'video/webm',
    'woff' : 'application/font-woff',
    'woff2': 'application/font-woff2',
    'zip'  : 'application/zip'
} // mimeType

//---------
// Exports
//---------
module.exports = option