var _ = require('lodash');
var fs = require('fs');

var config = require('./config/config');

var BeamAPI = require('./api/base');
var BeamChatAPI = require('./api/chat/base');

var api = new BeamAPI(config.username, config.password);
api.login().then(function(user) {
	console.log('Logged in as ' + user.name + '. Joining channels...');
	_.forEach(config.channels, function (channelID) {
		var chat = new BeamChatAPI(api, channelID, true);
		chat.connect().then(function() {
			var channelConfig = fs.existsSync('./config/channel/' + channelID + '.js') ? require('./config/channel/' + channelID + '.js') : require('./config/channel/default.js');
			//DONE
		}).catch(function (err) {
			console.log('Chat join error: ', err);
		});
	});
}).catch(function(err) {
	console.log('Login error: ', err);
});