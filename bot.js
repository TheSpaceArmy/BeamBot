'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));

var BeamChatAPI = require('./api/chat/base');

var Module = require('./module');

function BeamBot (api, channel) {
	this.channel = channel;
	this.api = api;
	this.chatAPI = new BeamChatAPI(api, channel, true);
}

BeamBot.prototype.load = function () {
	var self = this;

	return fs.existsAsync('./config/channels/' + self.channel.getId() + '.js').then(function (exists) {
		if (exists) {
			return require('./config/channels/' + self.channel.getId() + '.js');
		} else {
			return require('./config/channels/default.js');
		}
	}).then(function (config) {
		return Module.getAll(config.modules, self).spread(function (modules, commands) {
			return [config, modules, commands];
		});
	}).spread(function (config, modules, commands) {
		self.chatAPI.on('ChatMessage', function (msg) {
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

		return Module.initAll(modules);
	}).then(function () {
		self.isLoaded = true;
	});
};

BeamBot.prototype.start = function () {
	if(!this.isLoaded) {
		throw 'BeamBot is not loaded';
	}

	return this.chatAPI.connect();
}

BeamBot.prototype.getAPI = function () {
	return this.api;
};

BeamBot.prototype.getChatAPI = function () {
	return this.chatAPI;
};

module.exports = BeamBot;
