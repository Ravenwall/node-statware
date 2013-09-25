var test = require("tape").test
var http = require("http")
var request = require("request")

var statware

// Stats
test("load", function (t) {
  t.plan(1)

  statware = require("../")
  t.ok(statware, "loaded module")
})

test("create statware", function (t) {
  t.plan(5)

  var sw = statware()
  t.ok(sw instanceof statware, "Used directly.")

  var sw_logger = statware.logger(console.log)
  t.ok(sw_logger instanceof statware, "Used indirectly (logger)")

  var sw_pusher = statware.pusher({url: "hi"})
  t.ok(sw_pusher instanceof statware, "Used indirectly (pusher)")

  var sw_page = statware.page()
  t.ok(sw_page instanceof statware, "Used indirectly (page)")
  sw_page.stopPage()

  var sw_chained = statware.logger(console.log).pusher({url: "hi"})
  t.ok(sw_chained instanceof statware, "chained")
})

test("contains stats", function (t) {
  t.plan(7)

  var sw = statware({hi: "world"})
  sw.getStats(function (stats) {
    t.deepEquals(stats, {hi: "world"}, "Keeps initial stats")
  })

  sw.registerHelper(statware.procstats)
  sw.registerHelper(statware.memstats)
  sw.registerHelper(statware.sysstats)
  sw.registerHelper(function (s, n) {
    s.newval = "abc"
    n()
  })
  sw.getStats(function (stats) {
    t.ok(stats.process.pid, "procstats was run.")
    t.ok(stats.system.loadavg, "sysstats was run.")
    t.ok(stats.process.memory.rss, "memstats was run (process)")
    t.ok(stats.system.memory.free, "memstats was run (system)")
    t.equal(stats.hi, "world", "Initial value still there.")
    t.equal(stats.newval, "abc", "Custom helper was run.")
  })
})

// Logger
test("logger", function (t) {
    t.plan(3)

    var sw = statware({foo: "bar"})
    var runs = []

    function testLogger(stats) {
      runs.push(Date.now())
      t.deepEquals(stats, {foo: "bar"}, "'logged' stats are correct.")
      if (runs.length == 2) {
        t.ok(runs[1] > runs[0] + 100, "scheduled run was later")
        sw.stopLogger()
      }
      if (runs.length > 2) {
        t.fail("Logger should be shut off!")
      }
    }

    sw.logger(testLogger, 1)
    sw.log()
})

// Pusher
test("pusher", function (t) {
    t.plan(6)

    var sw = statware({foo: "bar"})
    var runs = []

    var server = http.createServer(function (req, res) {
      if (req.url.match(/^\/foo/)) {
        runs.push(Date.now())
        t.equal(req.method, "POST", "pusher POSTed")
        t.equal(req.headers.hi, "mom", "Header sent")
        if (runs.length == 2) {
          t.ok(runs[1] > runs[0] + 100, "scheduled run was later")
          sw.stopPusher()
          server.close()
        }
        if (runs.length > 2) {
          t.fail("Pusher should be shut off!")
        }
        res.end("")
      }
      else {
        t.fail("Wrong path.")
      }
    }).listen(9119, function () {
      sw.pusher({url: "http://localhost:9119/foo", headers: {hi: "mom"}}, 1)
      sw.push()
      t.equal(sw.pushUrl, "http://localhost:9119/foo", "Push URL is exposed")
    })
})

// Page
test("page", function (t) {
    t.plan(10)

    var sw = statware({foo: "bar"}).page(9111)

    request("http://localhost:9111", function (err, res, body) {
      t.equal(err, null, "No error")
      t.equal(res.statusCode, 404, "Not found")
      t.equal(body, "404", "Page is 404")
    })
    request("http://localhost:9111/favicon.ico", {followRedirect: false}, function (err, res, body) {
      t.equal(err, null, "No error")
      t.equal(res.statusCode, 303, "Redirects")
      t.equal(res.headers.location, "https://ravenwall.com/ico/favicon.ico", "Redirects to ravenwall ico")
    })
    request("http://localhost:9111/stats.json", {followRedirect: false}, function (err, res, body) {
      t.equal(err, null, "No error")
      t.equal(res.statusCode, 200, "Success")
      t.deepEquals(JSON.parse(body), {foo: "bar"}, "Body  matches expected status.")
    })
    setTimeout(function () {
      sw.stopPage()
      request("http://localhost:9111/stats.json", {followRedirect: false}, function (err, res, body) {
        t.ok(err instanceof Error, "Error is returned, page server is shut down.")
      })
    }, 500)
})
