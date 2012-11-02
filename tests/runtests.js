
var fs = require('fs'),
	child_process = require('child_process'),
	assert = require('assert'),
	async = require('async'),
	log = require('npmlog'),
	mkfiletree = require('mkfiletree');

var currentLogContext = "";

//
// A test is run by creating a temporary directory, filling it with
// the appropriate files (contained in exports.content), starting watch-make
// (with the command line parameters in exports.parameters if present), then
// following each step in exports.steps.
//
// exports.content is in the format required by the mkfiletree module.
//
// exports.steps is an array of steps to follow in sequence. Each step may be one
// of the following:
//
//  - A string, which will be run as a shell command in the top level temp dir.
//    The success or failure of this shell command is not considered.
//
//  - A number, which specifies a number of seconds to halt execution.
//
//  - An array of filenames. We will verify that the files listed have "last modified times"
//    in the order given in the array. For instance, ["a.txt", "x/b.txt"] will succeed iff
//    a.txt and x/b.txt both exist, and a.txt's last modified time is earlier than x/b.txt's.
//
//  - An arbitrary function which will be run with a callback function (per async.series)
//

function runTest(testModule, runTestCb) {
	currentLogContext = "[" + testModule.name + "]";

	// non-function steps get transformed into implementation functions
	var plainSteps = testModule.steps.map(getFunctionForStep);

	// because os x only has 1s resolution on modification time, we need
	// to add lots of pauses in-between steps so our comparisons work :(
	var silentWait = function(cb) { setTimeout(function() { cb(null, true); }, 2000); };
	var steps = [];
	plainSteps.forEach(function(s) {
		steps.push(silentWait);
		steps.push(s);
	});

	// create temporary directory with files in it
	log.info(currentLogContext, "Creating test tree");
	mkfiletree.makeTemp('watchmaketest', testModule.content, function(err,dir) {
		if(err) runTestCb(err,null);
		else {
			// change into the created directory
			log.info(currentLogContext, "Running test in", dir);
			var oldcwd = process.cwd();
			process.chdir(dir);

			// run all the tests, and change out of the created directory afterwards
			// so that it can be cleaned up if necessary
			async.series(steps, function(err, result) {
				process.chdir(oldcwd);

				// if test failed, assert out(crash!), but callback successfully re: the actual
				// test code
				assert.ifError(err);
				currentLogContext = "";
				runTestCb(null, true);
			});
		}
	});
}


function getFunctionForStep(s) {
	if(typeof s == 'number') return function(cb) {
		log.info(currentLogContext, "Waiting for", s, "s..");
		setTimeout(function() { cb(null, true); }, 1000*s);
	};

	if(typeof s == 'string') return function(cb) {
		log.info(currentLogContext, "Executing:", s);
		child_process.exec(s, function(error, stdout, stderr) { cb(null, true); });
	};

	if(Array.isArray(s)) return function(cb) {
		log.info(currentLogContext, "Verifying mtime order:", s);
		verifyModifiedOrder(s, cb);
	};

	if(typeof s == 'function') return function(cb) {
		log.info(currentLogContext, "Executing arbitrary function");
		s(cb);
	};

	// should have returned something by now
	throw new Error("invalid step in exports.steps");
}

function verifyModifiedOrder(filenames, cb) {
	async.map(filenames, fs.stat, function(err, results) {
		if(err) cb(err);
		else {
			var last = 0, failedAlready = false;
			results.forEach(function(stats, i) {

				if(!stats || !stats.isFile()) {
					if(!failedAlready)
						cb(new Error("Does not exist as a file, but should: " + filenames[i]), false);
					failedAlready = true;

				} else if(last >= stats.mtime.getTime()) {
					if(!failedAlready)
						cb(new Error("mtime(" + filenames[i-1] + ") >= mtime(" + filenames[i] + ")"), false);
					failedAlready = true;
				}

				last = stats.mtime.getTime();
			});

			if(!failedAlready) cb(null, true);
		}
	});
}


var mod = {};

mod.content = {
	'Makefile': 
		"dest: dir/src\n" +
		"\tcp dir/src dest\n",
	
	'dir' : {
		src:
			"hello world\n"
	}
};



mod.steps = [
	"make",
	[ "dir/src", "dest" ],
	"touch dir/src",
	[ "Makefile", "dest", "dir/src" ],
];

mod.name = "inlinetest";

mod.extrasteps = [
	"make",

	[ "dir/src", "dest" ],

	4,
	
	"touch dir/src",

	4,

	[ "Makefile", "dir/src", "dest" ]
];

var dir = process.cwd();
runTest(mod, function(err,result) {
	console.log("ERR:", err);
	console.log("RES:", result);
	console.log("Cleaning up...");
	process.chdir('/');
	process.chdir(dir);

	mkfiletree.cleanUp(console.log);
});







