var Promise = require('bluebird');
var _ = require('lodash');
var request = Promise.promisify(require('request').defaults({jar: true}));

var API_ENDPOINT_BASE = 'https://beam.pro/api/v1/';

function APIError(code, body) {
	this.code = code;
	this.body = body;
	this.message = 'Response code ' + code;
}

function BeamAPI(username, password) {
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
	return request({
		url: API_ENDPOINT_BASE + url,
		method: method,
		json: data
	}).spread(function(response, body) {
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
		return Promise.resolve();
	}
	var self = this;
	return this._apiRequest('POST', 'users/login', {
		username: this.username,
		password: this.password
	}, true).then(function(data) {
		self.isLoggedIn = true;
		self.currentUser = data;
	}).catch(function(err) {
		if(err instanceof APIError && err.code == 401) {
			err.message = 'Username or password invalid';
		}
		throw err;
	});
};

BeamAPI.prototype.logout = function () {
	var self = this
	return this._apiRequest('DELETE', 'users/current', {}, true).finally(function () {
		self.isLoggedIn = false;
	});
};

BeamAPI.prototype.getCurrentUser = function () {
	var self = this;
	return this._userApiRequest('GET', 'users/current').then(function(data) {
		self.currentUser = data;
		return data;
	});
};

BeamAPI.prototype.joinChat = function (id) {
	return this._userApiRequest('GET', 'chats/' + id);
};

module.exports = BeamAPI;