
var temp = require('temp'),
	path = require('path'),
	net = require('net'),
	events = require('events'),
	util = require('util'),
	carrier = require('carrier'),
	underscore = require('underscore'),
	whichSync = underscore.memoize(require('which').sync),
	WatchSet = require('./watchset.js').WatchSet;

function splitFileList(x) {
	x = x.trim();
	if(!x.length)
		return [];  // .split returns [ '' ]
	return x.split(/\s+/);
};

function parseMakeDatabase(makeDatabaseText) {
	var deps = {};
	var variables = {};  // := are the only ones we care about
	var rules = {};

	// to avoid the "make: `target` is ..." message near the top of the file,
	// skip ahead to the line that says "# Variables"
	var skipOfs = makeDatabaseText.indexOf("\n# Variables");
	if(skipOfs < 0)
		throw Error("Can't find variables section in make database output");

	// split blocks separated by blank lines
	makeDatabaseText.substr(skipOfs).split("\n\n").forEach(function(block) {
		// accumulated state
		var depText;
		
		var i, line, lines = block.split("\n");
		for(i = 0; i < lines.length; ++i) {
			line = lines[i];

			if(line.indexOf("# Not a target") === 0)
				return; // bomb out of the entire thing

			var colonIdx = line.indexOf(':');
			if(colonIdx > 0 && line[colonIdx+1] === '=') {
				// VAR := value
				variables[line.substr(0,colonIdx).trim()] = line.substr(colonIdx+2).trim();
			} else if(line.indexOf('=') > 0 && line.indexOf('=') < colonIdx) {
				// avoid this line I see on mac os x:
				// __CF_USER_TEXT_ENCODING = 0x1F5:0:0
				;
			} else if(colonIdx > 0) {
				line = line.replace(/#.*$/, '');
				colonIdx = line.indexOf(':');
				if(colonIdx > 0) {
					depText = line.trim();
				}
			}
		}

		if(depText && depText.length && depText[0] !== '%') {
			var colonIdx = depText.indexOf(':');
			var target = depText.substr(0,colonIdx).trim();
			var sources = splitFileList(depText.substr(colonIdx+1));

			if(!deps[target]) {
				deps[target] = sources;
			} else {
				deps[target] = underscore.union(deps[target], sources);
			}
		}
	});

	return { dependencies: deps, variables: variables };
}


function findLeafFiles(db) {
	var topGoals = db.variables['MAKECMDGOALS'];
	if(!topGoals || !(''+topGoals).trim().length)
		topGoals = db.variables['.DEFAULT_GOAL'];
	topGoals = splitFileList(topGoals);

	var considered = {};
	var leaves = {};

	function dependencyRecurse(target) {
		var deps = db.dependencies[target]
		if(!deps) {
			console.warn('watch-make: could not find target `', target, '` in make database.');
			return;
		}

		considered[target] = true;

		deps.forEach(function(f) {
			if(!db.dependencies[f])
				leaves[f] = true;
			else if(!considered[f])
				dependencyRecurse(f);
		});
	}

	topGoals.forEach(dependencyRecurse);

	return Object.getOwnPropertyNames(leaves);
}

			
				
function Controller() {
	events.EventEmitter.call(this);

	var self = this;

	var tmpDir = temp.mkdirSync("watch-make.");
	this.socketPath = path.join(tmpDir, 'controller.socket');

	this.knownMakeFiles = {};

	this.mustRunMake = true;

	this.server = net.createServer(function(conn) {
		carrier.carry(conn, function(line) {
			var req = JSON.parse(line);
			var key = JSON.stringify([req.cwd, req.command_line_argv]);
			var entry = self.knownMakeFiles[key];
	
			if(req.reqtype == 'output') {
				entry.dbNeedsUpdate = false;
				entry.dependencies = {};

				var db = parseMakeDatabase(req.stdout);
				findLeafFiles(db).forEach(function(file) {
					entry.dependencies[file] = false;
				});
				splitFileList(db.variables.MAKEFILE_LIST).forEach(function(file) {
					entry.dependencies[file] = true;
				});

				console.log(self.knownMakeFiles);
				entry.watchset.setFiles(entry.cwd, Object.getOwnPropertyNames(entry.dependencies));

//				console.log('OUTPUT: code is ', req.err, ' stdout has ', req.stdout.length, ' bytes, stderr has ', req.stderr.length, ' bytes');
			} else if(req.reqtype == 'command') {
				var commandsToRun = [];

				if(!entry) { // may not exist yet
					entry = self.knownMakeFiles[key] = {
						cwd: req.cwd,
						command_line_argv: req.command_line_argv,
						dbNeedsUpdate: true,
						watchset: new WatchSet(),
						dependencies: {}    // filename -> <true = must reparse makefile | false = no reparse, just run>
					};
					entry.watchset.on('change', function(filename) {
						console.log('CHANGE: ', filename, ', MAKEFILE CHANGE: ', entry.dependencies[filename]);
						if(entry.dependencies[filename]) 
							entry.dbNeedsUpdate = true;
						self.mustRunMake = true;
						self.runMakeIfNeeded();
					});
				}

				if(entry.dbNeedsUpdate) {
					var getDepsCommand = [req.command_line_argv[0], '-n', '-p'].concat(req.command_line_argv.slice(1));
					commandsToRun.push({
						resultsToServer: true,
						filename: whichSync(getDepsCommand[0]),
						argv: getDepsCommand });
				}
			
				commandsToRun.push({
					resultsToServer: false,
					filename: whichSync(req.command_line_argv[0]),
					argv: req.command_line_argv
				});

				console.log(commandsToRun);
				conn.write(JSON.stringify(commandsToRun));
				conn.write("\n");
			}
		});
	});

	self.server.listen(self.socketPath, function() {
		self.runMakeIfNeeded();
	});

}

util.inherits(Controller, events.EventEmitter);

Controller.prototype.runMakeIfNeeded = function() {
	var self = this;

	if(self.mustRunMake) {
		self.mustRunMake = false;
		self.emit('run', function() {
			self.runMakeIfNeeded();
		});
	}
}


exports.Controller = Controller;

