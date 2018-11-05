var request = require('request');
var hash = require('object-hash');
var util = require('util');

var headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv: 49.0) Gecko / 20100101 Firefox / 49.0 "
};

// require('request-debug')(request);

function compareMessage(a, b) {
    if (parseFloat(a.ts) < parseFloat(b.ts))
        return -1;
    if (parseFloat(a.ts) > parseFloat(b.ts))
        return 1;
    return 0;
}

const messagePollingInterval = 10000;
const authValidationInterval = 15000;

exports.team = false;
exports.counter = 0;
exports.token = false;
exports.version_uid = false;
exports.channels = [];
exports.users = [];
exports.bots = [];
exports.ts = {};
exports.reactions = {};
exports.thread_ts = {};
exports.last_thread_req = Date.now();
exports.jar = request.jar()
exports.debug = false;

exports.getSession = function(args) {
    this.team = args.team;
    this.debug = args.debug ? args.debug : false;
    this.log("Getting crumb cookie");
    request.get({
        timeout: 5000,
        headers: headers,
        jar: this.jar,
        url: 'https://' + this.team + '.slack.com/'
    }, function(error, httpResponse, body) {
        if (error || (httpResponse && httpResponse.statusCode != 200)) {
            if (args.onError) args.onError("Crumb cookie grab failed");
        } else {
            // <input type="hidden" name="crumb" value="s-1521890-5ab54dfb3c13f7cf6ce8416286efc088eb1687ac989bb-☃" />
            var re = /name=\"crumb\" value=\"([^\"]+)\"/i;
            var vv = body.match(re);
            if (vv && vv[1]) {
                var crumb = vv[1];
                this.log("Got crumb cookie, now getting api_token and version_uid");
                request.post({
                    url: 'https://' + this.team + '.slack.com/',
                    jar: this.jar,
                    headers: headers,
                    followAllRedirects: true,
                    form: {
                        signin: 1,
                        redir: '',
                        crumb: crumb,
                        email: args.email,
                        password: args.password,
                        remember: 'on'
                    }
                }, function(err, httpResponse, body) {
                    if (err || (httpResponse && httpResponse.statusCode != 200)) {
                        if (args.onError) args.onError("authentication request failed");
                    } else {
                        var re = /api_token: \"([a-z0-9\-]+)\"/i;
                        var f1 = body.match(re);

                        var re = /version_uid: \"([a-z0-9]+)\"/i;
                        var f2 = body.match(re);

                        if (f1 && f1[1] && f2 && f2[1]) { // got token ?
                            this.log("Got api_token and version_uid, now calling users.list()");
                            this.version_uid = f2[1];
                            this.token = f1[1];
                            this.callMethod('users.list', {
                                onError: args.onError,
                                onSuccess: function(r) {
                                    this.users = r.members;
                                    this.log("Got users.list(), now getting users.counts()");
                                    this.callMethod('users.counts', {
                                        onError: args.onError,
                                        onSuccess: function(r) {
                                            for (var i in r.channels) this.channels.push(r.channels[i]);
                                            for (var i in r.groups) this.channels.push(r.groups[i]);
                                            if (args.onSession) args.onSession(this); // We have a session, callback
                                            this.authenticator(args);
                                        }.bind(this)
                                    });
                                }.bind(this)
                            });
                        } else {
                            if (args.onError) args.onError("authentication credentials failed");
                        }
                    }
                }.bind(this));
            } else {
                if (args.onError) args.onError("couldn't find crumb code");
            }
        }
    }.bind(this));
}

exports.authenticator = function(args) {
    // lets call auth validation every once in a while
    this.authValidator = setInterval(function() {
        this.log("Calling auth.currentSessions");
        var ts = Date.now() / 1000;
        request.post({
            url: 'https://' + this.team + '.slack.com/api/auth.currentSessions?_x_id=' + this.version_uid.substring(0, 8) + "-" + ts,
            jar: this.jar,
            headers: headers,
            form: {
                token: this.token
            }
        }, function(err, httpResponse, body) {
            if (err) {
                if (args.onError) args.onError("auth.currentSessions failed " + err);
            } else if (httpResponse && httpResponse.statusCode != 200) {
                if (args.onError) args.onError("auth.currentSessions invalid token");
            } else {
                var r = JSON.parse(body);
                if (r.error) {
                    if (args.onError) args.onError("auth.currentSessions " + r.error);
                    this.token = false;
                    clearInterval(this.authValidator);
                }
            }
        }.bind(this));
    }.bind(this), authValidationInterval);
}

exports.info = function() {
    return ({
        version_uid: this.version_uid,
        token: this.token,
        team: this.team
    });
}

exports.listenChannels = function(args) {
    if (args.onMessage) {
        this.messagepollcount = 0;
        setInterval(function() {
            this.log("listenChannels() :: setInterval() triggered (messagepollcount: " + this.messagepollcount + ")");
            for (var c in args.channels) {
                if (this.messagepollcount <= args.channels.length) { // polling interval too short
                    this.messagepollcount++;
                    this.lastMessages({
                        channel: args.channels[c],
                        onCalled: function() {
                            this.messagepollcount--;
                        }.bind(this),
                        onError: args.onError,
                        onMessage: args.onMessage,
                        onMessageThread: args.onMessageThread,
                        onReaction: args.onReaction
                    });
                }
            }
        }.bind(this), messagePollingInterval);
    }
}

exports.countReactions = function(reactions) {
    var n = 0;
    if (reactions) {
        var counts = reactions.map(function(e) {
            return (e.count);
        });
        for (var i in counts) n += counts[i];
    }
    return (n);
}

exports.handleReactions = function(reactions, channel, ts, callback) {
    if (reactions && callback) {
        if (this.reactions[channel][ts] == undefined) this.reactions[channel][ts] = [];
        if (hash(reactions) != hash(this.reactions[channel][ts])) { // something changed, let's go through the object

            function sendEvent(name, user, count, dir) {
                var r = {
                    name: name,
                    ts: ts,
                    user: user,
                    count: count,
                    channel: channel,
                    add: dir,
                    remove: !dir,
                    action: (dir ? "add" : "remove")
                }
                callback(r);
            }

            function reactionCmp(r1, r2, dir) {
                for (var i in r1) {
                    var found = r2.map(function(e) {
                        return (e.name)
                    }).indexOf(r1[i].name);
                    if (found == -1) { // it's a new one
                        for (var k in r1[i].users) {
                            sendEvent(r1[i].name, r1[i].users[k], r1[i].users.length, dir);
                        }
                    } else {
                        // added reactions
                        for (var k in r1[i].users) {
                            if (r2[found].users.indexOf(r1[i].users[k]) == -1) {
                                sendEvent(r1[i].name, r1[i].users[k], r1[i].users.length, dir);
                            }
                        }
                        // removed reactions
                        for (var k in r2[found].users) {
                            if (r1[i].users.indexOf(r2[found].users[k]) == -1) {
                                sendEvent(r2[found].name, r2[found].users[k], r2[found].users.length, !dir);
                            }
                        }
                    }
                }
            }

            reactionCmp(reactions, this.reactions[channel][ts], true);
            reactionCmp(this.reactions[channel][ts], reactions, false);

            this.reactions[channel][ts] = reactions;
        }
    }
}

exports.handleMessage = function(msg, channel_id, channel_name, index, callback) {
    if (callback == undefined) return;
    msg.meta = {};
    msg.channel = channel_id;
    msg.channelname = channel_name;
    if (msg.subtype == 'bot_message') { // message from bot
        var bot = this.bots.map(function(e) { // do we have it alread?
            return e.id;
        }).indexOf(msg.bot_id);
        if (bot != -1) {
            msg.username = this.bots[bot].name;
            msg.meta.bot = this.bots[bot];
            callback(msg, index);
        } else { // nope, let's find out using the api
            this.callMethod('bots.info', {
                bot: msg.bot_id,
                onSuccess: function(r) {
                    this.handle.bots.push(r.bot);
                    this.msg.username = r.bot.name;
                    this.msg.meta.bot = r.bot;
                    callback(this.msg, index);
                }.bind({
                    handle: this,
                    msg: msg
                })
            });
        }
    } else { // message from normal user
        for (var u in this.users) {
            if (this.users[u].id == msg.user) {
                msg.username = this.users[u].name;
                msg.meta.user = this.users[u];
                callback(msg, index);
                break;
            }
        }
    }
}

exports.lastMessages = function(args) {
    const channel = args.channel;
    if (this.ts[channel] == undefined) this.ts[channel] = 0;
    if (this.thread_ts[channel] == undefined) this.thread_ts[channel] = 0;
    if (this.reactions[channel] == undefined) this.reactions[channel] = {};
    const channel_index = this.channels.map(function(e) {
        return e.name;
    }).indexOf(channel);
    if (channel_index == -1) { // bye bye
        if (args.onCalled) args.onCalled();
        if (args.onError) args.onError("can't find channel " + channel);
        return;
    }
    const channel_id = this.channels[channel_index].id;

    this.log("calling lastMessages() :: conversations.view for channel " + channel + " (" + this.messagepollcount + ")");
    this.callMethod('conversations.view', {
        name: channel_id,
        onError: function(error) {
            if (args.onCalled) args.onCalled();
            if (args.onError) args.onError(error);
        },
        onSuccess: function(r) {
            if (args.onCalled) args.onCalled();
            var messages = r.history.messages;
            messages.sort(compareMessage);

            // Iterate messages
            for (var i in messages) {

                var msg = messages[i];
                var ts = parseFloat(msg.ts);

                // Grab threads
                // https://api.slack.com/docs/message-threading
                if (msg.reply_count) { // this message has replies

                    var found = msg.replies.map(function(e) {
                        return (e.ts > this ? true : false)
                    }.bind(this.thread_ts[channel])).indexOf(true);

                    // any of them is new? or has it been too long (30secs), so let's check it out
                    if (found != -1 || (Date.now() - 30 * 1000) > this.last_thread_req) {

                        this.log("calling lastMessages() :: groups.replies for channel_id " + channel_id);
                        this.last_thread_req = Date.now();

                        this.callMethod('groups.replies', {
                            channel: channel_id,
                            thread_ts: msg.thread_ts,
                            onError: args.onError,
                            onSuccess: function(r) {
                                for (var j in r.messages) {
                                    var msg = r.messages[j];
                                    var ts = parseFloat(msg.ts);
                                    if (ts > this.handle.thread_ts[this.channel]) {

                                        if (r.messages[j].parent_user_id) { // ignore first thread message, has no parent_user_id
                                            this.handle.handleMessage(r.messages[j], this.channel_id, this.channel, j, args.onMessageThread);
                                        }
                                        this.handle.thread_ts[this.channel] = ts;
                                    }
                                    // Handle new reactions
                                    this.handle.handleReactions(r.messages[j].reactions, this.channel, ts, args.onReaction);
                                }
                            }.bind({
                                handle: this,
                                msg: msg,
                                channel_id: channel_id,
                                channel: channel
                            })
                        });
                    } // indexOf
                } // reply_count

                if (ts > this.ts[channel]) { // Handle new messages
                    this.handleMessage(msg, channel_id, channel, i, args.onMessage);
                    this.ts[channel] = ts;
                }

                // Handle new reactions
                this.handleReactions(msg.reactions, channel, ts, args.onReaction);
            }

        }.bind(this)
    });
};

exports.callMethod = function(method, args) {
    if (this.token == false) {
        if (args.onError) args.onError("token is invalid (" + method + ")");
    } else {
        var ts = Date.now() / 1000;
        var form = {
            canonical_avatars: true,
            include_full_users: true,
            count: 49,
            ignore_replies: true,
            include_pin_count: true,
            no_members: false,
            name_tagging: true,
            no_user_profile: false,
            token: this.token
        };
        var keys = Object.keys(args);
        for (var i in keys) {
            form[keys[i]] = args[keys[i]];
        }
        request.post({
            url: 'https://' + this.team + '.slack.com/api/' + method + '?_x_id=' + this.version_uid.substring(0, 8) + "-" + ts,
            jar: this.jar,
            headers: headers,
            form: form
        }, function(err, httpResponse, body) {
            if (err) {
                if (args.onError) args.onError(err + " (" + method + ")");
            } else if (httpResponse && httpResponse.statusCode != 200) {
                if (args.onError) args.onError("callMethod failed (" + method + ")");
            } else {
                // console.log(httpResponse.headers);
                if (args.onSuccess) args.onSuccess(JSON.parse(body));
            }
        });
    }
}

exports.log = function(...args) {
    if (this.debug) {
        console.log(...args);
    }
}
