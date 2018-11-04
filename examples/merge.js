#!/usr/bin/env node

const slack = require('../lib/index.js');
const util = require('util');
const fs = require('fs');
const {
    WebClient
} = require('@slack/client');

if (process.argv.length < 7) {
    console.log("Missing arguments, type:");
    console.log("npm run merge -- team email password from_channel to_channel");
    return;
}

var team = process.argv[2];
var email = process.argv[3];
var password = process.argv[4];
var fromName = process.argv[5];
var toName = process.argv[6];

var channels = [];

var getId = function(e) {
    return (e.id)
};

var getName = function(e) {
    return (e.name)
};

slack.getSession({
    team: team,
    email: email,
    password: password,
    debug: true,
    onError: function(error) {
        console.log(error);
    },
    onSession: function(session) {

        console.log("We have a session: ");
        console.log(session.info());

        session.callMethod('channels.list', { // public channels
            onError: function(error) {
                console.log(error);
            },
            onSuccess: function(r) {
                for (var i in r.channels) channels.push(r.channels[i]);
                session.callMethod('groups.list', { // private channels
                    onError: function(error) {
                        console.log(error);
                    },
                    onSuccess: function(r) {
                        for (var i in r.groups) channels.push(r.groups[i]);
                        var from = channels.map(getName).indexOf(fromName);
                        var to = channels.map(getName).indexOf(toName);

                        if (from !== -1 && to !== -1) {
                            console.log(from);
                            console.log(to);
                            for (var m in channels[from].members) {
                                console.log("Inviting " + channels[from].members[m] + " to channel #" + toName);
                                session.callMethod(channels[to].is_group ? 'groups.invite' : 'channels.invite', {
                                    channel: channels[to].id,
                                    user: channels[from].members[m],
                                    onError: function(error) {
                                        console.log(error);
                                    },
                                    onSuccess: function(r) {
                                        console.log(r);
                                    }
                                });
                            }

                        } else {
                            console.log("Channel does not existe");
                            console.log(fromName + ": " + from);
                            console.log(toName + ": " + to);
                        }
                    }
                });
            }
        });
    }
});
