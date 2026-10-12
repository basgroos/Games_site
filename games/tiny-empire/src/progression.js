/* =====================================================================
   PROGRESSION — city levels, building unlocks, quests, daily challenges
   and temporary income buffs.
   ===================================================================== */
(function (TE) {
  'use strict';
  const G = () => TE.Game;

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  const Progress = {
    todayStr,
    notify(S, note) { (S.notes = S.notes || []).push(note); },

    metrics(S) {
      const R = S.R, T = (R && R.totals) || {};
      let maxLevel = 1, homes = 0;
      G().eachBuilding(S, (b) => {
        if (b.level > maxLevel && !TE.BUILDINGS[b.type].service) maxLevel = b.level;
        if (TE.BUILDINGS[b.type].residents) homes++;
      });
      return {
        level: S.level, population: Math.floor(T.population || 0), totalEarned: S.totalEarned,
        income: T.net || 0, combos: Object.keys(S.discovered).length, happiness: T.happiness || 0,
        safety: T.safety || 0, quality: T.bestQuality || 0, homes, expansions: S.expansions, maxLevel,
        shoppingStreets: (R && R.shoppingStreets) || 0,
      };
    },
    metric(S, key, m) {
      m = m || Progress.metrics(S);
      if (key.startsWith('count:')) return G().count(S, key.slice(6));
      if (key.startsWith('earned:')) return S.earnedByCat[key.slice(7)] || 0;
      return m[key] || 0;
    },

    /* ---------- City levels ---------- */
    nextLevel(S) { return TE.LEVELS[S.level] || null; },
    levelProgress(S) {
      const next = Progress.nextLevel(S);
      if (!next) return null;
      const m = Progress.metrics(S);
      return Object.keys(next.req).map((k) => ({ key: k, have: m[k] || 0, need: next.req[k], done: (m[k] || 0) >= next.req[k] }));
    },
    checkLevel(S) {
      const prog = Progress.levelProgress(S);
      if (!prog || !prog.every((p) => p.done)) return;
      S.level++;
      const L = TE.LEVELS[S.level - 1];
      S.money += L.reward;
      const unlocks = Object.keys(TE.BUILDINGS).filter((t) => (TE.BUILDINGS[t].unlock || {}).level === S.level);
      Progress.notify(S, { kind: 'level', level: S.level, name: L.name, reward: L.reward, unlocks });
      S.dirty = true; // needs like "services" activate with the level
    },

    checkUnlocks(S, silent) {
      Object.keys(TE.BUILDINGS).forEach((t) => {
        if (S.unlocked[t]) return;
        if (G().unlockStatus(S, t).ok) {
          S.unlocked[t] = true;
          const u = TE.BUILDINGS[t].unlock || {};
          const levelOnly = !u.population && !u.quality; // those are announced by the level-up itself
          if (!silent && !levelOnly) Progress.notify(S, { kind: 'unlock', type: t });
        }
      });
    },

    /* ---------- Quests ---------- */
    activeQuests(S) { return TE.QUESTS.filter((q) => !S.questsDone[q.id]).slice(0, 3); },
    checkQuests(S) {
      const m = Progress.metrics(S);
      Progress.activeQuests(S).forEach((q) => {
        if (Progress.metric(S, q.metric, m) >= q.target) {
          S.questsDone[q.id] = S.time;
          Progress.grant(S, q.reward);
          Progress.notify(S, { kind: 'quest', quest: q });
        }
      });
    },
    grant(S, reward) {
      if (!reward) return;
      if (reward.money) S.money += reward.money;
      if (reward.buff) Progress.addBuff(S, reward.buff);
    },
    addBuff(S, buff) {
      S.buffs.push({ name: buff.name, mult: buff.mult, until: S.time + buff.seconds, seconds: buff.seconds });
    },
    expireBuffs(S) { S.buffs = S.buffs.filter((b) => b.until > S.time); },

    /* ---------- Daily challenges (seeded by local date, no server) ---------- */
    ensureDaily(S) {
      const date = todayStr();
      if (S.daily && S.daily.date === date) return;
      const R = TE.util.rng(TE.util.hashStr(date));
      const pool = TE.DAILY_POOL.slice();
      const picked = [];
      while (picked.length < 3 && pool.length) picked.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
      const st = { totals: S.R ? S.R.totals : null };
      S.daily = {
        date, items: picked.map((p) => ({ id: p.id, target: p.target(S.level, st), done: false })), counters: {}, allDone: false,
      };
    },
    bumpDaily(S, counter, v) {
      if (!S.daily) return;
      S.daily.counters[counter] = (S.daily.counters[counter] || 0) + v;
    },
    checkDaily(S) {
      Progress.ensureDaily(S);
      const d = S.daily;
      d.items.forEach((it) => {
        if (it.done) return;
        const def = TE.DAILY_POOL.find((p) => p.id === it.id);
        if ((d.counters[def.counter] || 0) >= it.target) {
          it.done = true;
          const reward = TE.DAILY_REWARD(S.level);
          Progress.grant(S, reward);
          Progress.notify(S, { kind: 'daily', text: def.text(it.target), reward });
        }
      });
    },
    dailyText(it) { const def = TE.DAILY_POOL.find((p) => p.id === it.id); return def.text(it.target); },
    dailyCounter(S, it) { const def = TE.DAILY_POOL.find((p) => p.id === it.id); return S.daily.counters[def.counter] || 0; },
  };
  TE.Progress = Progress;
})(typeof window !== 'undefined' ? (window.TE = window.TE || {}) : (globalThis.TE = globalThis.TE || {}));
