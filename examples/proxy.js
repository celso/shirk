#!/usr/bin/env node

var slack = require('../lib/index.js');
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

                        console.log(message);

                        if (ts - cool_off_period > now) { // chillout in the first seconds to avoid message storming

                            switch (message.subtype) {
                                case undefined:
                                    var user = message.meta.user;
                                    break;
                                case "bot_message":
                                    var user = message.meta.bot;
                                    break;
                                default:
                                    return; // other subtypes don't matter
                                    break;
                            }
                            var nm = {
                                channel: d_chid,
                                mrkdwn: true,
                                unfurl_links: false,
                                unfurl_media: true,
                                username: user.real_name + ' @ ' + team + ' #' + message.channelname,
                                text: message.text
                            };
                            if(message.attachments) nm.attachments = message.attachments;
                            if(message.title) nm.title = message.title;
                            if(message.title_link) nm.title_link = message.title_link;
                            if(message.color) nm.color = message.color;

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
