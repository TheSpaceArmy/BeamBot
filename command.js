'use strict';

var _ = require('lodash');
var Promise = require('bluebird');

function Command (defconfig) {
	if(_.isString(defconfig)) {
		defconfig = {
			name: defconfig
		};
	}

	this.config = _.merge(defconfig, {
		aliases: [],
		enabled: true
	});
}

Command.inherit = function (childCommand) {
	childCommand.prototype = Object.create(Command.prototype);
	childCommand.prototype.constructor = childCommand;
	return childCommand;
};

Command.ctor = function (self, defconfig) {
	return Command.apply(self, [defconfig]);
};

var allCommands = null;
function loadCommands() {
	if(allCommands) {
		return Promise.resolve(allCommands);
	}

	var dir = './commands/';
	return new Promise(function (resolve, reject) {
		var commands = {};
		require('readdirp')({ root: dir, findFilter: '*.js' })
		.on('data', function (entry) {
			var SubCommand = require(dir + entry.path);
			commands[entry.path.substr(0, entry.path.length - 3).replace(/\//g, '.')] = SubCommand;
		})
		.on('end', function () {
			resolve(commands);
		})
		.on('error', function (err) {
			reject(err);
		});
	}).then(function (commands) {
		allCommands = commands;
		return commands;
	});
}

Command.getAll = function(config, api, chatAPI) {
	return loadCommands().then(function (commands) {
		var cmdInstances = {};
		_.forEach(commands, function (SubCommand, key) {
			var cmd = new SubCommand();
			if(config && config[key]) {
				cmd.setConfig(config[key]);
			}
			if(api) {
				cmd.setAPI(api);
			}
			if(chatAPI) {
				cmd.setChatAPI(chatAPI);
			}
			if(cmd.config.enabled) {
				cmdInstances[cmd.config.name] = cmd;
				_.forEach(cmd.config.aliases, function(alias) {
					cmdInstances[alias] = cmd;
				});
			}
		});
		return cmdInstances;
	});
};

Command.prototype.run = function (/* message */) {
	console.error('Command ' + this.config.name + ' not implemented!');
	return Promise.reject('Not implemented');
};

Command.prototype.getConfig = function () {
	return _.cloneDeep(this.config);
};

Command.prototype.setConfig = function (config) {
	this.config = _.merge(this.config, config);
};

Command.prototype.setAPI = function (api) {
	this.api = api;
};

Command.prototype.setChatAPI = function (chatAPI) {
	this.chatAPI = chatAPI;
};

module.exports = Command;