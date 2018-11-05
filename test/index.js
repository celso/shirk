'use strict';
const http = require('http');
const fs = require('fs');

if (!process.env.SLACK_TEAM || !process.env.SLACK_USER || !process.env.SLACK_PASSWORD) {
    console.log("One of there env vars is not defined SLACK_TEAM, SLACK_USER, SLACK_PASSWORD");
    console.log("Quiting...");
    process.exit(0);
}

describe('Testing Shirk', function() {
    var slack = require('../lib/index');
    var session = false;
    var test_channel = false;

    beforeEach(function() {});
    afterEach(function() {});
    before(function() {});
    after(function() {
        process.exit(0);
    });

    describe('testing slack.getSession()', function() {
        it('responds to slack.getSession()', function(done) {
            this.timeout(10000);
            slack.getSession({
                team: process.env.SLACK_TEAM,
                email: process.env.SLACK_USER,
                password: process.env.SLACK_PASSWORD,
                debug: false,
                onError: function(error) {
                    return (done(new Error(error)));
                },
                onSession: function(r) {
                    session = r;
                    done();
                }
            });
        });
    });

    describe('testing session.callMethod("channels.create")', function() {
        it('responds to session.callMethod("channels.create")', function(done) {
            session.callMethod('channels.create', {
                name: 'shirk-tests',
                validate: true,
                onError: function(error) {
                    return (done(new Error(error)));
                },
                onSuccess: function(r) {
                    if (r.ok || (r.ok == false && r.error == 'name_taken')) {
                        console.log(r);
                        test_channel = r.id;
                        done();
                    } else {
                        return (done(new Error(r.error)));
                    }
                }
            });

        });
    });

    describe('testing session.listenChannels()', function() {
        it('responds to session.listenChannels()', function(done) {

            session.listenChannels({
                channels: ['shirk-tests'],
                onError: function(error) {
                    console.log(error);
                },
                onMessage: function(message) {
                    console.log("--------- Message -----------");
                    console.log(message);
                },
                onMessageThread: function(message) {
                    console.log("--------- Thread Message -----------");
                    console.log(message);
                },
                onReaction: function(reaction) {
                    console.log("--------- Reaction -----------");
                    console.log(reaction);
                },
                onReady: function() {
                    console.log("------- We're ready --------------");
                }
            });

        });
    });

    describe('testing session.callMethod("emoji.list")', function() {
        it('responds to session.callMethod("emoji.list")', function(done) {
            session.callMethod('emoji.list', {
                onError: function(error) {
                    return (done(new Error(error)));
                },
                onSuccess: function(r) {
                    if (r.ok) {
                        done();
                    } else {
                        return (done(new Error(r.error)));
                    }
                }
            });

        });
    });

    describe('testing session.callMethod("channels.delete")', function() {
        it('responds to session.callMethod("channels.delete")', function(done) {
            session.callMethod('channels.delete', {
                channel: test_channel,
                onError: function(error) {
                    return (done(new Error(error)));
                },
                onSuccess: function(r) {
                    if (r.ok) {
                        done();
                    } else {
                        return (done(new Error(r.error)));
                    }
                }
            });

        });
    });

});
