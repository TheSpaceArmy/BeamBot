'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var WebSocketClient = require('websocket').client;

var BeamChatMessage = require('./message');

//api = BeamAPI
function BeamChatAPI (api, channel, autoReconnect) {
	var self = this;

	this.api = api;
	this.channel = channel;
	this.autoReconnect = autoReconnect !== false;
	this.methodCallID = 1;

	this.methodsWaitingForReply = {};
	this.connectionHandlers = [];

	this.eventPreprocessors = {
		ChatMessage: function (data) {
			return new BeamChatMessage(self, data);
		}
	};

	this.eventHandlers = {};
	this.replyErrorHandlers = [];
}

function announceConnection (self, success) {
	_.forEach(self.connectionHandlers, function (handler) {
		var handlerFunc = success ? handler.success : handler.fail;
		if (handlerFunc) {
			handlerFunc();
		}
	});
	self.connectionHandlers = [];
}

BeamChatAPI.prototype.on = function (event, callback) {
	if (this.eventHandlers[event]) {
		this.eventHandlers[event].push(callback);
	} else {
		this.eventHandlers[event] = [callback];
	}
};

BeamChatAPI.prototype.onReplyError = function (callback) {
	this.replyErrorHandlers.push(callback);
};

function onWSData (self, data) {
	switch (data.type) {
		case 'reply':
			if (self.methodsWaitingForReply[data.id]) {
				self.methodsWaitingForReply[data.id](data);
				delete self.methodsWaitingForReply[data.id];
			} else {
				if (data.error) {
					_.forEach(self.replyErrorHandlers, function (handler) {
						handler(data.error);
					});
				} else {
					console.log('Received unexpected success reply', data);
				}
			}
			break;
		case 'event':
			var eventName = data.event;
			var eventData = data.data;
			if (self.eventPreprocessors[eventName]) {
				eventData = self.eventPreprocessors[eventName](eventData);
			}
			_.forEach(self.eventHandlers[eventName], function (handler) {
				handler(eventData);
			});
			break;
	}
}

function sendMethod (self, method, args, noReply) {
	var methodCallID = self.methodCallID++;
	return sendData(self, {
		type: 'method',
		method: method,
		arguments: args,
		id: methodCallID
	}).then(function () {
		if (!noReply) {
			return new Promise(function (resolve, reject) {
				self.methodsWaitingForReply[methodCallID] = function (data) {
					if (data.error) {
						reject(data.error);
					} else {
						resolve(data.data);
					}
				};
			});
		}
	});
}

function websocketReconnect (self) {
	self.websocketConnection = null;
	self.websocket = null;

	if (!self.canBeConnected || !self.autoReconnect) {
		self.canBeConnected = false;
		return;
	}

	self.connect();
}

function sendData (self, data) {
	if (!self.websocket || !self.websocketConnection) {
		return self.connect().then(function () {
			return sendData(self, data);
		});
	}

	self.websocketConnection.sendUTF(JSON.stringify(data));
	return Promise.resolve();
}

BeamChatAPI.prototype.sendMessage = function (msg) {
	return sendMethod(this, 'msg', [msg]);
};

BeamChatAPI.prototype.close = function () {
	this.canBeConnected = false;
	if (this.websocketConnection) {
		this.websocketConnection.close();
		this.websocketConnection = null;
	}
};

BeamChatAPI.prototype.connect = function () {
	var self = this;

	if (this.canBeConnected) {
		if (this.websocketConnection) {
			return Promise.resolve();
		} else {
			return new Promise(function (resolve, reject) {
				self.connectionHandlers.push({
					success: resolve,
					fail: reject
				});
			});
		}
	}

	this.canBeConnected = true;

	return this.api.joinChat(this.channel.getId()).then(function (data) {
		self.chatData = data;
		var endpoint = data.endpoints[Math.floor(Math.random() * data.endpoints.length)];

		return new Promise(function (resolve, reject) {
			self.websocket = new WebSocketClient();
			self.websocket.on('connect', function (connection) {
				if (!self.canBeConnected) {
					self.websocket = null;
					connection.close();
					return;
				}
				self.websocketConnection = connection;
				connection.on('error', function (err) {
					console.log('[chat] error', err);
					websocketReconnect(self);
				});
				connection.on('close', function () {
					websocketReconnect(self);
				});
				connection.on('message', function (data) {
					onWSData(self, JSON.parse(data.utf8Data));
				});
				announceConnection(self, true);
				resolve(sendMethod(self, 'auth', [
					self.channel.getId(),
					self.api.currentUser.getId(),
					data.authkey
				]));
			});
			self.websocket.on('connectFailed', function (err) {
				websocketReconnect(self);
				announceConnection(self, false);
				reject(err);
			});
			self.websocket.connect(endpoint);
		});
	});
};

module.exports = BeamChatAPI;
