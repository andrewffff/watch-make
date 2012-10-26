
var events = require('events'),
	fs = require('fs'),
	path = require('path'),
	util = require('util'),
	underscore = require('underscore');

/**
 * A probably-overengineered class which watches a set of files and
 * emits ('change', filename) iff a file changes. Accesses don't count.
 */
function WatchSet() {
	events.EventEmitter.call(this);

	// maps "fully resolved filename" --> function which calls checkChange
	this.watching = {};
}
util.inherits(WatchSet, events.EventEmitter);

/**
 * Change the set of files currently being watched. You supply a base path
 * which is applied to every filename supplied. Duplicates are not ok.
 */
WatchSet.prototype.setFiles = function(base, list) {
	var self = this;

	var toInputFormat = {};
	var newList = [];
	list.forEach(function(name) {
		var r = path.resolve(base, name);
		toInputFormat[r] = name;
		newList.push(r);
	});

	var oldList = Object.getOwnPropertyNames(this.watching);

	underscore.difference(oldList, newList).forEach(function(f) {
		fs.unwatchFile(f, self.watching[f]);
		delete self.watching[f];
	});

	underscore.difference(newList, oldList).forEach(function(f) {
		var inputFormat = toInputFormat[f];
		var cb = function(curr, prev) {
			self.checkChange(inputFormat, curr, prev);
		};

		fs.watchFile(f, { interval: 2001 }, cb);
		self.watching[f] = cb;
	});
};

WatchSet.prototype.checkChange = function(filename, curr, prev) {
	if(curr.mtime > prev.mtime)
		this.emit('change', filename);
};

WatchSet.prototype.finish = function() {
	this.setFiles('', []);
};


exports.WatchSet = WatchSet;

