var request = require('request');

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
                if (args.onError) args.onError("invalid token (" + method + ")");
            } else {
                var r = JSON.parse(body);
                if (r.error) {
                    if (args.onError) args.onError(r.error + " (" + method + ")");
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
                this.messagepollcount++;
                if (this.messagepollcount <= args.channels.length) { // polling interval too short
                    this.lastMessages({
                        channel: args.channels[c],
                        onCalled: function() {
                            this.messagepollcount--;
                        }.bind(this),
                        onError: args.onError,
                        onMessage: args.onMessage
                    });
                }
            }
        }.bind(this), messagePollingInterval);
    }
}

exports.lastMessages = function(args) {
    const channel = args.channel;
    if (this.ts[channel] == undefined) this.ts[channel] = 0;
    const channel_index = this.channels.map(function(e) {
        return e.name;
    }).indexOf(channel);
    if (channel_index == -1) { // bye bye
        if (args.onCalled) args.onCalled();
        if (args.onError) args.onError("can't find channel " + channel);
        return;
    }
    const channel_id = this.channels[channel_index].id;

    this.log("calling lastMessages() :: conversations.view for channel " + channel);
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
            for (var i in messages) {
                var ts = parseFloat(messages[i].ts);
                if (ts > this.ts[channel]) {
                    var msg = messages[i];
                    msg.channel = channel_id;
                    msg.channelname = channel;
                    if (msg.subtype == 'bot_message') { // message from bot
                        var bot = this.bots.map(function(e) { // do we have it alread?
                            return e.id;
                        }).indexOf(msg.bot_id);
                        if (bot != -1) {
                            msg.username = this.bots[bot].name;
                            if (args.onMessage) args.onMessage(msg, i);
                        } else { // nope, let's find out using the api
                            this.callMethod('bots.info', {
                                bot: msg.bot_id,
                                onError: args.onError,
                                onSuccess: function(r) {
                                    this.handle.bots.push(r.bot);
                                    this.msg.username = r.bot.name;
                                    if (args.onMessage) args.onMessage(this.msg, this.index);
                                }.bind({
                                    handle: this,
                                    msg: msg,
                                    index: i
                                })
                            });
                        }
                    } else { // message from normal user
                        for (var u in this.users) {
                            if (this.users[u].id == msg.user) {
                                msg.username = this.users[u].name;
                                if (args.onMessage) args.onMessage(msg, i);
                                break;
                            }
                        }
                    }
                    this.ts[channel] = ts;
                }
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
            no_members: true,
            name_tagging: true,
            no_user_profile: true,
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
