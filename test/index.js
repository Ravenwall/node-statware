"use strict";

var test = require("tape")
var os = require("os")
var statware = require("../statware")

test("simple", function (t) {
  var stats = statware({foo: "initial"})
  stats.getStats(function (s) {
    t.deepEqual(s, {foo: "initial"})
    t.end()
  })
})

test("methods", function (t) {
  var stats = statware()
  stats.increment("bar")
  stats.increment("bar")
  stats.set("foo", "blah")
  stats.registerHelper(function (s, next) {
    s.zzz = "ZZZ"
    next()
  })
  stats.getStats(function (s) {
    t.equals(s.bar, 2)
    t.equals(s.foo, "blah")
    t.equals(s.zzz, "ZZZ")
    t.ok(s.statware instanceof Object, "adds statware info when a helper is defined")
    t.end()
  })
})

test("stats", function (t) {
  var stats = statware()
  var bucket = stats.windowedStat("ages", 10)
  bucket.push(4)
  bucket.push(9)
  bucket.push(11)

  var st = stats.addStat("ht")
  st.update(36)
  st.update(48)
  st.update(66)

  stats.getStats(function (s) {
    t.equals(s.ages.n, 3)
    t.equals(s.ages.min, 4)
    t.equals(s.ages.max, 11)
    t.equals(s.ages.mean, 8)

    t.equals(s.ht.n, 3)
    t.equals(s.ht.min, 36)
    t.equals(s.ht.max, 66)
    t.equals(s.ht.sum, 150)
    t.equals(s.ht.mean, 50)
    t.equals(Math.floor(s.ht.standard_deviation), 12)

    t.ok(s.statware instanceof Object, "statware stats added")
    t.end()
  })
})

test("system_info", function (t) {
  var stats = statware()
  stats.installSystemInfo()
  stats.getStats(function (s) {
    t.equal(s.system_info.totalmem, os.totalmem())
    t.ok(s.system_info.freemem)
    t.ok(s.system_info.arch)
    t.ok(s.system_info.platform)
    t.ok(s.system_info.uptime)
    t.ok(s.system_info.loadavg)
    t.ok(s.system_info.loadavg["1m"])
    t.ok(s.system_info.loadavg["5m"])
    t.ok(s.system_info.loadavg["15m"])
    t.ok(s.system_info.cores)
    t.ok(s.system_info.cpu_model)
    t.ok(s.system_info.cpu_speed)

    t.end()
  })
})

test("process_info", function (t) {
  var stats = statware()
  stats.installProcessInfo()
  stats.getStats(function (s) {
    var p = s.process_info
    t.ok(p.uptime != null)
    t.ok(p.memory.rss)
    t.ok(p.memory.heapTotal)
    t.ok(p.memory.heapUsed)
    t.ok(p.active_requests != null)
    t.ok(p.active_handles != null)
    t.deepEqual(p.versions, process.versions)
    t.ok(p.node_env != null)
    t.equal(p.pid, process.pid)
    t.ok(p.title)
    t.ok(p.user)
    t.end()
  })
})

test("namespace simple", function (t) {
  var stats = statware({foo: "initial"})
  var ns = stats.namespace("bar")
  ns.set("blah", "hi")
  stats.getStats(function (s) {
    t.deepEqual(s, {foo: "initial", bar: {blah: "hi"}})
    t.end()
  })
})

test("namespace methods", function (t) {
  var stats = statware()
  var ns = stats.namespace("ns")
  ns.increment("bar")
  ns.increment("bar")
  ns.set("foo", "blah")
  stats.registerHelper(function (s, next) {
    s.zzz = "ZZZ"
    next()
  })
  stats.getStats(function (s) {
    t.equals(s.ns.bar, 2)
    t.equals(s.ns.foo, "blah")
    t.equals(s.zzz, "ZZZ")
    t.ok(s.statware instanceof Object, "adds statware info when a helper is defined")
    t.end()
  })
})

test("namespace stats", function (t) {
  var stats = statware()
  var ns = stats.namespace("ns")
  var bucket = ns.windowedStat("ages", 10)
  bucket.push(4)
  bucket.push(9)
  bucket.push(11)

  var st = ns.addStat("ht")
  st.update(36)
  st.update(48)
  st.update(66)

  stats.getStats(function (s) {
    t.equals(s.ns.ages.n, 3)
    t.equals(s.ns.ages.min, 4)
    t.equals(s.ns.ages.max, 11)
    t.equals(s.ns.ages.mean, 8)

    t.equals(s.ns.ht.n, 3)
    t.equals(s.ns.ht.min, 36)
    t.equals(s.ns.ht.max, 66)
    t.equals(s.ns.ht.sum, 150)
    t.equals(s.ns.ht.mean, 50)
    t.equals(Math.floor(s.ns.ht.standard_deviation), 12)

    t.ok(s.statware instanceof Object, "statware stats added")
    t.end()
  })
})
