var slack = require('./lib/index.js');

if (process.argv.length < 5) {
    console.log("Missing arguments, type:");
    console.log("npm run test -- team email password [channel1,channel2,...]");
    return;
}

var team = process.argv[2];
var email = process.argv[3];
var password = process.argv[4];
var channels = process.argv[5] ? process.argv[5].split(",") : ['general', 'random'];

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
        console.log("Listening to channels " + channels.join(','));

        /*
        session.callMethod('emoji.list', {
            onError: function(error) {
                console.log(error);
            },
            onSuccess: function(r) {
                console.log(r);
            }
        });
        */

        session.listenChannels({
            channels: channels,
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
            }
        });

    }
});
