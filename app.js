'use strict';

var _ = require('lodash');

var BeamAPI = require('./api/base');
var BeamBot = require('./bot');

var config = require('./config/config');

var api = new BeamAPI(config.username, config.password);

api.login().then(function (user) {
	console.log('Logged in as ' + user.username + '. Joining channels...');
	_.forEach(config.channels, function (channelID) {
		var bot = new BeamBot(api, channelID);
		bot.load().then(function () {
			return bot.start();
		}).then(function () {
			console.log('Channel ' + channelID + ' joined!');
		}).catch(function (err) {
			console.log('Channel ' + channelID + ' error: ', err);
		});
	});
}).catch(function (err) {
	console.log('Login error: ', err);
});
