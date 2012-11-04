
//
// there are actually three tests that run out of this data
//  - test_dep_tree.js directly verifies that we correctly pick the 
//    default (first) target, and pay attention to all of its ultimate
//    dependencies, and DON'T pay attention to the "dep1: src1.txt" rule
//    which is not relevant
//
//  - test_dep_tree_explicit.js does that same thing, but with "sample"
//    as the explicit target
//
//  - test_dep_tree_other.js runs "watch-make dep1" and makes sure that
//    the sample and dep2 targets are ignored
//

exports.content = {
	'Makefile': 
		"sample: dep2\n" +
		"\tsleep 2 && touch sample_was_built\n" +
		"\n" +	
		"dep1: src1.txt\n" +
		"\tsleep 2 && cat $+ > $@\n" +	
		"\n" +	
		"dep2: src2.txt\n" +
		"\tsleep 2 && cat $+ > $@\n" +	
		"\n",

	'src1.txt': "This is src1.txt\n",
	'src2.txt': "This is src2.txt\n",

	'dep1': "I will be overwritten by 'make dep1', the default target leaves me alone.\n",
	'dep2': "I will be overwritten by 'make', 'make sample' or 'make dep2'.\n",
};

exports.steps = [
	6,

	["Makefile", "sample_was_built" ],

	// should trigger rebuild of "sample: dep2"
	"touch src2.txt",
	6,
	["src1.txt", "src2.txt", "dep2", "sample_was_built" ],

	// should NOT trigger rebuild since the applicable target doesn't depend on this
	2,
	"touch src1.txt",
	6,
	["dep1", "src2.txt", "dep2", "sample_was_built", "src1.txt" ]

];



exports.parametersExplicit = ['sample'];
exports.stepsExplicit = exports.steps;


exports.parametersOther = ['dep1'];
exports.stepsOther = [
	6,

	// establish a known order between dep2 and dep1
	"touch dep1",
	2,
	["dep2", "dep1"],

	// should have no effect
	"touch src2.txt",
	6,
	["dep2", "dep1", "src2.txt"],

	// should rebuilt dep1
	"touch src1.txt",
	6,
	["dep2", "src2.txt", "src1.txt", "dep1"],
];







