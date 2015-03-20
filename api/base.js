'use strict';

var Promise = require('bluebird');

var cache = require('./cache');
var BeamUser = require('./user');

var API_ENDPOINT_BASE = '/api/v1/';
var API_ADDRESS = 'https://beam.pro';

var io = require('socket.io-client');
var sails = require('sails.io.js')(io);
io.sails.autoConnect = false;

function APIError (code, body) {
	this.code = code;
	this.body = body;
	this.message = 'Response code ' + code;
}

function BeamAPI (username, password) {
	this.username = username;
	this.password = password;
	this.isLoggedIn = false;

	this.socket = io.sails.connect(API_ADDRESS, {
		useCORSRouteToGetCookie: false,
		transports: ['websocket']
	});

	this.socket.on('connect', function () { console.log('[sails.socket.io] connected'); });
	this.socket.on('disconnect', function () { console.log('[sails.socket.io] disconnected'); });
	this.socket.on('reconnecting', function () { console.log('[sails.socket.io] reconnecting'); });
	this.socket.on('reconnect', function () { console.log('[sails.socket.io] reconnected'); });
	this.socket.on('error', function (err) { console.log('[sails.socket.io] error', err); });
}
BeamAPI.APIError = APIError;

BeamAPI.prototype._userApiRequest = function (method,  url, data) {
	var self = this;
	return this.login().then(function () {
		return self._apiRequest(method, url, data);
	});
};

BeamAPI.prototype._apiRequest = function (method, url, data, noRetryOn403) {
	var self = this;
	return new Promise(function (resolve /*, reject*/) {
		self.socket.request({
			url: API_ENDPOINT_BASE + url,
			params: data,
			method: method
		}, function (body, response) {
			resolve([body, response]);
		});
	}).spread(function (body, response) {
		if (response.statusCode === 403 && !noRetryOn403) {
			self.isLoggedIn = false;
			return self.login().then(function () {
				return self._apiRequest(method, url, data, true);
			});
		}

		if (response.statusCode >= 300 || response.statusCode < 200) {
			throw new APIError(response.statusCode, body);
		}

		return body;
	});
};

BeamAPI.prototype.login = function () {
	if (this.isLoggedIn) {
		return Promise.resolve(this.currentUser);
	}
	var self = this;
	return this._apiRequest('post', 'users/login', {
		username: this.username,
		password: this.password
	}, true).then(function (data) {
		self.isLoggedIn = true;
		self.currentUser = data;
		return data;
	}).catch(function (err) {
		if (err instanceof APIError && err.code === 401) {
			err.message = 'Username or password invalid';
		}
		throw err;
	});
};

BeamAPI.prototype.logout = function () {
	var self = this;
	return this._apiRequest('delete', 'users/current', {}, true).finally(function () {
		self.isLoggedIn = false;
	});
};

BeamAPI.prototype.getCurrentUser = function (raw) {
	var self = this;
	return this._userApiRequest('get', 'users/current').then(function (data) {
		if(raw) {
			return data;
		}
		data = cache.getOrCreate(BeamUser, self, data);
		self.currentUser = data;
		return data;
	});
};

BeamAPI.prototype.getUser = function (id, raw) {
	var self = this;
	return this._userApiRequest('get', 'users/' + id).then(function (data) {
		if(raw) {
			return data;
		}
		return cache.getOrCreate(BeamUser, self, data);
	});
};

BeamAPI.prototype.joinChat = function (id) {
	return this._userApiRequest('get', 'chats/' + id);
};

module.exports = BeamAPI;
