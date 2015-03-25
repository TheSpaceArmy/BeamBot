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

	this.config = _.merge({
		enabled: true,
		dependencies: null
	}, defconfig);
}

Module.inherit = function (childModule) {
	childModule.prototype = Object.create(Module.prototype);
	childModule.prototype.constructor = childModule;
	return childModule;
};

Module.ctor = function (self, defconfig) {
	return Module.apply(self, [defconfig]);
};

function loadModules (isGlobalContext) {
	return fs.readdirAsync('./modules/').then(function (files) {
		var modules = {};
		_.forEach(files, function (file) {
			if (isGlobalContext) {
				if (fs.existsSync('./modules/' + file + '/global.js')) {
					modules[file] = require('./modules/' + file + '/global.js');
				} else {
					return;
				}
			}
			modules[file] = require('./modules/' + file + '/module.js');
		});
		return modules;
	});
}

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

Module.prototype.getStoragePath = function () {
	return process.cwd() + '/storage/' + this._idname;
};

Module.prototype.log = function (msg) {
	console.log(this._isGlobalContext ? '[GlOBAL]' : '[C:' + this.bot.getChatAPI().channel.getId() + ']', '<' + this._idname + '>', msg);
}

//Modules collection
function initAll (self, modules, filter, inits) {
	_.forEach(filter, function (moduleName) {
		var module = modules[moduleName];
		if (module._isInitAll) {
			console.error('Circular module dependency');
			return;
		}
		module._isInitAll = true;
		if (module.isInitialized) {
			return;
		}
		if (module.dependencies && module.dependencies.length > 0) {
			inits = initAll(modules, module.dependencies, inits);
		}
		var init = module.init(self);
		if (init && init.then) {
			inits.push(init.then(function (ret) {
				module.log('Initialized');
				return ret;
			}));
		} else {
			inits.push(new Promise(function (resolve) {
				module.log('Initialized');
				resolve();
			}));
		}
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

ModuleManager.getAll = function (channelConfig, bot, isGlobalContext) {
	var cmdInstances = {};
	return loadModules(isGlobalContext).then(function (modules) {
		var moduleInstances = {};
		_.forEach(modules, function (Module, dir) {
			var module = new Module();
			module._idname = dir;
			module._isGlobalContext = isGlobalContext;
			if (fs.existsSync('./config/modules/' + dir + '.js')) {
				module.setConfig(require('./config/modules/' + dir));
			}
			if (channelConfig && channelConfig[dir]) {
				module.setConfig(channelConfig[dir]);
			}
			if (!isGlobalContext) {
				module.setBot(bot);
			}
			if (module.config.enabled) {
				moduleInstances[dir] = module;
			}
			module.log('Loaded');
		});
		return moduleInstances;
	}).then(function (modules) {
		if (isGlobalContext) {
			return new ModuleManager(modules);
		}

		var res = [];
		_.forEach(modules, function (module, dir) {
			res.push(Command.getAllForDir('./modules/' + dir + '/', module.config.commands, module)
						.then(function (commands) {
				module.commands = commands;
				cmdInstances = _.merge(cmdInstances, commands);
			}));
			res.push(fs.mkdirAsync(module.getStoragePath()).catch(function () { }));
		});
		return Promise.all(res).return([new ModuleManager(modules), cmdInstances]);
	});
};

module.exports = {
	Module: Module,
	ModuleManager: ModuleManager
};
