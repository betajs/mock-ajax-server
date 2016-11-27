(function() {

	var Helper = {

		__lastId : 0,

		newId : function() {
			var t = (new Date()).getTime();
			this.__lastId = t > this.__lastId ? t : this.__lastId + 1;
			return this.__lastId;
		},
		
		is_empty: function (obj) {
			for (var key in obj)
				return false;
			return true;
		},

		extend : function(target, source) {
			target = target || {};
			if (source) {
				for ( var key in source)
					target[key] = source[key];
			}
			return target;
		},

		loadByIframe : function(options, callback, context) {
			var iframe = document.createElement("iframe");
			if (options.visible) {
				iframe.style.border = "none";
				iframe.style.width = "1px";
				iframe.style.height = "1px";
			} else {
				iframe.style.display = "none";
			}
			var loaded = function() {
				var body = null;
				var content = null;
				try {
					body = iframe.contentDocument.body;
					content = body.textContent || body.innerText;
				} catch (e) {
				}
				callback.call(context || this, content, body, iframe);
				if (options.remove)
					document.body.removeChild(iframe);
			};
			if (iframe.attachEvent)
				iframe.attachEvent("onload", loaded);
			else
				iframe.onload = loaded;
			iframe.src = options.url;
			document.body.appendChild(iframe);
		},

		generate_token : function(length) {
			length = length || 16;
			var s = "";
			while (s.length < length)
				s += Math.random().toString(36).substr(2);
			return s.substr(0, length);
		},

		setCookie : function(key, value, path) {
			var result = encodeURIComponent(key) + "="
					+ encodeURIComponent(value);
			if (path)
				result += "; path=" + path;
			document.cookie = result;
		}

	};

	window.MockAjax = {

		corsHost : "",

		createCrossCookie : function(cookiename, cookievalue, callback) {
			Helper.loadByIframe({
				url : this.corsHost + "/setcookie?name="
						+ encodeURIComponent(cookiename) + "&value="
						+ encodeURIComponent(cookievalue),
				remove : false
			}, function() {
				callback();
			});
		},

		createRequest : function(clientOptions, serverOptions) {
			var id = Helper.newId();
			clientOptions = Helper.extend({
				path : "/",
				cors : false
			}, clientOptions);
			serverOptions = Helper.extend({
				id : id
			}, serverOptions);
			var arr = [];
			for ( var key in serverOptions)
				arr.push(key + ":" + serverOptions[key]);
			return {
				uri : (clientOptions.cors ? this.corsHost : "") + "/request/"
						+ arr.join(",") + clientOptions.path,
				id : id
			};
		},

		requestLog : function(request, callback, errorCallback) {
			Helper.loadByIframe({
				url : "/logs/" + request.id,
				remove : true
			}, function(textData) {
				try {
					callback(JSON.parse(textData));
				} catch (e) {
					errorCallback(e);
				}
			});
		},

		createTest : function(opts) {
			var name = [];
			name.push(opts.method.toLowerCase());
			name.push(opts.origin + " origin");
			if (opts.jsondata)
				name.push("jsondata");
			if (opts.jsonp)
				name.push("jsonp");
			if (opts.postmessage)
				name.push("postmessage");
			if (opts.corscreds)
				name.push("cors credentials");
			if (opts.wrapstatus)
				name.push("wrap status");
			name.push("status " + opts.status);
			name.push("cookie expect " + opts.cookie);
			name.push("should " + opts.should);

			name = name.join(", ");

			var data = {
				path : "/" + Helper.generate_token(),
				querykey : Helper.generate_token(),
				queryvalue : Helper.generate_token(),
				datakey : Helper.generate_token(),
				datavalue : Helper.generate_token(),
				cookiekey : "ajax_unit_test",
				cookievalue : Helper.generate_token(),
				crosscookievalue : Helper.generate_token()
			};
			if (opts.jsondata) {
				data.datavalue = {
					foo : data.datavalue
				};
			}
			var request = this.createRequest({
				path : data.path,
				cors : opts.origin === "cross"
			}, {
				status : opts.status,
				cors : !!opts.servercors,
				corscreds : !!opts.corscreds,
				jsonp : !!opts.jsonp,
				postmessage : !!opts.postmessage
			});

			var ajax = {
				method : opts.method,
				uri : request.uri + "?" + data.querykey + "=" + data.queryvalue,
				data : {},
				jsonp : "jsonp",
				postmessage : "postmessage",
				forceJsonp : !!opts.jsonp,
				forcePostmessage : !!opts.postmessage,
				corscreds : !!opts.corscreds,
				wrapStatus : !!opts.wrapstatus,
				wrapStatusParam : "wrapstatus"
			};
			ajax.data[data.datakey] = data.datavalue;

			return {
				name : name,
				opts : opts,
				data : data,
				request : request,
				ajax : ajax
			};
		},
		
		runTest: function (setup, callback) {
			Helper.setCookie(setup.data.cookiekey, setup.data.cookievalue, "/");
			this.createCrossCookie(setup.data.cookiekey, setup.data.crosscookievalue, callback);			
		},
		
		qunitCheckLog: function (log, setup) {
			if (Helper.is_empty(log)) {
				QUnit.equal(setup.opts.allowsilent, true);
			} else {
				QUnit.equal(log.response.status, setup.opts.status, "Status");
				QUnit.equal(log.request.method, setup.opts.method, "Method");
				QUnit.equal(log.request.path, setup.data.path, "Path");
				QUnit.equal(log.request.query[setup.data.querykey], setup.data.queryvalue, "Query Value");
				if (setup.opts.method !== "GET")
					QUnit.deepEqual(log.request.body[setup.data.datakey], setup.data.datavalue, "Data Value");
				if (setup.opts.cookie !== "crossornone")
					QUnit.equal(log.request.cookies[setup.data.cookiekey], setup.opts.cookie === "same" ? setup.data.cookievalue : (setup.opts.cookie === "cross" ? setup.data.crosscookievalue : undefined));
				else if (log.request.cookies[setup.data.cookiekey] === undefined)
					QUnit.equal(log.request.cookies[setup.data.cookiekey], undefined);
				else
					QUnit.equal(log.request.cookies[setup.data.cookiekey], setup.data.crosscookievalue);
			}
		}

	};

}).call(this);