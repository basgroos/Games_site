/* =====================================================================
   SIMULATION LOOP — advances game time, pays income, runs the
   once-per-second systems. Has no DOM code, so it can run in tests.
   ===================================================================== */
(function (TE) {
  'use strict';

  const Sim = {
    /* Recalculate the economy if something changed, then process discoveries. */
    ensure(S) {
      if (!S.dirty && S.R) return;
      S.R = TE.Economy.recalc(S);
      S.dirty = false;
      Sim.processCombos(S);
    },

    processCombos(S) {
      const keys = {};
      S.R.combos.forEach((inst) => {
        const key = inst.id + ':' + inst.members.slice().sort((a, b) => a - b).join(',');
        keys[key] = 1;
        if (!S._comboKeys) return;
        if (!S._comboKeys[key]) {
          const c = TE.Combos.byId(inst.id);
          if (!S.discovered[inst.id]) {
            S.discovered[inst.id] = S.time || 0.001;
            S.money += c.reward;
            TE.Progress.notify(S, { kind: 'discovery', id: inst.id, members: inst.members });
          } else {
            TE.Progress.notify(S, { kind: 'comboFormed', id: inst.id, members: inst.members });
          }
          S.stats.combosFormed++;
        }
      });
      // First run after a load: remember existing combos without celebrating them again
      if (!S._comboKeys) S.R.combos.forEach((inst) => { if (!S.discovered[inst.id]) S.discovered[inst.id] = S.time || 0.001; });
      S._comboKeys = keys;
    },

    /* Advance the game by dt simulated seconds (already multiplied by speed). */
    step(S, dt) {
      if (dt <= 0) return;
      Sim.ensure(S);
      const T = S.R.totals;
      const gross = T.gross * dt, upkeep = T.upkeep * dt;
      S.money += gross - upkeep;
      S.totalEarned += gross;
      for (const cat in T.byCat) S.earnedByCat[cat] = (S.earnedByCat[cat] || 0) + T.byCat[cat] * dt;
      TE.Progress.bumpDaily(S, 'earned', gross);
      if (S.money < 0) S.money = 0;
      const under = S.money <= 0.5 && T.net < 0;
      if (under !== !!S.underfunded) { S.underfunded = under; S.dirty = true; }
      S.time += dt;
      S.stats.playTime += dt;
      S._acc = (S._acc || 0) + dt;
      while (S._acc >= 1) { S._acc -= 1; Sim.second(S); }
    },

    /* Systems that run once per simulated second. */
    second(S) {
      Sim.ensure(S);
      const R = S.R;
      TE.Citizens.tick(S, R, 1);
      TE.Progress.expireBuffs(S);
      TE.Economy.refresh(S, R);
      const T = R.totals;
      if (T.net > S.stats.peakIncome) S.stats.peakIncome = T.net;
      if (T.happiness >= 60 && T.population > 0) TE.Progress.bumpDaily(S, 'happySeconds', 1);
      if (T.safety >= 55 && T.population > 0) TE.Progress.bumpDaily(S, 'safeSeconds', 1);
      if (T.traffic && T.traffic.roads > 20 && T.traffic.jammed === 0) TE.Progress.bumpDaily(S, 'flowSeconds', 1);
      // Traffic and occupancy drift slowly: refresh the full city model every 10 seconds
      if (S.time - (S._lastFull || 0) > 10) { S._lastFull = S.time; S.dirty = true; }
      TE.Events.tick(S);
      TE.Progress.checkUnlocks(S);
      TE.Progress.checkLevel(S);
      TE.Progress.checkQuests(S);
      TE.Progress.checkDaily(S);
      Sim.ensure(S);
    },

    /* Start a game (new or loaded). */
    init(S) {
      S.notes = S.notes || [];
      TE.Progress.checkUnlocks(S, true);
      TE.Progress.ensureDaily(S);
      S.dirty = true;
      S._comboKeys = null;
      Sim.ensure(S);
    },
  };
  TE.Sim = Sim;
})(typeof window !== 'undefined' ? (window.TE = window.TE || {}) : (globalThis.TE = globalThis.TE || {}));
