module.exports = Statware
module.exports.logger = function () {
  var s = Statware()
  return logger.apply(s, arguments)
}
module.exports.pusher = function () {
  var s = Statware()
  return pusher.apply(s, arguments)
}
module.exports.page = function () {
  var s = Statware()
  return page.apply(s, arguments)
}

module.exports.memstats = memstats
module.exports.sysstats = sysstats
module.exports.procstats = procstats

var os = require("os")

var push = require("./push")
var Stats = require("./stats")
var server = require("./server")

var fa = require("fixed-array")

/**
 * The Statware class incapsulates a stat middleware tool for recording application stats
 * and allows behavior to be added that can send or log those stats.
 *
 * @param {Object} initial The initial status values. It is sometimes useful to bootstrap some values.
 */
function Statware(initial) {
  if (!(this instanceof Statware)) return new Statware(initial)
  var stats = Stats(initial)

  // Wrap Stats methods
  this.registerHelper = stats.registerHelper.bind(stats)
  this.getStats = stats.getStats.bind(stats)
  this.set = stats.set.bind(stats)
  this.increment = stats.increment.bind(stats)
  this.incrementHash = stats.incrementHash.bind(stats)
  this.namespace = stats.namespace.bind(stats)

  this.stats = stats
}
Statware.prototype.logger = logger
Statware.prototype.pusher = pusher
Statware.prototype.page = page

/**
 * Create a capped history of values to report min/max/mean of
 * @param  {string} key The name of the capped collection
 * @param  {number} max The maximum size of the history, FIFO
 * @return {FixedValueHistory}     The history object. history.push(values) to it to store them.
 */
Statware.prototype.cappedHistory = function (key, max) {
  var capped = fa.newFixedValueHistory(max)
  this.registerHelper(function (status, next) {
    status[key] = {}
    status[key].min = capped.min()
    status[key].max = capped.max()
    status[key].mean = capped.mean()
    next()
  })
  return capped
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
  var self = this
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
  var self = this
  var defaultCallback = function (err, res) {
    if (err) {
      console.log("Unable to push stats.", err)
      return
    }
    if (res.statusCode >= 400) {
      console.log("Unable to push stats. Server reported %s", res.statusCode)
      return
    }
  }
  self.push = function (cb) {
    self.stats.getStats(function (stats) {
      push(options, stats, cb || defaultCallback)
    })
  }
  self.pushUrl = options.url

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
  var self = this
  self.server = server(self)
  self.server.listen(port || 7667)
  self.stopPage = function () {
    self.server.close()
  }
  return self
}

function namespace(hash, space) {
  if (hash[space] == null) {
    hash[space] = {}
  }
  return hash[space]
}

/**
 * A provided async helper that appends memory stats.
 *
 * Usage:
 *   sw.registerHelper(statware.memstats)
 */
function memstats(stats, next) {
  var hostinfo = namespace(stats, "system")
  var hostmem = namespace(hostinfo, "memory")
  hostmem.free = os.freemem()
  hostmem.total = os.totalmem()

  var proc = namespace(stats, "process")
  var procmem = namespace(proc, "memory")
  var mem = process.memoryUsage()
  procmem.rss = mem.rss
  procmem.heapTotal = mem.heapTotal
  procmem.heapUsed = mem.heapUsed
  next()
}

/**
 * A provided async helper that appends system stats.
 *
 * Usage:
 *   sw.registerHelper(statware.sysstats)
 */
function sysstats(stats, next) {
  var hostinfo = namespace(stats, "system")
  hostinfo.arch = process.arch
  hostinfo.platform = process.platform
  hostinfo.hostname = os.hostname()
  hostinfo.uptime = os.uptime()

  var load = os.loadavg()
  hostinfo.loadavg = {}
  hostinfo.loadavg["1m"] = load[0]
  hostinfo.loadavg["5m"] = load[1]
  hostinfo.loadavg["15m"] = load[2]

  // TODO more cpu info
  var cpuinfo = os.cpus()
  var cpu = namespace(hostinfo, "cpu")
  cpu.cores = cpuinfo.length
  // TODO is it possible to have multiple models?
  cpu.model = cpuinfo[0].model
  cpu.speed = cpuinfo.reduce(function (p, c) { return p + c.speed}, 0) / cpuinfo.length
  next()
}

/**
 * A provided async helper that appends process stats.
 *
 * Usage:
 *   sw.registerHelper(statware.procstats)
 */
function procstats(stats, next) {
  var proc = namespace(stats, "process")
  proc.pid = process.pid
  proc.title = process.title
  proc.uptime = process.uptime()
  proc.user = process.env.USER
  proc.versions = process.versions
  proc.active_requests = process._getActiveRequests().length
  proc.active_handles = process._getActiveHandles().length
  next()
}
