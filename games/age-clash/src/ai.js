/* =========================================================================
 * ai.js — Bot-tegenstander. Geeft precies dezelfde commando's als een speler.
 * Strategie: counter-picks, frontlinie/backline-balans, economie op het juiste
 * moment, towers onder druk, upgrades bij overschot, tijdperk-upgrades, powers.
 * Gebruikt zijn eigen RNG (niet die van de sim), dus beïnvloedt de sim alleen
 * via commando's.
 * ========================================================================= */
var AC = (typeof window !== 'undefined' ? window : globalThis).AC;

(function () {
  var C = AC.CONST;

  function Bot(sim, side, diff, seed) {
    this.sim = sim; this.side = side; this.cfg = AC.BOT[diff] || AC.BOT.normal; this.diff = diff;
    this.t = 0; this.evolveWait = 0; this.rng = new AC.RNG(seed || 777);
    this.plan = null; this.lastAge = 0;
    this.saveFor = -1;
    this.spentUnits = 0; this.spentUpg = 0; this.slotHist = [1, 1, 0.5, 0.5]; this.flip = 0;
  }
  AC.Bot = Bot;

  Bot.prototype.update = function (dt) {
    this.t += dt;
    var think = this.cfg.think * (0.8 + this.rng.next() * 0.4);
    if (this.t < think) return;
    this.t = 0;
    this.decide(think);
  };

  Bot.prototype.cmd = function (c) { this.sim.command(this.side, c); };

  Bot.prototype.analyze = function () {
    var s = this.sim, me = this.side, a = {
      en: [0, 0, 0, 0], my: [0, 0, 0, 0], enValue: 0, myValue: 0, threat: 0, nearest: 1e9,
      enArmored: 0, enRanged: 0, enMelee: 0, myFront: 0, enFlying: 0, pushing: 0,
    };
    var myBaseX = me ? C.W : 0;
    for (var i = 0; i < s.units.length; i++) {
      var u = s.units[i]; if (u.dead) continue;
      var d = Math.abs(u.x - myBaseX);
      if (u.side === me) {
        a.my[u.slot]++; a.myValue += u.cost * (u.hp / u.maxHp);
        if (u.slot === 0 || u.slot === 3) a.myFront++;
        if (d > C.W * 0.55) a.pushing++;
      } else {
        a.en[u.slot]++; a.enValue += u.cost * (u.hp / u.maxHp);
        if (u.armored) a.enArmored++;
        if (u.slot === 1) a.enRanged++;
        if (u.slot === 0) a.enMelee++;
        if (u.flying) a.enFlying++;
        if (d < 700) a.threat += u.cost * (1.6 - d / 700);
        if (d < a.nearest) a.nearest = d;
      }
    }
    return a;
  };

  Bot.prototype.decide = function (think) {
    var s = this.sim, me = this.side, p = s.players[me], cfg = this.cfg, rng = this.rng;
    if (s.over) return;
    var A = this.analyze();

    // 1) Tijdperk-upgrade
    if (s.canEvolve(me)) {
      this.evolveWait += think;
      var delay = cfg.evolveDelay * (A.threat > 0 ? 0.5 : 1);
      if (this.evolveWait >= delay) { this.cmd({ t: 'evolve' }); this.evolveWait = 0; return; }
    } else this.evolveWait = 0;

    // 2) Age power
    if (p.powerCd <= 0) {
      var id = AC.AGES[p.age].power.id;
      var enCount = A.en[0] + A.en[1] + A.en[2] + A.en[3];
      var use = id === 'testudo' ? (A.my[0] + A.my[3] >= 3 && enCount >= 3) : (A.threat > 250 * Math.pow(C.COST_GROWTH, p.age) || enCount >= 6);
      if (use && rng.next() > cfg.mistakes) { this.cmd({ t: 'power' }); }
    }

    // 2b) Tijdperk-item (slot 5)
    if (p.itemCd <= 0 && rng.next() > cfg.mistakes) {
      var it = AC.ITEMS[p.age], ic5 = s.itemCost(me);
      if (p.iron >= ic5 + s.unitCost(me, 0) * (this.diff === 'hard' ? 0.5 : 1) && this.itemUseful(it, A)) { this.cmd({ t: 'item' }); p = s.players[me]; }
    }

    if (rng.next() < cfg.mistakes * 0.5) return; // aarzelen

    var costs = [0, 1, 2, 3].map(function (sl) { return s.unitCost(me, sl); });
    var unitScale = costs[0];
    var underPressure = A.threat > unitScale * 4 || A.nearest < 420;

    // 3) Towers onder druk
    var towers = 0; for (var sp = 0; sp < 3; sp++) if (s.towerAt(me, sp)) towers++;
    var wantTowers = Math.min(3, Math.floor(s.time / 120) + (underPressure ? 1 : 0));
    if (this.diff === 'easy') wantTowers = Math.min(wantTowers, 1);
    if (towers < wantTowers && rng.next() < 0.6 * cfg.towerBias) {
      var kind = A.enArmored >= 2 ? 1 : (A.en[0] + A.en[1] >= 5 ? 2 : (rng.next() < 0.5 ? 0 : 2));
      var tc = s.towerCost(me, kind);
      if (p.iron >= tc + (underPressure ? 0 : unitScale * 2)) {
        for (var spot = 0; spot < 3; spot++) if (!s.towerAt(me, spot)) { this.cmd({ t: 'tower', s: spot, k: kind }); p.iron -= 0; return; }
      }
    }

    // 4) Economie (als het rustig is)
    var ecoTarget = Math.floor(s.time / (this.diff === 'hard' ? 22 : this.diff === 'normal' ? 30 : 50));
    ecoTarget = Math.min(ecoTarget, 18);
    // inkomen-upgrade alleen als hij zich snel genoeg terugverdient
    var payback = s.upgradeCost(me, 'income') / s.upgradeDef('income').per;
    var maxPayback = { easy: 50, normal: 75, hard: 110 }[this.diff];
    if (!underPressure && (payback < maxPayback || p.upg.income < Math.min(2, ecoTarget))) {
      var ic = s.upgradeCost(me, 'income');
      if (p.iron >= ic + unitScale) { this.cmd({ t: 'upg', k: 'income' }); return; }
    }
    if (!underPressure && p.upg.bounty < Math.floor(ecoTarget / 3)) {
      var bc = s.upgradeCost(me, 'bounty');
      if (p.iron >= bc + unitScale * 2) { this.cmd({ t: 'upg', k: 'bounty' }); return; }
    }

    // 5) Upgrades: een slimme bot investeert een vast deel in upgrades en
    //    stopt met spammen als zijn leger al vastloopt in een lange rij.
    var myTot = A.my[0] + A.my[1] + A.my[2] + A.my[3];
    var share = { easy: 0.12, normal: 0.25, hard: 0.36 }[this.diff];
    var cap = { easy: 30, normal: 18, hard: 13 }[this.diff];
    var iron = p.iron;
    var wantUpg = this.spentUpg < share * (this.spentUpg + this.spentUnits) || (myTot >= cap && !underPressure);
    if (wantUpg && rng.next() < cfg.upgradeBias + 0.2) {
      var key = this.pickUpgrade(A, towers);
      if (key) {
        var uc = s.upgradeCost(me, key);
        if (iron >= uc) { this.cmd({ t: 'upg', k: key }); iron -= uc; this.spentUpg += uc; }
        else if (myTot >= cap && !underPressure) return; // sparen voor upgrade
      }
    }

    // 6) Units kiezen (meerdere acties per denkmoment op hogere moeilijkheid)
    var actions = this.diff === 'hard' ? 4 : this.diff === 'normal' ? 2 : 1;
    if (myTot >= cap * 1.4 && !underPressure) actions = 0;
    for (var act = 0; act < actions; act++) {
      var slot = this.pickSlot(A, costs, iron);
      if (this.diff === 'easy' && rng.next() < 0.35) slot = Math.floor(rng.next() * 4);
      if (slot < 0) break;
      if (p.cds[slot] > 0) break;
      if (iron >= costs[slot]) {
        this.cmd({ t: 'spawn', s: slot }); iron -= costs[slot]; this.spentUnits += costs[slot];
        A.my[slot]++; if (slot === 0 || slot === 3) A.myFront++;
        this.slotHist[slot] += 1;
        A._used = (A._used || 0) | (1 << slot);
      } else {
        if (underPressure && iron >= costs[0] && p.cds[0] <= 0 && !((A._used || 0) & 1)) { this.cmd({ t: 'spawn', s: 0 }); iron -= costs[0]; this.spentUnits += costs[0]; A._used |= 1; }
        break; // sparen voor de gewenste unit
      }
    }
  };

  // Is het item nu de moeite waard? Damagers op een groep, potions bij gewonde troepen,
  // power-ups als er genoeg eigen units aan het vechten zijn.
  Bot.prototype.itemUseful = function (it, A) {
    var s = this.sim, me = this.side, front = s.enemyFront(me), near = 0, own = 0, hurt = 0, fighting = 0, i, u;
    for (i = 0; i < s.units.length; i++) {
      u = s.units[i]; if (u.dead) continue;
      if (u.side !== me) { if (Math.abs(u.x - front) < 220) near++; }
      else { own++; hurt += 1 - u.hp / u.maxHp; if (u.state === 'attack') fighting++; }
    }
    var enTot = A.en[0] + A.en[1] + A.en[2] + A.en[3];
    if (it.type === 'damager') return it.id === 'timefreeze' ? enTot >= 5 : near >= 3 || (near >= 2 && A.nearest < 400);
    if (it.type === 'potion') return own >= 3 && hurt / own > 0.3;
    return fighting >= 2 && own >= 3;
  };

  Bot.prototype.pickUpgrade = function (A, towers) {
    var s = this.sim, p = s.players[this.side], rng = this.rng;
    var tot = this.slotHist[0] + this.slotHist[1] + this.slotHist[2] + this.slotHist[3];
    var best = null, bv = -1e9;
    for (var sl = 0; sl < 4; sl++) {
      var w = this.slotHist[sl] / tot;
      var cand = [['dmg' + sl, w * 1.1], ['hp' + sl, w * (sl === 0 || sl === 3 ? 1.05 : 0.75)]];
      for (var c = 0; c < 2; c++) {
        var key = cand[c][0], d = s.upgradeDef(key);
        if (p.upg[key] >= d.max) continue;
        var v = cand[c][1] / (1 + p.upg[key] * 0.35) + rng.next() * 0.05;
        if (v > bv) { bv = v; best = key; }
      }
    }
    if (towers > 0) {
      var tv = towers * 0.12 / (1 + p.upg.tdmg * 0.4);
      if (tv > bv && p.upg.tdmg < 10) { bv = tv; best = 'tdmg'; }
    }
    return best;
  };
  Bot.prototype.pickSlot = function (A, costs, iron) {
    var s = this.sim, p = s.players[this.side], rng = this.rng, smart = this.diff !== 'easy';
    var used = A._used || 0;
    var enTot = A.en[0] + A.en[1] + A.en[2] + A.en[3];
    var myTot = A.my[0] + A.my[1] + A.my[2] + A.my[3];
    // gewenste samenstelling
    var t = [0.34, 0.30, 0.12, 0.24];
    if (smart && enTot > 0) {
      var shA = A.enArmored / enTot, shR = A.enRanged / enTot, shM = A.enMelee / enTot;
      t[2] += shA * 0.5; t[3] -= shA * 0.15;
      t[0] += shR * 0.25; t[1] += shM * 0.2;
      if (A.en[2] > 1) t[3] -= 0.12; // vijand heeft anti-armor: minder tanks
      if (A.enFlying) t[1] += 0.15;
    }
    if (A.myFront === 0) { t[0] += 0.3; t[3] += 0.2; }
    var best = -1, bv = -1e9;
    for (var i = 0; i < 4; i++) {
      if (used & (1 << i)) continue;
      var share = myTot ? A.my[i] / myTot : 0;
      var v = t[i] - share + rng.next() * (smart ? 0.08 : 0.3);
      if (p.cds[i] > 0) v -= 0.5;
      if (iron < costs[i] && A.nearest < 350) v -= 0.4;
      if (v > bv) { bv = v; best = i; }
    }
    return best;
  };
})();
if (typeof module !== 'undefined') module.exports = AC;
