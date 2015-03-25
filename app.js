'use strict';

var _ = require('lodash');
var child_process = require('child_process');

var config = require('./config/config');

var BeamAPI = require('./api/base').extend('channel').extend('user');
var api = new BeamAPI(config.username, config.password);

//var ModuleManager = require('./module').ModuleManager; //TODO: THIS
var globalModules = {}; //TODO: Load

var XPC = require('./xpchelper');

api.login().then(function (user) {
	console.log('Logged in as ' + user.data.username + '. Joining channels...');
	_.forEach(config.channels, function (channelID) {
		var child = child_process.fork('./app_bot', [channelID], {silent: false});
		child.xpc = new XPC(api, child, globalModules);
	});
}).catch(function (err) {
	console.log('Login error: ', err);
});
