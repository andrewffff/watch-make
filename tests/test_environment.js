


exports.content = {
	'Makefile': 
		"dest-$(XXXYYY): foo.txt\n" +
		"\tsleep 2 && cp foo.txt $@\n",

	'foo.txt': "FOO",	
};

exports.environment = {
	"IRRELEVANT_VAR" : "blah_blah",
	"XXXYYY" : "arbitrary_variable_99"
};

exports.steps = [
	3,

	"touch foo.txt",
	5,
	["Makefile", "foo.txt", "dest-arbitrary_variable_99"],

];







