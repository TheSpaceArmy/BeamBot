var Promise = require('bluebird');
var _ = require('lodash');
var WebSocketClient = require('websocket').client;

var BeamChatMessage = require('./chat/message');

//api = BeamAPI
function BeamChatAPI(api, channelID, autoReconnect) {
	var self = this;

	this.api = api;
	this.channelID = channelID;
	this.autoReconnect = autoReconnect !== false;
	this.methodCallID = 1;
	
	this.methodsWaitingForReply = {};
	this.connectionHandlers = [];

	this.eventHandlers = {
		'ChatMessage': [
			function(data) {
				var msg = new BeamChatMessage(self, data);
				_.forEach(self.chatMessageHandlers, function(handler) {
					handler(msg);
				});
			}
		]
	};
	this.chatMessageHandlers = [];
	this.replyErrorHandlers = [];
}

BeamChatAPI.prototype._announceConnection = function (success) {
	_.forEach(this.connectionHandlers, function(handler) {
		var handler = success ? handler.success : handler.fail;
		if(handler) {
			handler();
		}
	});
	this.connectionHandlers = [];
};

BeamChatAPI.prototype.on = function (event, callback) {
	if(this.eventHandlers[event]) {
		this.eventHandlers[event].push(callback);
	} else {
		this.eventHandlers[event] = [callback];
	}
};

BeamChatAPI.prototype.onChatMessage = function (callback) {
	this.chatMessageHandlers.push(callback);
};

BeamChatAPI.prototype.onReplyError = function (callback) {
	this.replyErrorHandlers.push(callback);
};

BeamChatAPI.prototype._onWSData = function (data) {
	switch(data.type) {
		case 'reply':
			if(this.methodsWaitingForReply[data.id]) {
				this.methodsWaitingForReply[data.id](data);
				delete this.methodsWaitingForReply[data.id];
			} else {
				if(data.error) {
					_.forEach(this.replyErrorHandlers, function (handler) {
						handler(data.error);
					});
				} else {
					console.log('Received unexpected success reply', data);
				}
			}
			break;
		case 'event':
			_.forEach(this.eventHandlers[data.event], function (handler) {
				handler(data.data);
			});
			break;
	}
};

BeamChatAPI.prototype._sendMethod = function (method, arguments, expectsReply) {
	var methodCallID = this.methodCallID++;
	var self = this;
	return this._sendData({
		type: 'method',
		method: method,
		arguments: arguments,
		id: methodCallID
	}).then(function() {
		if(expectsReply) {
			return new Promise(function (resolve, reject) {
				self.methodsWaitingForReply[methodCallID] = function(data) {
					if(data.error) {
						reject(data.error);
					} else {
						resolve(data.data);
					}
				};
			});
		}
	});
};

BeamChatAPI.prototype._websocketReconnect = function () {
	this.websocketConnection = null;
	this.websocket = null;

	if(!this.canBeConnected || !this.autoReconnect) {
		this.canBeConnected = false;
		return;
	}

	this.connect();
};

BeamChatAPI.prototype._sendData = function (data) {
	var self = this;
	if(!this.websocket || !this.websocketConnection) {
		return this.connect().then(function() {
			return self._sendData(data);
		});
	}

	this.websocketConnection.sendUTF(JSON.stringify(data));
	return Promise.resolve();
};

BeamChatAPI.prototype.sendMessage = function (msg) {
	return this._sendMethod('msg', [msg]);
};

BeamChatAPI.prototype.close = function () {
	this.canBeConnected = false;
	if(this.websocketConnection) {
		this.websocketConnection.close();
		this.websocketConnection = null;
	}
};

BeamChatAPI.prototype.connect = function () {
	var self = this;

	if(this.canBeConnected) {
		if(this.websocketConnection) {
			return Promise.resolve();
		} else {
			return new Promise(function(resolve, reject) {
				self.connectionHandlers.push({
					success: resolve,
					fail: reject
				});
			});
		}
	}

	this.canBeConnected = true;

	return this.api.joinChat(this.channelID).then(function(data) {
		self.chatData = data;
		var endpoint = data.endpoints[Math.floor(Math.random() * data.endpoints.length)];

		return new Promise(function (resolve, reject) {
			self.websocket = new WebSocketClient();
			self.websocket.on('connect', function(connection) {
				if(!self.canBeConnected) {
					self.websocket = null;
					connection.close();
					return;
				}
				self.websocketConnection = connection;
				connection.on('error', function (err) { 
					self._websocketReconnect();
				});
				connection.on('close', function (err) { 
					self._websocketReconnect();
				});
				connection.on('message', function (data) {
					self._onWSData(JSON.parse(data.utf8Data));
				});
				self._announceConnection(true);
				resolve(self._sendMethod('auth', [self.channelID, self.api.currentUser.id, data.authkey], true));
			});
			self.websocket.on('connectFailed', function(err) {
				self._websocketReconnect();
				self._announceConnection(false);
				reject(err);
			});
			self.websocket.connect(endpoint);
		});
	});
};

module.exports = BeamChatAPI;