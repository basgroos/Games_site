/* =====================================================================
   Endless (en de race, die ook eindeloos is): oplopend steeds lastiger,
   rond golf 1000 onmogelijk (v1.27).
   Waarom: HP groeide al exponentieel, maar effecten die HP negeren
   (uitwissen, executie, hypnose, %-schade, doorgeslagen buffs) en eindeloos
   ophouden (verdoven, terugduwen) en genezen lieten de beste helden altijd
   doorgaan. Nu, oplopend:
   - golf 50→450: uitwissen, executie, hypnose en %-max-HP worden zwakker, daarna uit
   - golf 60+:  vijanden sneller (tot 2,5×) en meer pantser
   - golf 150→650: steeds meer vijanden onstuitbaar (geen verdoving/terugduwen)
   - golf 200→500: genezen van de basis werkt steeds minder, daarna niet
   - golf 300+: max. schade per treffer krimpt (100% → 21% bij 500 → 0,5% bij 1000)
   - golf 550+: minimale tijd om één vijand te verslaan groeit (1 s bij 650 → 11 s bij 1000)
     en lekken kost steeds meer levens
   Gemeten (alles max, 2× de beste helden): tot golf 900 houdbaar, 950 kost ~60 levens,
   vanaf 1000 niet meer te halen. Een sterk team (Ultra's + Exotics) gaat rond 500–600 onderuit.
   ===================================================================== */
const ENDLESS = {
  capFrom: 300, capTau: 130,                // treffer-limiet: exp(-(n-150)/130) van max-HP
  bypassFrom: 50, bypassTo: 450,           // HP-negerende effecten nemen lineair af
  speedFrom: 60, speedPer: 0.0016, speedMax: 2.5,
  armorFrom: 60, armorPer: 0.08,
  unstopFrom: 150, unstopTo: 650,          // kans op 'onstuitbaar' loopt op van 0 naar 100%
  bossLeak: 20, bossCap: 3,               // bazen: max. 20 levens bij lekken; mogen 3× zoveel per treffer verliezen
  leakFrom: 550, leakPer: 250,             // lekken kost (1 + (n-400)/250)× zoveel levens
  ttkFrom: 550, ttkBase: 0.5, ttkTau: 145,  // minimale tijd om één vijand te verslaan: 0,5·e^((n-400)/145) s → 1 s (500), 4 s (700), 16 s (900), 31 s (1000)

  milestones: { 150: ['DE SCHURKEN WORDEN TAAI', 'Elke klap haalt minder weg. Dit wordt steeds lastiger.'], 300: ['GOLF 300', 'Uitwissen en executies werken bijna niet meer; genezen wordt zwakker.'], 500: ['GOLF 500', 'Snel, gepantserd en de basis geneest niet meer.'], 750: ['GOLF 750', 'Alleen de allerbeste verdediging houdt dit nog vol.'], 900: ['GOLF 900', 'Het einde is dichtbij. Rond golf 1000 houdt niemand het meer.'] },
};
const endlessOn = g => g && (g.mode === 'endless' || g.mode === 'race');
const endlessHitCap = n => n <= ENDLESS.capFrom ? 1 : Math.exp(-(n - ENDLESS.capFrom) / ENDLESS.capTau);
const endlessBypass = n => n <= ENDLESS.bypassFrom ? 1 : Math.max(0, 1 - (n - ENDLESS.bypassFrom) / (ENDLESS.bypassTo - ENDLESS.bypassFrom));
const endlessUnstop = n => Math.max(0, Math.min(1, (n - ENDLESS.unstopFrom) / (ENDLESS.unstopTo - ENDLESS.unstopFrom)));
const endlessTTK = n => n <= ENDLESS.ttkFrom ? 0 : ENDLESS.ttkBase * Math.exp((n - ENDLESS.ttkFrom) / ENDLESS.ttkTau);
const endlessSpeed = n => n <= ENDLESS.speedFrom ? 1 : Math.min(ENDLESS.speedMax, 1 + (n - ENDLESS.speedFrom) * ENDLESS.speedPer);

// sneller en meer pantser
const _spawn28 = Game.prototype.spawnEnemy;
Game.prototype.spawnEnemy = function (type, d, waveN) {
  const e = _spawn28.apply(this, arguments);
  if (e && endlessOn(this) && waveN > ENDLESS.speedFrom && !e.E.worldBoss) {
    e.speed *= endlessSpeed(waveN); e.armor += (waveN - ENDLESS.armorFrom) * ENDLESS.armorPer;
    e.endW = waveN;
    // steeds meer vijanden onstuitbaar (geen verdoving, vertraging of terugduwen): anders kun je ze eeuwig ophouden
    if (Math.random() < endlessUnstop(waveN)) { e.ccImm = true; e.endUnstop = true; }
    const ttk = endlessTTK(waveN); if (ttk > 0) { e.endRate = e.maxHp / ttk; e.endBud = e.endRate * 0.25; }
    // lekken kost meer levens
    // bazen kosten in endless hooguit 20 levens (de Overlord anders 999 = meteen verloren); laat in het spel meer
    const baseLeak = e.boss ? Math.min(e.E.leak, ENDLESS.bossLeak) : e.E.leak, lm = waveN > ENDLESS.leakFrom ? 1 + (waveN - ENDLESS.leakFrom) / ENDLESS.leakPer : 1;
    if (baseLeak !== e.E.leak || lm > 1) e.E = Object.assign({}, e.E, { leak: Math.ceil(baseLeak * lm) });
  }
  return e;
};

// schade: HP-negerende effecten afzwakken + maximum per treffer
const BYPASS_STATS = ['erase', 'execute', 'pctMax', 'hypno'];
const _damage28 = Game.prototype.damage;
Game.prototype.damage = function (e, amt, h, o = {}) {
  const n = e && e.endW; if (!n || !endlessOn(this) || e.megaBoss) return _damage28.call(this, e, amt, h, o);
  const by = endlessBypass(n), cap = endlessHitCap(n), st = h && h.st, saved = [];
  if (st && by < 1) for (const k of BYPASS_STATS) if (st[k]) { saved.push([k, st[k]]); st[k] *= by; }
  try {
    if (cap >= 1) return _damage28.call(this, e, amt, h, o);
    // buffer zodat geen enkele treffer (ook %-schade of absurde buffs) meer dan het maximum weghaalt
    // tijdens de treffer kan hij niet sterven (ook niet door uitwissen/hypnose/absurde schade): alles wordt één begrensde klap
    const hp0 = e.hp, buf = e.maxHp, prev = this._endHit; e.hp += buf; this._endHit = e;
    let r; try { r = _damage28.call(this, e, amt, h, o); } finally { this._endHit = prev; }
    const dealt = Math.max(0, hp0 + buf - Math.max(e.hp, 0)), real = Math.max(0, Math.min(dealt, e.maxHp * Math.min(1, cap * (e.boss ? ENDLESS.bossCap : 1)), e.endRate ? e.endBud : Infinity));
    e.hp = hp0 - real; if (e.endRate) e.endBud -= real;
    if (e.hp <= 0 && !e.dead) this.kill(e, h);
    return Math.min(r, real);
  } finally { for (const [k, v] of saved) st[k] = v; }
};
// schade-budget per vijand bijvullen (minimale tijd om hem te verslaan)
const _updEnemy28 = Game.prototype.updateEnemy;
Game.prototype.updateEnemy = function (e, dt) {
  if (e.endRate) e.endBud = Math.min(e.endRate * 0.5, e.endBud + e.endRate * dt);
  return _updEnemy28.call(this, e, dt);
};
const _kill28 = Game.prototype.kill;
Game.prototype.kill = function (e, h) { if (this._endHit === e) return; return _kill28.call(this, e, h); };
// golf-mijlpalen
const _startWave28 = Game.prototype.startWave;
Game.prototype.startWave = function () {
  const r = _startWave28.apply(this, arguments);
  if (endlessOn(this) && this.mode === 'endless') { const m = ENDLESS.milestones[this.wave]; if (m) { this.banner(m[0], m[1], '#ef4444'); this.shake(8); } }
  return r;
};

// basis genezen wordt vanaf golf 200 zwakker (helft bij 350, niets meer vanaf 500): anders compenseert genezen eeuwig de lekken
ENDLESS.healFrom = 200; ENDLESS.healTo = 500;
const endlessHeal = n => n <= ENDLESS.healFrom ? 1 : Math.max(0, 1 - (n - ENDLESS.healFrom) / (ENDLESS.healTo - ENDLESS.healFrom));
for (const fn of ['update', 'useAbility']) {
  const orig = Game.prototype[fn];
  Game.prototype[fn] = function () {
    const hp0 = this.hp, m0 = this.maxHp, r = orig.apply(this, arguments);
    if (endlessOn(this) && this.wave > ENDLESS.healFrom && this.hp > hp0 && this.maxHp === m0 && !this.over) this.hp = hp0 + (this.hp - hp0) * endlessHeal(this.wave);
    return r;
  };
}
