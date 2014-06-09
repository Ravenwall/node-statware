statware
=============

[![NPM](https://nodei.co/npm/statware.svg)](https://nodei.co/npm/statware/)

Node.js status monitoring wares.

```javascript
var statware = require("statware")

var stats = statware()

stats.getStats(function (stats) {
  console.log(stats)
})

// Will collect some pre-defined system-related stats and put them under
//   "system_info"
stats.installSystemInfo()
stats.installProcessInfo()

var custom = stats.namespace("custom_stats")
var rollingLog = custom.addCappedLog

```

API
===

`Statware([initial])`
---

Create a statware instance, with optional initial value object of `initial`.

`statwareInstance.getStats(callback)`
---

Fetch the stats object. The `callback` should be of form `callback(statsObject)` where `statsObject` is a pure Js object with the statware internal stats.

`statwareInstance.registerHelper(helper)`
---

Register an asynchronous helper function to be called whenever stats are being processed (sent/logged). The helper must be in the form of `helper(statsObject, next)` and *must* call `next()` one time. The `statsObject` is the internal stats object from `statware` and can be mutated to add, remove, or modify values.

LICENSE
=======

MIT
