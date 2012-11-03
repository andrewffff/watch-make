


exports.content = {
	'Makefile': 
		"b: src1\n" +
		"\tsleep 2 && cp src1 a && sleep 2 && cp src1 b\n",

	'secondMakefile':
		"b: src2\n" +
		"\tsleep 2 && cp src2 b && sleep 2 && cp src2 a\n",
	
	
	'src1' : "SOURCE NUMBER 1",
	'src2' : "SOURCE NUMBER 2",
};

// Makefile.other should be used, and plain old Makefile should be ignored
exports.steps = [
	6,

	// original Makefile should ignore changes to src2, and touches a before b
	"touch src2",
	8,
	["src1", "a", "b", "src2"],

	"touch src1",
	8,
	["Makefile", "src2", "src1", "a", "b"],

	// change the makefile, since "b" isn't changed this shouldn't provoke
	// make into running any commands
	"cat secondMakefile > Makefile",
	5,
	["src2", "src1", "a", "b", "Makefile"],

	// new makefile contents: ignore changes to src1, and touch b before a

	"touch src1",
	8,
	["src2", "a", "b", "Makefile", "src1"],

	"touch src2",
	8,
	["Makefile", "src1", "src2", "b", "a"],
];







