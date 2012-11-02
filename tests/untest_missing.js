
if(require.main === module) console.log("You can't start this directly - use runtests.js!");

// THIS SHOULD ALWAYS FAIL
// it checks the mtime of a file which doesn't exists

exports.steps = [
	"touch a",
	[ "b", "a" ], // should work
	[ "c", "b", "a" ] // should fail - c doesn't exist
];

exports.content = {
	"a" : "hello world",
	"b" : "goodbyte world"
};


