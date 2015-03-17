'use strict';

var Module = require('../../module.js');

function BaseModule () {
	Module.ctor(this, 'base');
}
Module.inherit(BaseModule);

BaseModule.prototype.init = function () {
	console.log('LOADED');
};

module.exports = BaseModule;
