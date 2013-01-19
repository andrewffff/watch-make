
# watch-make

*watch-make* is a program which monitors Makefile dependencies and re-invokes
`make` when one changes. It's a bit like
[guard](https://github.com/guard/guard/),
[nodemon](https://github.com/remy/nodemon),
or [node-supervisor](https://github.com/isaacs/node-supervisor), but for
any project with a Makefile.

*watch-make* only works with GNU Make - it uses the `--print-data-base` option
to extract the dependency graph from a Makefile. It understands non-default
targets, subdirectories, recursive invocations of Makefiles, etc.

I've been using *watch-make* on a few of my own projects; `watch-make test` in
a terminal tucked in the corner is my usual working method. It also has a
reasonably complete test suite. I've only tried it on Mac OS X.

I want to make *watch-make* a generally usable tool.


## Using watch-make

*watch-make* is built in node.js. You'll have to check it out and put it in
your PATH. Then you can run `watch-make foo bar` wherever you would usually
run `make foo bar`.


## Further work

An [npm](https://npmjs.org/) package and more extensive testing are obvious next steps.

Get in touch! You can follow me on Twitter at
[@andrewffff](https://twitter.com/andrewffff).


## License

*watch-make* is published under the GNU General Public License, Version 2. See
the file LICENSE.txt for more information.



