'use strict';

var BeamAPI = require('../base');
var cache = require('../cache');
var BeamChannel = require('../classes/channel');

BeamAPI.prototype.getChannel = function (id, raw) {
	var self = this;
	return this._userApiRequest('get', 'channels/' + id).then(function (data) {
		if (raw) {
			return data;
		}
		return cache.getOrCreate(BeamChannel, self, data);
	});
};

module.exports = BeamAPI;