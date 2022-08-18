'use strict'

//-------------
// Description
//-------------
// Shared memory object.

//-----------
// Variables
//-----------
const memory = {
    /*
    A series of domain objects each with individual file objects like...

    'local.test': {
        '/path/to/file.txt': {
            checked : 1554569901947, // unix timestamp
            content : null,          // contents of a file, if those contents are allowed to be cached in memory
            modified: 1554569710321  // unix timestamp
            size    : 1024           // bytes
        }
    }
    */
} // memory

//---------
// Exports
//---------
module.exports = memory