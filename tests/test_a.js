

exports.content = {
	'Makefile': 
		"dest: dir/src\n" +
		"\tsleep 2 && cp dir/src dest\n",
	
	'dir' : {
		src:
			"hello world\n"
	}
};



exports.steps = [
	[ "dir/src", "dest" ],
	5,
	"touch dir/src",
	5,
	[ "Makefile", "dir/src", "dest" ],
];







