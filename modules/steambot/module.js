'use strict';


var Module = require('../../module.js').Module;

var readline = require('readline');
var Steam = require('steam');
var fs = require('fs');

function readLineInstant(question, cb) {
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	rl.question(question, function (answer) {
		rl.close();
		return cb(answer);
	});
}

function SteamBotModule () {
	Module.ctor(this, {
		name: 'steambot',
		enabled: false
	});
}
Module.inherit(SteamBotModule);

SteamBotModule.prototype.tryLogOn = function (authCode) {
	var self = this;

	this.steam = new Steam.SteamClient();
	this.steam.logOn({
		accountName: this.config.accountName,
		password: this.config.password,
		shaSentryfile: this.config.shaSentryfile ? new Buffer(this.config.shaSentryfile, 'base64') : undefined,
		authCode: authCode
	});
	this.steam.on('error', function (e) {
		console.log('Steam error: ', e.cause, '(', e.eresult, ')');
		switch (e.cause) {
			case 'logonFail':
				if (e.eresult === Steam.EResult.AccountLogonDenied) {
					readLineInstant('SteamGuard code: ', function (code) {
						return self.tryLogOn(code);
					});
				}
				break;
			case 'loggedOff':
				break;
		}
	});
	this.steam.on('sentry', function (sentry) {
		console.log('Got Steam sentry hash: ', sentry.toString('base64'));
	});
	this.steam.on('loggedOn', function () {
		self.steamReady();
	});
	this.steam.on('servers', function (servers) {
		fs.writeFile(self._serversStorage, JSON.stringify(servers));
	});
};

SteamBotModule.prototype.steamReady = function () {
	var self = this;
	this.steam.setPersonaState(Steam.EPersonaState.Online);
	this.steam.on('friendMsg', function (steamid, message, type) {
		if (!message || type !== Steam.EChatEntryType.ChatMsg) {
			return;
		}
		self.getChatAPI().sendMessage('[STEAM] ' + message);
	});
};

SteamBotModule.prototype.init = function (modules) {
	var self = this;

	this._serversStorage = this.getStoragePath() + '/servers.json';

	modules.on('ChatMessage', function (msg) {
		if (self.steam && self.steam.loggedOn) {
			self.steam.sendMessage(self.config.masterSteamID, msg.user.getName() + ': ' + msg.getText());
		}
	});

	if (fs.existsSync(this._serversStorage)) {
		Steam.servers = JSON.parse(fs.readFileSync(this._serversStorage));
	}

	this.tryLogOn();
};

module.exports = SteamBotModule;
