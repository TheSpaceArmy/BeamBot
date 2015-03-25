'use strict';

var _ = require('lodash');
var child_process = require('child_process');

var config = require('./config/config');

var BeamAPI = require('./api/base').extend('channel').extend('user');
var api = new BeamAPI(config.username, config.password);

var ModuleManager = require('./module').ModuleManager;

var XPC = require('./xpchelper');

api.login().then(function (user) {
	console.log('Logged in as ' + user.data.username + '. Joining channels...');
	return ModuleManager.getAll(null, null, true);
}).then(function (modules) {
	_.forEach(config.channels, function (channelID) {
		var child = child_process.fork('./app_bot', [channelID], {silent: false});
		child.xpc = new XPC(api, child, modules);
	});
}).catch(function (err) {
	console.log('Login error: ', err);
});
