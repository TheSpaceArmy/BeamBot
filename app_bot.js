'use strict';

var channelID = process.argv[2];

var Promise = require('bluebird');

var BeamBot = require('./bot');

var apiCallbackHandlers = {};
var apiCallbackID = 0;

var apiData = {};
var api = Proxy.create({
	get: function (target, prop) {
		if (apiData[prop] !== undefined) {
			return apiData[prop];
		}

		return function () {
			var callbackID = apiCallbackID++;
			var args = Array.prototype.slice.apply(arguments);
			return new Promise(function (resolve, reject) {
				apiCallbackHandlers[callbackID] = {resolve: resolve, reject: reject};
				process.send({id: callbackID, method: prop, args: args});
			});
		};
	}
});
process.on('message', function (message) {
	var handler = apiCallbackHandlers[message.id];
	if (!handler) {
		return;
	}
	delete apiCallbackHandlers[message.id];

	var data = message.data;
	if (message.class) {
		var Class = require('./api/classes/' + message.class);
		data = new Class(api, message.data);
	}

	if (message.success) {
		handler.resolve(data);
	} else {
		handler.reject(data);
	}
});

api.getCurrentUser().then(function (user) {
	apiData.currentUser = user;
}).then(function () {
	api.getChannel(channelID).then(function (channel) {
		var bot = new BeamBot(api, channel);
		bot.load().then(function () {
			return bot.start();
		}).then(function () {
			console.log('Channel ' + channel.getId() + ' joined!');
		}).catch(function (err) {
			console.log('Channel ' + channel.getId() + ' error: ', err.stack);
		});
	});
});
