/*
 * Monkey-patch the http and https modules
 * to support proxies defined in the environment
 * (from HTTP_PROXY, HTTPS_PROXY, and NO_PROXY)
 *
 * Coded by macolu (https://github.com/macolu)
 */

var http  = require('http');
var https = require('https');
var url   = require('url');

var httpRequest = http.request;
var httpsRequest = https.request;

if (process.env.http_proxy) {
  var httpProxy = url.parse(process.env.http_proxy);

  http.request = function(options, callback) {
    if (!isProxyRequired(options.host)) {
        if(isProxyGinRequired(options.host))
        {
            httpProxy = url.parse("http://proxy-gin.internal.fr:3128");
            var newOptions = clone(options);
            newOptions.path     = "http://" + options.hostname + ":" + (options.port || 80) + options.path;
            newOptions.hostname = httpProxy.hostname;
            newOptions.port     = httpProxy.port;
            newOptions.headers  = {
                Host: options.hostname + ":" + (options.port || 80) + options.path
            };
            return httpRequest(newOptions, callback);
        }
        else
            return httpRequest(options, callback);
    }

    //Change proxy URL if URL is on GIN
    httpProxy = isProxyGinRequired(options.href) ? url.parse("http://proxy-gin.internal.fr:3128") : url.parse(process.env.http_proxy);
    console.error(httpProxy);
    console.error('URL : ' + options.href);

    var newOptions = clone(options);
    newOptions.path     = "http://" + options.hostname + ":" + (options.port || 80) + options.path;
    newOptions.hostname = httpProxy.hostname;
    newOptions.port     = httpProxy.port;
    newOptions.headers  = {
        Host: options.hostname + ":" + (options.port || 80) + options.path
    };
    if (httpProxy.protocol === 'https:') {
      return httpsRequest(newOptions, callback);
    } else {
      return httpRequest(newOptions, callback);
    }
  };
}

// if (process.env.https_proxy) {
//   var httpsProxy = url.parse(process.env.https_proxy);
//   https.request = function(options, callback) {
//     if (!isProxyRequired(options.host)) {
//       return httpsRequest(options, callback);
//     }
//     var newOptions = clone(options);
//     newOptions.path     = "https://" + options.hostname + ":" + (options.port || 443) + options.path;
//     newOptions.hostname = httpsProxy.hostname;
//     newOptions.port     = httpsProxy.port;
//     newOptions.protocol = httpsProxy.protocol;
//     if (httpsProxy.protocol === 'https:') {
//       return httpsRequest(newOptions, callback);
//     } else {
//       return httpRequest(newOptions, callback);
//     }
//   };
// }

/**
 * Returns weather proxy should be used when requesting given host
 *
 * ie. returns false if hostname match any pattern in no_proxy environment variable
 */
var isProxyRequired = function(hostname) {
  if (!process.env.NO_PROXY) {
    return true;
  }

  var exclusionPatterns = process.env.NO_PROXY.split(',');

  for (var i in exclusionPatterns) {
    if (hostname.search(exclusionPatterns[i]) >= 0) {
      return false;
    }
  }

  return true;
};

/**
 * returns if hostname is only accessible through GIN proxy
 * @param hostname
 * @returns true : URL is on GIN, false : URL is on internet
 */
var isProxyGinRequired = function(hostname) {
    var pattern = new RegExp(/^(.+(\.intraorange|\.francetelecom\.fr|\.ftgroup|\.forge\.orange-labs\.fr))/);
    return pattern.test(hostname);
}

var clone = function(obj) {
  if (obj == null || typeof(obj) != 'object') return obj;
  var temp = {};
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      temp[key] = clone(obj[key]);
    }
  }
  return temp;
};
