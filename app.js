var config = require('./config');

var BeamAPI = require('./api/base');
var BeamChatAPI = require('./api/chat');

var api = new BeamAPI(config.username, config.password);
var chat = new BeamChatAPI(api, 127, true);

chat.on('ChatMessage', function(msg) {
	if(msg.user.name === 'Core') {
		msg.delete();
	}
	console.log(msg.user.name + ': ' + msg.getText());
});

chat.connect().then(function() {
	console.log('Ready!');
}).catch(function(err) {
	console.log(err);
});