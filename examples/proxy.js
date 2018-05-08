#!/usr/bin/env node

const slack = require('../lib/index.js');
const util = require('util')

const {
    WebClient
} = require('@slack/client');

if (process.argv.length < 7) {
    console.log("Missing arguments, type:");
    console.log("npm run test -- team email password channel1,channel2,... token channel");
    return;
}

const cool_off_period = 20; // in seconds

var team = process.argv[2];
var email = process.argv[3];
var password = process.argv[4];
var channels = process.argv[5].split(",");
var token = process.argv[6];
var d_channel = process.argv[7];

const web = new WebClient(token);

slack.getSession({
    team: team,
    email: email,
    password: password,
    debug: false,
    onError: function(error) {
        console.log(error);
    },
    onSession: function(session) {


        console.log("We have a session: ");
        console.log(session.info());
        console.log("Listening to channels " + channels.join(','));

        getChannels(function(d_channels) {

            var i = d_channels.map(function(e) {
                return (e.name);
            }).indexOf(d_channel);

            if (i != -1) {

                const d_chid = d_channels[i].id;
                var now = Math.floor(Date.now() / 1000);

                session.listenChannels({
                    channels: channels,
                    onError: function(error) {
                        console.log(error);
                    },
                    onMessage: function(message) {

                        var ts = Math.floor(Date.now() / 1000);

                        console.log("Got a new message in channel " + message.channelname);

                        if (ts - cool_off_period > now) { // chillout in the first seconds to avoid message storming

                            console.log(util.inspect(message, false, null))

                            var nm = {
                                channel: d_chid,
                                mrkdwn: true,
                                unfurl_links: false,
                                unfurl_media: false,
                                text: parseUsers(message.text, session.users)
                            };

                            switch (message.subtype) {
                                case undefined:
                                    nm.username = message.meta.user.real_name + ' @ ' + team + ' #' + message.channelname;
                                    nm.icon_url = 'https://api.adorable.io/avatars/72/' + message.meta.user.id + '.png';
                                    break;
                                case "bot_message":
                                    nm.username = message.meta.bot.name + ' @ ' + team + ' #' + message.channelname;
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

                            web.chat.postMessage(nm).then((res) => {
                                console.log('Message sent: ', res.ts);
                            }).catch(console.error);

                        }
                    }

                });


            }

        });


    }
});

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
