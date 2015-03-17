var Command = require('../command.js');

function DeleteMeCommand(config) {
	Command.ctor(this, 'deleteme');
}
Command.inherit(DeleteMeCommand);

DeleteMeCommand.prototype.run = function(msg) {
	return msg.delete();
};

module.exports = DeleteMeCommand;