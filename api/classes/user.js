'use strict';

var _ = require('lodash');
var Promise = require('bluebird');

function setUserData (self, data, isDownloaded) {
	self.data = _.merge(self.data, data);
	self.isDownloaded = !!isDownloaded;
	return self.data;
}

function BeamUser (api, data, isDownloaded) {
	this.api = api;
	this.data = {};
	if (data) {
		setUserData(this, data, isDownloaded);
	}
}

BeamUser.prototype.setData = function (data) {
	return setUserData(this, data, data.createdAt);
};

BeamUser.prototype.getData = function () {
	if (this.isDownloaded) {
		return Promise.resolve(this.data);
	} else {
		var self = this;
		return this.api.getUser(this.id, true, true).then(function (data) {
			return setUserData(self, data, true);
		});
	}
};

BeamUser.prototype.get = function (attr) {
	return this.getData(this.api).then(function (data) {
		return data[attr];
	});
};

BeamUser.prototype.getId = function () {
	return this.data.id;
};

BeamUser.prototype.getName = function () {
	return this.data.name;
};

module.exports = BeamUser;
