[![Build Status](https://travis-ci.org/lmtm/node-talon.svg)](https://travis-ci.org/lmtm/node-talon) [![Dependency Status](https://david-dm.org/lmtm/node-talon.png)](https://david-dm.org/lmtm/node-talon) [![devDependency Status](https://david-dm.org/lmtm/node-talon/dev-status.png)](https://david-dm.org/lmtm/node-talon#info=devDependencies)

node-talon
==========

Port of [mailgun/talon](https://github.com/mailgun/talon) (signature detection in mails) from Python to JavaScript.

This can be used to extract and strip signature from mail messages, allowing safer automatic parsing for example.

Installation
------------

```sh
npm install --save talon
```

Usage
-----

```js
var talon = require("talon");
var extractSignature = talon.signature.bruteforce.extractSignature;

var message = "Wow. Awesome!\n--\nBob Smith";

console.log(extractSignature(message));
```

expected output:

```
{ text: 'Wow. Awesome!', signature: '--\nBob Smith' }
```

Why the whole `talon.signature.bruteforce.extractSignature`?
------------------------------------------------------------

In the original library, there are multiple ways of extracting signatures. Here is implemented only one of the available methods, but I chose to keep the same namespace structure.

Roadmap
-------

### What's working?

* The bruteforce method of extracting signature
* Added French support

### What's not working?

* Everything else, including:
  * machine-learning way of extracting signature
  * quotations extraction

### What's planned?

* We'll need quotations handling very soon, so it will land fast
* The machine-learning thing is really not a priority
