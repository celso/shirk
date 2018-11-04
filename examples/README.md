# Examples

## Slack proxy

This example will proxy all incoming messages from a list of selected channels in a public team, using Shirk, to a single channel in another Slack team we own (or can issue tokens in), using the official client sdk with a Bot token.

Usage:

```javascript
./proxy.js configuration.json
```

### Configuration file

This is an example configuration file

To create a legacy xoxb- bot token for your team, use [this link][1]

In this example the channels **random** and **echo** in the source team (handled by shirk) map to the channel **random** on the destination team (handled by the native slack api)

Normal messages, message threads and reactions are supported.

Destination team avatars are handled by [Adorable Avatars][2].

Feel free to change the code.

```
{
    "source": {
        "team": "teamname",
        "email": "email@domain.com",
        "password": "PaSsw0rd"
    },
    "destination": {
        "token": "xoxb-3324424566-As84775ebDHy7474",
        "mappings": {
            "random": "random",
            "echo": "random"
        }
    }
}
```

## Merge two channels

In this example we invite all members of the *from* channel (public or private) to the *to* channel (public or private).

[1]: https://slack.com/apps/A0F7YS25R-bots
[2]: http://avatars.adorable.io/
