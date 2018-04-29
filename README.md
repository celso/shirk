# Shirk

An unofficial but useful Slack client library based on the private client APIs.

This module authenticates a normal slack user (not a bot) and creates a normal session, in the same way as the browser does, which is then used to call the same private API methods as the official web client.

This is useful when you don't have access to a token to connect your bot to the official Slack API. You can just use this module to connect using your normal user credentials.

Please note that:

 * Only a minimal set of methods are supported.
 * It may break at any moment for obvious reasons.

## How to install

```
npm install --save shirk
```

## How to use

```javascript
var shirk = require('shirk');

var email = process.env['email'];
var password = process.env['password'];
var team = process.env['team'];

shirk.getSession({
    team: team,
    email: email,
    password: password,
    channels: ['general', 'random'],
    onError: function(err) {
        console.log(err);
    },
    onMessage: function(message) {
        console.log(message);
    },
    onSession: function() {
        // your stuff here
    }
});
```
