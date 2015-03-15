var config = require('./config');

var BeamAPI = require('./api/base');
var BeamChatAPI = require('./api/chat');

var api = new BeamAPI(config.username, config.password);
var chat = new BeamChatAPI(api, 127, true);

chat.on('ChatMessage', function(msg) {
	console.log(msg.user_name + ': ', msg.message);
});

chat.connect().catch(function(err) {
	console.log(err);
});