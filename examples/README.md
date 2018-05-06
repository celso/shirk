# Examples

To create a legacy bot token for your team, use [this link][1]

## Slack proxy

This example will proxy all incoming messages from a list of selected channels in a public team, using Shirk, to a single channel in another Slack team we own (or can issue tokens in), using the official client sdk with a Bot token.

Usage:

```javascript
./proxy.js -- teamname email@domain.com PaSsw0rd channel1,channel2,... "xoxb-3324424566-As84775ebDHy7474" mychannel
```

[1]: https://slack.com/apps/A0F7YS25R-bots
