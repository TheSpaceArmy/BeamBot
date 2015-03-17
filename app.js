'use strict';

var _ = require('lodash');
var fs = require('fs');

var config = require('./config/config');

var BeamAPI = require('./api/base');
var BeamChatAPI = require('./api/chat/base');

var Module = require('./module');

var api = new BeamAPI(config.username, config.password);

api.login().then(function (user) {
	console.log('Logged in as ' + user.username + '. Joining channels...');
	_.forEach(config.channels, function (channelID) {
		var chat = new BeamChatAPI(api, channelID, true);
		chat.connect().then(function () {
			var config = fs.existsSync('./config/channels/' + channelID + '.js') ?
							require('./config/channels/' + channelID + '.js') :
							require('./config/channels/default.js');
			return Module.getAll(config.modules, api, chat).spread(function (modules, commands) {
				return [config, modules, commands];
			});
		}).spread(function (config, modules, commands) {
			chat.on('ChatMessage', function (msg) {
				var msgText = msg.getText();
				if (msgText.charAt(0) === '!') {
					var cmdArgs = msgText.substr(1).trim().split(' ');
					if (cmdArgs) {
						var cmd = cmdArgs.shift().toLowerCase();
						if (cmd) {
							if (commands[cmd]) {
								commands[cmd].run(msg).catch(function (err) {
									console.log('Command error:', err);
								});
							} else {
								msg.reply('Command not found');
							}
						}
					}
				} else {

				}
			});

			console.log('Channel ' + channelID + ' joined!');
		}).catch(function (err) {
			console.log('Chat init error: ', err);
		});
	});
}).catch(function (err) {
	console.log('Login error: ', err);
});
