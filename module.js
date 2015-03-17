'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));

var Command = require('./command');

function Module (defconfig) {
	if (_.isString(defconfig)) {
		defconfig = {
			name: defconfig
		};
	}

	this.config = _.merge(defconfig, {
		enabled: true
	});
}

Module.inherit = function (childModule) {
	childModule.prototype = Object.create(Module.prototype);
	childModule.prototype.constructor = childModule;
	return childModule;
};

Module.ctor = function (self, defconfig) {
	return Module.apply(self, [defconfig]);
};

function loadModules () {
	return fs.readdirAsync('./modules/').then(function (files) {
		var modules = {};
		_.forEach(files, function (file) {
			modules[file] = require('./modules/' + file + '/module.js');
		});
		return modules;
	});
}

Module.getAll = function (config, api, chatAPI) {
	var cmdInstances = {};
	return loadModules().then(function (modules) {
		var moduleInstances = {};
		_.forEach(modules, function (Module, dir) {
			var module = new Module();
			if (config && config[dir]) {
				module.setConfig(config[dir]);
			}
			if (api) {
				module.setAPI(api);
			}
			if (chatAPI) {
				module.setChatAPI(chatAPI);
			}
			if (module.config.enabled) {
				moduleInstances[dir] = module;
			}
		});
		return moduleInstances;
	}).then(function (modules) {
		var res = [];
		_.forEach(modules, function (module, dir) {
			res.push(Command.getAllForDir('./modules/' + dir + '/', module.config.commands, api, chatAPI)
						.then(function (commands) {
				module.commands = commands;
				cmdInstances = _.merge(cmdInstances, commands);
			}));
		});
		return Promise.all(res).return([modules, cmdInstances]);
	});
};

Module.prototype.init = function () {

};

Module.prototype.getConfig = function () {
	return _.cloneDeep(this.config);
};

Module.prototype.setConfig = function (config) {
	this.config = _.merge(this.config, config);
};

Module.prototype.setAPI = function (api) {
	this.api = api;
};

Module.prototype.setChatAPI = function (chatAPI) {
	this.chatAPI = chatAPI;
};

module.exports = Module;
