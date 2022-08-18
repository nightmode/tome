'use strict'

//-------------
// Description
//-------------
// A simplification of https://github.com/chalk/ansi-styles so we do not require a dependency.

//----------
// Includes
//----------
const os = require('os')

//-----------
// Variables
//-----------
const color = {
    // black
    // blue
    // cyan
    // gray
    // green
    // grey
    // magenta
    // red
    // white
    // yellow
} // color

const colors = {
    black  : [30, 39],
    red    : [31, 39],
    green  : [32, 39],
    yellow : [33, 39],
    blue   : [34, 39],
    magenta: [35, 39],
    cyan   : [36, 39],
    white  : [37, 39],
    gray   : [90, 39],
    grey   : [90, 39],
    // bright colors
    redBright    : [91, 39],
    greenBright  : [92, 39],
    yellowBright : [93, 39],
    blueBright   : [94, 39],
    magentaBright: [95, 39],
    cyanBright   : [96, 39],
    whiteBright  : [97, 39]
} // colors

const platform = os.platform()

//-----------
// Functions
//-----------
function setupColors() {
    /*
    Loop through the colors object in order to setup color wrapping functions for console logs.
    */

    for (const item in colors) {
        const hue = item

        color[hue] = function(info) {
            return showColor(hue, info)
        }
    } // for

    if (platform === 'win32' || platform === 'win64') {
        // use brighter versions of these colors
        color.red     = color.redBright
        color.green   = color.greenBright
        color.yellow  = color.yellowBright
        color.blue    = color.blueBright
        color.magenta = color.magentaBright
        color.cyan    = color.cyanBright
        color.white   = color.whiteBright
    } // if
} // setupColors

function showColor(hue, info = '') {
    /*
    Wrap a string in color for console logs.

    @param  {String}  hue     Color string like "cyan" or "gray".
    @param  {String}  [info]  Optional. String to wrap with color. Defaults to an empty string.
    */

    // ` signifies a template literal
    return `\u001B[${colors[hue][0]}m` + info + `\u001B[${colors[hue][1]}m`
} // showColor

//--------------
// Setup Colors
//--------------
setupColors()

//---------
// Exports
//---------
module.exports = color