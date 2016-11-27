var Express = require("express");
var Proxy = require(__dirname + "/proxy_service.js");

module.exports = function (Config) {
	var logs = {};
	
	Config.ports.forEach(function (port) {
		var express = Express();
		express.use(require("cookie-parser")());
		express.use(function (req, res, next) {
	        var useragentString = req.headers['user-agent'];
	        var contentType = req.headers['content-type'] || '';
	        var ua = require("useragent").lookup(useragentString);
	        if (ua && ua.family === 'IE' && (ua.major === '8' || ua.major === '9')) {
	            if (req.headers.accept === '*/*') {
	                if (!contentType.length || contentType === 'text/plain') {
	                    req.headers['content-type'] = "application/x-www-form-urlencoded";
	                }
	            }
	        }
	        next();
	    });
		express.use(require("body-parser")());
		
		express.use("/assets", Express["static"](__dirname + "/../assets"));
		
		if (Config.staticServe)
			express.use("/static", Express["static"](Config.staticServe));

		if (Config.proxyServe) {
			express.get('/proxy', function (request, response) {
				Proxy(request.query.url, "/proxy?url=", function (result) {
					response.status(result.status).header("Content-Type", result.contentType).send(result.data);
				});
			});
		}
		
		express.get('/logs/:id', function (request, response) {
			response.header("Access-Control-Allow-Origin", "*");
			response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
			response.header('Content-Type', 'text/html');
			if (logs[request.params.id])
				response.status(200).send(JSON.stringify(logs[request.params.id]));
			else
				response.status(200).send('{}');
		});
		
		express.get("/setcookie", function (request, response) {
			response.header('Content-Type', 'text/html');
			var cookiename = request.query.name;
			var cookievalue = request.query.value;
			response.cookie(cookiename, cookievalue, { maxAge: 900000, httpOnly: true });
			response.status(200).send('Set-Cookie: ' + cookiename + "=" + cookievalue);
		});

		express.all('/request/:options/:path*?', function (request, response) {
			
			var path = "/" + (request.params.path || "") + (request.params['0'] || "");
			
			var options = {};
			request.params.options.split(",").forEach(function (option) {
				var kv = option.split(":");
				options[kv[0]] = kv[1];
			});
			options.cors = options.cors === "true";
			options.id = options.id || undefined;
			options.status = options.status ? parseInt(options.status, 10) : 200;
			options.jsonp = options.jsonp === "true";
			options.postmessage = options.postmessage === "true";
			
			var log = {
				options: options,
				id: options.id,
				request: {
					path: path,
					method: request.method,
					query: request.query,
					body: request.body,
					cookies: request.cookies,
					origin: request.headers.origin
				},
				response: {
					status: options.status
				}
			};
			
			if (log.id)
				logs[log.id] = log;
			
			console.log(log);
			
			if (options.cors) {
				response.header("Access-Control-Allow-Origin", request.headers.origin);
				//response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
				response.header("Access-Control-Allow-Methods", "*");
				response.header("Access-Control-Allow-Credentials", options.corscreds ? "true" : "false");
			}
			
			var status = log.response.status;
			var responseJSON = log;
			
			if (log.request.query.wrapstatus) {
				responseJSON = {
					status: log.response.status,
					responseText: responseJSON
				};
				status = 200;
			}

			if (log.options.jsonp) {
				response.header('Content-Type', 'text/html');
				response.status(status).send(log.request.query.jsonp + "(" + JSON.stringify(responseJSON) + ");");
			} else if (log.options.postmessage) {
				response.header('Content-Type', 'text/html');
				response.status(status).send("<!DOCTYPE html><script>parent.postMessage(JSON.stringify({'" + log.request.query.postmessage + "' : " + JSON.stringify(responseJSON) + " }), '*');</script>");
			} else {
				response.header('Content-Type', 'application/json');
				response.status(status).send(responseJSON);
			}
		});

		express.listen(port, function () {
			console.log("Listening on", port);
		});

	});
};