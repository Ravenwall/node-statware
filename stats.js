module.exports = stats
var fa = require("fixed-array")

function stats(initial) {
  if (initial && initial instanceof Stats) {
    return initial
  }
  if (initial && typeof initial == "object") {
    return new Stats(initial)
  }
  return new Stats({})
}

function Stats(initial) {
  this.status = initial
  this.helper_stack = []
}
Stats.prototype._handle = function (out) {
  var self = this
  var index = 0
  var stack = this.helper_stack
  function next(error) {
    if (error && error instanceof Error) {
      self.increment("helperErrors")
    }
    var layer = stack[index++]
    if (!layer) {
      return out(self.status)
    }
    layer(self.status, next)
  }
  next()
}
Stats.prototype.getStats = function (callback) {
  var self = this
  self._handle(callback)
}
Stats.prototype.set = function (key, value) {
  this.status[key] = value
}
Stats.prototype.increment = function (key) {
  if (isNaN(this.status[key])) {
    this.status[key] = 1
  }
  else {
    this.status[key]++
  }
}
Stats.prototype.incrementHash = function (key, subkey) {
  if (this.status[key] === undefined) {
    this.status[key] = {}
  }
  if (isNaN(this.status[key][subkey])) {
    this.status[key][subkey] = 1
  }
  else {
    this.status[key][subkey]++
  }
}
Stats.prototype.cappedHistory = function (key, max) {
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
// Async helpers should be be function(status_object, next)
Stats.prototype.registerHelper = function (fn) {
  this.helper_stack.push(fn)
}
