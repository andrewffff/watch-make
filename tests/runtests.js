
//
// Runs tests. Each test is its own javascript module. You can supply test
// filenames on the command line; if you don't, test_*.js will be run.
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
//    NOTE: Last modified times may only have 1s resolution! (eg on osx's HFS+ filesystem,
//    hardly an edge case :() So you should wait 2 seconds between actions on different files
//    if you expect them to compare properly.
//
//  - An arbitrary function which will be run with a callback function (per async.series)
//
// Commonly, we perform an action, wait long enough for watch-make to act on it, then
// observe the results. This is inherently dodgy but the alternative is some sort of
// more specific observation of the process under test and/or the files.. too hard.
//

var fs = require('fs'),
	path = require('path'),
	child_process = require('child_process'),
	assert = require('assert'),
	util = require('util'),
	async = require('async'),
	glob = require('glob'),
	log = require('npmlog'),
	mkfiletree = require('mkfiletree');

var watchMakeJsFile = path.resolve(path.dirname(process.argv[1]), '../watch-make');

var currentLogContext = "";

function runTest(testModule, runTestCb) {
	currentLogContext = "[" + testModule.name + "]";

	// non-function steps get transformed into implementation functions
	try {
		var plainSteps = testModule.steps.map(getFunctionForStep);
	} catch(e) {
		runTestCb(e, null);
		return;
	}

	// we pause for a bit at the start so watch-make can start
	var silentWait = function(cb) { setTimeout(function() { cb(null, true); }, 3000); };
	var steps = [silentWait].concat(plainSteps);

	// create temporary directory with files in it
	log.info(currentLogContext, "Creating test tree");
	mkfiletree.makeTemp('watchmaketest', testModule.content, function(err,dir) {
		if(err) runTestCb(err,null);
		else {
			// change into the created directory and run watch-make
			log.info(currentLogContext, "Running test in", dir);
			process.chdir(dir);

			var procUnderTest = child_process.spawn(
				process.execPath,
				[watchMakeJsFile].concat(testModule.parameters || []),
				{ stdio: 'inherit' });
			var procShouldQuit = false;

			log.info(currentLogContext, "watch-make child process started, pid", procUnderTest.pid);

			procUnderTest.on('exit', function(code,signal) {
				log.info(currentLogContext, "child process finished, exit code:", code, ", signal:", signal);

				// we expect watch-make to exit only when we kill it
				if(!procShouldQuit) {
					runTestCb('watch-make process finished without being correctly killed, exit code = ' + util.inspect(code), true);
					runTestCb = function(){;}; // async loop below will still be going haywire.. whatever
				} else {
					currentLogContext = "";
					runTestCb(null, true);
				}
			});

			// run all the tests, then kill the child process
			// so that it can be cleaned up if necessary
			async.series(steps, function(err, result) {
				if(err) {
					// on success, then happens above after the child process exits
					runTestCb(err, true);
					runTestCb = function(){;};
				}
				log.info(currentLogContext, "sending SIGTERM to child process");
				procShouldQuit = true;
				procUnderTest.kill();
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
		try {
			s(cb);
		} catch(e) {
			cb(e, null);
		}
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


// locate test modules (as specified, or all appropriately named files
// in same dir as runtests.js)
var testFiles = process.argv.slice(2).map(function(filename) {
	return (filename[0] == '/')
		? filename
		: "./" + filename;
});

if(!testFiles.length) {
	process.chdir(path.dirname(process.argv[1]));
	testFiles = glob.sync('./test_*.js');
}


// load all tests
var testModules = testFiles.map(require);
testModules.forEach(function(m, i) { m.name = testFiles[i]; });

var testTasks = testModules.map(function(m) { return function(cb) { runTest(m, cb); }; });


// run all the tests, clean up when finished or erroring out
var startDir = process.cwd();
async.series(testTasks, function(err,result) {
	if(err) log.error(currentLogContext, err);
	else log.info("", "All tests finished OK");

	// clean up temp directories (need to chdir out of them)
	process.chdir('/');
	try { process.chdir(startDir); } catch(e) {;}
	mkfiletree.cleanUp(assert.ifError);
});


