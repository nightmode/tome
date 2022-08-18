<img src="https://raw.githubusercontent.com/nightmode/tome/master/images/tome.jpg" width="830" alt="">

# Tome

A zero dependency web server.

## Navigation

* [Features](#features)
* [Install](#install)
* [Quickstart Guide](#quickstart-guide)
* [Advanced Uses](#advanced-uses)
* [Donate](#donate)
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

Install Tome globally as a command line tool, accessible from anywhere.

```
npm install -g tome-server
```

If you would rather install Tome with the idea of hacking or developing your own fork, download Tome from GitHub and then run `npm link` from the main folder. You should now be able to run `tome` from any location and it will always use your latest changes to the codebase.

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

Tome shares its own `tome` object with every Tome config file and that opens up a lot of possibilities. For example, you can change any [code/option.js](https://github.com/nightmode/tome/blob/main/code/option.js) or [code/shared.js](https://github.com/nightmode/tome/blob/main/code/shared.js) setting from your config file without having to touch the original codebase.

How about adding or replacing functions within [code/functions.js](https://github.com/nightmode/tome/blob/main/code/functions.js)? Yep.

Want to customize any of the flow functions in [code/flow](https://github.com/nightmode/tome/tree/main/code/flow)? Want to setup your own flow function to go beyond static file serving and host an API? I ran this very same setup for years in production. Works great and you get to leverage not just everything in Tome but everything in Node too. All within the comfort of your own custom config file.

## Donate

Buy me [Bubble Tea](https://ko-fi.com/kai_nightmode). Support my work and get the ability to send me private messages on Ko-fi. ^_^

## License

MIT © [Kai Nightmode](https://twitter.com/kai_nightmode)

The MIT license does NOT apply to the name `Tome` or any of the images in this repository. Those items are strictly copyrighted to Kai Nightmode.