
var temp = require('temp'),
	path = require('path'),
	net = require('net'),
	events = require('events'),
	util = require('util'),
	carrier = require('carrier'),
	underscore = require('underscore'),
	whichSync = underscore.memoize(require('which').sync);

function Controller() {
	events.EventEmitter.call(this);

	var tmpDir = temp.mkdirSync("watch-make.");
	this.socketPath = path.join(tmpDir, 'controller.socket');

	this.server = net.createServer(function(conn) {
		carrier.carry(conn, function(line) {
			var req = JSON.parse(line);
	
			if(req.reqtype == 'output') {
				console.log('OUTPUT: code is ', req.err, ' stdout has ', req.stdout.length, ' bytes, stderr has ', req.stderr.length, ' bytes');
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

