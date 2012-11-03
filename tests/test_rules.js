

// This test actually requires that GNU make's built-in rule for
// .c -> .o works (generally: you need a working C compiler)

exports.content = {
	'Makefile': 
		"program: builtin.o dotdot.o percent.o\n" +
		"\tsleep 2 && cat $+ > $@\n" +
		"\n" +	
		".SUFFIXES: .dot .percent\n" +	
		"\n" +	
		".dot.o:\n" +
		"\tsleep 2 && cat $+ > $@\n" +	
		"\n" +	
		"%.o : %.percent\n" +
		"\tsleep 2 && cat $+ > $@\n" +	
		"\n",

	'percent.percent': "Hello world from percent.percent.\n",
	'dotdot.dot': "Hello world from dotdot.dot.\n",
	'builtin.c': "\n int main(int argc,char** argv){ return 0; } \n\n",
	'notused.c': "\n int main(int argc,char** argv){ return 0; } \n\n",
};

exports.steps = [
	10,  // 3 "sleep 2"s in the makefile!

	["Makefile", "program" ],

	"touch percent.percent",
	6,
	["dotdot.dot", "percent.percent", "program" ],

	"touch dotdot.dot",
	6,
	["builtin.c", "percent.percent", "dotdot.dot", "program" ],

	"touch builtin.c",
	6,
	["Makefile", "percent.percent", "dotdot.dot", "builtin.c", "program" ],

	"touch notused.c",
	6,
	["Makefile", "percent.percent", "dotdot.dot", "builtin.c", "program", "notused.c" ],

];







