//-----------------------------------
// Tome - Zero Dependency Web Server
//-----------------------------------
// More info -> https://github.com/nightmode/tome
module.exports = function(tome) {
    //---------
    // Aliases
    //---------
    const { newHost } = tome // function alias
    const { shared } = tome // object alias

    //----------------
    // Shared Options
    //----------------
    // shared.http.port = 80
    // shared.https.port = 443
    // shared.serveUnknownDomains = false

    // Additional shared options and defaults -> https://github.com/nightmode/tome/blob/main/code/shared.js

    //------
    // Host
    //------
    // the newHost function can be used for a single domain name or an array of domain names
    let option = newHost('local.test')

    // option.compress = true // serve br and gzip compressed files, if available

    // option.customError['404'] = '404.html'
    // option.customError['500'] = '500.html'

    // option.https.certificate = ''   // full path to a certificate in PEM format
    // option.https.enable      = true
    // option.https.key         = ''   // full path to a private key in PEM format
    // option.https.require     = true // if true, http requests will be redirected to https

    // option.log = true // if true, log information about finished requests to disk

    // option.memoryCache = true // if true, serve certain file types from memory

    option.sitePath = '' // full path to the folder that is the root of your site

    // Additional host options and defaults -> https://github.com/nightmode/tome/blob/main/code/option.js
}