"use strict";

module.exports = statware

var Stats = require("./stats")

var os = require("os")

function statware(initial) {
  var stats = new Stats(initial)

  stats.installSystemInfo = function () {
    var sumSpeed = function (p, c) {
      return p + c.speed
    }

    stats.registerHelper(function (status, next) {
      var sys = status.system_info
      if (sys == null) {
        sys = {}
      }
      sys.freemem = os.freemem()
      sys.totalmem = os.totalmem()
      sys.arch = process.arch
      sys.platform = process.platform
      sys.uptime = os.uptime()
      var load = os.loadavg()
      sys.loadavg = {}
      sys.loadavg["1m"] = load[0]
      sys.loadavg["5m"] = load[1]
      sys.loadavg["15m"] = load[2]
      var cpuinfo = os.cpus()
      sys.cores = cpuinfo.length
      sys.cpu_model = cpuinfo[0].model
      sys.cpu_speed = cpuinfo.reduce(sumSpeed, 0) / cpuinfo.length
      sys.hostname = os.hostname()

      status.system_info = sys
      next()
    })
    return stats
  }
  stats.installProcessInfo = function () {
    stats.registerHelper(function (status, next) {
      var proc = status.process_info
      if (proc == null) {
        proc = {}
      }
      proc.uptime = process.uptime()
      proc.memory = process.memoryUsage()
      proc.active_requests = process._getActiveRequests().length
      proc.active_handles = process._getActiveHandles().length
      proc.versions = process.versions
      proc.node_env = process.env.NODE_ENV || ""
      proc.pid = process.pid
      proc.title = process.title
      proc.user = process.env.USER

      status.process_info = proc
      next()
    })
    return stats
  }

  return stats
}
