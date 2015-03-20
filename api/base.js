'use strict';

var Promise = require('bluebird');

var cache = require('./cache');
var BeamUser = require('./classes/user');

var API_ENDPOINT_BASE = '/api/v1/';
var API_ADDRESS = 'https://beam.pro';

var io = require('socket.io-client');
require('sails.io.js')(io);
io.sails.autoConnect = false;
io.sails.environment = 'production';

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

BeamAPI.prototype.joinChat = function (id) {
	return this._userApiRequest('get', 'chats/' + id);
};

BeamAPI.extend = function (sub) {
	return require('./extensions/' + sub);
};

module.exports = BeamAPI;
