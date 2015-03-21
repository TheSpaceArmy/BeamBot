'use strict';

var Module = require('../../module.js').Module;

function BaseModule () {
	Module.ctor(this, 'base');
}
Module.inherit(BaseModule);

BaseModule.prototype.init = function (modules) {
	modules.on('ChatMessage', function (msg) {
		if(msg.getText() === 'T42') {
			msg.reply('T99');
		}
	});
};

module.exports = BaseModule;
