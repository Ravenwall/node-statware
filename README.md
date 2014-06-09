statware
=============

[![NPM](https://nodei.co/npm/statware.svg)](https://nodei.co/npm/statware/)

Node.js status monitoring wares.

```javascript
var statware = require("statware")

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

/*
  { cat: 'meow',
  lines: 3,
  ns: { foo: 1 },
  process_info:
   { uptime: 0,
     memory: { rss: 13094912, heapTotal: 6163968, heapUsed: 1938952 },
     active_requests: 0,
     active_handles: 0,
     versions:
      { http_parser: '1.0',
        node: '0.10.28',
        v8: '3.14.5.9',
        ares: '1.9.0-DEV',
        uv: '0.10.27',
        zlib: '1.2.3',
        modules: '11',
        openssl: '1.0.1g' },
     node_env: '',
     pid: 61429,
     title: 'node',
     user: 'bryce' },
  system_info:
   { freemem: 2590896128,
     totalmem: 17179869184,
     arch: 'x64',
     platform: 'darwin',
     uptime: 4015625,
     loadavg: { '1m': 4.21923828125, '5m': 4.244140625, '15m': 4.0029296875 },
     cores: 8,
     cpu_model: 'Intel(R) Core(TM) i7-4960HQ CPU @ 2.60GHz',
     cpu_speed: 2600 },
  foo: 'Sun Jun 08 2014 20:23:48 GMT-0700 (PDT)',
  games: { n: 3, min: 50, max: 100, mean: 75 },
  ht:
   { n: 4,
     min: 40,
     max: 1000,
     sum: 1942,
     mean: 485.5,
     variance: 121290.75,
     standard_deviation: 348.2682156040083 },
  statware: { checktime: 1402284228839, stats_runtime: 0.001205082 } }
*/

```

API
===

`Statware([initial])`
---

Create a statware stats instance, with optional initial value object of `initial`.

`statwareInstance.getStats(callback)`
---

Fetch the stats object. The `callback` should be of form `callback(statsObject)` where `statsObject` is a pure Js object with the statware internal stats.

`statwareInstance.registerHelper(helper)`
---

Register an asynchronous helper function to be called whenever `stats.getStats(cb)` is called. The helper must be in the form of `helper(statsObject, next)` and *must* call `next()` one time. The `statsObject` is the internal stats object from `statware` and can be mutated to add, remove, or modify values. Returns itself for chaining.

`statwareInstance.set(key, value)`
---

Set a key to a value explicitly

`statwareInstance.increment(key)`
---

Update an incrementing key

`var fixedArray = statwareInstance.windowedStat(key, windowSize)`
---

Create a [FixedArray](http://npm.im/fixed-array) at `key` that will have n, min, max, mean reported for it at each `getStats()` call.

`var statsIncremental = statwareInstance.addStat(key)`
---

Create a [stats-incremental](http://npm.im/stats-incremental) instance that will report `getAll()` every time `getStats()` is run.

`var namespace = statwareInstance.namespace(name)`
---

Create a top-level namespace inside the `statInstance` that behaves almost identically to `statwareInstance` except it cannot define deeper namespaces.

`stawareInstance.installProcessInfo()`
---

Register a pre-defined helper that collects a set of process-related information.

`statwareInstance.installSystemInfo()`
---

Register a pre-defined helper that collects a set of system-related information.

LICENSE
=======

MIT
