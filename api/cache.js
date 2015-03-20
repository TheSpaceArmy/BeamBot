'use strict';

function get (Class, id) {
	if (!Class._cache) {
		Class._cache = {};
	}
	return Class._cache[id];
}

function getOrCreate (Class, api, data, id) {
	id = id || data.id;
	var instance = get(Class, id);
	if(!instance) {
		instance = new Class(api);
	}
	instance.setData(data);
	Class._cache[id] = instance;
	return instance;
}

module.exports = {
	get: get,
	getOrCreate: getOrCreate
};