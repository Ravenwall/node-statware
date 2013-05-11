module.exports = push

var url = require("url")
var http = require("http")
var https = require("https")

var MAX_PAGE_FETCH_SIZE = 2048
var PUSH_TIMEOUT = 10000

function noop() {}

function push(options, body, cb) {
  if (!cb) cb = noop
  if (!options || !body) throw new Error("Please supply options and body to push()")

  var push_content = JSON.stringify(body)

  var uri = url.parse(options.url)
  if (!uri.port) {
    if (uri.protocol == "https:") {
      uri.port = 443
    }
    else {
      uri.port = 80
    }
  }
  var request = {
    agent: false,
    host: uri.hostname,
    path: uri.path,
    port: uri.port,
  }

  request.method = options.method || "POST"

  request.headers = {}
  // Set cookies first (so that custom-set header fields can override cookie value we put in)
  if (options.use_cookies && options.cookies) {
    request.headers.cookie = options.cookies
  }

  // Delete any set "User-Agent" fields (case insensitive)
  // This is to make sure we overwrite it with the correct Ravenwall UA
  if (options.headers) {
    Object.keys(options.headers).forEach(function (header) {
      // Skip any customer-set user-agents (not allowed)
      if (header.match(/^user-agent$/i)) return
      request.headers[header] = options.headers[header]
    })
  }

  request.headers["User-Agent"] = "Mozilla/5.0 (compatible; Ravenwall_NodeStatware/0.5; +https://npm.im/statware)"

  request.headers["Content-Length"] = push_content.length

  var request_handler = http
  if (uri.protocol == "https:") request_handler = https

  console.log(request)
  var req = request_handler.request(request, function(res) {
    var content = ""
    var fetched_length = 0

    res.on("data", function (chunk) {
      fetched_length += chunk.length
      content += chunk
      // Limit the size of something we'll fetch.
      if (fetched_length >= MAX_PAGE_FETCH_SIZE) {
        req.abort()
      }
    })

    res.on("end", function () {
      var response
      try {
        response = JSON.parse(content);
      }
      catch (e) {
        // JSON failed to parse
        response = {error: "Failed to parse response as json"}
      }
      return cb(null, {statusCode: res.statusCode, content: response})
    })
  })

  req.setTimeout(options.timeout || PUSH_TIMEOUT)
  req.on("timeout", function () {
    return cb(new Error("Push attempt timeout"))
  })

  req.on("error", function (err) {
    return cb(err)
  })

  req.write(push_content)
  req.end()
}