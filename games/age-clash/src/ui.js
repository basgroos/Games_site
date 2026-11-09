/* =========================================================================
 * ui.js — alle menu's en pagina's: Main Menu, Game Mode, Collection, Ages,
 * Upgrades, Shop, Seizoen, Leaderboard, Settings, Online lobby.
 * ========================================================================= */
var AC = window.AC;
(function () {
  var Pf = AC.Profile;
  function $(s, r) { return (r || document).querySelector(s); }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k === 'text') e.textContent = v;
      else if (k === 'style') e.style.cssText = v; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    (kids || []).forEach(function (c) { if (c == null) return; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { n = Math.round(n); return n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'k' : String(n); }
  var UI = { $: $, h: h, esc: esc, fmt: fmt, cur: null, previews: [] };
  AC.UI = UI;

  UI.click = function () { if (AC.audio) { AC.audio.init(); AC.audio.play('click'); } };
  UI.toast = function (msg, ms) {
    var t = h('div', { class: 'toast', html: msg }); $('#stage').appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, ms || 1800);
  };
  UI.modal = function (title, bodyHtml, buttons) {
    var bg = h('div', { class: 'modal-bg' });
    var box = h('div', { class: 'modal panel' }, [h('h2', { html: title }), h('div', { html: bodyHtml })]);
    var row = h('div', { class: 'row' });
    (buttons || [{ t: 'OK' }]).forEach(function (b) {
      row.appendChild(h('button', { class: 'btn ' + (b.c || ''), html: b.t, onclick: function () { UI.click(); if (b.f) { if (b.f() === false) return; } bg.remove(); } }));
    });
    box.appendChild(row); bg.appendChild(box); $('#stage').appendChild(bg);
    return bg;
  };

  UI.show = function (id, arg) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('on'); });
    UI.previews = [];
    var el = $('#scr-' + id); if (!el) return;
    if (UI.build[id]) UI.build[id](el, arg);
    el.classList.add('on'); UI.cur = id;
    AC.Main.onScreen(id);
  };

  function topbar(title, backTo) {
    var d = Pf.data;
    return h('div', { class: 'topbar' }, [
      h('button', { class: 'btn ghost sm back', html: '← Terug', onclick: function () { UI.click(); UI.show(backTo || 'menu'); } }),
      h('h1', { class: 'scr-title', text: title }), h('div', { class: 'sp' }),
      h('div', { class: 'chip' }, [h('span', { class: 'coin', text: fmt(d.coins) })]),
      h('div', { class: 'chip', html: '⭐ Lvl ' + d.level }),
    ]);
  }

  /* --------------------------- unit preview --------------------------- */
  AC.drawUnitPreview = function (cv, age, slot, col, t, opts) {
    opts = opts || {};
    var c = cv.getContext('2d'), w = cv.width, hh = cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, hh);
    var def = AC.UNITS[age][slot], st = AC.unitStats(age, slot), ag = AC.AGES[age];
    if (opts.bg !== false) {
      var g = c.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, ag.colors.sky1); g.addColorStop(1, ag.colors.sky2);
      c.fillStyle = g; c.fillRect(0, 0, w, hh); c.fillStyle = ag.colors.ground; c.fillRect(0, hh * 0.82, w, hh * 0.18);
    }
    var lh = AC.LOOK_H[def.look] || 50;
    var flying = def.look === 'drone';
    var sc = Math.min((hh * 0.72) / (flying ? 40 : lh), (w * 0.8) / ((st.w + 30) * 2)) * (opts.zoom || 1);
    c.save(); c.translate(w / 2 - (flying ? 0 : 0), hh * 0.84 + (flying ? 120 * sc - hh * 0.3 : 0)); c.scale(sc, sc);
    if (opts.flip) c.scale(-1, 1);
    var cyc = (t || 0) % 3, a = -1, moving = false, ph = 0;
    if (opts.anim) { if (cyc < 1.6) { moving = true; ph = t * 7; } else { a = ((cyc - 1.6) % 0.7) / 0.7; } }
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(0, 0, st.w + 3, 4, 0, 0, Math.PI * 2); c.fill();
    AC.LOOKS[def.look](c, { pal: def.pal, gear: def.gear, ph: ph, a: a, t: t || 0, team: col, moving: moving, st: st, seed: slot });
    c.restore();
  };
  var iconCache = {};
  AC.unitIcon = function (age, slot, col) {
    var k = age + '_' + slot + '_' + col; if (iconCache[k]) return iconCache[k];
    var cv = document.createElement('canvas'); cv.width = 192; cv.height = 160;
    AC.drawUnitPreview(cv, age, slot, col, 0.4, { bg: false });
    iconCache[k] = cv; return cv;
  };
  function prevCanvas(age, slot, locked, anim) {
    var cv = h('canvas', { class: 'uprev', width: 440, height: 300 });
    UI.previews.push({ cv: cv, age: age, slot: slot, anim: anim !== false, off: Math.random() * 3 });
    AC.drawUnitPreview(cv, age, slot, Pf.color(), 0.4, { anim: false });
    return cv;
  }
  UI.tickPreviews = function (t) {
    for (var i = 0; i < UI.previews.length; i++) { var p = UI.previews[i]; if (p.anim && p.cv.isConnected) AC.drawUnitPreview(p.cv, p.age, p.slot, Pf.color(), t + p.off, { anim: true }); }
  };

  /* --------------------------- MAIN MENU --------------------------- */
  UI.build = {};
  UI.build.menu = function (el) {
    var d = Pf.data, rk = Pf.rank(d.rating);
    el.innerHTML = '';
    el.appendChild(h('div', { class: 'logo' }, [h('div', { class: 'l1', html: 'AGE CLASH' }), h('div', { class: 'l2', text: 'EVOLUTION WAR' }), h('div', { class: 'l3', text: 'Leid je leger door 8 tijdperken — van apen met knotsen tot kosmische kolossen. Vernietig de basis van je tegenstander.' })]));
    var mb = h('div', { class: 'menu-btns' });
    [['play', '⚔', 'SPELEN', 'gold play'], ['collection', '🛡', 'Collectie'], ['ages', '⏳', 'Tijdperken'], ['upgrades', '⬆', 'Upgrades'], ['shop', '🛒', 'Shop'], ['settings', '⚙', 'Instellingen']].forEach(function (b) {
      mb.appendChild(h('button', { class: 'btn ' + (b[3] || ''), onclick: function () { UI.click(); UI.show(b[0] === 'play' ? 'mode' : b[0]); } }, [h('span', { class: 'ico', text: b[1] }), h('span', { text: b[2] })]));
    });
    el.appendChild(mb);
    var side = h('div', { class: 'menu-side' });
    // profielkaart
    var lvlNeed = Pf.levelXp(d.level);
    var hist = h('div', { class: 'hist' }); d.history.slice(0, 12).forEach(function (m) { hist.appendChild(h('i', { class: m.won ? 'w' : 'l', text: m.won ? 'W' : 'L' })); });
    side.appendChild(h('div', { class: 'panel card' }, [
      h('div', { class: 'prof' }, [
        h('div', { class: 'avatar', style: 'background:' + Pf.color(), text: (d.name || 'C')[0].toUpperCase() }),
        h('div', { style: 'flex:1' }, [
          h('div', { style: 'font-weight:900;font-size:20px', text: d.name }),
          h('div', { style: 'display:flex;gap:8px;align-items:center;margin-top:4px' }, [h('span', { class: 'rankbadge', style: 'color:' + rk.col, text: rk.name }), h('span', { class: 'mut', text: d.rating + ' rating' })]),
        ]),
        h('span', { class: 'coin', style: 'font-size:20px', text: fmt(d.coins) }),
      ]),
      h('div', { style: 'margin-top:12px;display:flex;justify-content:space-between;font-size:13px', html: '<b>Level ' + d.level + '</b><span class="mut">' + Math.round(d.xp) + ' / ' + lvlNeed + ' XP</span>' }),
      h('div', { class: 'bar', style: 'margin-top:5px' }, [h('i', { style: 'width:' + Math.min(100, d.xp / lvlNeed * 100) + '%' })]),
      h('div', { style: 'margin-top:10px;font-size:13px', class: 'mut', html: d.wins + ' gewonnen · ' + d.losses + ' verloren · beste streak ' + d.bestStreak }),
      hist,
    ]));
    // seizoen
    var sx = d.season.xp, nextT = AC.SEASON.tiers.filter(function (t) { return t.xp > sx; })[0];
    var claimable = AC.SEASON.tiers.filter(function (t) { return t.xp <= sx && d.season.claimed.indexOf(t.tier) < 0; }).length;
    var curT = AC.SEASON.tiers.filter(function (t) { return t.xp <= sx; }).length;
    side.appendChild(h('div', { class: 'panel card', style: 'cursor:pointer', onclick: function () { UI.click(); UI.show('season'); } }, [
      h('h3', { html: '🏆 ' + AC.SEASON.name + (claimable ? ' <span class="tag" style="background:var(--gold);color:#221">' + claimable + ' te claimen</span>' : '') }),
      h('div', { style: 'display:flex;justify-content:space-between;font-size:13px', html: '<span>Tier <b>' + curT + '</b> / 30</span><span class="mut">' + (nextT ? sx + ' / ' + nextT.xp + ' XP' : 'Voltooid!') + '</span>' }),
      h('div', { class: 'bar', style: 'margin-top:6px' }, [h('i', { style: 'background:linear-gradient(90deg,#ffb02a,#ffd65a);width:' + (nextT ? Math.min(100, (sx - (nextT.xp - 400)) / 400 * 100) : 100) + '%' })]),
    ]));
    // dagelijks + kisten
    var dailyDone = d.daily.day === Pf.today();
    side.appendChild(h('div', { class: 'panel card' }, [
      h('h3', { html: '🎁 Beloningen' }),
      h('div', { style: 'font-size:14px', html: dailyDone ? '✅ Dagelijkse overwinningsbonus geclaimd' : '⚡ Eerste overwinning vandaag: <span class="coin">+150</span>' }),
      h('div', { style: 'display:flex;gap:8px;margin-top:10px;align-items:center' }, [
        h('span', { style: 'flex:1;font-size:14px', html: '📦 Kisten: <b>' + d.crates + '</b>' + (d.boost ? ' · 🔥 Boost: ' + d.boost + ' matches' : '') }),
        d.crates ? h('button', { class: 'btn gold sm', text: 'Open kist', onclick: function () { UI.click(); UI.openCrate(); } }) : null,
      ]),
    ]));
    side.appendChild(h('div', { style: 'display:flex;gap:10px' }, [
      h('button', { class: 'btn ghost', style: 'flex:1', html: '📊 Leaderboard', onclick: function () { UI.click(); UI.show('leader'); } }),
      h('button', { class: 'btn ghost', style: 'flex:1', html: '🏆 Seizoen', onclick: function () { UI.click(); UI.show('season'); } }),
    ]));
    el.appendChild(side);
    var B = AC.BUILD;
    if (B && B.home != null) el.appendChild(h('a', { class: 'btn ghost sm', href: B.home || '../../', style: 'position:absolute;left:24px;top:22px;text-decoration:none', text: '← Bas Games' }));
    if (B && B.env === 'staging') el.appendChild(h('div', { style: 'position:absolute;left:50%;top:0;transform:translateX(-50%);background:#ff8a2a;color:#221;font-weight:900;padding:4px 14px;border-radius:0 0 8px 8px;font-size:13px', text: 'STAGING' + (B.commit ? ' · ' + B.commit.slice(0, 7) : '') }));
    el.appendChild(h('div', { class: 'ver', text: 'v' + ((B && B.version) || '1.0') + ' · ' + (Pf.cloud === 'cloud' ? 'voortgang opgeslagen in je account' : 'voortgang opgeslagen in deze browser') }));
  };

  UI.openCrate = function () {
    var r = Pf.openCrate(); if (!r) return;
    if (AC.audio) AC.audio.play('coin');
    var body;
    if (r.type === 'coins') body = '<div style="font-size:64px">💰</div><p style="font-size:22px"><span class="coin">+' + r.n + '</span> coins</p>';
    else if (r.type === 'boost') body = '<div style="font-size:64px">🔥</div><p style="font-size:20px">Coin-boost ×1.5 voor <b>' + r.n + '</b> matches</p>';
    else body = '<div style="font-size:64px">✨</div><p style="font-size:20px"><b style="color:' + AC.RARITY_COL[r.item.rarity] + '">' + r.item.name + '</b><br><span class="mut">' + r.item.rarity.toUpperCase() + ' cosmetic</span></p>';
    UI.modal('Kist geopend!', body, [{ t: 'Top!', c: 'gold', f: function () { if (UI.cur === 'menu' || UI.cur === 'shop') UI.show(UI.cur); } }]);
  };

  /* --------------------------- GAME MODE --------------------------- */
  UI.build.mode = function (el) {
    var d = Pf.data; el.innerHTML = '';
    el.appendChild(h('div', { class: 'scr-bg', style: 'background:linear-gradient(180deg,rgba(8,10,18,.55),rgba(8,10,18,.9))' }));
    el.appendChild(topbar('Kies je spelmodus'));
    var diff = d.settings.diff || 'normal';
    var modes = h('div', { class: 'modes' });
    var diffBox = h('div', { class: 'diffs' });
    function renderDiffs() {
      diffBox.innerHTML = '';
      ['easy', 'normal', 'hard'].forEach(function (k) {
        var b = AC.BOT[k];
        diffBox.appendChild(h('button', { class: 'btn sm ' + (k === diff ? 'on ' : '') + (k === 'easy' ? 'green' : k === 'hard' ? 'red' : 'blue'), onclick: function () { UI.click(); diff = k; d.settings.diff = k; Pf.save(); renderDiffs(); } }, [h('span', { text: b.name }), h('small', { text: '×' + b.coins + ' coins' })]));
      });
    }
    renderDiffs();
    modes.appendChild(h('div', { class: 'panel mode' }, [
      h('div', { class: 'big', text: '🤖' }), h('h2', { text: 'Vs Bot' }),
      h('p', { text: 'Vecht tegen een slimme AI-commandant. Hogere moeilijkheid levert meer coins en rating op.' }),
      diffBox,
      h('button', { class: 'btn gold', style: 'font-size:22px;padding:16px', text: 'START MATCH', onclick: function () { UI.click(); AC.Match.start({ mode: 'bot', diff: diff }); } }),
    ]));
    modes.appendChild(h('div', { class: 'panel mode' }, [
      h('div', { class: 'big', text: '🌐' }), h('h2', { text: 'Online PvP' }),
      h('p', { text: 'Speel 1v1 tegen een echte speler. Ranked: winnen verhoogt je rating. Eerlijk: permanente upgrades staan uit.' }),
      h('div', { style: 'flex:1' }),
      h('button', { class: 'btn blue', style: 'font-size:22px;padding:16px', text: 'ZOEK TEGENSTANDER', onclick: function () { UI.click(); UI.show('online'); } }),
    ]));
    modes.appendChild(h('div', { class: 'panel mode' }, [
      h('div', { class: 'big', text: '🎮' }), h('h2', { text: 'Lokaal 1v1' }),
      h('p', { html: 'Twee spelers op één computer. Speler 1: <kbd>1</kbd>–<kbd>4</kbd> <kbd>Q</kbd> <kbd>E</kbd> · Speler 2: <kbd>7</kbd>–<kbd>0</kbd> <kbd>P</kbd> <kbd>O</kbd> + muis.' }),
      h('div', { style: 'flex:1' }),
      h('button', { class: 'btn', style: 'font-size:22px;padding:16px', text: 'START LOKAAL', onclick: function () { UI.click(); AC.Match.start({ mode: 'local' }); } }),
    ]));
    el.appendChild(modes);
    el.appendChild(h('div', { style: 'position:absolute;left:0;right:0;bottom:60px;text-align:center', class: 'mut', html: 'Jouw maximale tijdperk in een match: <b style="color:#fff">' + AC.AGES[Pf.maxAge()].name + '</b> · koop meer tijdperken onder <i>Tijdperken</i>' }));
  };

  /* --------------------------- COLLECTION --------------------------- */
  UI.build.collection = function (el, arg) {
    var d = Pf.data; el.innerHTML = '';
    var age = arg && arg.age != null ? arg.age : (UI._colAge || 0); UI._colAge = age;
    var filter = UI._colFilter || 'all';
    var cmp = UI._cmp || [];
    el.appendChild(h('div', { class: 'scr-bg' }));
    el.appendChild(topbar('Collectie'));
    var ct = h('div', { class: 'content' });
    var tabs = h('div', { class: 'tabs' });
    AC.AGES.forEach(function (ag, i) {
      var n = d.owned[i].filter(Boolean).length;
      tabs.appendChild(h('button', { class: 'tab' + (i === age ? ' on' : ''), style: '--tabcol:' + ag.colors.accent, onclick: function () { UI.click(); UI.show('collection', { age: i }); } }, [h('span', { text: (i + 1) + '. ' + ag.short }), h('span', { class: 'lk', text: d.agesOwned[i] ? n + '/4' : '🔒' })]));
    });
    var fl = h('div', { style: 'margin-left:auto;display:flex;gap:6px' });
    [['all', 'Alle'], ['own', 'In bezit'], ['lock', 'Vergrendeld']].forEach(function (f) { fl.appendChild(h('button', { class: 'tab' + (filter === f[0] ? ' on' : ''), style: '--tabcol:#ffcf4a', text: f[1], onclick: function () { UI._colFilter = f[0]; UI.show('collection'); } })); });
    tabs.appendChild(fl);
    ct.appendChild(tabs);
    var ag = AC.AGES[age];
    var bgUrl = AC.getBackground(age).toDataURL('image/jpeg', 0.6);
    ct.appendChild(h('div', { class: 'agehead', style: 'background-image:url(' + bgUrl + ')' }, [
      h('div', {}, [h('div', { class: 'mut', style: 'font-weight:800;letter-spacing:2px', text: 'TIJDPERK ' + (age + 1) + ' · ' + ag.era.toUpperCase() }), h('h2', { style: 'color:' + ag.colors.accent, text: ag.name }), h('div', { style: 'max-width:640px;margin-top:4px', text: ag.desc })]),
      h('div', { style: 'margin-left:auto;text-align:right;font-size:14px' }, [h('div', { html: '✦ <b>Bonus:</b> ' + ag.passive.text }), h('div', { style: 'margin-top:4px', html: '⚡ <b>Power:</b> ' + ag.power.name }),
        !d.agesOwned[age] ? h('button', { class: 'btn gold sm', style: 'margin-top:10px', html: 'Tijdperk ontgrendelen · <span class="coin" style="color:#2a1a00">' + ag.unlockCost + '</span>', onclick: function () { buyAge(age); } }) : null]),
    ]));
    var grid = h('div', { class: 'grid4' });
    var maxS = [0, 0, 0, 0, 0, 0];
    for (var a = 0; a < 8; a++) for (var s = 0; s < 4; s++) { var x = AC.unitStats(a, s); maxS[0] = Math.max(maxS[0], x.hp); maxS[1] = Math.max(maxS[1], AC.dps(x)); maxS[2] = Math.max(maxS[2], x.range); maxS[3] = Math.max(maxS[3], x.speed); maxS[4] = Math.max(maxS[4], x.cost); }
    [0, 1, 2, 3].forEach(function (slot) {
      var u = AC.UNITS[age][slot], st = AC.unitStats(age, slot), own = d.owned[age][slot] && d.agesOwned[age];
      if (filter === 'own' && !own) return; if (filter === 'lock' && own) return;
      var role = AC.ROLES[slot];
      var sel = cmp.some(function (c) { return c[0] === age && c[1] === slot; });
      var card = h('div', { class: 'ucard' + (own ? '' : ' locked') + (sel ? ' sel' : '') });
      card.appendChild(prevCanvas(age, slot, !own));
      card.appendChild(h('span', { class: 'tag role', html: role.icon + ' ' + role.name }));
      card.appendChild(h('div', { class: 'nm', text: u.name }));
      card.appendChild(h('div', { class: 'ds', text: u.desc }));
      var sts = h('div', { class: 'stats' });
      [['HP', st.hp, maxS[0]], ['DPS', AC.dps(st), maxS[1]], ['Bereik', st.range, maxS[2]], ['Snelheid', st.speed, maxS[3]]].forEach(function (r) {
        sts.appendChild(h('span', { class: 'mut', text: r[0] })); sts.appendChild(h('div', { class: 'sb' }, [h('i', { style: 'width:' + Math.max(4, Math.sqrt(r[1] / r[2]) * 100) + '%' })])); sts.appendChild(h('b', { text: fmt(r[1]) }));
      });
      card.appendChild(sts);
      card.appendChild(h('div', { style: 'font-size:12.5px', class: 'mut', html: 'Prijs in match: <b class="ironic" style="color:#dfe6f2">' + st.cost + '</b> · cooldown ' + AC.CONST.SLOT_CD[slot] + 's' + (st.armored ? ' · <b style="color:#ddd">Armored</b>' : '') + (st.aa ? ' · <b style="color:#ffb02a">×2.6 vs armored</b>' : '') + (st.flying ? ' · <b style="color:#8cf">Vliegt</b>' : '') }));
      card.appendChild(h('div', { class: 'special', text: '★ ' + AC.specialText(u.special) }));
      var row = h('div', { style: 'display:flex;gap:8px;margin-top:2px' });
      if (own) row.appendChild(h('button', { class: 'btn green sm', style: 'flex:1', text: '✓ In bezit', disabled: true }));
      else if (!d.agesOwned[age]) row.appendChild(h('button', { class: 'btn sm dis', style: 'flex:1', html: '🔒 Tijdperk vergrendeld' }));
      else row.appendChild(h('button', { class: 'btn gold sm', style: 'flex:1', html: 'Kopen · ' + u.coin, onclick: function () { buyUnit(age, slot); } }));
      row.appendChild(h('button', { class: 'btn ghost sm', text: sel ? '✕' : '⇄', title: 'Vergelijk', onclick: function () {
        UI.click(); var i = cmp.findIndex(function (c) { return c[0] === age && c[1] === slot; });
        if (i >= 0) cmp.splice(i, 1); else { cmp.push([age, slot]); if (cmp.length > 2) cmp.shift(); }
        UI._cmp = cmp; UI.show('collection');
      } }));
      card.appendChild(row);
      grid.appendChild(card);
    });
    ct.appendChild(grid);
    // vergelijken
    var cb = h('div', { class: 'panel cmpbox' });
    if (cmp.length < 2) cb.appendChild(h('div', { class: 'mut', html: '⇄ <b>Vergelijken:</b> klik op ⇄ bij twee units (ook uit verschillende tijdperken) om hun stats naast elkaar te zien. ' + (cmp.length === 1 ? 'Geselecteerd: <b style="color:#fff">' + AC.UNITS[cmp[0][0]][cmp[0][1]].name + '</b>' : '') }));
    else {
      var A1 = AC.unitStats(cmp[0][0], cmp[0][1]), B1 = AC.unitStats(cmp[1][0], cmp[1][1]);
      var g2 = h('div', { class: 'cmpgrid' });
      g2.appendChild(h('div', {})); g2.appendChild(h('div', { class: 'h', text: A1.name + ' (' + AC.AGES[A1.age].short + ')' })); g2.appendChild(h('div', { class: 'h', text: B1.name + ' (' + AC.AGES[B1.age].short + ')' }));
      [['Rol', AC.ROLES[A1.slot].name, AC.ROLES[B1.slot].name], ['HP', A1.hp, B1.hp, 1], ['Schade', A1.dmg, B1.dmg, 1], ['Aanvallen/sec', +(1 / A1.cd).toFixed(2), +(1 / B1.cd).toFixed(2), 1], ['DPS', AC.dps(A1), AC.dps(B1), 1], ['Bereik', A1.range, B1.range, 1], ['Snelheid', A1.speed, B1.speed, 1], ['Prijs (ijzer)', A1.cost, B1.cost, -1], ['HP per ijzer', +(A1.hp / A1.cost).toFixed(2), +(B1.hp / B1.cost).toFixed(2), 1], ['DPS per 100 ijzer', +(AC.dps(A1) / A1.cost * 100).toFixed(2), +(AC.dps(B1) / B1.cost * 100).toFixed(2), 1], ['Speciaal', AC.specialText(A1.special), AC.specialText(B1.special)]].forEach(function (r) {
        g2.appendChild(h('span', { class: 'mut', text: r[0] }));
        var ba = r[3] && (r[3] > 0 ? r[1] > r[2] : r[1] < r[2]), bb = r[3] && (r[3] > 0 ? r[2] > r[1] : r[2] < r[1]);
        g2.appendChild(h('span', { class: ba ? 'better' : '', text: r[1] })); g2.appendChild(h('span', { class: bb ? 'better' : '', text: r[2] }));
      });
      cb.appendChild(g2);
    }
    ct.appendChild(cb);
    el.appendChild(ct);
  };
  function buyUnit(age, slot) {
    var u = AC.UNITS[age][slot];
    UI.modal('Unit kopen', '<p>Wil je <b>' + esc(u.name) + '</b> permanent ontgrendelen voor <span class="coin">' + u.coin + '</span>?</p>', [{ t: 'Annuleren', c: 'ghost' }, { t: 'Kopen', c: 'gold', f: function () {
      if (Pf.buyUnit(age, slot)) { AC.audio && AC.audio.play('coin'); UI.toast('🎉 <b>' + esc(u.name) + '</b> ontgrendeld!'); UI.show(UI.cur, { age: age }); }
      else { AC.audio && AC.audio.play('deny'); UI.toast('Niet genoeg coins'); }
    } }]);
  }
  function buyAge(age) {
    var ag = AC.AGES[age];
    if (age > 0 && !Pf.data.agesOwned[age - 1]) { UI.toast('Ontgrendel eerst ' + AC.AGES[age - 1].name); return; }
    UI.modal('Tijdperk ontgrendelen', '<p>Ontgrendel <b style="color:' + ag.colors.accent + '">' + ag.name + '</b> voor <span class="coin">' + ag.unlockCost + '</span>?</p><p class="mut">Daarna kun je tijdens matches naar dit tijdperk evolueren en zijn units kopen.</p>', [{ t: 'Annuleren', c: 'ghost' }, { t: 'Ontgrendelen', c: 'gold', f: function () {
      if (Pf.buyAge(age)) { AC.audio && AC.audio.play('evolve', age); UI.toast('⏳ ' + ag.name + ' ontgrendeld!'); UI.show(UI.cur, { age: age }); }
      else { AC.audio && AC.audio.play('deny'); UI.toast('Niet genoeg coins'); }
    } }]);
  }

  /* --------------------------- AGES --------------------------- */
  UI.build.ages = function (el) {
    var d = Pf.data; el.innerHTML = '';
    el.appendChild(h('div', { class: 'scr-bg' }));
    el.appendChild(topbar('Tijdperken'));
    var ct = h('div', { class: 'content' });
    ct.appendChild(h('p', { class: 'mut', style: 'margin:0 0 14px', html: 'Tijdens een match verzamel je XP om te evolueren naar het volgende tijdperk. Je kunt alleen evolueren naar tijdperken die je hebt ontgrendeld. Units die je in een tijdperk nog niet bezit, worden vervangen door je beste unit uit een eerder tijdperk.' }));
    var g = h('div', { class: 'agegrid' });
    AC.AGES.forEach(function (ag, i) {
      var own = d.agesOwned[i], n = d.owned[i].filter(Boolean).length;
      var url = AC.getBackground(i).toDataURL('image/jpeg', 0.5);
      var card = h('div', { class: 'agecard' + (own ? '' : ' locked') }, [
        h('div', { class: 'thumb', style: 'background-image:url(' + url + ')' }, [h('div', { class: 'num', text: i + 1 })]),
        h('div', { class: 'bd' }, [
          h('h3', { style: 'color:' + ag.colors.accent, text: ag.name }), h('div', { class: 'mut', text: ag.era }),
          h('div', { text: ag.desc }),
          h('div', { html: '✦ ' + ag.passive.text }), h('div', { html: '⚡ <b>' + ag.power.name + '</b> — ' + ag.power.desc }),
          h('div', { class: 'mut', html: 'XP nodig in match: <b style="color:#fff">' + fmt(AC.CONST.AGE_XP[i]) + '</b> · Units: <b style="color:#fff">' + n + '/4</b>' }),
          h('div', { style: 'flex:1' }),
          own ? h('button', { class: 'btn ghost sm', text: 'Bekijk units →', onclick: function () { UI.click(); UI.show('collection', { age: i }); } })
            : h('button', { class: 'btn gold sm', html: '🔓 Ontgrendel · ' + ag.unlockCost, onclick: function () { buyAge(i); } }),
        ]),
      ]);
      g.appendChild(card);
    });
    ct.appendChild(g); el.appendChild(ct);
  };

  /* --------------------------- UPGRADES --------------------------- */
  UI.build.upgrades = function (el) {
    var d = Pf.data; el.innerHTML = '';
    el.appendChild(h('div', { class: 'scr-bg' }));
    el.appendChild(topbar('Permanente upgrades'));
    var ct = h('div', { class: 'content' });
    ct.appendChild(h('p', { class: 'mut', style: 'margin:0 0 16px', html: 'Deze upgrades gelden in <b>Vs Bot</b>-matches. In PvP staan ze uit, zodat iedere match eerlijk is.' }));
    var list = h('div', { class: 'list' });
    var icons = { startIron: '💰', baseHp: '🏰', unitHp: '❤', unitDmg: '⚔', xp: '📜', coins: '🍀' };
    AC.PERMA.forEach(function (p) {
      var lvl = d.perma[p.key] || 0, max = lvl >= p.max;
      var pips = h('div', { class: 'pips' }); for (var i = 0; i < p.max; i++) pips.appendChild(h('i', { class: i < lvl ? 'on' : '' }));
      list.appendChild(h('div', { class: 'panel lrow' }, [
        h('div', { class: 'ic', text: icons[p.key] }),
        h('div', { class: 'tx' }, [h('b', { text: p.name }), h('div', { class: 'mut', style: 'font-size:14px', text: p.desc + ' · nu: ' + (p.per < 1 ? '+' + Math.round(lvl * p.per * 100) + '%' : '+' + lvl * p.per) }), pips]),
        max ? h('span', { class: 'tag', style: 'color:var(--good)', text: 'MAX' }) : h('button', { class: 'btn gold', html: 'Upgrade · ' + p.cost[lvl], onclick: function () {
          if (Pf.buyPerma(p.key)) { AC.audio && AC.audio.play('upgrade'); UI.show('upgrades'); } else { AC.audio && AC.audio.play('deny'); UI.toast('Niet genoeg coins'); }
        } }),
      ]));
    });
    ct.appendChild(list); el.appendChild(ct);
  };

  /* --------------------------- SHOP --------------------------- */
  UI.build.shop = function (el) {
    var d = Pf.data; el.innerHTML = '';
    el.appendChild(h('div', { class: 'scr-bg' }));
    el.appendChild(topbar('Shop'));
    var ct = h('div', { class: 'content' });
    ct.appendChild(h('h2', { style: 'font-size:22px;margin-bottom:12px', text: 'Kisten & boosts' }));
    var top = h('div', { class: 'shopgrid', style: 'margin-bottom:26px' });
    top.appendChild(h('div', { class: 'sitem' }, [h('div', { class: 'sw', style: 'font-size:48px;background:rgba(255,207,74,.12)', text: '📦' }), h('b', { text: 'Oorlogskist' }), h('div', { class: 'mut', style: 'font-size:13px', text: 'Coins, boost of een zeldzame cosmetic' }),
      h('button', { class: 'btn gold sm', html: 'Kopen · 400', onclick: function () { if (Pf.spend(400)) { d.crates++; Pf.save(); UI.openCrate(); } else UI.toast('Niet genoeg coins'); } })]));
    top.appendChild(h('div', { class: 'sitem' }, [h('div', { class: 'sw', style: 'font-size:48px;background:rgba(255,120,60,.12)', text: '🔥' }), h('b', { text: 'Coin-boost' }), h('div', { class: 'mut', style: 'font-size:13px', text: '×1.5 coins voor 3 matches' }),
      h('button', { class: 'btn gold sm', html: 'Kopen · 350', onclick: function () { if (Pf.spend(350)) { d.boost += 3; Pf.save(); AC.audio && AC.audio.play('coin'); UI.toast('🔥 Boost actief voor ' + d.boost + ' matches'); UI.show('shop'); } else UI.toast('Niet genoeg coins'); } })]));
    top.appendChild(h('div', { class: 'sitem' }, [h('div', { class: 'sw', style: 'font-size:48px;background:rgba(74,168,255,.12)', text: '📦' }), h('b', { text: 'Jouw kisten: ' + d.crates }), h('div', { class: 'mut', style: 'font-size:13px', text: 'Verdien kisten via levels en het seizoen' }),
      h('button', { class: 'btn sm' + (d.crates ? ' blue' : ' dis'), text: 'Open kist', onclick: function () { if (d.crates) UI.openCrate(); } })]));
    ct.appendChild(top);
    [['color', 'Legerkleuren'], ['banner', 'Banier-emblemen'], ['glow', 'Unit-aura\'s']].forEach(function (grp) {
      ct.appendChild(h('h2', { style: 'font-size:22px;margin:6px 0 12px', text: grp[1] }));
      var g = h('div', { class: 'shopgrid', style: 'margin-bottom:22px' });
      AC.COSMETICS.filter(function (c) { return c.type === grp[0]; }).forEach(function (c) {
        var own = d.cosmetics.indexOf(c.id) >= 0, eq = d.equip[c.type] === c.id;
        var sw = h('div', { class: 'sw' });
        if (c.type === 'color') sw.style.background = c.color;
        else if (c.type === 'banner') { var cv = h('canvas', { width: 76, height: 76 }); var cc = cv.getContext('2d'); cc.fillStyle = Pf.color(); cc.fillRect(8, 8, 60, 60); AC.drawEmblem(cc, c.emblem, 38, 38, 3.2, '#fff'); sw.appendChild(cv); }
        else { sw.style.background = 'radial-gradient(circle, ' + c.glow + ' 0%, transparent 70%)'; sw.textContent = '✦'; sw.style.fontSize = '34px'; }
        g.appendChild(h('div', { class: 'sitem' + (eq ? ' eq' : '') }, [sw, h('b', { text: c.name }), h('span', { class: 'tag', style: 'color:' + AC.RARITY_COL[c.rarity], text: c.rarity.toUpperCase() }),
          own ? h('button', { class: 'btn sm ' + (eq ? 'green' : 'ghost'), text: eq ? (c.type === 'color' ? '✓ Uitgerust' : '✓ Uitgerust (klik = uit)') : 'Uitrusten', onclick: function () { UI.click(); Pf.equip(c.id); UI.show('shop'); } })
            : h('button', { class: 'btn gold sm', html: 'Kopen · ' + c.cost, onclick: function () { if (Pf.buyCosmetic(c.id)) { AC.audio && AC.audio.play('coin'); Pf.equip(c.id); UI.show('shop'); } else { AC.audio && AC.audio.play('deny'); UI.toast('Niet genoeg coins'); } } }),
        ]));
      });
      ct.appendChild(g);
    });
    el.appendChild(ct);
  };

  /* --------------------------- SEIZOEN --------------------------- */
  UI.build.season = function (el) {
    var d = Pf.data; el.innerHTML = '';
    el.appendChild(h('div', { class: 'scr-bg' }));
    el.appendChild(topbar(AC.SEASON.name));
    var ct = h('div', { class: 'content' });
    ct.appendChild(h('p', { class: 'mut', html: 'Iedere match levert seizoens-XP op (ook bij verlies). Jouw seizoens-XP: <b style="color:#fff">' + d.season.xp + '</b>. Claim je beloningen hieronder.' }));
    var s = h('div', { class: 'season' });
    AC.SEASON.tiers.forEach(function (t) {
      var reached = d.season.xp >= t.xp, claimed = d.season.claimed.indexOf(t.tier) >= 0, r = t.reward, ic, lab;
      if (r.type === 'coins') { ic = '💰'; lab = '<span class="coin">' + r.n + '</span>'; }
      else if (r.type === 'crate') { ic = '📦'; lab = 'Kist'; }
      else { var c = AC.COSMETICS.filter(function (x) { return x.id === r.id; })[0]; ic = '✨'; lab = '<b style="color:' + AC.RARITY_COL[c.rarity] + '">' + c.name + '</b>'; }
      s.appendChild(h('div', { class: 'tier' + (reached && !claimed ? ' ready' : '') + (claimed ? ' done' : '') }, [
        h('b', { text: 'Tier ' + t.tier }), h('div', { class: 'rw', text: ic }), h('div', { html: lab }), h('div', { class: 'mut', style: 'font-size:11px', text: t.xp + ' XP' }),
        claimed ? h('span', { class: 'tag', text: '✓' }) : reached ? h('button', { class: 'btn gold sm', text: 'Claim', onclick: function () { Pf.claimTier(t.tier); AC.audio && AC.audio.play('coin'); UI.show('season'); } }) : h('span', { class: 'tag', text: '🔒' }),
      ]));
    });
    ct.appendChild(s); el.appendChild(ct);
  };

  /* --------------------------- LEADERBOARD --------------------------- */
  UI.build.leader = function (el) {
    var d = Pf.data; el.innerHTML = '';
    el.appendChild(h('div', { class: 'scr-bg' }));
    el.appendChild(topbar('Leaderboard'));
    var ct = h('div', { class: 'content' });
    var box = h('div', { class: 'panel', style: 'max-width:900px;padding:18px' }, [h('div', { class: 'mut', text: 'Laden…' })]);
    ct.appendChild(box); el.appendChild(ct);
    function render(rows, online) {
      box.innerHTML = '';
      box.appendChild(h('h3', { style: 'font-size:20px;margin-bottom:10px', text: online ? '🌐 Spelers van deze game' : '🏠 Lokale ranglijst (jij vs. AI-rivalen)' }));
      var t = h('table', { class: 'lb' }); t.appendChild(h('tr', {}, [h('th', { text: '#' }), h('th', { text: 'Speler' }), h('th', { text: 'Rank' }), h('th', { text: 'Rating' }), h('th', { text: 'Wins' }), h('th', { text: 'Level' })]));
      rows.forEach(function (r, i) { var rk = Pf.rank(r.rating); t.appendChild(h('tr', { class: r.me ? 'me' : '' }, [h('td', { text: i + 1 }), h('td', { text: r.name + (r.ai ? ' (AI)' : '') }), h('td', { html: '<b style="color:' + rk.col + '">' + rk.name + '</b>' }), h('td', { text: r.rating }), h('td', { text: r.wins }), h('td', { text: r.level })])); });
      box.appendChild(t);
      if (!online) box.appendChild(h('p', { class: 'mut', style: 'font-size:13px', text: 'De online ranglijst verschijnt wanneer je voortgang in je account wordt opgeslagen. AI-rivalen zijn fictieve bots.' }));
    }
    var local = AC.BOT_NAMES.map(function (n, i) { return { name: n, rating: 820 + i * 95, wins: 10 + i * 23, level: 3 + i * 4, ai: true }; });
    local.push({ name: d.name, rating: d.rating, wins: d.wins, level: d.level, me: true });
    local.sort(function (a, b) { return b.rating - a.rating; });
    Pf.publishScore();
    Pf.fetchBoard().then(function (rows) {
      if (UI.cur !== 'leader') return;
      if (rows && rows.length) render(rows, true); else render(local, false);
    });
  };

  /* --------------------------- SETTINGS --------------------------- */
  UI.build.settings = function (el) {
    var d = Pf.data, S = d.settings; el.innerHTML = '';
    el.appendChild(h('div', { class: 'scr-bg' }));
    el.appendChild(topbar('Instellingen'));
    var ct = h('div', { class: 'content' });
    var f = h('div', { class: 'panel form' });
    var name = h('input', { type: 'text', maxlength: 16, value: d.name });
    name.addEventListener('change', function () { var n = (name.value || '').replace(/[^\w \-.À-ÿ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); if (n.length < 2) n = 'Commandant'; Pf.setName(n); name.value = n; UI.toast('Naam opgeslagen'); });
    function range(key, cb) { var r = h('input', { type: 'range', min: 0, max: 100, value: Math.round(S[key] * 100) }); r.addEventListener('input', function () { S[key] = r.value / 100; cb && cb(); Pf.save(); }); return r; }
    function apply() { var a = AC.audio; a.vol = S.vol; a.musVol = S.mus; a.muted = S.muted; a.apply(); }
    function toggle(key, lab, cb) { var b = h('button', { class: 'btn sm ' + (S[key] ? 'green' : 'ghost'), text: S[key] ? 'Aan' : 'Uit' }); b.onclick = function () { S[key] = !S[key]; Pf.save(); cb && cb(); UI.show('settings'); }; return b; }
    [['Spelersnaam', name], ['Geluidseffecten', range('vol', apply)], ['Muziek', range('mus', apply)], ['Alles dempen', toggle('muted', '', apply)], ['Schadegetallen', toggle('dmgNums')]].forEach(function (r) { f.appendChild(h('b', { text: r[0] })); f.appendChild(r[1]); });
    f.appendChild(h('b', { text: 'Besturing' }));
    f.appendChild(h('div', { class: 'keys', html: '<kbd>1</kbd>–<kbd>4</kbd><span>Unit plaatsen (slot 1–4)</span><kbd>Q</kbd><span>Tijdperk-power</span><kbd>E</kbd><span>Evolueren</span><kbd>U</kbd><span>Upgrade-menu</span><kbd>T</kbd><span>Towers</span><kbd>Esc</kbd><span>Pauze / sluiten</span><kbd>F</kbd><span>Snelheid 1× / 2× / 3× / 5× (online: stemmen)</span><kbd>7</kbd>–<kbd>0</kbd><span>Speler 2 units (lokaal)</span><kbd>P</kbd>/<kbd>O</kbd><span>Speler 2 power / evolueren</span>' }));
    f.appendChild(h('b', { text: 'Opslag' }));
    f.appendChild(h('div', { class: 'mut', text: Pf.cloud === 'cloud' ? 'Je voortgang wordt opgeslagen in je account en lokaal in deze browser.' : 'Je voortgang wordt lokaal in deze browser opgeslagen.' }));
    f.appendChild(h('b', { text: 'Voortgang wissen' }));
    f.appendChild(h('div', {}, [h('button', { class: 'btn red sm', text: 'Alles resetten', onclick: function () { UI.modal('Weet je het zeker?', '<p>Al je coins, units, tijdperken en cosmetics worden gewist.</p>', [{ t: 'Annuleren', c: 'ghost' }, { t: 'Wissen', c: 'red', f: function () { Pf.reset(); UI.show('menu'); } }]); } })]));
    ct.appendChild(f); el.appendChild(ct);
  };

  /* --------------------------- ONLINE LOBBY --------------------------- */
  UI.build.online = function (el) {
    var d = Pf.data; el.innerHTML = '';
    el.appendChild(h('div', { class: 'scr-bg' }));
    el.appendChild(topbar('Online PvP', 'mode'));
    var ct = h('div', { class: 'content', style: 'display:flex;justify-content:center' });
    var box = h('div', { class: 'panel', style: 'width:820px;padding:28px;text-align:center;margin-top:20px;align-self:flex-start' }, [h('div', { class: 'searching' }), h('p', { text: 'Verbinden met de lobby…' })]);
    ct.appendChild(box); el.appendChild(ct);
    var unsub = null;
    AC.Net.init().then(function (mode) {
      if (UI.cur !== 'online') return;
      if (mode === 'none' || mode === 'offline') { box.innerHTML = '<h2>Online niet beschikbaar</h2><p class="mut">' + (mode === 'offline' ? 'Kan geen verbinding maken met de online lobby. Controleer je internet en probeer het opnieuw.' : 'Deze browser ondersteunt geen realtime verbinding.') + '</p>'; AC.Net.ready = null; return; }
      var info = function () { return { name: d.name, rating: d.rating, color: Pf.color(), emblem: Pf.banner(), glow: Pf.glow(), loadout: AC.NetMatch.encodeLoadout(Pf.loadout()), maxAge: Pf.maxAge() }; };
      var searching = false, code = null;
      function idle() {
        box.innerHTML = '';
        box.appendChild(h('div', { style: 'font-size:56px', text: '🌐' }));
        box.appendChild(h('h2', { style: 'font-size:30px', text: 'Ranked 1v1' }));
        var cnt = h('p', { class: 'mut', text: '' }); box.appendChild(cnt);
        box.appendChild(h('p', { class: 'mut', style: 'font-size:14px', html: mode === 'room' || mode === 'site'
          ? 'Je speelt tegen anderen die deze game nu open hebben. Stuur de link naar een vriend en speel samen met een privé-code.'
          : '<b style="color:#ffb02a">Testmodus:</b> de online lobby is hier niet bereikbaar. Je kunt de multiplayer testen door deze game in <b>twee tabbladen</b> te openen en in beide te zoeken.' }));
        var row = h('div', { style: 'display:flex;gap:12px;justify-content:center;margin-top:18px;flex-wrap:wrap' });
        row.appendChild(h('button', { class: 'btn gold', style: 'font-size:20px;padding:16px 26px', text: '⚔ SNEL ZOEKEN', onclick: function () { UI.click(); code = null; search(); } }));
        row.appendChild(h('button', { class: 'btn blue', style: 'font-size:18px', text: '🔑 Privé-match maken', onclick: function () { UI.click(); code = Math.random().toString(36).slice(2, 7).toUpperCase(); search(); } }));
        var inp = h('input', { type: 'text', maxlength: 5, placeholder: 'CODE', style: 'width:110px;padding:12px;border-radius:10px;border:1px solid var(--line);background:rgba(0,0,0,.35);color:#fff;font-size:18px;font-weight:800;text-align:center;text-transform:uppercase' });
        row.appendChild(inp);
        var joinBtn = h('button', { class: 'btn', text: 'Deelnemen', onclick: function () { var v = (inp.value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (v.length < 3) { UI.toast('Vul een code in'); return; } UI.click(); code = v; search(); } });
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') joinBtn.click(); });
        row.appendChild(joinBtn);
        box.appendChild(row);
        if (UI._lobbyUnsub) UI._lobbyUnsub();
        unsub = UI._lobbyUnsub = AC.Net.watchLobby(function (peers) {
          var s = peers.filter(function (p) { return !p.isMe && p.presence && p.presence.mm && p.presence.mm.st === 'seek' && !p.presence.mm.code; }).length;
          cnt.innerHTML = '<b style="color:#fff">' + peers.length + '</b> speler' + (peers.length === 1 ? '' : 's') + ' in de lobby' + (s ? ' · <b style="color:var(--good)">' + s + ' zoekt een match</b>' : '');
        });
      }
      function search() {
        searching = true; box.innerHTML = '';
        box.appendChild(h('div', { class: 'searching' }));
        box.appendChild(h('h2', { text: code ? 'Wachten op je vriend…' : 'Tegenstander zoeken…' }));
        if (code) box.appendChild(h('p', { html: 'Geef deze code aan je vriend: <span style="font-family:var(--f-title);font-size:34px;color:var(--gold);letter-spacing:4px">' + code + '</span>' }));
        var tm = h('p', { class: 'mut', text: '0:00' }); box.appendChild(tm);
        var t0 = Date.now(), iv = setInterval(function () { if (!searching) { clearInterval(iv); return; } var s = Math.floor((Date.now() - t0) / 1000); tm.textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }, 500);
        box.appendChild(h('button', { class: 'btn ghost', text: 'Annuleren', onclick: function () { searching = false; AC.Net.cancel(); clearInterval(iv); idle(); } }));
        AC.Net.seek(info(), function (match) {
          searching = false; clearInterval(iv);
          box.innerHTML = '<div class="searching"></div><h2>Tegenstander gevonden!</h2><p class="mut">Verbinden…</p>';
          var to = setTimeout(function () { if (!match.opp) { match.leave(); UI.toast('Verbinding mislukt — probeer opnieuw'); idle(); } }, 12000);
          match.whenReady(function (opp) {
            clearTimeout(to);
            var me = info(), rk1 = Pf.rank(me.rating), rk2 = Pf.rank(opp.rating);
            box.innerHTML = '';
            box.appendChild(h('div', { class: 'vs' }, [
              h('div', { class: 'pl', style: 'box-shadow:inset 0 0 0 2px ' + me.color }, [h('h3', { text: me.name }), h('div', { style: 'color:' + rk1.col, text: rk1.name + ' · ' + me.rating }), h('div', { class: 'mut', text: 'Max: ' + AC.AGES[me.maxAge].short })]),
              h('div', { class: 'big', text: 'VS' }),
              h('div', { class: 'pl', style: 'box-shadow:inset 0 0 0 2px ' + opp.color }, [h('h3', { text: opp.name }), h('div', { style: 'color:' + rk2.col, text: rk2.name + ' · ' + opp.rating }), h('div', { class: 'mut', text: 'Max: ' + AC.AGES[opp.maxAge].short })]),
            ]));
            var cd = h('h2', { style: 'font-size:40px', text: '3' }); box.appendChild(cd);
            var n = 3, ci = setInterval(function () { n--; if (n > 0) cd.textContent = n; else { clearInterval(ci); AC.Match.start({ mode: 'online', net: match, opp: opp }); } }, 1000);
          });
        }, code);
      }
      idle();
    });
  };
})();
