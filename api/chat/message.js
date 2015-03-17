'use strict';

var _ = require('lodash');

function BeamChatMessage (chatAPI, data) {
	this.chatAPI = chatAPI;
	this.api = chatAPI.api;
	this.baseAPIURL = 'chats/' + chatAPI.channelID + '/';

	this.user = {
		id: data.user_id,
		role: data.user_role,
		name: data.user_name
	};
	this.id = data.id;
	this.channelID = data.channel;
	this.message = data.message;
}

BeamChatMessage.prototype.getText = function () {
	var text = '';
	_.forEach(this.message, function (component) {
		switch (component.type) {
			case 'text':
				text += component.data;
				break;
			case 'link':
			case 'emoticon':
				text += component.text;
				break;
		}
	});
	return text;
};

BeamChatMessage.prototype.delete = function () {
	return this.api._userApiRequest('delete', this.baseAPIURL + 'message/' + this.id);
};

BeamChatMessage.prototype.reply = function (msg) {
	return this.chatAPI.sendMessage('@' + this.user.name + ': ' + msg);
};

module.exports = BeamChatMessage;
