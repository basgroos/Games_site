/* =====================================================================
   Meer gems (v1.25): bovenop de bestaande beloningen
   - per verslagen baas: 5 + 3 per moeilijkheidsniveau (zichtbaar boven de baas)
   - per potje: 1 gem per 2 gehaalde golven (ook bij verlies)
   - bij winst: 15 + 5 per moeilijkheidsniveau
   De Megabaas heeft zijn eigen grote beloning en telt hier niet mee.
   ===================================================================== */
const GEMS = {
  boss: d => 5 + 3 * d,
  perWaves: 2, maxWaves: 120,
  win: d => 15 + 5 * d,
};
const gemDiff = g => Math.max(0, g.raid ? (RAID_DIFFS.indexOf(g.raidDiff) + 1) : (g.diffIdx || 0));

// meteen laten zien als een baas valt
const _kill27 = Game.prototype.kill;
Game.prototype.kill = function (e, h) {
  const was = e.dead; _kill27.call(this, e, h);
  if (!was && e.dead && e.boss && !e.megaBoss && !e.E.decoy && !(this.mp && this.mp.role === 'guest')) {
    const n = GEMS.boss(gemDiff(this)); this.bossGems = (this.bossGems || 0) + n;
    this.floatText(e.x, e.ay - e.r - 30, `+${n} gems`, '#5eead4', 18, 1.4);
  }
};

const _finish27 = Meta.finishMatch;
Meta.finishMatch = function (g) {
  const R = _finish27.apply(this, arguments);
  if (!g || g._gems27 || (g.opts && g.opts.mega)) return R; g._gems27 = true;
  if (!(g.wave > 0)) return R;
  const win = !!(g.result && g.result.win), d = gemDiff(g);
  // host/solo telt bazen bij het verslaan; de co-op-gast kent alleen het aantal (bossKills uit de snapshot)
  const bossGems = g.bossGems != null ? g.bossGems : (g.bossKills || 0) * GEMS.boss(d);
  const waves = Math.min(GEMS.maxWaves, win && g.totalWaves !== Infinity ? g.totalWaves : (g.cleared || 0));
  const waveGems = Math.floor(waves / GEMS.perWaves), winGems = win ? GEMS.win(d) : 0;
  const total = bossGems + waveGems + winGems; if (!total) return R;
  this.grant({ gems: total });
  const parts = [bossGems && `bazen ${bossGems}`, waveGems && `golven ${waveGems}`, winGems && `winst ${winGems}`].filter(Boolean).join(' · ');
  R.rows.push([`Extra gems (${parts})`, `+${fmt(total)}`]);
  R.gems27 = total; Store.save();
  return R;
};

/* ---------- winkel: veel gems kopen met munten (zonder weeklimiet) ----------
   Prijs per gem blijft boven wat gems→munten oplevert (max. 150 munten per gem), zodat
   heen-en-weer ruilen nooit gratis geld geeft. */
const GEM_PACKS = [
  { id: 'c-gems50', text: '50 Gems', cost: { coins: 10000 }, reward: { gems: 50 } },
  { id: 'c-gems300', text: '300 Gems', sub: 'Voordeel', cost: { coins: 54000 }, reward: { gems: 300 } },
  { id: 'c-gems1000', text: '1.000 Gems', sub: 'Groot voordeel', cost: { coins: 165000 }, reward: { gems: 1000 } },
  { id: 'c-gems5000', text: '5.000 Gems', sub: 'Beste deal', cost: { coins: 780000 }, reward: { gems: 5000 } },
];
SHOP_FIXED.currency = GEM_PACKS.concat(SHOP_FIXED.currency.filter(x => x.id !== 'c-gems'));
