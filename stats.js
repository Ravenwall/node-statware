"use strict";

module.exports = Stats

var FixedArray = require("fixed-array")
var StatsIncremental = require("stats-incremental")

function Stats(initial) {
  if (!(this instanceof Stats)) return new Stats(initial)
  this._stats = initial || {}
  this.helper_stack = []
}
Stats.prototype._handle = function (out) {
  // Bypass helper chain if there is none. (Mostly to avoid tacking on stats_runtime)
  if (this.helper_stack.length === 0) return out(this._stats)
  var self = this
  var index = 0
  var stack = this.helper_stack
  var start = process.hrtime()
  function next(error) {
    if (error && error instanceof Error) {
      self.increment("helperErrors")
    }
    var layer = stack[index++]
    if (!layer) {
      var elapsed = process.hrtime(start)
      var agentStats = self.namespace("statware")
      agentStats.checktime = Date.now()
      agentStats.stats_runtime = elapsed[0] + elapsed[1] / 1e9
      return out(self._stats)
    }
    layer(self._stats, next)
  }
  next()
}
Stats.prototype.getStats = function (callback) {
  var self = this
  self._handle(callback)
}
Stats.prototype.set = function (key, value) {
  this._stats[key] = value
}
Stats.prototype.increment = function (key) {
  if (isNaN(this._stats[key])) {
    this._stats[key] = 1
  }
  else {
    this._stats[key]++
  }
}
// Async helpers should be be function(status_object, next)
Stats.prototype.registerHelper = function (fn) {
  this.helper_stack.push(fn)
  return this
}
Stats.prototype.windowedStat = function (key, windowSize) {
  var statWindow = FixedArray(windowSize)
  this.registerHelper(function (status, next) {
    var vals = statWindow.values()
    status[key] = {}
    status[key].n = statWindow.length()
    status[key].min = statWindow.min()
    status[key].max = statWindow.max()
    status[key].mean = statWindow.mean()
    next()
  })
  return statWindow
}
Stats.prototype.addStat = function (key) {
  var rolling = new StatsIncremental()
  this.registerHelper(function (status, next) {
    status[key] = rolling.getAll()
    next()
  })
  return rolling
}

// Create a "namespace" within the object that has a similar interface.
//   Rather than creating another underlaying Stats instance it just a sugary
//   wrap around the existing one.
//   Does not manage nested namespaces.
Stats.prototype.namespace = function (name) {
  var parent = this
  if (this._stats[name] == null) {
    var space = {}
    Object.defineProperty(space, "getStats", {value: function (callback) {
      return parent.getStats(callback)
    }})
    Object.defineProperty(space, "set", {value: function (key, value) {
      this[key] = value
    }})
    Object.defineProperty(space, "increment", {value: function (key) {
      if (isNaN(this[key])) {
        this[key] = 1
      }
      else {
        this[key]++
      }
    }})
    Object.defineProperty(space, "windowedStat", {value: function (key, windowSize) {
      var statWindow = FixedArray(windowSize)
      parent.registerHelper(function (status, next) {
        var vals = statWindow.values()
        status[name][key] = {}
        status[name][key].n = statWindow.length()
        status[name][key].min = statWindow.min()
        status[name][key].max = statWindow.max()
        status[name][key].mean = statWindow.mean()
        next()
      })
      return statWindow
    }})
    Object.defineProperty(space, "addStat", {value: function (key) {
      var rolling = new StatsIncremental()
      parent.registerHelper(function (status, next) {
        status[name][key] = rolling.getAll()
        next()
      })
      return rolling
    }})
    Object.defineProperty(space, "registerHelper", {value: function (fn) {
      parent.registerHelper(function (status, next) {
        var ns = status[name]
        fn(ns, next)
      })
    }})
    Object.defineProperty(space, "namespace", {value: function () {
      throw new Error("This is already a namespace. Nested namespaces not supported.")
    }})

    this._stats[name] = space
  }
  return this._stats[name]
}
