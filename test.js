#!/usr/bin/env node

var slack = require('./lib/index.js');

if(process.argv.length < 5) {
    console.log("Missing arguments, type:");
    console.log("npm run test -- team email password");
    return;
}

var team = process.argv[2];
var email = process.argv[3];
var password = process.argv[4];

slack.getSession({
    team: team,
    email: email,
    password: password,
    channels: ['general', 'random'],
    onError: function(err) {
        console.log(err);
    },
    onMessage: function(r) {
        console.log(r);
    },
    onSession: function() {

    }
});
