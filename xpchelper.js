'use strict';

var Promise = require('bluebird');

function XPC (api, sender, modules) {
	this.apiCallbackHandlers = {};
	this.apiCallbackID = 0;
	this.sender = sender;
	this.api = api;
	this.modules = modules;

	var self = this;
	sender.on('message', function (message) {
		var target;
		switch (message.action) {
			case 'api':
				target = self.api;
				break;
			case 'reply':
				var handler = self.apiCallbackHandlers[message.id];
				if (!handler) {
					return;
				}
				delete self.apiCallbackHandlers[message.id];

				var data = self.decode(message);

				if (message.success) {
					handler.resolve(data);
				} else {
					handler.reject(data);
				}
				return;
			default:
				target = self.modules.modules[message.action];
				break;
		}
		target[message.method].apply(target, self.decode(message.args)).then(function (result) {
			var returnData = self.encode(result);
			returnData.id = message.id;
			returnData.action = 'reply';
			returnData.success = true;
			self.sender.send(returnData);
		}, function (error) {
			var returnData = self.encode(error);
			returnData.id = message.id;
			returnData.action = 'reply';
			returnData.success = false;
			self.sender.send(returnData);
		});
	});
}

XPC.prototype.send = function (action, method, args) {
	var self = this;
	return new Promise(function (resolve, reject) {
		var callbackID = self.apiCallbackID++;
		self.apiCallbackHandlers[callbackID] = {resolve: resolve, reject: reject};
		self.sender.send({id: callbackID, action: action, method: method, args: self.encode(args)});
	});
};

XPC.prototype.encode = function (obj) {
	var returnData = {};
	if (obj.data) {
		returnData.data = obj.data;
		returnData.class = getClassName(obj);
	} else {
		returnData.data = obj;
	}
	return returnData;
};

XPC.prototype.decode = function (obj) {
	var data = obj.data;
	if (obj.class) {
		var Class = require('./api/classes/' + obj.class);
		data = new Class(this.api, obj.data);
	}
	return data;
};

function getClassName (object) {
	return Object.getPrototypeOf(object).constructor.name;
}

module.exports = XPC;
