'use strict';

var _ = require('lodash');

var BeamAPI = require('./api/base').extend('channel').extend('user');
var BeamBot = require('./bot');

var config = require('./config/config');

var api = new BeamAPI(config.username, config.password);

api.login().then(function (user) {
	console.log('Logged in as ' + user.username + '. Joining channels...');
	_.forEach(config.channels, function (channelID) {
		api.getChannel(channelID).then(function(channel) {
			var bot = new BeamBot(api, channel);
			bot.load().then(function () {
				return bot.start();
			}).then(function () {
				console.log('Channel ' + channel.getId() + ' joined!');
			}).catch(function (err) {
				console.log('Channel ' + channel.getId() + ' error: ', err, err.stack);
			});
		});
	});
}).catch(function (err) {
	console.log('Login error: ', err);
});
