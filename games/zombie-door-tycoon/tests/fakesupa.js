// In-memory stand-in for Supabase Realtime (broadcast + presence), shared by several "browsers".
function makeBus(opts) {
  opts = opts || {};
  var chans = [], queue = [], stats = { sent: 0, dropped: 0, bytes: 0, maxBytes: 0 };
  function deliverPresence(name) {
    var members = chans.filter(function (c) { return c.name === name && c.subscribed && c.meta; });
    var state = {}; members.forEach(function (c) { state[c.key] = [c.meta]; });
    chans.filter(function (c) { return c.name === name && c.subscribed; }).forEach(function (c) { c._state = state; queue.push(function () { (c.h.presence || []).forEach(function (f) { f(); }); }); });
  }
  function client() {
    return {
      channel: function (name, cfg) {
        var c = { name: name, key: cfg.config.presence.key, h: { broadcast: {}, presence: [] }, subscribed: false, meta: null, _state: {} };
        c.on = function (type, filter, cb) { if (type === 'broadcast') (c.h.broadcast[filter.event] = c.h.broadcast[filter.event] || []).push(cb); else c.h.presence.push(cb); return c; };
        c.subscribe = function (cb) { chans.push(c); queue.push(function () { c.subscribed = true; cb('SUBSCRIBED'); deliverPresence(name); }); return c; };
        c.send = function (msg) {
          var size = JSON.stringify(msg.payload).length; stats.sent++; stats.bytes += size; stats.maxBytes = Math.max(stats.maxBytes, size);
          var copy = JSON.parse(JSON.stringify(msg.payload));
          chans.forEach(function (o) {
            if (o === c || o.name !== name || !o.subscribed) return;
            if (opts.drop && Math.random() < opts.drop) { stats.dropped++; return; }
            queue.push(function () { (o.h.broadcast[msg.event] || []).forEach(function (f) { f({ payload: copy }); }); });
          });
          return Promise.resolve('ok');
        };
        c.track = function (meta) { c.meta = meta; deliverPresence(name); return Promise.resolve(); };
        c.untrack = function () { c.meta = null; deliverPresence(name); return Promise.resolve(); };
        c.unsubscribe = function () { c.subscribed = false; chans.splice(chans.indexOf(c), 1); deliverPresence(name); return Promise.resolve(); };
        c.presenceState = function () { return c._state; };
        return c;
      },
      removeChannel: function (c) { var i = chans.indexOf(c); if (i >= 0) chans.splice(i, 1); }
    };
  }
  return { supabase: { createClient: function () { return client(); } }, flush: function () { var n = 0; while (queue.length && n < 100000) { queue.shift()(); n++; } return n; }, stats: stats };
}
module.exports = { makeBus: makeBus };
