module.exports = server

var http = require("http")

function server(statware) {
  return http.createServer(function (req, res) {
    var start = Date.now()
    if (req.url.match(/^\/stats\.json$/)) {
      statware.getStats(function (stats) {
        var content = JSON.stringify(stats, null, 2)
        var elapsed = Date.now() - start
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Response-Millis": elapsed,
          "Content-Length": content.length,
        })
        res.end(content)
      })
    }
    else if (req.url.match(/^\/favicon\.ico$/)) {
      res.writeHead(303, {"Location": "https://ravenwall.com/ico/favicon.ico"})
      res.end()
    }
    else {
      res.writeHead(404, {"Content-Type": "text/plain"})
      res.end("404")
    }
  })
}
