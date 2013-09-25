statware
=============

[![NPM](https://nodei.co/npm/statware.png)](https://nodei.co/npm/statware/)

[![david-dm](https://david-dm.org/ravenwall/node-statware.png)](https://david-dm.org/ravenwall/statware/)
[![david-dm](https://david-dm.org/ravenwall/node-statware/dev-status.png)](https://david-dm.org/ravenwall/statware#info=devDependencies/)

Node.js status monitoring wares. Used by the Ravenwall node.js agent.

```javascript
var statware = require("statware")

// Make a logger that logs to the console every minute
var stats = statware.logger(console.log, 60)
// Have it include memory stats
stats.registerHelper(statware.memstats)
// Include process stats
stats.registerHelper(statware.procstats)
// Include system stats
stats.registerHelper(statware.sysstats)

```

API
===

`Statware([initial])`
---

Create a statware instance, with optional initial value object of `initial`.

`statwareInstance.getStats(callback)`
---

Fetch the stats object. The `callback` should be of form `callback(statsObject)` where `statsObject` is a pure Js object with the statware internal stats.

`Statware.logger(handle [,seconds])`
---

Log the stats object via `handle(stats)` every `seconds` seconds. If no `seconds` is specified, will only operate when you call `statware.log()`.

Calling `statware.logger(...)` adds the methods `.log()` and `.stopLogger()` to the statware instance.

`Statware.pusher(options [,seconds])`
---

Similar to the logger, except it will create an http client that will push stats to a Rest api. Adds the methods `.push()` and `.stopPusher()` to the statware object.

Options:

  * url `[string]` e.g. `https://push.ravenwall.com/s/my_series_id`

`Statware.page(port)`
---

Create a thin process stats page http server at port `port`. Adds the method `.stopPage()` to the statware object.

`statwareInstance.registerHelper(helper)`
---

Register an asynchronous helper function to be called whenever stats are being processed (sent/logged). The helper must be in the form of `helper(statsObject, next)` and *must* call `next()` one time. The `statsObject` is the internal stats object from `statware` and can be mutated to add, remove, or modify values.

`Statware.procstats`
---

A provided helper that appends some process stats.

`Statware.memstats`
---

A provided helper that appends some memory stats.

`Statware.sysstats`
---

A provided helper that appends some system stats.

Feel free to use this module directly, though I suggest using it through http://npm.im/ravenwall

LICENSE
=======

MIT