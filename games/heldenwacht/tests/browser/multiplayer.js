// Twee spelers in twee browsers met een nagebootste Supabase (RPC + Realtime).
// Draaien: node scripts/build.js staging out && sed -i 's|"online":{[^}]*}|"online":{"url":"https://fake.supabase.co","key":"anon-test"}|' out/games/heldenwacht/index.html
//          node games/heldenwacht/tests/browser/multiplayer.js $PWD/out/games/heldenwacht/index.html /tmp   (vereist: npm i playwright)
const { chromium } = require('playwright');
const crypto = require('crypto');
const FILE = 'file://' + process.argv[2];
const SHOTS = process.argv[3] || '.';

/* ---------- nep-database ---------- */
const DB = { players: {}, friendships: [], invites: [], scores: [] };
const h = s => crypto.createHash('sha256').update(s).digest('hex');
const auth = (a) => { const p = DB.players[a.p_id]; if (!p || p.secret_hash !== h(a.p_secret || '')) throw Object.assign(new Error('auth'), { code: 401 }); return p; };
const pub = p => ({ id: p.id, name: p.name, code: p.code, last_seen: p.last_seen });
const RPC = {
  register_player(a) { const p = DB.players[a.p_id]; if (p) { if (p.secret_hash !== h(a.p_secret)) throw new Error('auth'); p.name = a.p_name; return { code: p.code }; } const code = crypto.randomBytes(4).toString('hex').toUpperCase().replace(/[01OIL]/g, 'Z').slice(0, 6); DB.players[a.p_id] = { id: a.p_id, code, name: a.p_name, secret_hash: h(a.p_secret), last_seen: new Date().toISOString() }; return { code }; },
  my_social(a) { const me = auth(a); me.last_seen = new Date().toISOString(); const id = me.id;
    return { me: pub(me), friends: DB.friendships.filter(f => (f.a === id || f.b === id) && f.status === 'accepted').map(f => pub(DB.players[f.a === id ? f.b : f.a])),
      incoming: DB.friendships.filter(f => f.b === id && f.status === 'pending').map(f => pub(DB.players[f.a])), outgoing: DB.friendships.filter(f => f.a === id && f.status === 'pending').map(f => pub(DB.players[f.b])),
      invites: DB.invites.filter(i => i.to_id === id && i.status === 'open').map(i => Object.assign({}, i, { from_name: DB.players[i.from_id].name })), sent: DB.invites.filter(i => i.from_id === id).map(i => Object.assign({}, i, { to_name: DB.players[i.to_id].name })) }; },
  friend_request(a) { const me = auth(a), c = String(a.p_code).toUpperCase().replace(/[^A-Z0-9]/g, ''); const t = Object.values(DB.players).find(p => p.code === c); if (!t) return 'notfound'; if (t.id === me.id) return 'self';
    if (DB.friendships.some(f => ((f.a === me.id && f.b === t.id) || (f.a === t.id && f.b === me.id)) && f.status === 'accepted')) return 'already';
    const rev = DB.friendships.find(f => f.a === t.id && f.b === me.id); if (rev) { rev.status = 'accepted'; return 'accepted'; }
    if (!DB.friendships.some(f => f.a === me.id && f.b === t.id)) DB.friendships.push({ a: me.id, b: t.id, status: 'pending' }); return 'sent'; },
  friend_respond(a) { const me = auth(a); const f = DB.friendships.find(x => x.a === a.p_other && x.b === me.id && x.status === 'pending'); if (f) { if (a.p_accept) f.status = 'accepted'; else DB.friendships.splice(DB.friendships.indexOf(f), 1); } return a.p_accept ? 'accepted' : 'declined'; },
  friend_remove(a) { const me = auth(a); DB.friendships = DB.friendships.filter(f => !((f.a === me.id && f.b === a.p_other) || (f.b === me.id && f.a === a.p_other))); return 'removed'; },
  invite_send(a) { const me = auth(a); if (!DB.friendships.some(f => ((f.a === me.id && f.b === a.p_to) || (f.b === me.id && f.a === a.p_to)) && f.status === 'accepted')) throw new Error('notfriends');
    const inv = { id: crypto.randomUUID(), from_id: me.id, to_id: a.p_to, kind: a.p_kind, game: 'heldenwacht', env: a.p_env, map: a.p_map, diff: a.p_diff, seed: 12345, status: 'open', created_at: new Date().toISOString() }; DB.invites.push(inv); return { id: inv.id, seed: inv.seed, kind: inv.kind, map: inv.map, diff: inv.diff }; },
  invite_respond(a) { const me = auth(a); const i = DB.invites.find(x => x.id === a.p_invite && x.to_id === me.id && x.status === 'open'); if (!i) return { ok: false }; i.status = a.p_accept ? 'accepted' : 'declined'; return { ok: true, id: i.id, from_id: i.from_id, kind: i.kind, map: i.map, diff: i.diff, seed: i.seed }; },
  invite_cancel(a) { const me = auth(a); const i = DB.invites.find(x => x.id === a.p_invite && x.from_id === me.id); if (i) i.status = 'cancelled'; return 'cancelled'; },
};
/* ---------- nep-realtime ---------- */
const pages = [], CH = {};
function chan(n) { return CH[n] || (CH[n] = { subs: new Map(), presence: {} }); }
async function presenceSync(name) { const c = chan(name), keys = Object.keys(c.presence); for (const [pg] of c.subs) await pg.evaluate(([n, k]) => window.__rtPresenceSync && window.__rtPresenceSync(n, k), [name, keys]).catch(() => {}); }
const FAKE_RT = () => {
  const chans = {};
  window.__rtPresenceSync = (name, keys) => { const c = chans[name]; if (!c) return; c.state = Object.fromEntries(keys.map(k => [k, [{}]])); (c.h.presence || []).forEach(f => f()); };
  window.__rtDeliver = (name, event, payload) => { const c = chans[name]; if (!c) return; (c.h['b:' + event] || []).forEach(f => f({ payload })); };
  window.supabase = { createClient: () => ({
    channel(name, opts) {
      const key = opts && opts.config && opts.config.presence && opts.config.presence.key;
      const c = chans[name] = { h: {}, state: {} };
      const api = {
        on(type, filter, fn) { const k = type === 'presence' ? 'presence' : 'b:' + filter.event; (c.h[k] = c.h[k] || []).push(fn); return api; },
        subscribe(cb) { window.__rtJoin(name).then(() => cb && cb('SUBSCRIBED')); return api; },
        track(meta) { return window.__rtTrack(name, key, meta); },
        untrack() { return window.__rtUntrack(name, key); },
        presenceState() { return c.state; },
        send(m) { window.__rtSend(name, m.event, m.payload); return Promise.resolve('ok'); },
      };
      return api;
    },
    removeChannel() {},
  }) };
};

/* ---------- spelers ---------- */
async function player(browser, name) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 820 } });
  const page = await ctx.newPage(); page.__name = name; pages.push(page);
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.errs = errs;
  await page.exposeBinding('__rtJoin', async ({ page: pg }, n) => { chan(n).subs.set(pg, true); });
  await page.exposeBinding('__rtTrack', async ({ page: pg }, n, key, meta) => { chan(n).presence[key] = meta; chan(n).subs.set(pg, true); await presenceSync(n); });
  await page.exposeBinding('__rtUntrack', async ({ page: pg }, n, key) => { delete chan(n).presence[key]; chan(n).subs.delete(pg); await presenceSync(n); });
  await page.exposeBinding('__rtSend', async ({ page: pg }, n, event, payload) => { for (const [o] of chan(n).subs) if (o !== pg) await o.evaluate(([a, b, c]) => window.__rtDeliver(a, b, c), [n, event, payload]).catch(() => {}); });
  await page.addInitScript(FAKE_RT);
  await page.route('https://fake.supabase.co/**', async route => {
    const url = route.request().url(), m = url.match(/rest\/v1\/rpc\/(\w+)/);
    if (m) { try { const r = RPC[m[1]](JSON.parse(route.request().postData() || '{}')); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r) }); } catch (e) { return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: e.message }) }); } }
    if (route.request().method() === 'POST') { DB.scores.push(JSON.parse(route.request().postData())); return route.fulfill({ status: 201, body: '' }); }
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/0' }, body: '[]' });
  });
  await page.goto(FILE); await page.waitForTimeout(700);
  await page.addStyleTag({ content: '#toasts{display:none!important}' });
  await page.evaluate(n => { Store.data.settings.rareAnim = 'off'; Store.data.settings.tips = false; redeemCode('8022'); closeOverlay(); setPlayerName(n); }, name);
  await page.waitForTimeout(400);
  return page;
}
const out = [], ok = (c, m) => { if (!c) throw new Error(m); };
async function step(label, fn) { try { const r = await fn(); out.push('OK   ' + label + (r !== undefined ? ' ' + JSON.stringify(r) : '')); } catch (e) { out.push('FAIL ' + label + ' — ' + e.message.split('\n')[0]); } }
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const A = await player(browser, 'Anna'), B = await player(browser, 'Bram');
  const codeA = await A.evaluate(() => readPlayer().code), codeB = await B.evaluate(() => readPlayer().code);
  await step('beide spelers geregistreerd met vriendcode', () => { ok(codeA && codeB && codeA !== codeB, 'geen codes'); return { codeA, codeB }; });
  await step('vriendverzoek via vriendcode en accepteren', async () => {
    await B.evaluate(() => nav('friends')); await B.waitForTimeout(300);
    await B.fill('#friend-code', codeA.slice(0, 3) + '-' + codeA.slice(3)); await B.click('#add-friend button[type=submit]'); await B.waitForTimeout(500);
    await A.evaluate(() => { nav('friends'); return SOC.refresh(); }); await A.waitForTimeout(400);
    await A.screenshot({ path: SHOTS + '/mp_friends_req.png' });
    await A.click('[data-act="fr-accept"]'); await A.waitForTimeout(500);
    await B.evaluate(() => SOC.refresh()); await B.waitForTimeout(300);
    const fa = await A.evaluate(() => SOC.data.friends.map(f => f.name)), fb = await B.evaluate(() => SOC.data.friends.map(f => f.name));
    ok(fa.includes('Bram') && fb.includes('Anna'), 'geen vrienden: ' + fa + ' / ' + fb); return { anna: fa, bram: fb };
  });
  await step('online-status zichtbaar', async () => { const on = await A.evaluate(() => SOC.isOnline(SOC.data.friends[0])); await A.evaluate(() => renderFriends()); await A.screenshot({ path: SHOTS + '/mp_friends.png' }); ok(on, 'Bram niet online'); });
  // ---------- RACE ----------
  await step('race-uitnodiging versturen en accepteren', async () => {
    const bid = await A.evaluate(() => SOC.data.friends[0].id);
    await A.evaluate(id => openInviteDialog(id, 'race'), bid); await A.waitForTimeout(200); await A.click('[data-act="inv-send"]'); await A.waitForTimeout(600);
    ok(await A.$('#mp-wait'), 'geen wachtscherm');
    await B.waitForSelector('.mp-invite', { timeout: 5000 }); await B.screenshot({ path: SHOTS + '/mp_invite.png' });
    await B.click('.mp-invite [data-act="inv-accept"]');
    await A.waitForFunction(() => App.game && App.game.mode === 'race', null, { timeout: 15000 }); await B.waitForFunction(() => App.game && App.game.mode === 'race', null, { timeout: 15000 });
    const wa = await A.evaluate(() => JSON.stringify(App.game.genWave(7).map(q => q.type))), wb = await B.evaluate(() => JSON.stringify(App.game.genWave(7).map(q => q.type)));
    ok(wa === wb, 'golven verschillen'); return { zelfdeGolven: true };
  });
  await step('race: stand live bij de ander + vijanden sturen', async () => {
    for (const P of [A, B]) await P.evaluate(() => { const g = App.game; g.cash = 5000; const t = g.freeTiles.find(([x, y]) => g.tileFree(x, y)); g.placeHero(g.team[0], t[0], t[1]); g.startWave(); });
    await A.waitForTimeout(1500);
    const opp = await A.evaluate(() => App.game.opp);
    ok(opp && opp.w >= 1, 'stand van Bram niet ontvangen: ' + JSON.stringify(opp));
    const n0 = await B.evaluate(() => App.game.enemies.length);
    await A.click('#rs-0'); await B.waitForTimeout(1800);
    const sent = await B.evaluate(() => App.game.enemies.filter(e => e.sentBy).length);
    ok(sent === 5, 'Bram kreeg ' + sent + ' handlangers'); return { oppGolf: opp.w, ontvangen: sent, n0 };
  });
  await step('race: zonder cooldown — ingedrukt houden en sneltoets blijven sturen, inkomen stijgt', async () => {
    const c0 = await A.evaluate(() => { const g = App.game; g.cash = 99999; return g.sentN; });
    const bx = await A.$eval('#rs-1', el => { const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await A.mouse.move(bx[0], bx[1]); await A.mouse.down(); await A.waitForTimeout(1300); await A.mouse.up();
    const held = await A.evaluate(c => App.game.sentN - c, c0);
    await A.waitForTimeout(200); await A.keyboard.press('z'); await A.waitForTimeout(200); await A.keyboard.press('z'); await A.waitForTimeout(300);
    const r = await A.evaluate(c => ({ totaal: App.game.sentN - c, eco: App.game.eco }), c0);
    ok(held >= 5, 'ingedrukt houden stuurde maar ' + held + '×'); ok(r.totaal >= held + 2, 'sneltoets werkt niet'); ok(r.eco > 0, 'geen inkomen');
    await B.waitForTimeout(1500); const inc = await B.evaluate(() => App.game.enemies.filter(e => e.sentBy).length + App.game.inQ.length);
    ok(inc > 30, 'Bram kreeg te weinig: ' + inc); return Object.assign(r, { ingedrukt: held, bijBram: inc });
  });
  await step('race: oneindig golven + bazen sturen voor 20k en 50k', async () => {
    const info = await A.evaluate(() => ({ tw: App.game.totalWaves, lbl: document.getElementById('mo-wave').textContent, b5: document.querySelector('#rs-5 .c').textContent, b6: document.querySelector('#rs-6 .c').textContent, canStart: App.game.wave < App.game.totalWaves }));
    ok(info.tw === Infinity && info.canStart, 'race heeft geen oneindig golven: ' + info.tw); ok(!/\//.test(info.lbl), 'golflabel toont nog een einde: ' + info.lbl);
    ok(info.b5 === '$20k' && info.b6 === '$50k', 'bazenprijzen kloppen niet: ' + info.b5 + ' ' + info.b6);
    await B.evaluate(() => { App.game.inQ = []; App.game.hp = 99999; }); // wachtrij van de vorige stap leeg, zodat de bazen meteen komen
    const before = await A.evaluate(() => { const g = App.game; g.cash = 70000; g.wave = 12; return g.cash; });
    await A.click('#rs-5'); await A.waitForTimeout(200); await A.keyboard.press('m'); await A.waitForTimeout(200);
    const after = await A.evaluate(() => ({ cash: App.game.cash, b5: document.querySelector('#rs-5 .c').textContent }));
    ok(before - after.cash === 70000, 'betaald: ' + (before - after.cash)); ok(after.b5 === '$20k', 'prijs stijgt mee met golf');
    await B.waitForTimeout(2500);
    const bosses = await B.evaluate(() => App.game.enemies.filter(e => e.sentBy && e.boss).map(e => ({ t: e.type, leak: e.E.leak, hp: Math.round(e.maxHp) })));
    ok(bosses.some(b => b.t === 'chaoskoning' && b.leak === 40) && bosses.some(b => b.t === 'tiran' && b.leak === 75), 'Bram kreeg de bazen niet: ' + JSON.stringify(bosses));
    await B.screenshot({ path: SHOTS + '/mp_race_boss.png' });
    return bosses;
  });
  await step('race: splitscreen toont veld, helden en vijanden van de ander', async () => {
    await A.waitForTimeout(800);
    const v = await A.evaluate(() => { const V = App.game.oview, cv = document.getElementById('ocv'); return { helden: V ? V.heroes.length : 0, vijanden: V && V.cur ? V.cur.m.size : 0, gestuurd: V && V.cur ? [...V.cur.m.values()].filter(e => e.f & 2).length : 0, breed: cv ? cv.clientWidth : 0, zichtbaar: !!(cv && cv.offsetParent) }; });
    await A.screenshot({ path: SHOTS + '/mp_race_split_a.png' }); await B.screenshot({ path: SHOTS + '/mp_race_split_b.png' });
    ok(v.helden >= 1 && v.vijanden > 0 && v.gestuurd > 0 && v.zichtbaar && v.breed > 200, JSON.stringify(v));
    await A.click('.opp-box [data-act="split-toggle"]'); const hid = await A.evaluate(() => document.getElementById('obox').hidden);
    await A.click('#ob-show'); const back = await A.evaluate(() => !document.getElementById('obox').hidden);
    ok(hid && back, 'verbergen/tonen werkt niet'); return v;
  });
  await step('race: splitscreen op telefoon (onder elkaar)', async () => {
    await B.setViewportSize({ width: 400, height: 860 }); await B.waitForTimeout(400);
    await B.evaluate(() => fitCanvas());
    const r = await B.evaluate(() => { const a = document.getElementById('gcv').getBoundingClientRect(), b = document.getElementById('ocv').getBoundingClientRect(); return { onder: b.top >= a.bottom - 2, breed: Math.round(b.width), scroll: document.documentElement.scrollWidth <= 400 }; });
    await B.screenshot({ path: SHOTS + '/mp_race_split_phone.png', fullPage: true });
    await B.setViewportSize({ width: 1300, height: 820 });
    ok(r.onder && r.breed > 300, JSON.stringify(r)); return r;
  });
  await step('race: basis van Bram valt → Anna wint', async () => {
    await B.evaluate(() => { const g = App.game; g.hp = 0; g.lose(); }); await A.waitForTimeout(800);
    const ra = await A.evaluate(() => App.game.result), rb = await B.evaluate(() => App.game.result);
    ok(ra && ra.win && rb && !rb.win, 'uitslag klopt niet ' + JSON.stringify([ra, rb]));
    await A.waitForTimeout(2200); await A.screenshot({ path: SHOTS + '/mp_race_win.png' });
    const txt = await A.evaluate(() => (document.querySelector('.results-card') || {}).textContent || '');
    ok(/Race gewonnen/.test(txt), 'geen racebeloning in resultaten'); return 'gewonnen';
  });
  for (const P of [A, B]) await P.evaluate(() => { closeOverlay(); exitGame('friends'); });
  await wait(500);
  // ---------- CO-OP ----------
  await step('co-op: uitnodigen, accepteren en starten', async () => {
    const bid = await A.evaluate(() => SOC.data.friends[0].id);
    await A.evaluate(id => openInviteDialog(id, 'coop'), bid); await A.waitForTimeout(200); await A.click('[data-act="inv-send"]');
    await B.evaluate(() => SOC.refresh()); await B.waitForSelector('.mp-invite', { timeout: 5000 }); await B.click('.mp-invite [data-act="inv-accept"]');
    await A.waitForFunction(() => App.game && App.game.mode === 'coop2', null, { timeout: 15000 }); await B.waitForFunction(() => App.game && App.game.mode === 'coop2', null, { timeout: 15000 });
    return { host: await A.evaluate(() => App.game.mp.role), gast: await B.evaluate(() => App.game.mp.role) };
  });
  await step('co-op: gast plaatst een held, host ziet hem', async () => {
    await A.evaluate(() => { App.game.cash = 4000; App.game.cash2 = 4000; });
    await B.waitForTimeout(400);
    await B.evaluate(() => { const g = App.game, t = g.freeTiles.find(([x, y]) => g.tileFree(x, y) && x > 8); g.placeHero(g.team[0], t[0], t[1]); });
    await A.waitForTimeout(600);
    const hostSees = await A.evaluate(() => App.game.heroes.filter(h => h.owner === 1).map(h => h.id)), guestSees = await B.evaluate(() => App.game.heroes.filter(h => h.owner === 1).map(h => h.id));
    ok(hostSees.length === 1 && guestSees.length === 1, `host ${hostSees} gast ${guestSees}`);
    await A.evaluate(() => { const g = App.game, t = g.freeTiles.find(([x, y]) => g.tileFree(x, y) && x < 8); g.placeHero(g.team[0], t[0], t[1]); g.startWave(); });
    await B.waitForTimeout(1500);
    const ge = await B.evaluate(() => ({ en: App.game.enemies.length, heroes: App.game.heroes.length, wave: App.game.wave, cash: App.game.cash }));
    ok(ge.en > 0 && ge.heroes === 2 && ge.wave === 1, 'gast ziet geen golf: ' + JSON.stringify(ge));
    await B.screenshot({ path: SHOTS + '/mp_coop_guest.png' }); await A.screenshot({ path: SHOTS + '/mp_coop_host.png' });
    return ge;
  });
  await step('co-op: gast ziet soldaten, putten en wortels van nieuwe helden', async () => {
    await A.evaluate(() => { const g = App.game; for (let i = 0; i < 3; i++) h4Ally(g, { d: g.leakD - 20 - i * 30, hp: 200, dmg: 10, kind: 'soldier', look: HERO.garnizoen.look }); const e = g.enemies[0]; if (e) h4Root(e, 3); });
    await B.waitForTimeout(700);
    const v = await B.evaluate(() => ({ allies: (App.game.h4view && App.game.h4view.a || []).length, rooted: App.game.enemies.filter(e => e.rootT > 0).length }));
    ok(v.allies === 3, 'gast ziet geen soldaten: ' + JSON.stringify(v)); return v;
  });
  await step('co-op: gast upgradet eigen held, niet die van de host', async () => {
    await B.evaluate(() => { const g = App.game, mine = g.heroes.find(h => h.owner === 1); g.upgrade(mine); });
    await A.waitForTimeout(500); await B.waitForTimeout(300);
    const tier = await A.evaluate(() => App.game.heroes.find(h => h.owner === 1).tier), tierB = await B.evaluate(() => App.game.heroes.find(h => h.owner === 1).tier);
    const other = await B.evaluate(() => { const g = App.game, his = g.heroes.find(h => h.owner !== 1); return g.upgrade(his); });
    ok(tier === 1 && tierB === 1 && other === false, `tier host ${tier} gast ${tierB} ander ${other}`);
    const c = await A.evaluate(() => ({ host: App.game.cash, gast: App.game.cash2 })); return c;
  });
  await step('co-op: gast start golf en gebruikt ability', async () => {
    await A.evaluate(() => { const g = App.game; g.queue = []; g.enemies.forEach(e => { e.hp = 0; g.kill(e, null); }); g.bonusPending = false; });
    await B.waitForTimeout(400);
    await B.evaluate(() => App.game.startWave()); await A.waitForTimeout(500);
    const w = await A.evaluate(() => App.game.wave);
    await B.evaluate(() => { const g = App.game, mine = g.heroes.find(h => h.owner === 1); mine.abilCd = 0; g.useAbility(mine); });
    await A.waitForTimeout(400); const cd = await A.evaluate(() => App.game.heroes.find(h => h.owner === 1).abilCd);
    ok(w === 2 && cd > 0, `golf ${w} cd ${cd}`); return { golf: w, cooldown: Math.round(cd) };
  });
  await step('co-op: einde → beide zien de uitslag', async () => {
    await A.evaluate(() => App.game.win()); await B.waitForTimeout(2600); await A.waitForTimeout(200);
    const tb = await B.evaluate(() => (document.querySelector('.results-card') || {}).textContent || ''), ta = await A.evaluate(() => (document.querySelector('.results-card') || {}).textContent || '');
    await B.screenshot({ path: SHOTS + '/mp_coop_end.png' });
    ok(/Samen gewonnen/.test(tb) && /Samen gewonnen/.test(ta), 'geen samen-gewonnen'); return 'ok';
  });
  for (const P of [A, B]) await P.evaluate(() => { closeOverlay(); exitGame('friends'); });
  await wait(500);
  // ---------- MEGABAAS ----------
  await step('megabaas: knop bij vrienden en eis van minstens 1 Ultra/Secret', async () => {
    await A.evaluate(() => { Store.data.team = Store.data.team.filter(id => !['ultra', 'secret'].includes(HERO[id].rarity)).slice(0, 4); nav('friends'); renderFriends(); });
    const btn = await A.$('[data-act="fr-invite"][data-k="mega"]'); ok(btn, 'geen Megabaas-knop');
    await btn.click(); await A.waitForTimeout(200);
    const dis = await A.$eval('[data-act="inv-send"]', b => b.disabled); ok(dis, 'versturen kan zonder Ultra');
    await A.screenshot({ path: SHOTS + '/mp_mega_invite_locked.png' });
    for (const P of [A, B]) await P.evaluate(() => { for (const id of ['omega', 'nul', 'genesis']) { grantHero(id); Store.data.heroes[id].level = MAX_LEVEL; } Store.data.team = ['omega', 'nul', 'genesis'].concat(Store.data.team.filter(id => !['omega', 'nul', 'genesis'].includes(id))).slice(0, 8); Store.save(); });
    await A.evaluate(() => { closeOverlay(); renderFriends(); }); await A.click('[data-act="fr-invite"][data-k="mega"]'); await A.waitForTimeout(200);
    const dis2 = await A.$eval('[data-act="inv-send"]', b => b.disabled); ok(!dis2, 'versturen nog steeds uit');
    await A.screenshot({ path: SHOTS + '/mp_mega_invite.png' }); return 'ok';
  });
  await step('megabaas: uitnodigen, accepteren, beide in megabaas-modus', async () => {
    await A.click('[data-act="inv-send"]'); await A.waitForTimeout(500);
    const stored = DB.invites[DB.invites.length - 1]; ok(stored.kind === 'coop' && /^mega:/.test(stored.map), 'opgeslagen als ' + stored.kind + ' ' + stored.map);
    await B.evaluate(() => SOC.refresh()); await B.waitForSelector('.mp-invite', { timeout: 5000 });
    const lbl = await B.$eval('.mp-invite .mi-kind', el => el.textContent); ok(lbl === 'Megabaas', 'label ' + lbl);
    await B.click('.mp-invite [data-act="inv-accept"]');
    await A.waitForFunction(() => App.game && App.game.opts.mega, null, { timeout: 15000 }); await B.waitForFunction(() => App.game && App.game.opts.mega, null, { timeout: 15000 });
    const r = await A.evaluate(() => ({ mode: App.game.mode, waves: App.game.totalWaves, cash: App.game.cash, label: modeLabel(App.game), prep: Math.round(App.game.autoT) }));
    ok(r.mode === 'coop2' && r.waves === 1 && r.cash >= 9000, JSON.stringify(r)); return r;
  });
  await step('megabaas: helden plaatsen, baas komt, gast ziet hem', async () => {
    await A.evaluate(() => { const g = App.game; g.cash = 1e6; g.cash2 = 1e6; const t = g.freeTiles.filter(([x, y]) => g.tileFree(x, y)); g.placeHero('omega', t[3][0], t[3][1]); g.placeHero('nul', t[9][0], t[9][1]); });
    await B.evaluate(() => { const g = App.game, t = g.freeTiles.filter(([x, y]) => g.tileFree(x, y) && x > 10); g.placeHero('genesis', t[0][0], t[0][1]); });
    await A.waitForTimeout(600);
    await B.evaluate(() => App.game.startWave()); await B.waitForTimeout(1500);
    const host = await A.evaluate(() => { const b = App.game.enemies.find(e => e.type === 'megabaas'); return b && { hp: b.maxHp, speed: +b.speed.toFixed(3) }; });
    const guest = await B.evaluate(() => { const b = App.game.enemies.find(e => e.type === 'megabaas'); return b && { hp: b.maxHp }; });
    await A.screenshot({ path: SHOTS + '/mp_mega_host.png' }); await B.screenshot({ path: SHOTS + '/mp_mega_guest.png' });
    ok(host && guest && guest.hp === host.hp, JSON.stringify({ host, guest })); return { host, guest };
  });
  await step('megabaas: vanaf fase 2 alleen Ultra/Secret; die raken hem altijd', async () => {
    const r = await A.evaluate(() => {
      const g = App.game, b = g.enemies.find(e => e.type === 'megabaas'), om = g.heroes.find(h => h.id === 'omega'), nul = g.heroes.find(h => h.id === 'nul');
      const fake = { def: HERO['straatvuist'] || HEROES.find(H => H.rarity === 'common'), st: om.st, id: 'x', owner: 0, kills: 0, dmg: 0 };
      const hit = (h) => { b.megaBudget = 1e12; const h0 = b.hp; g.damage(b, 1e6, h); return Math.round(h0 - b.hp); };
      b.hp = b.maxHp * 0.5; const p2common = hit(fake), p2ultra = hit(om);
      b.hp = b.maxHp * 0.2; const p3common = hit(fake), p3ultra = hit(om), p3secret = hit(nul);
      return { p2common, p2ultra, p3common, p3ultra, p3secret, cap: Math.round(megaCapBase() * MEGA.hitCap) };
    });
    ok(r.p2common === 0 && r.p2ultra > 0 && r.p3common === 0 && r.p3ultra > 0 && r.p3secret > 0 && r.p3secret <= r.cap, JSON.stringify(r));
    await B.waitForTimeout(800); await B.screenshot({ path: SHOTS + '/mp_mega_phase3_guest.png' }); return r;
  });
  await step('megabaas: verslagen → beide winnen met gems, tokens en trait-bonus', async () => {
    const g0 = await B.evaluate(() => ({ gems: Store.data.gems, tokens: Store.data.tokens }));
    const kd = await A.evaluate(() => { const g = App.game, b = g.enemies.find(e => e.type === 'megabaas'), nul = g.heroes.find(h => h.id === 'nul'); let r = 0; for (let i = 0; i < 30 && !g.over; i++) { b.hp = Math.min(b.hp, 10); b.invulnT = 0; b.megaBudget = 1e9; r = g.damage(b, 1e6, nul); } return { r, hp: b.hp, dead: b.dead, over: g.over, nul: !!nul, rar: nul && nul.def.rarity, mb: b.megaBoss, own: g.hasOwnProperty('damage') }; });
    ok(kd.over, 'baas niet verslagen: ' + JSON.stringify(kd));
    await A.waitForTimeout(400); await B.waitForTimeout(2800); await A.waitForTimeout(200);
    const ta = await A.evaluate(() => (document.querySelector('.results-card') || {}).textContent || ''), tb = await B.evaluate(() => (document.querySelector('.results-card') || {}).textContent || '');
    const g1 = await B.evaluate(() => ({ gems: Store.data.gems, tokens: Store.data.tokens, pity: Store.data.traitPity }));
    await B.screenshot({ path: SHOTS + '/mp_mega_win.png' });
    const sa = await A.evaluate(() => ({ over: App.game && App.game.over, res: App.game && App.game.result, boss: App.game && (App.game.enemies.find(e => e.type === 'megabaas') || {}).hp, ov: document.getElementById('overlay-root').textContent.slice(0, 120) }));
    ok(/Oerverslinder verslagen/.test(ta) && /Oerverslinder verslagen/.test(tb), 'geen winst-regel: ' + JSON.stringify(sa) + ' | B: ' + tb.slice(0, 200));
    ok(g1.gems - g0.gems >= 400 && g1.tokens - g0.tokens >= 25 && g1.pity >= 49, JSON.stringify([g0, g1]));
    return { gems: g1.gems - g0.gems, tokens: g1.tokens - g0.tokens };
  });
  await step('portaal: uitnodigen vanuit Modi → Portalen, accepteren, beide op de Maan', async () => {
    for (const P of [A, B]) await P.evaluate(() => { closeOverlay(); if (App.game) exitGame('friends'); MP.leave(); });
    await A.waitForTimeout(500);
    const pb0 = await B.evaluate(() => { Store.data.portals = { 'lunar:rare': 1 }; return portalCount('lunar', 'rare'); });
    await A.evaluate(() => { Store.data.portals = { 'lunar:rare': 1 }; Store.data.team = ['omega', 'nul', 'genesis']; App.modeTab = 'portals'; nav('modes'); });
    await A.click('[data-act="portal-friend"][data-w="lunar"][data-t="rare"]'); await A.waitForSelector('[data-act="portal-invite-send"]', { timeout: 5000 });
    await A.click('[data-act="portal-invite-send"]'); await A.waitForTimeout(500);
    const stored = DB.invites[DB.invites.length - 1]; ok(stored.kind === 'coop' && stored.map === 'pt:maanbasis' && stored.diff === 2, 'opgeslagen als ' + JSON.stringify(stored));
    await B.evaluate(() => SOC.refresh()); await B.waitForSelector('.mp-invite', { timeout: 5000 });
    const lbl = await B.$eval('.mp-invite .mi-kind', el => el.textContent); ok(lbl === 'Portaal', 'label ' + lbl);
    await B.click('.mp-invite [data-act="inv-accept"]');
    await A.waitForFunction(() => App.game && App.game.opts.portal, null, { timeout: 15000 }); await B.waitForFunction(() => App.game && App.game.opts.portal, null, { timeout: 15000 });
    const ra = await A.evaluate(() => ({ map: App.game.map.id, lanes: App.game.lanes.length, waves: App.game.totalWaves, label: modeLabel(App.game), left: portalCount('lunar', 'rare') }));
    const rb = await B.evaluate(() => ({ map: App.game.map.id, lanes: App.game.lanes.length, left: portalCount('lunar', 'rare') }));
    ok(ra.map === 'maanbasis' && rb.map === 'maanbasis' && ra.lanes === 2 && rb.lanes === 2 && ra.waves === 20, JSON.stringify([ra, rb]));
    ok(ra.left === 0 && rb.left === pb0, 'portaal gebruikt: host ' + ra.left + ' gast ' + rb.left);
    return { host: ra, gast: rb };
  });
  await step('portaal: vijanden van 3 kanten, gast ziet ze op de juiste route', async () => {
    await A.evaluate(() => { const g = App.game; g.cash = 1e6; g.startWave(); });
    await A.waitForTimeout(3500);
    const ha = await A.evaluate(() => App.game.enemies.filter(e => !e.dead).map(e => ({ id: e.id, lane: e.lane || 0, x: Math.round(e.x), y: Math.round(e.y) })));
    const hb = await B.evaluate(() => App.game.enemies.filter(e => !e.dead).map(e => ({ id: e.id, lane: e.lane || 0, x: Math.round(e.x), y: Math.round(e.y) })));
    ok(new Set(ha.map(e => e.lane)).size === 3, 'routes host ' + JSON.stringify(ha.map(e => e.lane)));
    const m = new Map(hb.map(e => [e.id, e])); let same = 0; for (const e of ha) { const o = m.get(e.id); if (o && o.lane === e.lane && Math.hypot(o.x - e.x, o.y - e.y) < 60) same++; }
    ok(same >= Math.min(ha.length, hb.length) - 1 && same > 0, 'gast ziet andere posities: ' + same + ' van ' + ha.length);
    await B.screenshot({ path: SHOTS + '/mp_portal_guest.png' });
    return { vijanden: ha.length, gelijk: same };
  });
  await step('portaal: gewonnen → allebei de portaal-beloning', async () => {
    const c0 = await B.evaluate(() => Store.data.coins);
    await A.evaluate(() => { const g = App.game; for (const e of g.enemies) e.dead = true; g.queue = []; g.wave = g.totalWaves; g.cleared = g.totalWaves; g.win(); });
    await A.waitForTimeout(400); await B.waitForTimeout(2800);
    const ta = await A.evaluate(() => (document.querySelector('.results-card') || {}).textContent || ''), tb = await B.evaluate(() => (document.querySelector('.results-card') || {}).textContent || '');
    const c1 = await B.evaluate(() => Store.data.coins);
    ok(/Lunar Portal \(Rare\) gehaald/.test(ta) && /Lunar Portal \(Rare\) gehaald/.test(tb), 'geen portaal-regel: ' + tb.slice(0, 200));
    ok(c1 - c0 >= 2400, 'gast munten ' + (c1 - c0));
    return { gastMunten: c1 - c0 };
  });
  for (const P of [A, B]) out.push(`errors ${P.__name}: ${JSON.stringify(P.errs.slice(0, 5))}`);
  console.log(out.join('\n')); await browser.close(); process.exit(0);
})();
