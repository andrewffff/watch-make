
var temp = require('temp'),
	path = require('path'),
	net = require('net'),
	events = require('events'),
	util = require('util'),
	carrier = require('carrier'),
	underscore = require('underscore'),
	whichSync = underscore.memoize(require('which').sync);

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
			var sources = depText.substr(colonIdx+1).trim().split(/\s+/);

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
	topGoals = topGoals.trim().split(/\s+/);

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

	var tmpDir = temp.mkdirSync("watch-make.");
	this.socketPath = path.join(tmpDir, 'controller.socket');

	this.server = net.createServer(function(conn) {
		carrier.carry(conn, function(line) {
			var req = JSON.parse(line);
	
			if(req.reqtype == 'output') {
				var db = (parseMakeDatabase(req.stdout));
				console.log(findLeafFiles(db));
				console.log(db);
//				console.log('OUTPUT: code is ', req.err, ' stdout has ', req.stdout.length, ' bytes, stderr has ', req.stderr.length, ' bytes');
			} else if(req.reqtype == 'command') {
				console.log('Received command: ', req.command_line_argv);
	
				var getDepsCommand = [req.command_line_argv[0], '-n', '-p'].concat(req.command_line_argv.slice(1));
				
				conn.write(JSON.stringify([
					{ resultsToServer: true,  filename: whichSync(getDepsCommand[0]), argv: getDepsCommand },
					{ resultsToServer: false, filename: whichSync(getDepsCommand[0]), argv: req.command_line_argv }
				]));
	
				conn.write("\n");
			}
		});
	});

	var self = this;
	self.server.listen(self.socketPath, function() {
		self.emit('run', function(){;});
	});
}
util.inherits(Controller, events.EventEmitter);



exports.Controller = Controller;

