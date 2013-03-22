module.exports = statware
module.exports.Statware = Statware
module.exports.logger = logger
module.exports.pusher = pusher
module.exports.page = page

module.exports.memstats = memstats
module.exports.sysstats = sysstats
module.exports.procstats = procstats

var os = require("os")
var request = require("request")

var stats = require("./stats")
var server = require("./server")

/**
 * Create a new Statware object.
 *
 * @param {Stats} initial The initial values for a Stats object.
 */
function statware(initial) {
  if (initial instanceof Statware) {
    return initial
  }
  return new Statware(initial)
}

/**
 * The Statware class incapsulates a stat middleware tool for recording application stats
 * and allows behavior to be added that can send or log those stats.
 *
 * @param {Object} initial The initial status values. It is sometimes useful to bootstrap some values.
 */
function Statware(initial) {
  this.stats = stats(initial)
}
Statware.prototype.logger = logger
Statware.prototype.pusher = pusher
Statware.prototype.page = page

/**
 * Register a helper for the stats object.
 *
 * @param {Function(Stats, next)} helper Add a helper to the Stats helper chain. Must call next().
 */
Statware.prototype.registerHelper = function (helper) {
  this.stats.registerHelper(helper)
}

/**
 * Get the stats stored internally, running all helpers.
 */
Statware.prototype.getStats = function (cb) {
  this.stats.getStats(cb)
}

/**
 * Create an optionally recurring logger.
 *
 * It will give the calling (or provided) Statware object two new methods:
 *   log() -- Manually invoke the logger.
 *   stopLogger() -- stop the recurring logger.
 *
 * @this Statware
 * @param {log handle} handle A log function to call like handle(stats)
 * @param {number} seconds A repeating interval to log(). Will not recur if not supplied.
 * @return {Statware}
 */
function logger(handle, seconds) {
  var self = statware(this)
  self.log = function () {
    self.stats.getStats(handle)
  }

  if (seconds && !isNaN(seconds) && seconds > 0) {
    self.logInterval = setInterval(self.log, seconds * 1000)
    self.stopLogger = function () {
      clearInterval(self.logInterval)
    }
  }
  return self
}

/**
 * Create an optionally recurring http POST pusher.
 *
 * It will give the calling (or provided) Statware object two new methods:
 *   push() -- Manually invoke the pusher.
 *   stopPusher() -- stop the recurring pusher.
 *
 * @this Statware
 * @param {Object} options Options to use when pushing. Requires url (full).
 * @param {number} seconds A repeating interval to push(). Will not recur if not supplied.
 * @return {Statware}
 */
function pusher(options, seconds) {
  if (!options.url) throw new Error("Please provide a url to push to.")
  options.json = true
  options.timeout = options.timeout || 10000
  var self = statware(this)
  self.push = function () {
    self.stats.getStats(function (stats) {
        options.body = stats
        request.post(options, function (err, res) {
          if (err) {
            console.log("Unable to push stats.", err)
          }
          if (res.statusCode >= 400) {
            console.log("Unable to push stats. Server reported %s", res.statusCode)
          }
        })
    })
  }

  if (seconds && !isNaN(seconds) && seconds > 0) {
    self.pushInterval = setInterval(self.push, seconds * 1000)
    self.stopPusher = function () {
      clearInterval(self.pushInterval)
    }
  }
  return self
}

/**
 * Create a http server that hosts your stats.
 *
 * It will give the calling (or provided) Statware object two new methods:
 *   stopPage() -- Stop the webserver.
 *
 * @this Statware
 * @param {number} [port=7667] The port to listen on.
 * @return {Statware}
 */
function page(port) {
  var self = statware(this)
  self.server = server(self)
  self.server.listen(port || 7667)
  self.stopPage = function () {
    self.server.close()
  }
  return self
}

/**
 * A provided async helper that appends memory stats.
 *
 * Usage:
 *   sw.registerHelper(statware.memstats)
 */
function memstats(stats, next) {
  stats.freemem = os.freemem()
  stats.totalmem = os.totalmem()
  var mem = process.memoryUsage()
  stats.rss = mem.rss
  stats.heapTotal = mem.heapTotal
  stats.heapUsed = mem.heapUsed
  next()
}

/**
 * A provided async helper that appends system stats.
 *
 * Usage:
 *   sw.registerHelper(statware.sysstats)
 */
function sysstats(stats, next) {
  stats.hostname = os.hostname()
  var load = os.loadavg()
  stats.loadavg = {}
  stats.loadavg["1m"] = load[0]
  stats.loadavg["5m"] = load[1]
  stats.loadavg["15m"] = load[2]
  next()
}

/**
 * A provided async helper that appends process stats.
 *
 * Usage:
 *   sw.registerHelper(statware.procstats)
 */
function procstats(stats, next) {
  stats.pid = process.pid
  stats.title = process.title
  stats.checktime = Date.now()
  stats.uptime = process.uptime()
  stats.user = process.env.USER
  stats.versions = process.versions
  stats.active_requests = process._getActiveRequests().length
  stats.active_handles = process._getActiveHandles().length
  next()
}
