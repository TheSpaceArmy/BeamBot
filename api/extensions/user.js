'use strict';

var Promise = require('bluebird');

var BeamAPI = require('../base');
var cache = require('../cache');
var BeamUser = require('../classes/user');

BeamAPI.prototype.getCurrentUser = function (refresh) {
	if (!refresh && this.currentUser) {
		return Promise.resolve(this.currentUser);
	}
	var self = this;
	return this._userApiRequest('get', 'users/current').then(function (data) {
		data = cache.getOrCreate(BeamUser, self, data);
		self.currentUser = data;
		return data;
	});
};

BeamAPI.prototype.getUser = function (id, refresh, raw) {
	if (!refresh) {
		var data = cache.get(BeamUser, id);
		if (data) {
			return Promise.resolve(data);
		}
	}
	var self = this;
	return this._userApiRequest('get', 'users/' + id).then(function (data) {
		if (raw) {
			return data;
		}
		return cache.getOrCreate(BeamUser, self, data);
	});
};

module.exports = BeamAPI;
