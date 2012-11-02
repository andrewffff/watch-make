
var temp = require('temp'),
	_ = require('underscore'),
	fs = require('fs'),
	assert = require('assert'),
	async = require('async'),
	mkfiletree = require('mkfiletree');

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
	// non-function steps get transformed into implementation functions
	var steps = testModule.steps.map(getFunctionForStep);

	// create temporary directory with files in it
	mkfiletree.makeTemp('watchmaketest', testModule.content, function(err,dir) {
		if(err) runTestCb(err,null);
		else {
			// change into the created directory
			var oldcwd = process.cwd();
			process.chdir(dir);

			// run all the tests, and change out of the created directory afterwards
			// so that it can be cleaned up if necessary
			async.series(steps, function(err, result) {
				process.chdir(oldcwd);

				// if test failed, assert out(crash!), but callback successfully re: the actual
				// test code
				assert.ifError(err);
				runTestCb(null, true);
			});
		}
	});
}


function getFunctionForStep(s) {
	if(typeof s == 'number')
		return function(cb) { setTimeout(function() { cb(null, true); }, 1000*s); };

	else if(typeof s == 'string')
		return function(cb) { child_process.exec(s, function(error, stdout, stderr) { cb(null, true); }); };

	else if(Array.isArray(s))
		return function(cb) { verifyModifiedOrder(s, cb); };

	else if(typeof s == 'function')
		return s;

	else
		throw new Error("invalid step in exports.steps");
}

/*
function writeContentToPwd(content) {
	var createdDirs = {};
	Object.getOwnPropertyNames(content).forEach(function(givenPath) {
		var parts = givenPath.split('/');
		for(var i = 0; i < parts.length - 1; ++i) {
			var joined = parts.slice(0, i+1).join('/');
			if(!createdDirs[joined]) {
				fs.mkdirSync(joined);
				createdDirs[joined] = true;
			}
		}

		// trailing '/' = create empty directory
		if(parts[parts.length - 1]) {
			fs.writeFileSync(givenPath, content[givenPath].join("\n"));
		}
	});
}
*/

var mod = {};

mod.content = {
	'Makefile': 
		"dest: dir/src\n" +
		"\tcp dir/src dest\n",
	
/*
	'dir' : {
		src:
			"hello world\n"
	}
*/
};



mod.steps = [
	20
];

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







