#!/usr/bin/env node

var slack = require('./lib/index.js');

var email = process.env['email'];
var password = process.env['password'];
var team = process.env['team'];

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
