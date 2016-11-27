module.exports = function(grunt) {
	
	grunt.registerMultiTask("mock-ajax-server", "Runs a mock ajax server", function() {
		var Server = require(__dirname + "/../src/server_service.js");

		Server({
			ports: this.options().ports || [5000, 5001],
			staticServe: this.options().staticserve,
			proxyServe: this.options().proxyserve
		});
	});
	
};
