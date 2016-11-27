opt = require('node-getopt').create([
    ["", "ports=PORTS+", "server ports (default 5000, 5001)"],
    ["", "staticserve=DIRECTORY", "statically serve directory (default disabled)"],
    ["", "proxyserve", "proxy serving (default disabled)"]
]).bindHelp().parseSystem().options;

var Server = require(__dirname + "/src/server_service.js");

Server({
	ports: opt.ports || [5000, 5001],
	staticServe: opt.staticserve,
	proxyServe: opt.proxyserve
});
