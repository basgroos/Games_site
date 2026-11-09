// =====================================================================
//  UI — lobby, menus, summons, collection, leaderboards, HUD
// =====================================================================
(function () {
  var UI = G.UI = {}, P = G.Profile, R = G.R, fmt = function (n) { return G.FX.fmt(n); };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function click() { G.Audio.init(); G.Audio.sfx('click'); }
  UI.$ = $;

  UI.toast = function (msg, col) {
    var t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg; if (col) t.style.borderColor = col;
    $('toasts').appendChild(t);
    while ($('toasts').children.length > 4) $('toasts').removeChild($('toasts').firstChild);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3200);
  };
  UI.banner = function (text, col, sub) {
    var b = $('banner'); b.innerHTML = '<div class="bt" style="color:' + (col || '#fff') + '">' + text + '</div>' + (sub ? '<div class="bs">' + sub + '</div>' : '');
  };
  UI.bossIntro = function (b, who) {
    var d = document.createElement('div'); d.className = 'bossintro';
    d.innerHTML = '<div class="bt2">⚠ BOSS INCOMING ⚠</div><div class="bn">' + esc(b.name) + '</div><div class="bt2">' + esc(b.title) + ' — ' + esc(b.abil) + '</div>' + (who ? '<div class="bt2" style="margin-top:8px;color:#ffd23f">→ ' + esc(who) + '</div>' : '');
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 3500);
    G.Audio.sfx('roar');
  };
  function rarBadge(rid) { var r = G.RAR[rid]; return '<span class="rr" style="color:' + r.color + '">' + r.name.toUpperCase() + '</span>'; }
  UI.rarBadge = rarBadge;
  var iconCache = {};
  UI.icon = function (it, size) {
    var k = it.id + '_' + size;
    if (!iconCache[k]) iconCache[k] = R.icon(it, size);
    var c = document.createElement('canvas'); c.width = iconCache[k].width; c.height = iconCache[k].height; c.style.width = c.style.height = size + 'px';
    c.getContext('2d').drawImage(iconCache[k], 0, 0); return c;
  };
  function starStr(n, max) { var s = ''; for (var i = 0; i < (max || 5); i++) s += i < n ? '★' : '☆'; return s; }

  // ---------------------------------------------------------------------
  //  LOBBY
  // ---------------------------------------------------------------------
  UI.showLobby = function () {
    var d = P.d, l = $('lobby');
    l.classList.remove('hidden'); $('hud').classList.add('hidden');
    l.innerHTML =
      '<header>' + (G.BUILD.home ? '<a class="home-link" href="' + esc(G.BUILD.home) + '">← Bas Games</a>' : '') + '<div class="logo">ZOMBIE DOOR<span>TYCOON</span></div><div class="grow"></div>' +
      '<div class="coinbox">🪙 <span class="coin" id="lcoins">' + fmt(d.coins) + '</span></div>' +
      '<button class="btn small" id="bSet">⚙️</button></header>' +
      '<main><section class="hero">' +
      '<div class="pcard"><canvas id="ava" width="80" height="90" style="width:80px;height:90px"></canvas><div><input id="pname" maxlength="16" value="' + esc(d.name) + '">' +
      '<div class="pstats"><div><b>' + d.stats.wins + '</b>wins</div><div><b>' + d.stats.games + '</b>potjes</div><div><b>' + d.stats.bestWave + '</b>beste wave</div><div><b>' + P.ownedCount() + '/' + G.ITEMS.length + '</b>items</div></div></div></div>' +
      '<button class="btn yellow playbtn" id="bPlay">▶ SPEEL (SOLO)</button>' +
      '<button class="btn blue playbtn" id="bOnline" style="font-size:24px;padding:12px">🌐 ONLINE SPELEN</button>' +
      '<div class="lostrip"><h4>JOUW LOADOUT (5) <button class="btn small" id="bEditLo">Bewerk</button></h4><div class="slots" id="loSlots"></div></div>' +
      '</section><section class="menugrid">' +
      '<button class="mcard" id="bSum"><div class="ic">🎰</div><b>Summon</b><small>Nieuwe towers verzamelen</small></button>' +
      '<button class="mcard" id="bCol"><div class="ic">📚</div><b>Collectie</b><small>' + P.ownedCount() + ' van ' + G.ITEMS.length + ' items</small></button>' +
      '<button class="mcard" id="bLb"><div class="ic">🏆</div><b>Leaderboard</b><small>Records van jou en bots</small></button>' +
      '<button class="mcard" id="bAch"><div class="ic">🎖️</div><b>Achievements</b><small>' + Object.keys(d.ach).length + '/' + G.ACHIEVEMENTS.length + ' behaald</small></button>' +
      '<button class="mcard" id="bMast"><div class="ic">🎖</div><b>Tower Mastery</b><small>Skins, kill-effecten & badges</small></button>' +
      '<button class="mcard" id="bMis"><div class="ic">📅</div><b>Daily Missions</b><small>' + P.missions().filter(function (m) { return m.prog >= m.goal && !m.claimed; }).length + ' klaar om te claimen</small>' + (P.missions().some(function (m) { return m.prog >= m.goal && !m.claimed; }) ? '<span class="badge">CLAIM</span>' : '') + '</button>' +
      '<button class="mcard" id="bHelp" style="grid-column:span 2"><div class="ic">❓</div><b>Hoe speel je?</b><small>Kamers claimen, bouwen, verdedigen, summonen</small>' + (d.seenHelp ? '' : '<span class="badge">NIEUW</span>') + '</button>' +
      '</section></main>' +
      '<footer>Solo: jij + 7 bots • Online: tot 8 spelers, lege plekken worden bots (Beginner, Balanced, Aggressive, Economy, Defensive)</footer>';
    var ac = $('ava').getContext('2d'); ac.clearRect(0, 0, 80, 90); R.drawAvatar(ac, 40, 82, '#ffd23f', '', 0, 1, false, d.hat);
    renderSlots($('loSlots'), 52);
    $('pname').onchange = function () { d.name = this.value.trim().slice(0, 16) || 'Speler'; P.save(); };
    $('pname').onkeydown = function (e) { e.stopPropagation(); };
    $('bPlay').onclick = function () { click(); UI.openPlay(); };
    $('bOnline').onclick = function () { click(); UI.openOnline(); };
    $('bEditLo').onclick = function () { click(); UI.openCollection(); };
    $('bSum').onclick = function () { click(); UI.openSummon(); };
    $('bCol').onclick = function () { click(); UI.openCollection(); };
    $('bLb').onclick = function () { click(); UI.openLeaderboard(); };
    $('bAch').onclick = function () { click(); UI.openAch(); };
    $('bHelp').onclick = function () { click(); UI.openHelp(); };
    $('bMast').onclick = function () { click(); UI.openMastery(); };
    $('bMis').onclick = function () { click(); UI.openMissions(); };
    $('bSet').onclick = function () { click(); UI.openSettings(); };
    UI.flushAch();
  };
  function renderSlots(el, size) {
    el.innerHTML = '';
    for (var i = 0; i < 5; i++) {
      var id = P.d.loadout[i], s = document.createElement('div'); s.className = 'slot';
      if (id) { var it = G.ITEM[id]; s.style.borderColor = G.RAR[it.rarity].color; s.appendChild(UI.icon(it, size)); var n = document.createElement('div'); n.className = 'nm'; n.textContent = it.name; s.appendChild(n); s.title = it.name; }
      else s.innerHTML = '<span style="color:#667;font-size:22px">+</span>';
      el.appendChild(s);
    }
  }
  UI.refreshCoins = function () { if ($('lcoins')) $('lcoins').textContent = fmt(P.d.coins); if ($('mcoins')) $('mcoins').textContent = fmt(P.d.coins); };

  UI._modal = function (a, b, c) { return modal(a, b, c); };
  function modal(title, body, cls) {
    var m = $('modal'); m.classList.remove('hidden');
    m.innerHTML = '<div class="mbox ' + (cls || '') + '"><div class="mhead"><h2>' + title + '</h2><div class="grow"></div><div class="coinbox" style="font-size:15px;padding:5px 11px">🪙 <span class="coin" id="mcoins">' + fmt(P.d.coins) + '</span></div><button class="x" id="mClose">✕</button></div><div class="mbody" id="mbody">' + body + '</div></div>';
    $('mClose').onclick = function () { click(); UI.closeModal(); };
    m.onclick = function (e) { if (e.target === m && !m.dataset.sticky) UI.closeModal(); };
    m.dataset.sticky = '';
    return $('mbody');
  }
  UI.closeModal = function () { $('modal').classList.add('hidden'); $('modal').innerHTML = ''; if (G.Game.state === 'lobby') UI.showLobby(); };

  // ---------------------------------------------------------------------
  //  PLAY SETUP
  // ---------------------------------------------------------------------
  UI.openPlay = function () {
    var sel = UI._map || 'city', dsel = UI._diff || 'easy';
    var b = modal('Kies map & difficulty', '<div class="maps" id="maps"></div><div class="diffs" id="diffs"></div>' +
      '<div class="modes" id="modes"></div>' +
      '<div style="display:flex;gap:12px;align-items:center;margin-top:16px;flex-wrap:wrap"><div class="tip" id="lotip" style="flex:1"></div><button class="btn green" id="bStart" style="font-size:20px;padding:12px 28px">START POTJE ▶</button></div>');
    var duo = !!UI._duo;
    function draw() {
      $('maps').innerHTML = ''; $('diffs').innerHTML = '';
      G.MAPS.forEach(function (m) {
        var c = document.createElement('div'); c.className = 'mapc' + (m.id === sel ? ' sel' : '');
        var cv = document.createElement('canvas'); cv.width = 400; cv.height = 200;
        var cx = cv.getContext('2d'); cx.drawImage(R.worldLayer(m), [300, 1500, 2700][G.MAPS.indexOf(m)], 150, 1200, 600, 0, 0, 400, 200);
        var g = cx.createLinearGradient(0, 120, 0, 200); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.7)'); cx.fillStyle = g; cx.fillRect(0, 0, 400, 200);
        c.appendChild(cv);
        var inn = document.createElement('div'); inn.className = 'in';
        inn.innerHTML = '<b style="color:' + m.accent + '">' + m.name + '</b><p>' + m.desc + '</p><p>Bosses: ' + m.bosses.map(function (id) { return G.BOSSES[id].name; }).join(', ') + '</p><p>Beloning x' + m.reward + ' • Zombies HP x' + m.hp + '</p>';
        c.appendChild(inn);
        c.onclick = function () { click(); sel = UI._map = m.id; draw(); };
        $('maps').appendChild(c);
      });
      G.DIFFS.forEach(function (df) {
        var c = document.createElement('div'); c.className = 'diffc' + (df.id === dsel ? ' sel' : ''); c.style.color = df.color;
        var best = P.d.best[sel + '_' + df.id] || 0, mm = G.MAP[sel].reward;
        var base = { easy: 10, medium: 30, hard: 80 }[df.id] * G.SUMMON.normal.cost * mm;
        var rew = df.id === 'endless' ? 'Beloning per wave' : '🪙 ' + Math.round(base) + '+ (≈' + Math.round(base / G.SUMMON.normal.cost) + ' summons)';
        c.innerHTML = '<b>' + df.name + '</b><small>' + (df.id === 'endless' ? '∞ waves' : df.waves + ' waves • boss iedere 5') + '</small><small style="color:#ffd23f">' + rew + '</small><small>Record: wave ' + best + '</small>';
        c.onclick = function () { click(); dsel = UI._diff = df.id; draw(); };
        $('diffs').appendChild(c);
      });
      $('modes').innerHTML = '<div class="modec' + (duo ? '' : ' sel') + '" data-d="0"><b>👤 Solo-kamer</b><small>Jij + 7 bots, ieder een eigen kamer</small></div><div class="modec' + (duo ? ' sel' : '') + '" data-d="1"><b>🤝 Duo-kamer</b><small>Deel je kamer en geld met een bot-maatje. Allebei je eigen 5 towers, je kunt elkaars towers upgraden.</small></div>';
      Array.prototype.forEach.call($('modes').children, function (c) { c.onclick = function () { click(); duo = UI._duo = c.dataset.d === '1'; draw(); }; });
      $('lotip').innerHTML = 'Loadout: ' + P.d.loadout.map(function (id) { var it = G.ITEM[id]; return '<span style="color:' + G.RAR[it.rarity].color + '">' + it.name + '</span>'; }).join(', ');
    }
    draw();
    $('bStart').onclick = function () {
      click();
      if (P.d.loadout.length !== 5) { UI.toast('Je loadout moet precies 5 items bevatten.', '#ff4d4d'); return; }
      $('modal').classList.add('hidden'); $('modal').innerHTML = '';
      G.Game.start(sel, dsel, duo);
    };
  };

  // ---------------------------------------------------------------------
  //  ONLINE LOBBY
  // ---------------------------------------------------------------------
  UI.openOnline = function () {
    var MP = G.MP;
    if (!G.Net.available()) {
      modal('🌐 Online spelen', '<p>Online spelen werkt op de <b>Bas Games-site</b>: <span class="coin">basgroos.github.io/Games_site</span>. Daar kun je een kamer maken, een code delen en met maximaal 8 spelers tegelijk spelen.</p><p class="tip">Hier kun je solo spelen met 7 bots.</p>', 'sm');
      return;
    }
    UI._online = true;
    modal('🌐 Online spelen', '<div id="onl"><p class="tip">Verbinden…</p></div>');
    $('modal').dataset.sticky = '1';
    $('mClose').onclick = function () { click(); if (!G.Game.match) G.MP.leave(); UI._online = false; G.MP.unwatchLobby(); UI.closeModal(); };
    UI._rooms = [];
    MP.watchLobby(function (list) { UI._rooms = list; if (!MP.role) UI.renderOnline(); }).then(function () { UI.renderOnline(); }, function (e) { var o = $('onl'); if (o) o.innerHTML = '<p style="color:#ff6b6b">Kon geen verbinding maken: ' + esc(e.message || e) + '</p>'; });
  };
  UI.renderOnline = function () {
    var o = $('onl'); if (!o || !UI._online || G.Game.state === 'match') return;
    var MP = G.MP, h;
    if (!MP.role) {
      h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" class="resg"><div>' +
        '<h3 style="margin:0 0 8px">Kamer maken</h3><p class="tip">Jij bent de host: jouw computer rekent het potje uit. Deel de code met je vrienden. Lege plekken worden bots.</p>' +
        '<button class="btn green" id="oHost" style="width:100%">➕ Maak een kamer</button>' +
        '<h3 style="margin:18px 0 8px">Meedoen met een code</h3><div style="display:flex;gap:8px"><input id="oCode" maxlength="5" placeholder="ABCDE" style="flex:1;background:rgba(0,0,0,.35);border:1px solid var(--line);border-radius:10px;color:#fff;font:700 20px Fredoka,sans-serif;padding:6px 10px;text-transform:uppercase;letter-spacing:3px"><button class="btn blue" id="oJoin">Meedoen</button></div></div>' +
        '<div><h3 style="margin:0 0 8px">Open kamers</h3><div id="oList"></div></div></div>';
      o.innerHTML = h;
      var l = $('oList');
      if (!UI._rooms.length) l.innerHTML = '<p class="tip">Nog geen open kamers. Maak er zelf een!</p>';
      UI._rooms.forEach(function (r) {
        var d = document.createElement('div'); d.className = 'ach'; d.style.marginBottom = '8px';
        d.innerHTML = '<div style="flex:1"><b>' + esc(r.host || 'Host') + '</b> <span class="tip">• ' + esc((G.MAP[r.map] || {}).name || r.map) + ' • ' + esc((G.DIFF[r.diff] || {}).name || r.diff) + '</span><small>' + r.n + '/8 spelers • code ' + esc(r.code) + '</small></div><button class="btn small blue">Meedoen</button>';
        d.querySelector('button').onclick = function () { click(); UI.joinOnline(r.code); };
        l.appendChild(d);
      });
      $('oHost').onclick = function () {
        click(); if (P.d.loadout.length !== 5) { UI.toast('Je loadout moet precies 5 items bevatten.', '#ff4d4d'); return; }
        o.innerHTML = '<p class="tip">Kamer maken…</p>';
        MP.host().then(function () { MP.setSettings(UI._map || 'city', UI._diff || 'easy'); UI.renderOnline(); }, function (e) { UI.toast('Mislukt: ' + (e.message || e), '#ff4d4d'); MP.leave(); UI.renderOnline(); });
      };
      $('oJoin').onclick = function () { click(); UI.joinOnline($('oCode').value); };
      $('oCode').onkeydown = function (e) { e.stopPropagation(); if (e.key === 'Enter') UI.joinOnline(this.value); };
      return;
    }
    var host = MP.role === 'host';
    h = '<div style="text-align:center;margin-bottom:12px"><div class="tip">KAMERCODE</div><div style="font-size:46px;font-weight:700;letter-spacing:8px;color:#ffd23f">' + esc(MP.code) + '</div><div class="tip">' + (host ? 'Deel deze code. Iedereen met de code kan meedoen (max 8).' : 'Wachten tot de host het potje start…') + '</div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" class="resg"><div><h3 style="margin:0 0 8px">Spelers (' + MP.roster.length + '/8)</h3><div id="oRoster"></div><p class="tip">' + (8 - MP.roster.length) + ' lege plek(ken) worden bots.</p></div><div id="oSet"></div></div>' +
      '<div style="display:flex;gap:10px;justify-content:center;margin-top:16px"><button class="btn red" id="oLeave">Kamer verlaten</button>' + (host ? '<button class="btn green" id="oStart" style="font-size:20px;padding:12px 28px">START POTJE ▶</button>' : '') + '</div>';
    o.innerHTML = h;
    var ro = $('oRoster');
    MP.roster.forEach(function (r, i) {
      var d = document.createElement('div'); d.className = 'prow'; d.style.cursor = 'default';
      d.innerHTML = '<span class="pd" style="background:' + G.PLAYER_COLORS[i] + '"></span><div class="pn"><b>' + esc(r.name) + (r.cid === G.Net.me ? ' (jij)' : '') + '</b><small>' + (r.host ? '👑 Host' : 'Speler') + '</small></div>' + (host && !r.host ? '<button class="btn small red">✕</button>' : '');
      var kb = d.querySelector('button'); if (kb) kb.onclick = function () { MP.kick(r.cid); };
      ro.appendChild(d);
    });
    var set = $('oSet');
    if (host) {
      set.innerHTML = '<h3 style="margin:0 0 8px">Map & difficulty</h3><div class="filters" id="oMaps"></div><div class="filters" id="oDiffs"></div><div class="filters" id="oMode"></div><p class="tip" id="oModeTip"></p>';
      G.MAPS.forEach(function (mp) { var c = document.createElement('span'); c.className = 'chip' + (MP.settings.map === mp.id ? ' on' : ''); c.textContent = mp.name; c.onclick = function () { UI._map = mp.id; MP.setSettings(mp.id, MP.settings.diff); UI.renderOnline(); }; $('oMaps').appendChild(c); });
      G.DIFFS.forEach(function (df) { var c = document.createElement('span'); c.className = 'chip' + (MP.settings.diff === df.id ? ' on' : ''); c.style.color = df.color; c.textContent = df.name; c.onclick = function () { UI._diff = df.id; MP.setSettings(MP.settings.map, df.id); UI.renderOnline(); }; $('oDiffs').appendChild(c); });
      [[false, '👤 Solo-kamers'], [true, '🤝 Duo-kamers']].forEach(function (o) { var c = document.createElement('span'); c.className = 'chip' + (!!MP.settings.duo === o[0] ? ' on' : ''); c.textContent = o[1]; c.onclick = function () { MP.setSettings(MP.settings.map, MP.settings.diff, o[0]); UI.renderOnline(); }; $('oMode').appendChild(c); });
      $('oModeTip').textContent = MP.settings.duo ? 'Duo: loop tijdens het claimen de kamer van een andere speler binnen om samen één kamer en één portemonnee te delen. Ieder gebruikt zijn eigen 5 towers en je kunt elkaars towers upgraden.' : 'Iedere speler krijgt een eigen kamer.';
      $('oStart').onclick = function () {
        click();
        var m = MP.startMatch(G.Game.botPlayers);
        G.Game.startOnline(m, 0, 'host');
      };
    } else set.innerHTML = '<h3 style="margin:0 0 8px">Instellingen</h3><div class="srow"><span>Map</span><b>' + esc((G.MAP[MP.settings.map] || {}).name || '…') + '</b></div><div class="srow"><span>Difficulty</span><b>' + esc((G.DIFF[MP.settings.diff] || {}).name || '…') + '</b></div><div class="srow"><span>Kamers</span><b>' + (MP.settings.duo ? '🤝 Duo' : '👤 Solo') + '</b></div>' + (MP.settings.duo ? '<p class="tip">Duo: loop bij het claimen de kamer van een andere speler in om samen te spelen.</p>' : '') + '<p class="tip">Jouw loadout: ' + P.d.loadout.map(function (id) { return esc(G.ITEM[id].name); }).join(', ') + '</p>';
    $('oLeave').onclick = function () { click(); MP.leave(); UI.renderOnline(); };
  };
  UI.joinOnline = function (code) {
    var MP = G.MP;
    code = String(code || '').toUpperCase().trim();
    if (!/^[A-Z0-9]{5}$/.test(code)) { UI.toast('Een kamercode heeft 5 tekens.', '#ff4d4d'); return; }
    $('onl').innerHTML = '<p class="tip">Verbinden met kamer ' + esc(code) + '…</p>';
    MP.join(code).then(function () {
      UI.renderOnline();
      setTimeout(function () { if (MP.role === 'client' && !MP.gotRoster && !MP.match) { UI.toast('Geen host gevonden voor code ' + code + '.', '#ff9f1c'); } }, 6000);
    }, function (e) { UI.toast('Mislukt: ' + (e.message || e), '#ff4d4d'); MP.leave(); UI.renderOnline(); });
  };

  // ---------------------------------------------------------------------
  //  SUMMON
  // ---------------------------------------------------------------------
  UI.openSummon = function () {
    var b = modal('🎰 Summon', '<div class="banners" id="bnrs"></div>' +
      '<p class="tip" style="margin-top:12px">Duplicaten geven je item een ster (max 5★, iedere ster +5% stats). Daarna worden extra duplicaten omgezet in munten (Common 10 … Secret 1500). Kansen worden niet beïnvloed door eerdere pulls. Premium heeft 3× luck op Epic en hoger, maar garandeert nooit Mythic of Secret.</p>' +
      '<h4 style="margin:12px 0 4px">Laatste pulls</h4><div class="pulls" id="pulls"></div>');
    function draw() {
      var h = '';
      ['normal', 'premium'].forEach(function (bid) {
        var bn = G.SUMMON[bid], odds = G.summonOdds(bid);
        h += '<div class="banner ' + bid + '"><h3>' + (bid === 'premium' ? '💎 ' : '🎲 ') + bn.name + '</h3><div class="sub">' + (bid === 'premium' ? '10× prijs • 3× luck' : 'Alle rarities mogelijk') + '</div><table class="odds">';
        G.RARITIES.slice().reverse().forEach(function (r) {
          h += '<tr><td><span class="rdot" style="background:' + r.color + '"></span>' + r.name + ' <span class="tip">(' + G.itemsByRarity(r.id).length + ' items)</span></td><td style="color:' + r.color + '">' + (+odds[r.id].toFixed(2)) + '%</td></tr>';
        });
        var tk = P.d.tickets[bid] || 0;
        h += '</table><div style="display:flex;gap:8px"><button class="btn ' + (bid === 'premium' ? 'purple' : 'blue') + '" data-b="' + bid + '" data-n="1" style="flex:1">x1 • 🪙' + fmt(bn.cost) + '</button><button class="btn ' + (bid === 'premium' ? 'purple' : 'blue') + '" data-b="' + bid + '" data-n="10" style="flex:1">x10 • 🪙' + fmt(bn.cost * 10) + '</button></div>' +
          (tk ? '<button class="btn green" data-b="' + bid + '" data-n="1" data-t="1" style="width:100%;margin-top:8px">🎟️ Gebruik ticket (' + tk + ' over)</button>' : '') + '</div>';
      });
      $('bnrs').innerHTML = h;
      Array.prototype.forEach.call($('bnrs').querySelectorAll('button[data-b]'), function (btn) {
        var cost = G.SUMMON[btn.dataset.b].cost * btn.dataset.n;
        if (P.d.coins < cost && !btn.dataset.t) btn.disabled = true;
        btn.onclick = function () {
          G.Audio.init();
          var r = P.summon(btn.dataset.b, +btn.dataset.n, !!btn.dataset.t);
          if (!r.ok) { UI.toast(r.msg, '#ff4d4d'); G.Audio.sfx('error'); return; }
          UI.refreshCoins(); UI.reveal(r.results, function () { draw(); });
        };
      });
      var pl = $('pulls'); pl.innerHTML = '';
      P.d.pulls.slice(0, 16).forEach(function (p) { var it = G.ITEM[p.id]; if (!it) return; var s = document.createElement('div'); s.className = 'slot'; s.style.width = '46px'; s.style.flex = 'none'; s.style.borderColor = G.RAR[it.rarity].color; s.title = it.name; s.appendChild(UI.icon(it, 40)); pl.appendChild(s); });
      if (!P.d.pulls.length) pl.innerHTML = '<span class="tip">Nog geen pulls.</span>';
    }
    draw();
  };
  UI.reveal = function (results, done) {
    var fx = $('summonFx'), best = results.reduce(function (a, r) { return G.RAR[r.item.rarity].index > G.RAR[a.item.rarity].index ? r : a; }, results[0]);
    var br = G.RAR[best.item.rarity], one = results.length === 1;
    fx.classList.remove('hidden');
    fx.style.setProperty('--rc', br.index >= 2 ? br.color : '#8fa8c8');
    fx.innerHTML = '<div class="rays"></div><div class="capsule"></div><div class="tip" style="position:relative">Klik om te openen</div>';
    G.Audio.sfx('summon');
    var stage = 0, timer;
    function open() {
      if (stage !== 0) return; stage = 1; clearTimeout(timer);
      G.Audio.sfx('reveal');
      fx.style.setProperty('--rc', br.color);
      var h = '<div class="rays"></div>';
      if (br.index >= 4) h += '<div class="bigrar ' + (br.id === 'secret' ? 'secretglow' : '') + '" style="color:' + br.color + ';position:relative">' + br.name.toUpperCase() + '!</div>';
      h += '<div class="rgrid ' + (one ? 'one' : '') + '" id="rgrid"></div><div style="position:relative;display:flex;gap:10px"><button class="btn" id="rSkip">Alles tonen</button><button class="btn yellow" id="rDone">Verder</button></div>';
      fx.innerHTML = h;
      results.forEach(function (r, i) {
        var it = r.item, rar = G.RAR[it.rarity], card = document.createElement('div'); card.className = 'rcard';
        card.style.setProperty('--rc', rar.color); card.style.setProperty('--rc2', rar.dark);
        var tag = r.isNew ? '<div class="tag" style="color:#7dff7d">NIEUW!</div>' : r.starUp ? '<div class="tag" style="color:#ffd23f">+1★ (' + r.starUp + '/5)</div>' : '<div class="tag">+🪙' + r.coins + '</div>';
        card.innerHTML = '<div class="rin"><div class="rf">?</div><div class="rb ' + (rar.id === 'secret' ? 'secretglow' : '') + '"><div class="rn">' + rar.name + '</div><div class="ic"></div><b>' + esc(it.name) + '</b>' + tag + '</div></div>';
        card.querySelector('.ic').appendChild(UI.icon(it, one ? 120 : 76));
        $('rgrid').appendChild(card);
        setTimeout(function () { card.classList.add('flip'); if (rar.index >= 3) G.Audio.sfx('upgrade'); }, 250 + i * (one ? 0 : 180));
      });
      $('rSkip').onclick = function () { Array.prototype.forEach.call(document.querySelectorAll('.rcard'), function (c) { c.classList.add('flip'); }); };
      $('rDone').onclick = function () { fx.classList.add('hidden'); fx.innerHTML = ''; if (P.newAch.length) { UI.flushAch(); UI.refreshCoins(); } done && done(); };
    }
    fx.onclick = function (e) { if (stage === 0) open(); };
    timer = setTimeout(open, br.index >= 3 ? 1800 : 1100);
  };

  // ---------------------------------------------------------------------
  //  COLLECTION + LOADOUT
  // ---------------------------------------------------------------------
  UI.itemStats = function (it, stars) {
    var m = 1 + 0.05 * (stars || 0), rows = [];
    rows.push(['Rarity', '<span style="color:' + G.RAR[it.rarity].color + '">' + G.RAR[it.rarity].name + '</span>']);
    rows.push(['Type', G.CATS[it.cat].icon + ' ' + G.CATS[it.cat].name + (it.place === 'path' ? ' (op pad)' : '')]);
    rows.push(['Damage', it.dmg ? fmt(it.dmg * m) + (it.kind === 'spread' ? ' × ' + it.pellets : '') + (it.kind === 'aura' ? '/s' : '') : '—']);
    rows.push(['Attack Speed', it.cd && it.dmg ? (it.cd >= 4 && !it.dmg ? '-' : (1 / it.cd).toFixed(2) + '/s') : it.cd ? 'iedere ' + it.cd + 's' : '—']);
    rows.push(['Range', it.global ? 'Hele kamer' : it.range ? it.range.toFixed(1) + ' vakjes' : '—']);
    rows.push(['Special Ability', it.ability || '—']);
    rows.push(['Inkomen', it.income ? '$' + fmt(it.income * m) + (it.kind === 'mine_farm' ? ' / 20s' : ' / 5s') + ' (' + (it.income * m / (it.every || 5)).toFixed(1) + '/s)' : '—']);
    rows.push(['Plaatsprijs', '$' + fmt(it.cost)]);
    rows.push(['Max per kamer', it.limit]);
    rows.push(['Upgrades', it.tracks.map(function (t) { return G.TRACKS[t].name; }).join(', ')]);
    rows.push(['Upgrade Level', '<span style="color:#ffd23f">' + starStr(stars || 0) + '</span>']);
    return rows;
  };
  UI.openCollection = function () {
    var st = UI._col || (UI._col = { rar: 'all', cat: 'all', own: false, fav: false, sel: P.d.loadout[0] || 'pistol' });
    var b = modal('📚 Collectie & Loadout', '<div class="lostrip" style="margin-bottom:12px"><h4>LOADOUT — klik een item om toe te voegen of te verwijderen (precies 5)</h4><div class="slots" id="cSlots" style="max-width:420px"></div></div>' +
      '<div class="colwrap"><div><div class="filters" id="fil"></div><div class="cgrid" id="cgrid"></div></div><div class="detail" id="det"></div></div>');
    function filt() {
      var h = '<span class="chip ' + (st.rar === 'all' ? 'on' : '') + '" data-r="all">Alle</span>';
      G.RARITIES.forEach(function (r) { h += '<span class="chip ' + (st.rar === r.id ? 'on' : '') + '" data-r="' + r.id + '" style="color:' + r.color + '">' + r.name + '</span>'; });
      h += '<span style="width:10px"></span><span class="chip ' + (st.cat === 'all' ? 'on' : '') + '" data-c="all">Alle types</span>';
      Object.keys(G.CATS).forEach(function (c) { h += '<span class="chip ' + (st.cat === c ? 'on' : '') + '" data-c="' + c + '">' + G.CATS[c].icon + ' ' + G.CATS[c].name + '</span>'; });
      h += '<span style="width:10px"></span><span class="chip ' + (st.own ? 'on' : '') + '" data-o="1">Alleen in bezit</span><span class="chip ' + (st.fav ? 'on' : '') + '" data-f="1">★ Favorieten</span>';
      $('fil').innerHTML = h;
      Array.prototype.forEach.call($('fil').children, function (ch) {
        ch.onclick = function () { click(); if (ch.dataset.r) st.rar = ch.dataset.r; if (ch.dataset.c) st.cat = ch.dataset.c; if (ch.dataset.o) st.own = !st.own; if (ch.dataset.f) st.fav = !st.fav; filt(); grid(); };
      });
    }
    function grid() {
      var g = $('cgrid'); g.innerHTML = '';
      G.ITEMS.forEach(function (it) {
        if (st.rar !== 'all' && it.rarity !== st.rar) return;
        if (st.cat !== 'all' && it.cat !== st.cat) return;
        var own = P.owns(it.id);
        if (st.own && !own) return;
        if (st.fav && P.d.fav.indexOf(it.id) < 0) return;
        var c = document.createElement('div'), rar = G.RAR[it.rarity];
        c.className = 'icard' + (own ? '' : ' locked') + (st.sel === it.id ? ' sel' : '');
        c.style.borderColor = rar.color;
        c.style.background = 'linear-gradient(170deg,' + rar.dark + '55, rgba(28,34,50,.95) 60%)';
        c.appendChild(UI.icon(it, 58));
        c.insertAdjacentHTML('beforeend', '<div class="nm">' + esc(it.name) + '</div><div class="st">' + (own ? starStr(P.stars(it.id)) : '🔒') + '</div>' +
          (P.d.loadout.indexOf(it.id) >= 0 ? '<div class="inl">IN</div>' : '') + (P.d.fav.indexOf(it.id) >= 0 ? '<div class="fv">⭐</div>' : ''));
        c.onclick = function () { click(); st.sel = it.id; grid(); detail(); };
        c.ondblclick = function () { var r = P.toggleLoadout(it.id); if (!r.ok) UI.toast(r.msg, '#ff4d4d'); slots(); grid(); detail(); };
        g.appendChild(c);
      });
      if (!g.children.length) g.innerHTML = '<p class="tip">Geen items met deze filters.</p>';
    }
    function slots() {
      var el = $('cSlots'); renderSlots(el, 50);
      Array.prototype.forEach.call(el.children, function (s, i) {
        s.style.cursor = 'pointer';
        s.onclick = function () { var id = P.d.loadout[i]; if (id) { click(); P.toggleLoadout(id); st.sel = id; slots(); grid(); detail(); } };
      });
    }
    function detail() {
      var it = G.ITEM[st.sel], own = P.owns(it.id), d = $('det'), inv = P.d.inv[it.id];
      d.innerHTML = '';
      var top = document.createElement('div'); top.style.textAlign = 'center'; top.appendChild(UI.icon(it, 110)); d.appendChild(top);
      d.insertAdjacentHTML('beforeend', '<h3>' + esc(it.name) + '</h3>' + rarBadge(it.rarity) + '<div class="desc">' + esc(it.desc) + '</div>');
      UI.itemStats(it, own ? inv.stars : 0).forEach(function (r) { d.insertAdjacentHTML('beforeend', '<div class="srow"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'); });
      d.insertAdjacentHTML('beforeend', '<div class="srow"><span>In bezit</span><b>' + (own ? inv.n + '×' : 'Nee — summon om te verdienen') + '</b></div>');
      var inLo = P.d.loadout.indexOf(it.id) >= 0;
      var bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:8px;margin-top:12px';
      bar.innerHTML = '<button class="btn ' + (inLo ? 'red' : 'green') + '" id="dLo" style="flex:1" ' + (own ? '' : 'disabled') + '>' + (inLo ? 'Uit loadout' : 'In loadout') + '</button><button class="btn" id="dFav">' + (P.d.fav.indexOf(it.id) >= 0 ? '★' : '☆') + '</button>';
      d.appendChild(bar);
      $('dLo').onclick = function () { click(); var r = P.toggleLoadout(it.id); if (!r.ok) UI.toast(r.msg, '#ff4d4d'); slots(); grid(); detail(); };
      $('dFav').onclick = function () { click(); P.toggleFav(it.id); grid(); detail(); };
    }
    filt(); grid(); slots(); detail();
  };

  // ---------------------------------------------------------------------
  //  LEADERBOARD / ACHIEVEMENTS / HELP / SETTINGS
  // ---------------------------------------------------------------------
  UI.openLeaderboard = function () {
    var tab = UI._lb || 'wave';
    var names = { wave: 'Highest Wave', bosses: 'Most Bosses Defeated', money: 'Most Money Earned', endless: 'Best Endless Run' };
    modal('🏆 Leaderboard', '<div class="tabs" id="lbt"></div><div id="lbb"></div><p class="tip">Lokaal leaderboard: bevat de beste resultaten van jou én van alle bots uit jouw potjes.</p>');
    function draw() {
      $('lbt').innerHTML = Object.keys(names).map(function (k) { return '<button class="btn small ' + (k === tab ? 'yellow' : '') + '" data-k="' + k + '">' + names[k] + '</button>'; }).join('');
      Array.prototype.forEach.call($('lbt').children, function (b) { b.onclick = function () { click(); tab = UI._lb = b.dataset.k; draw(); }; });
      var l = P.d.lb[tab] || [];
      var h = '<table class="tbl"><tr><th>#</th><th>Speler</th><th>Map</th><th>Difficulty</th><th style="text-align:right">' + names[tab] + '</th></tr>';
      l.forEach(function (e, i) { h += '<tr class="' + (e.you ? 'you' : '') + '"><td>' + (i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1) + '</td><td>' + esc(e.name) + (e.you ? ' (jij)' : '') + '</td><td>' + esc(e.map) + '</td><td>' + esc(e.diff) + '</td><td style="text-align:right;font-weight:700">' + (tab === 'money' ? '$' + fmt(e.v) : e.v) + '</td></tr>'; });
      if (!l.length) h += '<tr><td colspan="5" class="tip">Nog geen records — speel een potje!</td></tr>';
      $('lbb').innerHTML = h + '</table>';
    }
    draw();
  };
  UI.openAch = function () {
    var h = '<div class="achs">';
    G.ACHIEVEMENTS.forEach(function (a) { var done = !!P.d.ach[a.id]; h += '<div class="ach ' + (done ? 'done' : '') + '"><div class="ai">' + (done ? '🏅' : '🔒') + '</div><div><b>' + esc(a.name) + '</b><small>' + esc(a.desc) + '</small><small class="coin">🪙 ' + a.reward + (done ? ' ✓' : '') + '</small></div></div>'; });
    modal('🎖️ Achievements', h + '</div>');
  };
  UI.openHelp = function () {
    P.d.seenHelp = true; P.save();
    modal('❓ Hoe speel je?', '<div style="line-height:1.55;font-size:15px">' +
      '<p><b>1. Claim een kamer.</b> Iedereen start in het midden van een grote hal met 8 kamers. Loop met <b>WASD/pijltjes</b> of door te <b>klikken</b> via de deur een vrije kamer binnen. Elke kamer heeft 30 tegels en precies één deur.</p>' +
      '<p><b>2. Jij bent veilig, je deur niet.</b> Zombies vallen alleen deuren aan. Gaat jouw deur kapot, dan lig je eruit. Je kunt je kamer gewoon verlaten en bij andere spelers gaan kijken, maar bouwen en upgraden kan alleen <b>in je eigen kamer</b>. Je ziet ongeveer 1/5 van de map; de minimap toont alles.</p>' +
      '<p><b>3. Verdien geld en bouw.</b> Je Cash Register geeft elke 5 seconden geld. Kies een item uit je loadout (toetsen <b>1–5</b>) en klik op een tegel in je kamer. Traps en muren zet je op de vloer vlak vóór jouw deur. Klik op een tower voor upgrades, targeting en verkopen; klik op je <b>deur</b> om hem te upgraden.</p>' +
      '<p><b>4. Overleef de waves.</b> Zombies komen uit de grote poorten in de buitenmuur en lopen via de kortste weg naar de deur van hun doelkamer. Jouw towers schieten op álle zombies binnen bereik — ook als ze op weg zijn naar iemand anders (wie de kill maakt krijgt het geld). Met <b>Repair Door</b> herstel je je deur. Waves starten automatisch. Elke 5 waves komt er een <b>boss</b> naar de kamer van een willekeurige speler. Onzichtbare zombies zie je alleen met detectie (Scout, Sniper, Laser, Radar…). Vliegende zombies negeren traps.</p>' +
      '<p><b>5. Summon & verzamel.</b> Win potjes voor munten, summon nieuwe towers en stel een loadout van precies 5 items samen.</p>' +
      '<p><b>6. Sneller upgraden.</b> Selecteer een tower en druk op <b>E</b> (goedkoopste upgrade), <b>R</b> (verkopen), <b>T</b> (auto-upgrade) of <b>P</b> (prioriteit). <b>X</b> upgradet alles wat je kunt betalen, <b>C</b> al je farms, <b>F</b> de dichtstbijzijnde farm, <b>Q</b> je deur. <b>U</b> opent het upgrade-menu, <b>Spatie</b> de bouwmodus, <b>Tab</b> (vasthouden) het scorebord. Elke upgrade verandert het model van de tower; op hoge levels kun je towers <b>evolueren</b> (V).</p>' +
      '<p><b>7. Duo-kamer.</b> In een Duo-potje deel je één kamer en één portemonnee met een maatje. Jullie gebruiken allebei je eigen 5 towers en kunnen elkaars towers upgraden.</p>' +
      '<p class="tip">Sneltoetsen: WASD lopen • 1–5 item • E upgrade • R verkoop • Q deur • F farm • X alles • C farms • U menu • Spatie bouwmodus • Tab scores • H naar huis • G snelheid • Esc sluiten. Alles aan te passen in ⚙️ Instellingen.</p></div>', 'sm');
  };
  UI.openSettings = function () {
    var s = P.d.settings;
    modal('⚙️ Instellingen', '<div style="display:flex;flex-direction:column;gap:10px">' +
      '<button class="btn" id="sSfx">Geluidseffecten: ' + (s.sfx ? 'AAN' : 'UIT') + '</button><button class="btn" id="sMus">Muziek: ' + (s.music ? 'AAN' : 'UIT') + '</button>' +
      '<button class="btn red" id="sReset">Voortgang resetten</button><p class="tip">Je voortgang wordt in deze browser bewaard.</p></div>', 'sm');
    $('sSfx').onclick = function () { s.sfx = !s.sfx; G.Audio.setSfx(s.sfx); P.save(); UI.openSettings(); };
    $('sMus').onclick = function () { s.music = !s.music; G.Audio.setMusic(s.music); P.save(); UI.openSettings(); };
    $('sReset').onclick = function () {
      if (this.dataset.c) { P.reset(); UI.closeModal(); UI.toast('Voortgang gereset.'); return; }
      this.dataset.c = 1; this.textContent = 'Klik nogmaals om te bevestigen';
    };
  };

  // ---------------------------------------------------------------------
  //  HUD (in match)
  // ---------------------------------------------------------------------
  UI.buildHUD = function () {
    var g = G.Game, m = g.match, me = m.players[g.me];
    $('lobby').classList.add('hidden'); var h = $('hud'); h.classList.remove('hidden');
    h.innerHTML =
      '<div class="money" id="hMoney"><div class="cash" id="hCash">$0</div><div class="inc" id="hInc">+$0 / 5s</div><div class="ibar"><i id="hIbar"></i></div></div>' +
      '<div class="topbar" id="hTop"><span class="chip" style="color:' + m.map.accent + '">🗺 ' + m.map.name + '</span><span class="chip" style="color:' + m.diff.color + '">' + m.diff.name + '</span>' +
      '<div class="wavebox"><small>WAVE</small><b id="hWave">0</b></div><div class="timer" id="hTimer"></div><span class="chip" id="hAlive">👥 8/8</span></div>' +
      '<div class="ctrls"><button class="btn" id="hPl">👥</button><button class="btn" id="hSkip" title="Stem om de volgende wave nu te starten">⏭ Skip</button><button class="btn" id="hSpeed">1x</button><button class="btn" id="hMute">' + (P.d.settings.sfx ? '🔊' : '🔇') + '</button><button class="btn" id="hMenu">☰</button></div>' +
      '<div class="plist" id="hPlist"><h5>SPELERS</h5><div id="hRows"></div></div>' +
      '<div class="bossbar hidden" id="hBoss"><b id="hBossN"></b><div class="bb"><i id="hBossHp"></i></div></div>' +
      '<button class="repair hidden" id="hRepair">🔧 Repair Door</button>' +
      '<div class="lbar" id="hLbar"></div>' +
      '<div class="tpanel hidden" id="hPanel"></div>' +
      '<div class="mini" id="hMiniBox"><canvas id="hMini"></canvas><div class="loc" id="hLoc"></div></div>' +
      '<div class="claim hidden" id="hClaim"></div>' +
      '<div class="hint hidden" id="hHint"></div>';
    var lb = $('hLbar');
    me.loadout.forEach(function (id, i) {
      var it = G.ITEM[id], c = document.createElement('div'); c.className = 'lcard'; c.dataset.id = id;
      c.style.borderColor = G.RAR[it.rarity].color;
      c.appendChild(UI.icon(it, 46));
      c.insertAdjacentHTML('beforeend', '<div class="nm">' + esc(it.name) + '</div><div class="pr">$' + fmt(it.cost) + '</div><div class="ct"></div><div class="hk">' + (i + 1) + '</div>');
      c.onclick = function () { click(); g.selectItem(id); };
      c.title = it.name + ' — ' + it.desc;
      lb.appendChild(c);
    });
    $('hSpeed').onclick = function () { click(); g.cycleSpeed(); };
    $('hPl').onclick = function () { click(); $('hPlist').classList.toggle('open'); };
    $('hRepair').onclick = function () { var r = g.net.send({ type: 'repair' }); if (!r.ok) UI.toast(r.msg, '#ff9f1c'); else G.Audio.sfx('upgrade'); };
    $('hSkip').onclick = function () { click(); var r = g.net.send({ type: 'vote' }); if (!r.ok) UI.toast(r.msg || 'Skippen kan pas als jouw wave volledig gespawned is.', '#ff9f1c'); };
    $('hMute').onclick = function () { var s = P.d.settings; s.sfx = !s.sfx; s.music = s.sfx; G.Audio.setSfx(s.sfx); G.Audio.setMusic(s.music); P.save(); this.textContent = s.sfx ? '🔊' : '🔇'; };
    $('hMenu').onclick = function () { click(); UI.pauseMenu(); };
    UI._rowT = 0; UI._panelT = 0; UI._miniT = 0;
    var mc = $('hMini'), mw = window.innerWidth > 900 ? 220 : 140, mh = Math.round(mw * G.WROWS / G.WCOLS), dpr = Math.min(2, window.devicePixelRatio || 1);
    mc.width = mw * dpr; mc.height = mh * dpr; mc.style.width = mw + 'px'; mc.style.height = mh + 'px'; mc.dataset.w = mw;
    mc.onpointerdown = function (e) {
      var r = mc.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * G.WCOLS * G.T, y = (e.clientY - r.top) / r.height * G.WROWS * G.T;
      if (g.net.send({ type: 'move', x: x, y: y }).ok) { g.ui.marker = { x: x, y: y, t: 1 }; click(); }
    };
  };
  UI.pauseMenu = function () {
    var g = G.Game; g.paused = g.mode === 'solo';
    if (g.mode !== 'solo') {
      modal('☰ Menu', '<div style="display:flex;flex-direction:column;gap:10px"><p>Online potje — kamercode <b>' + esc(G.MP.code || '') + '</b>. Het spel loopt door.</p><button class="btn green" id="pRes">Verder spelen</button><button class="btn" id="pHelp">Hoe speel je?</button><button class="btn red" id="pLeave">Potje verlaten</button>' + (g.mode === 'host' ? '<p class="tip">Jij bent de host: als jij weggaat, stopt het potje voor iedereen.</p>' : '<p class="tip">Ga je weg, dan neemt een bot jouw kamer over.</p>') + '</div>', 'sm');
      $('modal').dataset.sticky = '1';
      $('mClose').onclick = $('pRes').onclick = function () { click(); $('modal').classList.add('hidden'); };
      $('pHelp').onclick = function () { UI.openHelp(); };
      $('pLeave').onclick = function () { click(); $('modal').classList.add('hidden'); g.finish(true); };
      return;
    }
    var b = modal('⏸ Pauze', '<div style="display:flex;flex-direction:column;gap:10px"><button class="btn green" id="pRes">Verder spelen</button><button class="btn" id="pHelp">Hoe speel je?</button><button class="btn red" id="pLeave">Potje verlaten</button><p class="tip">In een echt online potje loopt het spel door; in deze lokale simulatie pauzeert alles.</p></div>', 'sm');
    $('modal').dataset.sticky = '1';
    $('mClose').onclick = $('pRes').onclick = function () { click(); g.paused = false; $('modal').classList.add('hidden'); };
    $('pHelp').onclick = function () { UI.openHelp(); $('modal').dataset.sticky = '1'; $('mClose').onclick = function () { g.paused = false; $('modal').classList.add('hidden'); }; };
    $('pLeave').onclick = function () { click(); $('modal').classList.add('hidden'); g.paused = false; g.finish(true); };
  };

  UI.updateHUD = function (dt, camView) {
    var g = G.Game, m = g.match, me = m.players[g.me], room = m.roomOf(me);
    var here = m.roomAt(Math.floor(me.pos.x / G.T), Math.floor(me.pos.y / G.T));
    $('hCash').textContent = '$' + fmt(me.cash);
    if (g.mode === 'client') { var spd = (m.netSpeed || 1) + 'x'; if ($('hSpeed').textContent !== spd) $('hSpeed').textContent = spd; }
    if (room) {
      $('hInc').textContent = '+$' + fmt(m.incomePer5(room)) + ' / 5s';
      $('hIbar').style.width = (100 * (1 - room.incomeT / G.INCOME_INTERVAL)) + '%';
    }
    var tot = m.totalWaves();
    $('hWave').textContent = m.wave + (tot === Infinity ? '' : '/' + tot);
    var tm = m.phase === 'claim' ? 'Claim ' + Math.ceil(m.claimTimer) + 's' : m.phase === 'prep' ? 'Start ' + Math.ceil(m.prepTimer) + 's' : m.wave >= tot ? 'LAATSTE' : '⏱ ' + Math.ceil(m.waveTimer) + 's';
    $('hTimer').textContent = tm;
    var alive = m.alivePlayers().length;
    $('hAlive').textContent = '👥 ' + alive + '/8';
    var votes = m.alivePlayers().filter(function (p) { return p.vote; }).length;
    var sk = $('hSkip'); sk.textContent = '⏭ ' + (me.vote ? 'Gestemd ' : 'Skip ') + votes + '/' + alive; sk.className = 'btn' + (me.vote ? ' green' : m.canVote(me) ? ' blue' : '');
    // loadout cards
    Array.prototype.forEach.call($('hLbar').children, function (c) {
      var it = G.ITEM[c.dataset.id], n = room ? m.countPlaced(room, it.id) : 0;
      c.classList.toggle('sel', g.ui.placing === it.id);
      c.classList.toggle('poor', me.cash < it.cost);
      c.classList.toggle('full', n >= it.limit);
      c.querySelector('.ct').textContent = n + '/' + it.limit;
    });
    // boss bar: your own room first, otherwise a boss you can see
    var bossRooms = (room ? [room] : []).concat(m.rooms.filter(function (r) { return G.FX.vis[r.index] && r !== room; }));
    var boss = null; bossRooms.some(function (r) { boss = r.zombies.filter(function (z) { return z.isBoss && !z.dead && !z.child; })[0]; return !!boss; });
    $('hBoss').classList.toggle('hidden', !boss);
    if (boss) { $('hBossN').textContent = '👑 ' + boss.name + ' — ' + fmt(boss.hp) + ' / ' + fmt(boss.maxHp); $('hBossHp').style.width = (100 * boss.hp / boss.maxHp) + '%'; }
    // repair door button
    var rb = $('hRepair');
    if (room && me.alive && m.phase !== 'claim' && (room.door.hp < room.door.max - 1 || room.door.repairUntil > room.time || room.door.repairReady > room.time)) {
      rb.classList.remove('hidden');
      var dr = room.door, txt, st = '';
      if (dr.repairUntil > room.time) { txt = 'Repairing' + '...'.slice(0, 1 + Math.floor(R.time * 3) % 3); st = 'busy'; }
      else if (dr.repairReady > room.time) { txt = Math.ceil(dr.repairReady - room.time) + 's'; st = 'cd'; }
      else txt = '🔧 Repair Door' + (m.canBuild(me) ? '' : ' (ga naar je kamer)');
      if (rb.textContent !== txt) rb.textContent = txt;
      rb.className = 'repair ' + st;
    } else rb.classList.add('hidden');
    // location + minimap
    var loc = here ? (here === room ? '🏠 Jouw kamer' + (me.alive ? ' — hier kun je bouwen' : '') : here.owner >= 0 ? '👁 Kamer van ' + esc(m.players[here.owner].name) : '🚪 ' + here.def.name + ' (vrij)') : room && m.canBuild(me) ? '🏠 Bij je deur' : '🗺 Onderweg' + (room && me.alive ? ' — druk R om terug te lopen' : '');
    if (!me.alive) loc = '👻 Uitgeschakeld — je kunt nog rondlopen en kijken';
    if ($('hLoc').innerHTML !== loc) $('hLoc').innerHTML = loc;
    UI._miniT -= dt;
    if (UI._miniT <= 0 && camView) { UI._miniT = 0.1; var mc = $('hMini'); R.drawMinimap(mc.getContext('2d'), m, +mc.dataset.w, Math.round(+mc.dataset.w * G.WROWS / G.WCOLS), camView, me); }
    // claim
    var cl = $('hClaim');
    if (m.phase === 'claim') {
      cl.classList.remove('hidden'); $('hLbar').classList.add('hidden');
      cl.innerHTML = '<b>Claim een kamer!</b><div class="tip">Loop met WASD of door te klikken een vrije kamer binnen via de deur. Nog ' + Math.ceil(m.claimTimer) + 's — daarna krijg je automatisch een kamer.</div>' + UI.nearRoomInfo();
    } else { cl.classList.add('hidden'); $('hLbar').classList.remove('hidden'); }
    // hint
    var hint = $('hHint');
    if (m.phase === 'prep' && room && m.canBuild(me)) { hint.classList.remove('hidden'); hint.innerHTML = 'Kies een item onderin (1–5) en klik op een <b style="color:#7dff9a">groen vakje</b>. Klik op een tower of je deur om te upgraden. Eerste wave over ' + Math.ceil(m.prepTimer) + 's.'; }
    else if (m.phase === 'prep' && room) { hint.classList.remove('hidden'); hint.innerHTML = 'Loop naar <b>jouw kamer</b> (' + room.def.name + ') om te bouwen — druk op <b>R</b> of klik op de minimap.'; }
    else if (g.ui.placing && !m.canBuild(me)) { hint.classList.remove('hidden'); hint.innerHTML = 'Je bent niet in je kamer. Druk op <b>R</b> om terug te lopen en te bouwen.'; }
    else if (g.ui.placing) { hint.classList.remove('hidden'); var pi = G.ITEM[g.ui.placing]; hint.innerHTML = 'Plaats <b>' + esc(pi.name) + '</b> ' + (pi.place === 'path' ? 'op de <b>gele tegels vóór jouw deur</b>' : 'op een <b>tegel in je kamer</b>') + ' • Esc/rechtsklik om te annuleren'; }
    else hint.classList.add('hidden');
    // player list (throttled)
    UI._rowT -= dt;
    if (UI._rowT <= 0) { UI._rowT = 0.25; UI.renderRows(); }
    UI._panelT -= dt;
    if (UI._panelT <= 0) { UI._panelT = 0.2; UI.renderPanel(); }
  };
  UI.nearRoomInfo = function () {
    var g = G.Game, m = g.match, me = m.players[g.me], best = null, bd = 1e9;
    m.rooms.forEach(function (r) { if (r.owner >= 0) return; var dd = Math.hypot(r.def.doorPx.x - me.pos.x, r.def.doorPx.y - me.pos.y); if (dd < bd) { bd = dd; best = r; } });
    if (!best) return '';
    return '<div style="margin-top:6px;font-size:13px">Dichtstbijzijnde vrije kamer: <b style="color:#fff">' + best.def.name + '</b> (' + Math.round(bd / G.T) + ' tegels)</div>';
  };
  UI.renderRows = function () {
    var g = G.Game, m = g.match, rows = $('hRows'); if (!rows) return;
    var h = '';
    m.players.forEach(function (p) {
      var r = m.roomOf(p), hp = r ? r.door.hp / r.door.max : 1;
      var st = p.id === g.me ? 'Jij' : p.isBot ? (p.left ? '🤖 Bot (speler weg)' : 'Bot • ' + (G.BOT_STYLES[p.style] ? G.BOT_STYLES[p.style].name : 'Bot')) : '🌐 Speler';
      var status = !p.alive ? '💀 w' + p.stats.waveReached : p.finished ? '🏁' : 'w' + m.wave;
      var bossHere = r && r.zombies.some(function (z) { return z.isBoss && !z.dead; });
      var hereR = m.roomAt(Math.floor(m.players[g.me].pos.x / G.T), Math.floor(m.players[g.me].pos.y / G.T));
      h += '<div class="prow ' + (p.alive ? '' : 'dead ') + (r && hereR === r ? 'view' : '') + '" title="Klik om naar deze kamer te lopen" data-r="' + (r ? r.index : -1) + '"><span class="pd" style="background:' + p.color + '"></span><div class="pn"><b>' + (bossHere ? '👑 ' : '') + esc(p.name) + '</b><small>' + st + (r ? ' • ' + r.def.name : '') + '</small><div class="hpb"><i style="width:' + Math.max(0, hp * 100) + '%;background:' + (hp > 0.5 ? '#4cd964' : hp > 0.25 ? '#ffcc00' : '#ff4d4d') + '"></i></div></div><div class="pw">' + status + '<br>$' + fmt(p.cash) + '</div></div>';
    });
    rows.innerHTML = h;
    Array.prototype.forEach.call(rows.children, function (el) { el.onclick = function () { var ri = +el.dataset.r; if (ri >= 0) { g.goRoom(ri); } }; });
  };

  UI.renderPanel = function () {
    var g = G.Game, m = g.match, me = m.players[g.me], room = m.roomOf(me), pan = $('hPanel');
    if (!room || (!g.ui.selTower && !g.ui.selDoor) || !me.alive) { pan.classList.add('hidden'); return; }
    pan.classList.remove('hidden');
    var key, h, near = m.canBuild(me), far = near ? '' : '<p class="tip" style="color:#ff9f1c">Je bent niet in je kamer — loop terug (R) om te upgraden.</p>';
    if (g.ui.selDoor) {
      var d = room.door, tier = G.doorTier(d.lvl), cost = G.doorUpgradeCost(d.lvl), next = G.doorTier(d.lvl + 1);
      key = 'door' + d.lvl + '|' + (me.cash >= cost) + '|' + Math.round(d.hp) + '|' + Math.round(d.shield) + '|' + near;
      if (pan.dataset.k === key) return; pan.dataset.k = key;
      h = '<div style="display:flex;align-items:center;gap:8px"><div style="width:38px;height:46px;border-radius:5px;background:' + tier.color + ';border:3px solid ' + tier.trim + '"></div><div><h3>' + tier.name + '</h3><span class="tip">Deur level ' + d.lvl + '</span></div><div class="grow"></div><button class="x" id="pX">✕</button></div>' +
        '<div class="srow" style="margin-top:8px"><span>HP</span><b>' + fmt(d.hp) + ' / ' + fmt(d.max) + '</b></div><div class="hpb" style="height:8px"><i style="width:' + (100 * d.hp / d.max) + '%;background:#4cd964"></i></div>' +
        '<div class="srow"><span>Verdediging</span><b>-' + Math.round(G.doorArmor(d.lvl) * 100) + '% damage</b></div>' +
        (d.shield > 0 && d.shieldUntil > room.time ? '<div class="srow"><span>Schild</span><b style="color:#8cf">' + fmt(d.shield) + '</b></div>' : '') +
        '<div class="srow"><span>Volgende level</span><b>' + fmt(G.doorMaxHp(d.lvl + 1)) + ' HP • -' + Math.round(G.doorArmor(d.lvl + 1) * 100) + '%</b></div>' +
        (next !== tier ? '<div class="srow"><span>Nieuw uiterlijk</span><b style="color:' + next.trim + '">' + next.name + '</b></div>' : '') +
        far + '<button class="btn yellow" id="pDoor" style="width:100%;margin-top:10px" ' + (me.cash >= cost && near ? '' : 'disabled') + '>⬆ Upgrade deur — $' + fmt(cost) + '</button><p class="tip">Upgraden heelt ook de extra HP + 10%. Prijs stijgt exponentieel; er is geen maximum.</p>';
      pan.innerHTML = h;
      $('pDoor').onclick = function () { var r = g.net.send({ type: 'door' }); if (!r.ok) UI.toast(r.msg, '#ff4d4d'); pan.dataset.k = ''; UI.renderPanel(); };
      $('pX').onclick = function () { g.ui.selDoor = false; pan.dataset.k = ''; UI.renderPanel(); };
      return;
    }
    var t = room.towers.filter(function (q) { return q.id === g.ui.selTower; })[0];
    if (!t) { g.ui.selTower = null; pan.classList.add('hidden'); return; }
    var it = t.item, st = m.stats(t, room), lvl = m.towerLevel(t);
    key = 't' + near + t.id + '|' + JSON.stringify(t.lvl) + '|' + Math.floor(me.cash / 50) + '|' + t.target + '|' + t.kills + '|' + Math.round(t.earned) + '|' + (t.data.souls || 0);
    if (pan.dataset.k === key) return; pan.dataset.k = key;
    pan.innerHTML = '';
    var head = document.createElement('div'); head.style.cssText = 'display:flex;align-items:center;gap:8px';
    head.appendChild(UI.icon(it, 46));
    head.insertAdjacentHTML('beforeend', '<div style="flex:1"><h3>' + esc(it.name) + '</h3>' + rarBadge(it.rarity) + ' <span class="tip">• Lv ' + lvl + (P.stars(it.id) && !me.isBot ? ' • ' + P.stars(it.id) + '★' : '') + '</span></div><button class="x" id="pX">✕</button>');
    pan.appendChild(head);
    var rows = '';
    if (it.dmg) rows += '<div class="srow"><span>Damage</span><b>' + fmt(st.dmg) + '</b></div>';
    if (it.cd && it.dmg && it.kind !== 'blackhole' && it.kind !== 'meteor') rows += '<div class="srow"><span>Attack Speed</span><b>' + (1 / st.cd).toFixed(2) + '/s</b></div>';
    if (it.cd && (it.kind === 'blackhole' || it.kind === 'meteor' || it.kind === 'timeslow' || it.kind === 'shield' || it.kind === 'goldengod')) rows += '<div class="srow"><span>Cooldown</span><b>' + (it.kind === 'meteor' ? st.cd : it.cd / (1 + G.TRACKS.spd.per * t.lvl.spd)).toFixed(1) + 's</b></div>';
    if (it.range && !it.global) rows += '<div class="srow"><span>Range</span><b>' + (st.range / G.T).toFixed(1) + '</b></div>';
    if (it.isFarm) rows += '<div class="srow"><span>Inkomen</span><b>$' + fmt(st.income * t.buff.farm) + (it.kind === 'mine_farm' ? ' / 20s' : ' / 5s') + '</b></div><div class="srow"><span>Totaal verdiend</span><b>$' + fmt(t.earned) + '</b></div>';
    else if (it.dmg) rows += '<div class="srow"><span>Kills / damage</span><b>' + t.kills + ' / ' + fmt(t.dmgDealt) + '</b></div>';
    if (it.kind === 'soul') rows += '<div class="srow"><span>Zielen</span><b>' + t.data.souls + '</b></div>';
    if (it.kind === 'wall') rows += '<div class="srow"><span>HP</span><b>' + fmt(Math.max(0, t.hp)) + ' / ' + fmt(t.maxHp) + '</b></div>';
    if (t.buff.dmg > 1 || t.buff.spd > 1 || t.buff.detect || t.buff.farm > 1) rows += '<div class="srow"><span>Buffs</span><b style="color:#7dff9a">' + [t.buff.dmg > 1 ? '+' + Math.round((t.buff.dmg - 1) * 100) + '% dmg' : '', t.buff.spd > 1 ? '+' + Math.round((t.buff.spd - 1) * 100) + '% spd' : '', t.buff.detect ? 'detectie' : '', t.buff.farm > 1 ? '+' + Math.round((t.buff.farm - 1) * 100) + '% inkomen' : ''].filter(Boolean).join(', ') + '</b></div>';
    rows += '<div class="srow"><span>Special</span><b>' + esc(it.ability) + '</b></div>';
    pan.insertAdjacentHTML('beforeend', rows + far);
    it.tracks.forEach(function (tr) {
      var L = t.lvl[tr], max = L >= G.MAX_TRACK_LEVEL, cost = max ? 0 : m.upgradeCost(t, tr), pips = '';
      for (var i = 0; i < G.MAX_TRACK_LEVEL; i++) pips += '<i class="' + (i < L ? 'on' : '') + '"></i>';
      var eff = tr === 'dmg' ? '+22% damage' : tr === 'spd' ? '+10% snelheid' : tr === 'rng' ? '+8% range' : tr === 'inc' ? '+28% inkomen' : '+15% ' + (it.kind === 'spread' ? '(+1 pellet)' : it.kind === 'chain' ? '(+1 sprong)' : it.kind === 'poison' ? '(+1 stack)' : it.kind === 'drones' ? '(drones)' : 'effect');
      var row = document.createElement('div'); row.className = 'upg';
      row.innerHTML = '<div class="ul"><b>' + G.TRACKS[tr].name + '</b> <span class="tip">Lv ' + L + '</span><small>' + eff + '</small><div class="pips">' + pips + '</div></div><button class="btn small ' + (max ? '' : 'yellow') + '" ' + (max || me.cash < cost || !near ? 'disabled' : '') + '>' + (max ? 'MAX' : '$' + fmt(cost)) + '</button>';
      row.querySelector('button').onclick = function () { var r = g.net.send({ type: 'upgrade', tower: t.id, track: tr }); if (!r.ok) UI.toast(r.msg, '#ff4d4d'); pan.dataset.k = ''; UI.renderPanel(); };
      pan.appendChild(row);
    });
    if (it.dmg && it.place !== 'path' && ['bullet', 'hitscan', 'frost', 'poison', 'chain', 'splash', 'beam', 'plasma', 'soul', 'lastdef', 'spread', 'creator', 'reality'].indexOf(it.kind) >= 0) {
      var tg = document.createElement('div'); tg.className = 'tgt';
      [['first', 'Eerste'], ['last', 'Laatste'], ['strongest', 'Sterkste'], ['closest', 'Dichtst']].forEach(function (o) {
        var b = document.createElement('button'); b.textContent = o[1]; b.className = t.target === o[0] ? 'on' : '';
        b.onclick = function () { g.net.send({ type: 'target', tower: t.id, mode: o[0] }); pan.dataset.k = ''; UI.renderPanel(); };
        tg.appendChild(b);
      });
      pan.appendChild(tg);
    }
    var sell = document.createElement('button'); sell.className = 'btn red small'; sell.style.cssText = 'width:100%;margin-top:10px';
    sell.textContent = 'Verkoop voor $' + fmt(m.sellValue(t)); sell.disabled = !near;
    sell.onclick = function () { var r = g.net.send({ type: 'sell', tower: t.id }); if (r.ok) { g.ui.selTower = null; } pan.dataset.k = ''; UI.renderPanel(); };
    pan.appendChild(sell);
    $('pX').onclick = function () { g.ui.selTower = null; pan.dataset.k = ''; UI.renderPanel(); };
  };

  // ---------------------------------------------------------------------
  //  RESULTS
  // ---------------------------------------------------------------------
  UI.results = function (match, pid, rew) {
    var p = match.players[pid], d = match.diff;
    var title = d.id === 'endless' ? 'ENDLESS RUN' : rew.win ? 'VICTORY!' : 'DEFEAT';
    var col = rew.win ? '#4cd964' : d.id === 'endless' ? '#bf5af2' : '#ff4d4d';
    var sorted = match.players.slice().sort(function (a, b) { return G.Profile.rank(match, a.id) - G.Profile.rank(match, b.id); });
    var h = '<div class="res-title" style="color:' + col + ';text-shadow:0 0 30px ' + col + '">' + title + '</div>' +
      '<p style="text-align:center;margin:0 0 14px" class="tip">' + match.map.name + ' • ' + d.name + ' • Plaats #' + rew.rank + ' van 8</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" class="resg"><div><h4 style="margin:0 0 6px">Jouw potje</h4>' +
      '<div class="srow"><span>Wave gehaald</span><b>' + p.stats.waveReached + '</b></div>' +
      '<div class="srow"><span>Zombies verslagen</span><b>' + p.stats.kills + '</b></div>' +
      '<div class="srow"><span>Bosses verslagen</span><b>' + p.stats.bosses + '</b></div>' +
      '<div class="srow"><span>Geld verdiend</span><b>$' + fmt(p.stats.moneyEarned) + '</b></div>' +
      '<div class="srow"><span>Deurdamage ontvangen</span><b>' + fmt(p.stats.doorDamage) + '</b></div>' +
      '<h4 style="margin:14px 0 6px">Beloningen</h4><div class="rewards">' + rew.lines.map(function (l) { return '<div class="srow"><span>' + esc(l.label) + '</span><b class="coin">+🪙' + fmt(l.coins) + '</b></div>'; }).join('') +
      '<div class="srow" style="font-size:18px"><span>Totaal</span><b class="coin">+🪙' + fmt(rew.total) + '</b></div></div>' +
      '<p class="tip">≈ ' + Math.floor(rew.total / 100) + ' Normal Summons</p></div>' +
      '<div><h4 style="margin:0 0 6px">Lobby</h4><table class="tbl"><tr><th>#</th><th>Speler</th><th>Wave</th><th>Bosses</th><th>$</th></tr>' +
      sorted.map(function (q, i) { return '<tr class="' + (q.id === pid ? 'you' : '') + '"><td>' + (i + 1) + '</td><td><span class="rdot" style="background:' + q.color + '"></span>' + esc(q.name) + (q.isBot ? ' <span class="tip">' + G.BOT_STYLES[q.style].name + '</span>' : '') + '</td><td>' + (q.finished && q.alive ? '🏁 ' : q.alive ? '' : '💀 ') + q.stats.waveReached + '</td><td>' + q.stats.bosses + '</td><td>' + fmt(q.stats.moneyEarned) + '</td></tr>'; }).join('') + '</table></div></div>' +
      (G.Game.mode === 'host' && match.players.some(function (q) { return !q.isBot && q.id !== pid && q.alive && !q.finished; }) ? '<p class="tip" style="text-align:center;color:#ff9f1c">Je bent de host: anderen spelen nog. Als je naar de lobby gaat, stopt het potje voor iedereen.</p>' : '') +
      '<div style="display:flex;gap:10px;justify-content:center;margin-top:16px"><button class="btn" id="rLobby">Naar lobby</button><button class="btn blue" id="rSum">Summon</button><button class="btn green" id="rAgain">Opnieuw spelen</button></div>';
    modal('Resultaten', h);
    $('modal').dataset.sticky = '1';
    $('mClose').onclick = $('rLobby').onclick = function () { click(); G.Game.toLobby(); };
    $('rSum').onclick = function () { click(); G.Game.toLobby(); UI.openSummon(); };
    $('rAgain').onclick = function () { click(); $('modal').classList.add('hidden'); if (G.Game.mode !== 'solo') { G.Game.toLobby(); UI.openOnline(); } else G.Game.start(match.map.id, match.diff.id); };
    if (G.Game.mode !== 'solo') $('rAgain').textContent = 'Online lobby';
    G.Audio.sfx(rew.win ? 'win' : 'lose');
    if (P.newAch.length) { P.newAch.forEach(function (a) { UI.toast('🎖️ Achievement: <b>' + esc(a.name) + '</b> +🪙' + a.reward, '#ffd23f'); }); P.newAch = []; }
  };
  UI.defeatPrompt = function () {
    var g = G.Game;
    modal('💀 Je deur is gevallen', '<p>Je bent uitgeschakeld in wave <b>' + g.match.players[g.me].stats.waveReached + '</b>. Je kunt als geest blijven rondlopen en de andere kamers bekijken, of direct je beloning ophalen.</p><div style="display:flex;gap:10px"><button class="btn blue" id="dSpec" style="flex:1">👻 Rondkijken</button><button class="btn yellow" id="dRes" style="flex:1">Resultaten</button></div>', 'sm');
    $('modal').dataset.sticky = '1';
    $('mClose').onclick = $('dSpec').onclick = function () { click(); $('modal').classList.add('hidden'); g.spectating = true; UI.toast('Klik op een speler in de lijst om naar zijn kamer te lopen.'); };
    $('dRes').onclick = function () { click(); g.finish(); };
  };
})();
