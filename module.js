'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var EventEmitter = require('events').EventEmitter;

var Command = require('./command');

function Module (defconfig) {
	if (_.isString(defconfig)) {
		defconfig = {
			name: defconfig
		};
	}

	this.config = _.merge(defconfig, {
		enabled: true,
		dependencies: null
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
};

Module.prototype.init = function (/* ModuleManager */) {

};

Module.prototype.getConfig = function () {
	return _.cloneDeep(this.config);
};

Module.prototype.setConfig = function (config) {
	this.config = _.merge(this.config, config);
};

Module.prototype.setBot = function (bot) {
	this.bot = bot;
};

Module.prototype.getBot = function () {
	return this.bot;
};

Module.prototype.getAPI = function () {
	return this.bot.api;
};

Module.prototype.getChatAPI = function () {
	return this.bot.chatAPI;
};

//Modules collection
function initAll (self, modules, filter, inits) {	
	_.forEach(filter, function (moduleName) {
		var module = modules[moduleName];
		if(module._isInitAll) {
			console.error('Circular module dependency');
			return;
		}
		module._isInitAll = true;
		if(module.isInitialized) {
			return;
		}
		if(module.dependencies && module.dependencies.length > 0) {
			initAll(modules, module.dependencies, inits);
		}
		inits.push(module.init(self));
		module.isInitialized = true;
	});
	return inits;
}

function ModuleManager (modules) {
	this.modules = modules;
	EventEmitter.apply(this, []);
}

ModuleManager.prototype = Object.create(EventEmitter.prototype);
ModuleManager.prototype.constructor = ModuleManager;

ModuleManager.prototype.init = function () {
	return Promise.all(initAll(this, this.modules, Object.keys(this.modules), []));
};

ModuleManager.getAll = function (config, bot) {
	var cmdInstances = {};
	return loadModules().then(function (modules) {
		var moduleInstances = {};
		_.forEach(modules, function (Module, dir) {
			var module = new Module();
			if (config && config[dir]) {
				module.setConfig(config[dir]);
			}
			if (bot) {
				module.setBot(bot);
			}
			if (module.config.enabled) {
				moduleInstances[dir] = module;
			}
		});
		return moduleInstances;
	}).then(function (modules) {
		var res = [];
		_.forEach(modules, function (module, dir) {
			res.push(Command.getAllForDir('./modules/' + dir + '/', module.config.commands, module)
						.then(function (commands) {
				module.commands = commands;
				cmdInstances = _.merge(cmdInstances, commands);
			}));
		});
		return Promise.all(res).return([new ModuleManager(modules), cmdInstances]);
	});
};

module.exports = {
	Module: Module,
	ModuleManager: ModuleManager
};
