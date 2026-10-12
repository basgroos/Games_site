/* =====================================================================
   SAVE / LOAD — localStorage persistence, export/import codes and
   offline income.
   ===================================================================== */
(function (TE) {
  'use strict';
  // Staging builds of the Bas Games site keep their own save, so testing never touches real progress
  const ENV = (typeof window !== 'undefined' && window.HW_BUILD && window.HW_BUILD.env) || 'live';
  const KEY = 'tinyEmpire.save.v1' + (ENV === 'staging' ? '.staging' : '');
  const SKIP = { R: 1, notes: 1, dirty: 1, _comboKeys: 1, _acc: 1, selected: 1, underfunded: 1, _lastFull: 1 };

  const Save = {
    KEY,
    serialize(S) {
      S.savedAt = Date.now();
      return JSON.stringify(S, (k, v) => (SKIP[k] ? undefined : v));
    },
    deserialize(json) {
      const data = JSON.parse(json);
      if (!data || (data.version !== 1 && data.version !== 2) || !Array.isArray(data.tiles)) throw new Error('Not a Tiny Empire save');
      const fresh = TE.Game.newState(data.seed);
      // Merge so saves from older versions get any new fields
      // Old (v1) saves have no river: keep their map exactly as it was
      if (data.version === 1) { data.river = []; data.legacyMap = true; }
      const S = Object.assign(fresh, data);
      S.version = 2;
      S.stats = Object.assign(TE.Game.newState(1).stats, data.stats || {});
      S.settings = Object.assign(TE.Game.newState(1).settings, data.settings || {});
      // Rebuild derived counts
      S.counts = {};
      for (const k in S.buildings) { const b = S.buildings[k]; S.counts[b.type] = (S.counts[b.type] || 0) + 1; }
      return S;
    },
    save(S) {
      try { localStorage.setItem(KEY, Save.serialize(S)); return true; } catch (e) { return false; }
    },
    hasSave() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } },
    load() {
      let raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { return null; }
      if (!raw) return null;
      try { return Save.deserialize(raw); } catch (e) { return null; }
    },
    clear() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } },
    exportCode(S) { return btoa(unescape(encodeURIComponent(Save.serialize(S)))); },
    importCode(code) { return Save.deserialize(decodeURIComponent(escape(atob(code.trim())))); },

    /* Money earned while the game was closed (call after Sim.init on a loaded save). */
    offlineEarnings(S) {
      if (!S.savedAt) return null;
      const secs = Math.min(TE.BALANCE.offlineMaxSeconds, (Date.now() - S.savedAt) / 1000);
      if (secs < 60 || !S.R) return null;
      const net = Math.max(0, S.R.totals.net);
      const amount = Math.floor(net * secs * TE.BALANCE.offlineIncomeRate);
      if (amount <= 0) return null;
      return { seconds: secs, amount };
    },
  };
  TE.Save = Save;
})(typeof window !== 'undefined' ? (window.TE = window.TE || {}) : (globalThis.TE = globalThis.TE || {}));
