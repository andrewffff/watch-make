

exports.content = {
	'Makefile': 
		"not_c.txt: src.txt\n" +
		"\tsleep 2 && cp src.txt not_c.txt\n",
	
	'Makefile.other': 
		"c.txt: src.txt\n" +
		"\tsleep 2 && cp src.txt c.txt\n",
	
	'src.txt' : "lalala\nthis is junk\n"
};

exports.parameters = ["-fMakefile.other"];

// Makefile.other should be used, and plain old Makefile should be ignored
exports.steps = [
	[ "src.txt", "c.txt"],
	"touch src.txt",
	5,
	[ "Makefile", "src.txt", "c.txt"]
];







