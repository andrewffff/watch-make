


exports.content = {
	'Makefile': 
		"SOURCES = foo.txt bar.txt\n" +
		"\n" +
		"target.txt: $(SOURCES)\n" +
		"\tsleep 2 && cat $+ > $@\n",

	'foo.txt': "FOO",	
	'bar.txt': "BAR",	
	'irrelevant.txt': "IRRELEVANT"
};



exports.steps = [
	3,

	"touch foo.txt",
	5,
	["bar.txt", "foo.txt", "target.txt"],

	"touch bar.txt",
	5,
	["irrelevant.txt", "foo.txt", "bar.txt", "target.txt"],
	
	"touch irrelevant.txt",    // should not cause rebuild
	5,
	["foo.txt", "bar.txt", "target.txt", "irrelevant.txt"],
];







