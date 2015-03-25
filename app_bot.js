'use strict';

var channelID = process.argv[2];

var BeamBot = require('./bot');

var Module = require('./module').Module;
Module.prototype.xpcCall = function (prop) {
	var args = Array.prototype.slice.apply(arguments, 1);
	return xpc.send(this._idname, prop, args);
};

var apiData = {};
var api = Proxy.create({
	get: function (target, prop) {
		if (apiData[prop] !== undefined) {
			return apiData[prop];
		}

		return function () {
			var args = Array.prototype.slice.apply(arguments);
			return xpc.send('api', prop, args);
		};
	}
});

var XPC = require('./xpchelper');
var xpc = new XPC(api, process); //TODO: MODULES!

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
