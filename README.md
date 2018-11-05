# Shirk

An unofficial but eventually useful tokenless Slack library with minimal dependencies.

Shirk authenticates agaisn't normal user credentials (email and password) and doesn't require any bot token to operate. It creates a valid session by emulating the browser behaviour just like the official Slack web client.

This is useful when you don't have access to a token to connect your bot and use the official Slack API.

Please note that:

 * Some scrapping is involved, as well as undocumented private APIs, so this may break at any moment.
 * 2FA is not yet supported

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

Here's an example:

```javascript
var shirk = require('shirk');

const channels=['general', 'random'];

shirk.getSession({
    team: 'teamname',
    email: 'email@domain.com',
    password: 'PaSsw0rd',
    onError: function(err) {
        console.log(err);
    },
    onSession: function(session) {

        // your stuff here

        console.log("We have a session: ");
        console.log(session.info());
        console.log("Listening to channels "+channels.join(','));

        session.listenChannels({
            channels: channels,
            onMessage: function(message) {
                console.log(message);
            },
            onMessageThread: function(message) {
                console.log(message);
            },
            onReaction: function(reaction) {
                console.log(reaction);
            },
            onReady: function() {
                console.log("We're listening");
            }
        });

    }
});
```

## Methods

**getSession(args)**

Starts a Slack session.

args:

 * team - team name (without slack.com)
 * email - acccount
 * password - password
 * onError(err) - callback function to return errors
 * onSession(session) - callback function to return a good session
 * debug - boolean, true if you want console debug

**session.info()**

Return the session information: token, session_uid.

**session.listenChannels(args)**

Listens for messages in a list of channels. Fires up events when a new message arrives.

args:

 * channels - array of channels to listen to
 * onError(err) - callback function to return errors
 * onMessage(message) - callback function when a new message arrives
 * onMessageThread(message) - callback function when a new reaction to a message arrives
 * onReaction(reaction) - callback function when a new reaction to a message arrives

example of message:

```javascript
{ type: 'message',
  user: 'U3AE4L4F5',
  text: 'Has anyone else had trouble claiming this?',
  client_msg_id: 'A8D34254-B724-42C7-8A32-B2D17DE6A3A2',
  ts: '1515209040.000173',
  channel: 'A0S7VK72A',
  channelname: 'general',
  username: 'shirk' }
```

_real usernames and channelnames are added to the message structure, along with the ids, for convenience, both from normal users or bots_

## Using Slack's Web API methods

You can use any normal [Slack API method][2] after getting a valid session with getSession(). Here's an example:

```javascript
var shirk = require('shirk');

shirk.getSession({
    team: 'teamname',
    email: 'email@domain.com',
    password: 'PaSsw0rd',
    onError: function(err) {
        console.log(err);
    },
    onSession: function(session) {

        session.callMethod('emoji.list', {
            onError: function(error) {
                console.log(error);
            },
            onSuccess: function(r) {
                console.log(r);
            }
        });

    }
});
```

## Data structures

You can access these data structures once a session is open:

**session.channels**

List of channels. Example:

```javascript
[ { id: 'A4ZA28E3M',
    name: 'general',
    is_archived: false,
    is_general: false,
    is_muted: false,
    is_member: true,
    name_normalized: 'general',
    unread_count: 0,
    unread_count_display: 0,
    is_pending_ext_shared: false },
    ...
    {
        ...
    }
]
```

**session.users**

List of users in the team. Example:

```javascript
[
  { id: 'U3AEKELAH',
    team_id: 'T1A7TIA62',
    name: 'mike',
    deleted: false,
    color: '5870dd',
    real_name: 'Mike Foo',
    tz: 'Europe/London',
    tz_label: 'British Summer Time',
    tz_offset: 3600,
    profile:
     { title: '',
       phone: '',
       skype: '',
       real_name: 'Mike Foo',
       real_name_normalized: 'Make Foo',
       display_name: 'mike',
       display_name_normalized: 'mike',
       status_text: '',
       status_emoji: '',
       status_expiration: 0,
       avatar_hash: '232938482734',
       image_original: 'https://a.com/98237424_original.png',
       email: 'mail@mike.com',
       team: 'T1A7TIA62',
       is_custom_image: true },
    is_admin: false,
    is_owner: false,
    is_primary_owner: false,
    is_restricted: false,
    is_ultra_restricted: false,
    is_bot: false,
    updated: 1512234520,
    is_app_user: false,
    has_2fa: false },
    ...
    {
        ...
    }
]
```

## Changelog

You can check the [changelog here][3].

## Disclaimer

I've made this library for my own use. Use it at your own risk. I assume no responsibility or liability for any errors or omissions with this software. The information contained here is provided on an “as is” basis with no guarantees of completeness, accuracy, usefulness or timeliness and without any warranties of any kind whatsoever, express or implied.

[1]: https://github.com/celso/shirk/blob/master/test.js
[2]: https://api.slack.com/methods
[3]: CHANGELOG.md
