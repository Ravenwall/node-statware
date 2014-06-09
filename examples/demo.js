var statware = require("../statware")

var stats = statware()

// Optionally install pre-defined metric collections
stats.installProcessInfo()
stats.installSystemInfo()

// Register an asynchronous middleware helper
stats.registerHelper(function (status, next) {
  status.foo = (new Date()).toString()
  next()
})

// Set values manually
stats.set("cat", "meow")

// Incrementers
stats.increment("lines")
stats.increment("lines")
stats.increment("lines")

// windowed stats -- keeps the last `windowSize` records and reports on them
var windowed = stats.windowedStat("games", 10)
windowed.push(50)
windowed.push(100)
windowed.push(75)

// rolling stats for the lifetime of the process
var s = stats.addStat("ht")
s.update(40)
s.update(1000)
s.update(352)
s.update(550)

// namespaces

var ns = stats.namespace("ns")
ns.increment("foo")

// now read the stats by providing a callback function
stats.getStats(function (metrics) {
  console.log(metrics)
})
