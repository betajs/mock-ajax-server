var Http = require("http");

module.exports = function (sourceUrl, targetUrl, callback) {
	var result = {};
	Http.get(sourceUrl, function (response) {
		result.status = response.statusCode;
		result.contentType = response.headers["content-type"];
        var body = '';
        response.on('data', function(d) {
            body += d;
        });
        response.on('end', function() {
        	body = body.replace(/src=['"](.*?)['"]/g, function (dummy, src) {
        		if (src.indexOf("://") < 0 && src.indexOf("/") !== 0)
        			src = targetUrl + sourceUrl + "/../" + src;
        		return "src='" + src + "'";
        	});
        	result.data = body;
        	callback(result);
        });
	});
}