'use strict';

var _ = require('lodash');
var Promise = require('bluebird');

function setChannelData (self, data) {
	self.data = _.merge(self.data, data);
	self.isDownloaded = data.createdAt;
	return self.data;
}

function BeamChannel (api, data) {
	this.api = api;
	this.data = {};
	if (data) {
		setChannelData(this, data);
	}
}

BeamChannel.prototype.setData = function (data) {
	return setChannelData(this, data);
};

BeamChannel.prototype.getData = function () {
	if (this.isDownloaded) {
		return Promise.resolve(this.data);
	} else {
		var self = this;
		return this.api.getChannel(this.id, true, true).then(function (data) {
			return setChannelData(self, data, true);
		});
	}
};

BeamChannel.prototype.get = function (attr) {
	return this.getData(this.api).then(function (data) {
		return data[attr];
	});
};

BeamChannel.prototype.getId = function () {
	return this.data.id;
};

module.exports = BeamChannel;
