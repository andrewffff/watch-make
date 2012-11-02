
if(require.main === module) console.log("You can't start this directly - use runtests.js!");

// THIS SHOULD ALWAYS FAIL
// it touches a, then b, then asserts that b was modified before a

exports.steps = [
	"touch a",
	"touch b",
	[ "b", "a" ]
];


exports.content = { };


