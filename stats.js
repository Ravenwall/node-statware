module.exports = Stats

function Stats(initial) {
  if (!(this instanceof Stats)) return new Stats(initial)
  this._stats = initial || {}
  this.helper_stack = []
}
Stats.prototype._handle = function (out) {
  // Bypass helper chain if there is none. (Mostly to avoid tacking on stats_runtime)
  if (this.helper_stack.length == 0) return out(this._stats)
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
      self._stats.stats_runtime = elapsed[0] + elapsed[1] / 1e9
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

// Async helpers should be be function(status_object, next)
Stats.prototype.registerHelper = function (fn) {
  this.helper_stack.push(fn)
}
