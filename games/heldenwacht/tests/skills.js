const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.env.HW_FILE || require('path').join(__dirname, '..', '..', '..', 'site', 'games', 'heldenwacht', 'index.html'), 'utf8');
const WITH_DB = process.argv.includes('--db');
const QUICK = process.argv.includes('--quick');

function makeCtx() {
  const grad = { addColorStop() {} };
  const base = { createRadialGradient: () => grad, createLinearGradient: () => grad, measureText: () => ({ width: 10 }), getImageData: () => ({ data: [] }), setLineDash() {} };
  return new Proxy(base, { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}
function boot(store) {
  return new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/',
    beforeParse(w) {
      w.HTMLCanvasElement.prototype.getContext = function () { return this._c || (this._c = makeCtx()); };
      w.requestAnimationFrame = () => 0; w.AudioContext = undefined; w.scrollTo = () => {};
      if (store) for (const k in store) w.localStorage.setItem(k, store[k]);
    } });
}
const errors = [];
const ok = (c, m) => { if (!c) throw new Error(m); };
function run(label, fn) { try { const r = fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); } catch (e) { errors.push(label); console.log('FAIL', label, e.stack.split('\n').slice(0, 4).join(' | ')); } }
let dom = boot(), w = dom.window, d = w.document;
w.addEventListener('error', e => { errors.push('window error'); console.log('WINDOW ERROR', e.message, e.lineno); });
let E = s => w.eval(s);
const click = el => { if (!el) throw new Error('element niet gevonden'); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
const $ = s => d.querySelector(s);

(async () => {
  await new Promise(r => setTimeout(r, 50));
  E("setPlayerName('Tester')");
  run('nieuw account: 0 SP, alles vergrendeld behalve de basis', () => {
    const r = E('({ total: spTotal(), free: spFree(), states: SKILLS.map(k => k.id + ":" + skillState(k)).join(",") })');
    ok(r.total === 0 && r.free === 0, 'nieuw account heeft punten'); ok(/eco1:nopoints/.test(r.states) && /eco2:locked/.test(r.states) && /eco4:locked/.test(r.states), 'status klopt niet: ' + r.states);
    return r;
  });
  run('punten verdienen via levels, sterren, prestige', () => {
    E('Meta.addXP(20000)'); const lv = E('Store.data.level'), gained = E('Store.data.stats.levelsGained');
    ok(gained === lv - 1, 'levels niet geteld'); E('Store.data.prestige = 1; Store.data.clears = { stad: ["easy","normal","hard","nightmare","insane","hel","abyss"] }');
    const src = E('spSources()'); return { level: lv, sources: src.map(s => s[0] + ' ' + s[1]), total: E('spTotal()') };
  });
  run('vereisten: laag 2 pas na basis level 2', () => {
    ok(!E('buySkill("eco2")'), 'eco2 zonder vereiste gekocht'); ok(E('buySkill("eco1")') && E('buySkill("eco1")'), 'eco1 kopen mislukt'); ok(E('buySkill("eco2")'), 'eco2 na eco1 L2 niet te kopen');
    return E('({ eco1: skillLv("eco1"), eco2: skillLv("eco2"), free: spFree() })');
  });
  run('max level en geen punten', () => {
    for (let i = 0; i < 10; i++) E('buySkill("eco1")'); ok(E('skillLv("eco1")') === 5, 'max niet 5'); ok(E('skillState(SKILL.eco1)') === 'max', 'status niet max');
    const free = E('spFree()'); for (let i = 0; i < 200; i++) E('buySkill("atk1") || buySkill("atk2") || buySkill("atk3") || buySkill("tech1") || buySkill("def1") || buySkill("loot1")');
    ok(E('spFree()') >= 0, 'negatieve punten'); return { voor: free, na: E('spFree()') };
  });
  run('effecten in een potje', () => {
    E('Store.data.skills = { eco1: 5, atk1: 5, tech1: 5, tech2: 5, def1: 5, def3: 5 }; Store.save()');
    E(`startMatch({ map: 'stad', diffIdx: 1, mode: 'campaign' })`); const g = E('App.game');
    const base = E('MAPS[0].startCash + DIFFS[1].cash'), id = g.team[0];
    ok(g.cash === Math.round(base * 1.25), 'startgeld ' + g.cash + ' verwacht ' + Math.round(base * 1.25));
    ok(g.hp === E('DIFFS[1].baseHp') + 25, 'basis-HP ' + g.hp);
    const withSk = g.costOf(id); const t1 = g.SK.tech1; g.SK.tech1 = 0; const base0 = g.costOf(id); g.SK.tech1 = t1; ok(withSk === Math.round(base0 * 0.9), 'kosten ' + withSk + ' vs ' + base0);
    const e = g.spawnEnemy('grunt', 0, 1); ok(Math.abs(e.speed - E('ENEMIES.grunt.speed') * E('DIFFS[1].speed') * 0.95) < 1e-6, 'snelheid ' + e.speed);
    g.quit(); E('handleGameEvents(); closeOverlay(); exitGame("home")');
    return { cash: g.cash, hp: g.hp, kosten: g.costOf(id) };
  });
  run('laatste bolwerk bevriest vijanden één keer', () => {
    E('Store.data.skills.def2 = 2; Store.data.skills.def4 = 1'); E(`startMatch({ map: 'stad', diffIdx: 1, mode: 'campaign' })`); const g = E('App.game');
    const e = g.spawnEnemy('grunt', 50, 1); g.hp = Math.floor(g.maxHp * 0.2); g.update(1 / 30);
    ok(g.bulwarkUsed && e.stunT > 2, 'niet bevroren'); const s = e.stunT; g.update(1 / 30); ok(g.bulwarkUsed, 'reset');
    g.quit(); E('handleGameEvents(); closeOverlay(); exitGame("home")'); return { stun: s.toFixed(2) };
  });
  run('beloningen na winst', () => {
    E('Store.data.skills.loot1 = 5; Store.data.skills.loot4 = 3; Store.data.skills.loot2 = 3; Store.data.skills.loot3 = 3');
    E(`startMatch({ map: 'stad', diffIdx: 1, mode: 'campaign' })`); const g = E('App.game');
    const gems0 = E('Store.data.gems'); g.wave = 20; g.cleared = 20; g.kills = 300; g.win(); E('handleGameEvents(); showResults()');
    const gems = E('Store.data.gems') - gems0; ok(gems >= 3, 'geen schatkist-gems (' + gems + ')'); ok(/Muntenregen/.test(d.querySelector('.results-card').textContent), 'muntenregen niet getoond');
    E('closeOverlay(); exitGame("home")'); return { gems };
  });
  run('scherm en knoppen', () => {
    E('Store.data.skills = {}; App.skReset = false; nav("skills")'); ok($('#scr-skills .sk-node'), 'geen nodes'); const n = d.querySelectorAll('.sk-node').length;
    click($('[data-act="sk-buy"][data-id="atk1"]')); ok(E('skillLv("atk1")') === 1, 'kopen via knop mislukt');
    ok(d.querySelector('.sk-node[data-id="atk4"]').classList.contains('sk-locked'), 'atk4 niet vergrendeld');
    ok(d.querySelector('[data-act="nav"][data-to="skills"] .ndot'), 'geen melding in menu');
    return { nodes: n };
  });
  run('reset kost gems', () => {
    E('Store.data.gems = 10'); click($('[data-act="sk-reset"]')); click($('[data-act="sk-reset-yes"]')); ok(E('skillLv("atk1")') === 1, 'reset zonder gems');
    E('Store.data.gems = 100; renderSkills()'); click($('[data-act="sk-reset"]')); click($('[data-act="sk-reset-yes"]')); ok(E('skillLv("atk1")') === 0 && E('Store.data.gems') === 50, 'reset mislukt');
  });
  run('animatie zeldzame helden: drempel, alleen nieuw en gacha-volgorde', () => {
    E('Store.data.settings.rareAnim = "legendary"; Store.data.settings.rareOnlyNew = false; delete Store.data.heroes.kosmos; delete Store.data.heroes.nova');
    E('grantHero("vuist")'); ok(!E('RareQ.length'), 'common gaf animatie');
    E('const r = grantHero("kosmos"); showReveal([r], GACHAS[0])');
    ok(d.getElementById('rare-layer') && !d.getElementById('reveal'), 'animatie niet vóór de gacha-onthulling');
    d.getElementById('rare-layer').click(); d.getElementById('rare-layer') && d.getElementById('rare-layer').click();
    E('Store.data.settings.rareAnim = "off"; grantHero("nova")'); ok(!E('RareQ.length'), 'animatie terwijl hij uit staat');
    E('Store.data.settings.rareAnim = "legendary"; Store.data.settings.rareOnlyNew = true; grantHero("kosmos")'); ok(!E('RareQ.length'), 'animatie bij dubbele held terwijl alleen-nieuw aan staat');
    E('nav("settings")'); ok(d.getElementById('set-rareAnim') && d.getElementById('set-rareOnlyNew'), 'instellingen ontbreken');
    return { opties: d.querySelectorAll('#set-rareAnim option').length };
  });
  const saved = {}; E('buySkill("atk1"); Store.save()'); for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); saved[k] = w.localStorage.getItem(k); }
  dom = boot(saved); w = dom.window; E = s => w.eval(s); await new Promise(r => setTimeout(r, 60));
  run('opgeslagen en na herladen terug', () => { ok(E('skillLv("atk1")') === 1, 'skill na herladen weg'); ok(E('playerName()') === 'Tester', 'naam weg'); });
  await new Promise(r => setTimeout(r, 200));
  console.log(errors.length ? 'ERRORS: ' + errors.join(', ') : 'ALL PASSED'); process.exitCode = errors.length ? 1 : 0; setTimeout(() => process.exit(process.exitCode), 50);
})();
