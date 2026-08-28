**This software is no longer being tested or updated.**

# Tome

A zero dependency web server.

## Navigation

* [Features](#features)
* [Install](#install)
* [Quickstart Guide](#quickstart-guide)
* [Advanced Uses](#advanced-uses)
* [License](#license)

## Features

* Access Logs
* Cache Control and ETags
* Compressed File Formats
* Content Security Policies
* Custom Errors
* Direct Link Protection
* HTTP and HTTPS
* Memory Cache
* Pretty URLs
* Redirects
* Single and Multiple Domains
* Static and Streaming Files

## Install

Make sure you have [Node](https://nodejs.org/en/) version 14 or greater. You can check your node version by running `node --version`.

Run `npm link` from the Tome folder. You should now be able to run `tome` from any location and it will always use your latest changes to the codebase.

## Quickstart Guide

Tome requires a `tome-config.js` or `tome.js` file to tell it what to do. The quickest way to make a config file is the init command.

```
tome --init
```

The config file will have a few absolutely necessary items available to edit with other common options commented out in case you ever want to enable those.

At a minimum, you'll want to edit the `option.sitePath` location to point to a folder where you have HTML and other web files to serve. The path should be absolute or you can use relative paths by using the `__dirname` environment variable provided by Node.

```js
// macOS and Linux
option.sitePath = __dirname + '/web'

// Windows
option.sitePath = __dirname + '\\web'
```

Once your config file is saved, run `tome` to start a web server. Assuming there are no errors, your web site should be available at `localhost` or whatever other host name you setup that resolves to your own machine.

## Advanced Uses

Tome shares its own `tome` object with every Tome config file and that opens up a lot of possibilities. For example, you can change any `code/option.js` or `code/shared.js` setting from your config file without having to touch the original codebase.

How about adding or replacing functions within `code/functions.js`? Yep.

Want to customize any of the flow functions in `code/flow`? Want to setup your own flow function to go beyond static file serving and host an API? I ran this very same setup for years in production. Works great and you get to leverage not just everything in Tome but everything in Node too. All within the comfort of your own custom config file.

## License

[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)

This work has been marked as dedicated to the public domain.