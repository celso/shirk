# Shirk

An unofficial but eventually useful private API based Slack library with minimal dependencies.

This module authenticates agaisn't a normal slack user (not a bot) credentials, no token required, and creates a normal session, in the same way as the browser does, which is then used to call the same private API methods as the official web client.

This is useful when you don't have access to a token to connect your bot to the official Slack API.

You can just use this module to connect to any slack using your normal user credentials.

Please note that:

 * Only a minimal set of methods are supported.
 * Some scrapping is involved, as well as undocumented private APIs, so it may break at any moment.

## How to install

```
npm install --save shirk
```

## How to test

```
npm run test -- teamname email@domain.com PaSsw0rd
```

You can find the example test [code here][1].

## How to use

```javascript
var shirk = require('shirk');

shirk.getSession({
    team: 'teamname',
    email: 'email@domain.com',
    password: 'PaSsw0rd',
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

[1]: https://github.com/celso/shirk/blob/master/test.js
