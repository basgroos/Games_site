/* =====================================================================
   COMBINATIONS — detects the recipes in TE.COMBOS on the grid.
   A recipe matches when all required buildings are within `radius`
   tiles (square distance) of one anchor building.
   ===================================================================== */
(function (TE) {
  'use strict';
  const G = () => TE.Game;

  /* Pick the most specific need key as the anchor (plain ids before tags). */
  function anchorKey(recipe) {
    if (recipe.distinctTag) return 'tag:' + recipe.distinctTag.tag;
    const keys = Object.keys(recipe.needs);
    const plain = keys.filter((k) => k.indexOf(':') < 0);
    return (plain.length ? plain : keys).sort((a, b) => recipe.needs[a] - recipe.needs[b])[0];
  }

  function nearby(S, b, r) {
    const out = [];
    for (let y = b.y - r; y <= b.y + r; y++) for (let x = b.x - r; x <= b.x + r; x++) {
      const nb = G().buildingAt(S, x, y);
      if (nb) out.push({ b: nb, d: Math.max(Math.abs(nb.x - b.x), Math.abs(nb.y - b.y)) + (Math.abs(nb.x - b.x) + Math.abs(nb.y - b.y)) * 0.01 });
    }
    out.sort((a, c) => a.d - c.d);
    return out;
  }

  function damaged(S, b) { return b.damagedUntil && b.damagedUntil > S.time; }

  /* Try to satisfy one recipe around one anchor. Returns member uids or null. */
  function waterNear(S, b, r) {
    let n = 0;
    for (let y = b.y - r; y <= b.y + r; y++) for (let x = b.x - r; x <= b.x + r; x++) if (G().isWater(S, x, y)) n++;
    return n;
  }
  function tryAnchor(S, recipe, anchor) {
    if (recipe.water && waterNear(S, anchor, recipe.radius) < recipe.water) return null;
    const cands = nearby(S, anchor, recipe.radius).filter((c) => !damaged(S, c.b));
    if (recipe.distinctTag) {
      const seen = {}, members = [];
      for (const c of cands) {
        if (G().matches(c.b.type, 'tag:' + recipe.distinctTag.tag) && !seen[c.b.type]) { seen[c.b.type] = 1; members.push(c.b.uid); }
      }
      return members.length >= recipe.distinctTag.count ? members.slice(0, recipe.distinctTag.count) : null;
    }
    const used = {}, members = [];
    // Satisfy specific ids first, then tags, so tags don't steal specific buildings.
    const keys = Object.keys(recipe.needs).sort((a, b) => (a.indexOf(':') >= 0) - (b.indexOf(':') >= 0));
    for (const key of keys) {
      let need = recipe.needs[key];
      for (const c of cands) {
        if (need <= 0) break;
        if (!used[c.b.uid] && G().matches(c.b.type, key)) { used[c.b.uid] = 1; members.push(c.b.uid); need--; }
      }
      if (need > 0) return null;
    }
    return members;
  }

  const Combos = {
    /* Find every active combo instance. `focus` {x,y} limits the search to anchors near a tile. */
    detect(S, focus) {
      const instances = [], seenKeys = {};
      TE.COMBOS.forEach((recipe) => {
        const ak = anchorKey(recipe);
        const each = focus ? (fn) => { // only anchors near the focus tile
          const r = recipe.radius * 2;
          for (let y = focus.y - r; y <= focus.y + r; y++) for (let x = focus.x - r; x <= focus.x + r; x++) { const b = G().buildingAt(S, x, y); if (b) fn(b); }
        } : (fn) => G().eachBuilding(S, fn);
        if (focus && focus.only && focus.only.indexOf(recipe.id) < 0) return;
        each((b) => {
          if (!G().matches(b.type, ak)) return;
          const members = tryAnchor(S, recipe, b);
          if (!members) return;
          if (focus && members.indexOf(focus.uid) < 0) return;
          const key = recipe.id + ':' + members.slice().sort((a, c) => a - c).join(',');
          if (seenKeys[key]) return;
          seenKeys[key] = 1;
          instances.push({ id: recipe.id, members, anchor: b.uid });
        });
      });
      return instances;
    },
    byId(id) { return TE.COMBOS.find((c) => c.id === id); },

    /* Membership map: uid -> list of recipe ids the building belongs to (no duplicates). */
    membership(instances) {
      const m = {};
      instances.forEach((inst) => inst.members.forEach((uid) => {
        (m[uid] = m[uid] || []);
        if (m[uid].indexOf(inst.id) < 0) m[uid].push(inst.id);
      }));
      return m;
    },

    /* Which recipes would a new `type` building at (x,y) complete? (used for hints & previews) */
    wouldComplete(S, type, x, y, only) {
      const t = G().tile(S, x, y);
      if (!t || t.b || t.f) return [];
      const uid = -1;
      S.buildings[uid] = { uid, type, x, y, level: 1, perks: {} };
      t.b = uid;
      let found = [];
      try {
        found = Combos.detect(S, { x, y, uid, only }).map((i) => i.id);
      } finally { delete S.buildings[uid]; t.b = null; }
      return found.filter((v, i, a) => a.indexOf(v) === i);
    },
  };
  TE.Combos = Combos;
})(typeof window !== 'undefined' ? (window.TE = window.TE || {}) : (globalThis.TE = globalThis.TE || {}));
