'use strict';

var Command = require('../../../command.js');

function PingCommand () {
	Command.ctor(this, 'ping');
}
Command.inherit(PingCommand);

PingCommand.prototype.run = function (msg) {
	return msg.reply('Pong');
};

module.exports = PingCommand;
