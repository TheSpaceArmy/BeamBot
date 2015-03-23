'use strict';

var _ = require('lodash');
var child_process = require('child_process');

var config = require('./config/config');

var BeamAPI = require('./api/base').extend('channel').extend('user');
var api = new BeamAPI(config.username, config.password);

function getClassName(object) {
	return Object.getPrototypeOf(object).constructor.name;
}

api.login().then(function (user) {
	console.log('Logged in as ' + user.data.username + '. Joining channels...');
	_.forEach(config.channels, function (channelID) {
		var child = child_process.fork('./app_bot', [channelID], {silent: false});
		child.on('message', function (message) {
			var returnData = {id: message.id};
			api[message.method].apply(api, message.args).then(function (result) {
				returnData.success = true;
				if (result.data) {
					returnData.data = result.data;
					returnData.class = getClassName(result);
				} else {
					returnData.data = result;
				}
				child.send(returnData);
			}, function (error) {
				returnData.data = error;
				returnData.success = false;
				child.send(returnData);
			});
		});
	});
}).catch(function (err) {
	console.log('Login error: ', err);
});
