'use strict';

var Promise = require('bluebird');

var API_ENDPOINT_BASE = '/api/v1/';
var API_ADDRESS = 'https://beam.pro';

function APIError(code, body) {
	this.code = code;
	this.body = body;
	this.message = 'Response code ' + code;
}

function BeamAPI(username, password) {
	this.username = username;
	this.password = password;
	this.isLoggedIn = false;

	var sails = require('sails.io.js')(require('socket.io-client'));
	sails.sails.autoConnect = false;
	sails.sails.useCORSRouteToGetCookie = false;
	sails.sails.url = API_ADDRESS;
	sails.sails.environment = 'develop';
	this.socket = sails.connect(API_ADDRESS);
	this.sails = sails;

	this.socket.on('connect', function() { console.log('[sails.socket.io] connected'); });
	this.socket.on('disconnect', function() { console.log('[sails.socket.io] disconnected'); });
	this.socket.on('reconnecting', function() { console.log('[sails.socket.io] reconnecting'); });
	this.socket.on('reconnect', function() { console.log('[sails.socket.io] reconnected'); });
	this.socket.on('error', function(err) { console.log('[sails.socket.io] error', err); });
}
BeamAPI.APIError = APIError;

function userApiRequest(self, method,  url, data) {
	return self.login().then(function() {
		return apiRequest(self, method, url, data);
	});
}

function apiRequest(self, method, url, data, noRetryOn403) {
	return new Promise(function(resolve /*, reject*/) {
		var sendData = function() {
			self.socket.request(API_ENDPOINT_BASE + url, data, function(body, response) {
				resolve([body, response]);
			}, method);
		};
		if(self.socket.socket.connected) {
			sendData();
		} else {
			self.socket.on('connect', sendData);
		}
	}).spread(function(body, response) {
		if(response.statusCode === 403 && !noRetryOn403) {
			self.isLoggedIn = false;
			return self.login().then(function() {
				return apiRequest(self, method, url, data, true);
			});
		}

		if(response.statusCode >= 300 || response.statusCode < 200) {
			throw new APIError(response.statusCode, body);
		}

		return body;
	});
}

BeamAPI.prototype.login = function () {
	if(this.isLoggedIn) {
		return Promise.resolve(this.currentUser);
	}
	var self = this;
	return apiRequest(this, 'post', 'users/login', {
		username: this.username,
		password: this.password
	}, true).then(function(data) {
		self.isLoggedIn = true;
		self.currentUser = data;
		return data;
	}).catch(function(err) {
		if(err instanceof APIError && err.code == 401) {
			err.message = 'Username or password invalid';
		}
		throw err;
	});
};

BeamAPI.prototype.logout = function () {
	var self = this;
	return apiRequest(this, 'delete', 'users/current', {}, true).finally(function () {
		self.isLoggedIn = false;
	});
};

BeamAPI.prototype.getCurrentUser = function () {
	var self = this;
	return userApiRequest(this, 'get', 'users/current').then(function(data) {
		self.currentUser = data;
		return data;
	});
};

BeamAPI.prototype.joinChat = function (id) {
	return userApiRequest(this, 'get', 'chats/' + id);
};

BeamAPI.prototype._userApiRequest = function(method,  url, data) {
	return userApiRequest(this, method, url, data);
};

module.exports = BeamAPI;