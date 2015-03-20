'use strict';

var Module = require('../../module.js').Module;

function BaseModule () {
	Module.ctor(this, 'base');
}
Module.inherit(BaseModule);

BaseModule.prototype.init = function () {

};

module.exports = BaseModule;
