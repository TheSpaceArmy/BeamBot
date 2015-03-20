'use strict';

var BeamAPI = require('../base');
var cache = require('../cache');
var BeamUser = require('../classes/user');

BeamAPI.prototype.getCurrentUser = function (raw) {
	var self = this;
	return this._userApiRequest('get', 'users/current').then(function (data) {
		if (raw) {
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
		if (raw) {
			return data;
		}
		return cache.getOrCreate(BeamUser, self, data);
	});
};

module.exports = BeamAPI;