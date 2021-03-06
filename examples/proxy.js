#!/usr/bin/env node

const slack = require('../lib/index.js');
const util = require('util');
const fs = require('fs');
const {
    WebClient
} = require('@slack/client');

if (process.argv.length < 3) {
    console.log("Missing arguments, type:");
    console.log("npm run test -- proxy.json");
    return;
}

var config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const cool_off_timeout = Date.now() + 20000; // in miliseconds

var channels = Object.keys(config.destination.mappings);
var channels_ids = {};
var ts_map = {};

const web = new WebClient(config.destination.token);

console.log(config.source);

slack.getSession({
    team: config.source.team,
    email: config.source.email,
    password: config.source.password,
    debug: false,
    onError: function(error) {
        console.log(error);
        process.exit(1);
    },
    onSession: function(session) {

        console.log("We have a session: ");
        console.log(session.info());
        console.log("Listening to channels " + channels.join(','));

        getChannels(function(d_channels) {

            // map channes from source to destination
            for (var ci in channels) {
                var i = d_channels.map(function(e) {
                    return (e.name);
                }).indexOf(config.destination.mappings[channels[ci]]);
                if (i !== -1) {
                    channels_ids[channels[ci]] = d_channels[i].id;
                } else {
                    console.log("Can't find channel " + config.destination.mappings[channels[ci]] + ". Exiting.");
                    process.exit(1);
                    return;
                }
            }
            // end mapping

            var initDate = Date.now();

            session.listenChannels({
                channels: channels,
                onError: function(error) {
                    console.log(error);
                },

                onMessage: function(message) {
                    console.log("Got a new message in channel " + message.channelname);
                    console.log(util.inspect(message, false, null))
                    sendMessage(session, message);
                },

                onMessageThread: function(message) {
                    console.log("Got a new threaded message in channel " + message.channelname);
                    console.log(util.inspect(message, false, null))
                    sendMessage(session, message);
                },

                onReaction: function(reaction) {
                    console.log("Got a new reaction");
                    console.log(util.inspect(reaction, false, null))

                    console.log(channels_ids[reaction.channel]);
                    console.log(ts_map[parseFloat(reaction.ts)]);

                    if (channels_ids[reaction.channel] && ts_map[parseFloat(reaction.ts)]) {

                        web.reactions.add({
                            name: reaction.name,
                            channel: channels_ids[reaction.channel],
                            timestamp: ts_map[parseFloat(reaction.ts)]
                        }).then((res) => {
                            console.log('Reaction sent');
                        }).catch(console.error);

                    }

                }

            });


        });

    }
});

function sendMessage(session, message) {

    if (cool_off_timeout > Date.now()) return; // chillout in the first seconds to avoid message storming

    var nm = {
        channel: channels_ids[message.channelname],
        mrkdwn: true,
        unfurl_links: false,
        unfurl_media: false,
        text: parseUsers(message.text, session.users)
    };

    switch (message.subtype) {
        case undefined:
            nm.username = message.meta.user.real_name + ' @ ' + config.source.team + ' #' + message.channelname;
            nm.icon_url = 'https://api.adorable.io/avatars/72/' + message.meta.user.id + '.png';
            break;
        case "bot_message":
            nm.username = message.meta.bot.name + ' @ ' + config.source.team + ' #' + message.channelname;
            nm.icon_url = message.meta.bot.icons.image_72;
            break;
        default:
            return; // other subtypes don't matter
            break;
    }

    if (message.attachments) nm.attachments = message.attachments;
    if (message.title) nm.title = message.title;
    if (message.title_link) nm.title_link = message.title_link;
    if (message.color) nm.color = message.color;
    if (message.thread_ts && ts_map[parseFloat(message.thread_ts)]) nm.thread_ts = ts_map[parseFloat(message.thread_ts)]; // from a thread

    web.chat.postMessage(nm).then((res) => {
        console.log('Message sent: ', res.ts);
        ts_map[parseFloat(message.ts)] = res.ts;
    }).catch(console.error);

}

function getChannels(callback) {

    var channels = [];

    web.channels.list().then((res) => {
        res.channels.forEach(item => {
            channels.push(item);
        });
        web.groups.list().then((res) => {
            res.groups.forEach(item => {
                channels.push(item);
            });
            callback(channels);
        }).catch(console.error);
    }).catch(console.error);
}

function parseUsers(m, userdb) {
    var users = m.match(/<@[0-9A-Za-z]+>/gi);
    for (var i in users) {
        var user = users[i].match(/[0-9A-Za-z]+/i);
        for (var u in userdb) {
            if (userdb[u].id == user[0]) {
                m = m.replace(users[i], "_" + userdb[u].real_name + "_,");
            }
        }
    }
    return (m);
}
