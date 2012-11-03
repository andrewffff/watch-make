


var subdir_content = {
	'Makefile':
		"product: source.txt\n" +
		"\tsleep 2 && cat $+ > $@\n",

	'secondMakefile':
		"product: source.txt extra.txt\n" +
		"\tsleep 2 && cat $+ > $@\n",

	'source.txt': "Hi I am source.txt!\n",
	'extra.txt': "Only the second Makefile knows about me.\n",
};

exports.content = {
	'Makefile': 
		"all: always_run_a always_run_b\n" +
		"\n" +
		"always_run_a:\n" +
		"\tcd work_a && make\n" +
		"\tsleep 2 && cp work_a/product final_a\n" +
		"\n" +
		"always_run_b:\n" +
		"\tcd work_b && make\n" +
		"\tsleep 2 && cp work_b/product final_b\n",

	// both subdirs the same
	'work_a' : subdir_content,
	'work_b' : subdir_content,
};


exports.steps = [
	6,

	// This should cause a rebuild in work_a, not work_b
	"touch work_a/source.txt",
	10,
	["Makefile", "work_b/product", "work_a/product", "final_a", "final_b"],

	// This should cause a rebuild in work_b, not work_a
	"touch work_b/source.txt",
	10,
	["Makefile", "work_a/product", "final_a", "work_b/product", "final_b"],

	// Change the makefile in work_a but not work_b
	"cat work_a/secondMakefile > work_a/Makefile",
	10,

	// Just like "touch work_a/source.txt" above
	"touch work_a/extra.txt",
	10,
	["work_b/Makefile", "work_b/product", "work_a/Makefile", "work_a/extra.txt", "work_a/product", "final_a", "final_b"],

	// work_b's makefile is the old one which doesn't know about extra.txt, so this should do nothing
	"touch work_b/extra.txt",
	10,
	["work_b/Makefile", "work_b/product", "work_a/Makefile", "work_a/extra.txt", "work_a/product", "final_a", "final_b", "work_b/extra.txt"],

];







