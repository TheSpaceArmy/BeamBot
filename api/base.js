var Promise = require('bluebird');
var _ = require('lodash');

var API_ENDPOINT_BASE = '/api/v1/';
var API_ADDRESS = 'https://beam.pro';

var SocketIOClient = require('socket.io-client');
var SailsIOClient = require('sails.io.js');
var io = SailsIOClient(SocketIOClient);
io.sails.autoConnect = true;
io.sails.useCORSRouteToGetCookie = false;
io.sails.url = API_ADDRESS;
io.sails.environment = 'develop';

function APIError(code, body) {
	this.code = code;
	this.body = body;
	this.message = 'Response code ' + code;
}

function BeamAPI(username, password) {
	var self = this;

	this.username = username;
	this.password = password;
	this.isLoggedIn = false;
}
BeamAPI.APIError = APIError;

BeamAPI.prototype._userApiRequest = function (method,  url, data) {
	var self = this;
	return this.login().then(function() {
		return self._apiRequest(method, url, data);
	});
}

BeamAPI.prototype._apiRequest = function (method, url, data, noRetryOn403) {
	var self = this;

	return new Promise(function(resolve, reject) {
		io.socket.request(API_ENDPOINT_BASE + url, data, function(body, response) {
			resolve([body, response]);
		}, method);
	}).spread(function(body, response) {
		if(response.statusCode === 403 && !noRetryOn403) {
			this.isLoggedIn = false;
			return self.login().then(function() {
				return self._apiRequest(method, url, data, true);
			});
		}

		if(response.statusCode >= 300 || response.statusCode < 200) {
			throw new APIError(response.statusCode, body);
		}

		if(_.isString(body)) {
			return JSON.parse(body);
		}

		return body;
	});
};

BeamAPI.prototype.login = function () {
	if(this.isLoggedIn) {
		return Promise.resolve(this.currentUser);
	}
	var self = this;
	return this._apiRequest('post', 'users/login', {
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
	var self = this
	return this._apiRequest('delete', 'users/current', {}, true).finally(function () {
		self.isLoggedIn = false;
	});
};

BeamAPI.prototype.getCurrentUser = function () {
	var self = this;
	return this._userApiRequest('get', 'users/current').then(function(data) {
		self.currentUser = data;
		return data;
	});
};

BeamAPI.prototype.joinChat = function (id) {
	return this._userApiRequest('get', 'chats/' + id);
};

module.exports = BeamAPI;