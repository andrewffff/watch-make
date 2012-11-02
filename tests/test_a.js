

exports.content = {
	'Makefile': 
		"dest: dir/src\n" +
		"\tcp dir/src dest\n",
	
	'dir' : {
		src:
			"hello world\n"
	}
};



exports.steps = [
	"make",
	[ "dir/src", "dest" ],
	"touch dir/src",
	[ "Makefile", "dest", "dir/src" ],
];







