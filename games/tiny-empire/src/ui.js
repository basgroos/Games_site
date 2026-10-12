/* =====================================================================
   USER INTERFACE — top bar, construction tray, side panel, advisor,
   tooltips, toasts, event banner and all dialogs.
   ===================================================================== */
(function (TE) {
  'use strict';
  const G = () => TE.Game;
  const $ = (id) => document.getElementById(id);
  const fmt = (v) => TE.fmtMoney(v);
  const rate = (v) => {
    const a = Math.abs(v), s = v < 0 ? '-' : '';
    if (a >= 1e4) return s + fmt(a) + '/s';
    return s + '$' + (a >= 100 ? a.toFixed(0) : a >= 10 ? a.toFixed(1) : a.toFixed(2)) + '/s';
  };
  const pct = (v) => (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const statusClass = (v) => ({ good: 'good-bg', ok: 'ok-bg', bad: 'bad-bg', off: 'off-bg' }[TE.Citizens.needStatus(v)]);

  const UI = {
    tool: 'select', buildType: null, overlay: null, speed: 1, paused: false,
    hover: null, hoverChunk: null, moveUid: null, tab: 'homes',
    shownMoney: 0, previewCache: null, hotCache: null, sideSig: '', advSig: '', tipIdx: 0,
    advisorOpen: true, sideCollapsed: false, iconCache: {},

    S() { return TE.S; },

    init() {
      UI.shownMoney = TE.S.money;
      const build = window.HW_BUILD;
      if (build && build.home != null) { // running on the Bas Games site
        const brand = document.querySelector('.brand');
        const a = document.createElement('a'); a.href = build.home; a.className = 'home-link'; a.textContent = '← Bas Games'; a.title = 'Back to Bas Games';
        brand.insertBefore(a, brand.firstChild);
        if (build.env === 'staging') { const tag = document.createElement('span'); tag.className = 'env-tag'; tag.textContent = 'STAGING'; tag.title = (build.commit || '').slice(0, 7) + ' · own save'; brand.appendChild(tag); }
      }
      UI.buildTabs();
      UI.bindTopbar();
      UI.bindTools();
      UI.measure();
      window.addEventListener('resize', UI.measure);
      UI.sideCollapsed = window.innerWidth < 760;
      UI.advisorOpen = window.innerWidth >= 760;
      setInterval(() => { UI.tipIdx = (UI.tipIdx + 1) % TE.TIPS.length; }, 20000);
    },
    measure() {
      const r = document.documentElement.style;
      r.setProperty('--top-h', $('topbar').offsetHeight + 'px');
      r.setProperty('--bottom-h', $('bottombar').offsetHeight + 'px');
      TE.Render.resize();
    },

    /* ---------- Construction tray ---------- */
    icon(type, size) {
      const key = type + ':' + (size || 56);
      if (!UI.iconCache[key]) UI.iconCache[key] = TE.Render.iconCanvas(type, size || 56);
      const src = UI.iconCache[key], cv = document.createElement('canvas');
      cv.width = src.width; cv.height = src.height; cv.getContext('2d').drawImage(src, 0, 0);
      return cv;
    },
    buildTabs() {
      const tabs = $('tabs'); tabs.innerHTML = '';
      TE.MENU.forEach((m) => {
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.tab = m.id; b.setAttribute('role', 'tab');
        b.textContent = m.icon + ' ' + m.name;
        if (m.id === UI.tab) b.classList.add('on');
        b.onclick = () => { UI.tab = m.id; tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); UI.buildCards(); TE.Audio.play('click'); };
        tabs.appendChild(b);
      });
      UI.buildCards();
    },
    buildCards() {
      const wrap = $('cards'); wrap.innerHTML = '';
      const menu = TE.MENU.find((m) => m.id === UI.tab);
      UI.cardEls = {};
      menu.items.forEach((type, i) => {
        const def = TE.BUILDINGS[type];
        const c = document.createElement('button');
        c.type = 'button'; c.className = 'card'; c.dataset.type = type;
        c.appendChild(UI.icon(type));
        c.insertAdjacentHTML('beforeend', `<span class="nm">${esc(def.name)}</span><span class="pr"></span><span class="key">${i + 1}</span>`);
        c.onclick = () => UI.selectBuild(type);
        c.onmouseenter = (e) => UI.cardTip(type, e);
        c.onmousemove = (e) => UI.cardTip(type, e);
        c.onmouseleave = () => UI.hideTip();
        wrap.appendChild(c);
        UI.cardEls[type] = c;
      });
      UI.updateCards(true);
    },
    updateCards() {
      const S = UI.S();
      for (const type in UI.cardEls) {
        const c = UI.cardEls[type], def = TE.BUILDINGS[type];
        const st = G().unlockStatus(S, type);
        const cost = G().costOf(S, type);
        const unique = !!(def.unique && G().count(S, type) > 0);
        c.classList.toggle('locked', !st.ok || unique);
        c.classList.toggle('poor', st.ok && S.money < cost);
        c.classList.toggle('on', UI.tool === 'build' && UI.buildType === type);
        const pr = c.querySelector('.pr');
        const txt = unique ? 'Built' : st.ok ? fmt(cost) : '🔒';
        if (pr.textContent !== txt) pr.textContent = txt;
        const hasSpark = st.ok && UI.comboTypes && UI.comboTypes[type];
        let sp = c.querySelector('.spark');
        if (hasSpark && !sp) { sp = document.createElement('span'); sp.className = 'spark'; sp.textContent = '✨'; sp.title = 'Can complete a new combination somewhere!'; c.appendChild(sp); }
        if (!hasSpark && sp) sp.remove();
      }
    },
    /* Which building types could complete an undiscovered combo right now (sparkle on cards). */
    scanComboTypes() {
      const S = UI.S(), out = {};
      Object.keys(TE.BUILDINGS).forEach((type) => {
        if (!G().isUnlocked(S, type) || ['road'].indexOf(type) >= 0) return;
        const relevant = TE.COMBOS.filter((c) => !S.discovered[c.id] && (c.distinctTag ? G().matches(type, 'tag:' + c.distinctTag.tag) : Object.keys(c.needs).some((k) => G().matches(type, k)))).map((c) => c.id);
        if (!relevant.length) return;
        const n = S.size;
        for (let y = 0; y < n && !out[type]; y++) for (let x = 0; x < n; x++) {
          const t = S.tiles[y * n + x];
          if (t.b || t.f || !G().isOwned(S, x, y)) continue;
          if (TE.Combos.wouldComplete(S, type, x, y, relevant).length) { out[type] = true; break; }
        }
      });
      UI.comboTypes = out;
    },
    selectBuild(type) {
      const S = UI.S();
      const st = G().unlockStatus(S, type);
      if (!st.ok) { UI.toast(`🔒 ${TE.BUILDINGS[type].name} unlocks with: ${st.missing.join(', ')}`, 'bad'); TE.Audio.play('error'); return; }
      if (TE.BUILDINGS[type].unique && G().count(S, type) > 0) { UI.toast('Only one can be built.', 'bad'); return; }
      if (UI.tool === 'build' && UI.buildType === type) { UI.setTool('select'); return; }
      UI.setTool('build'); UI.buildType = type; UI.hotCache = null; UI.manualRot = false;
      UI.selectedUid = null;
      UI.updateCards();
      TE.Audio.play('click');
    },
    setTool(t) {
      UI.tool = t;
      if (t !== 'build') UI.buildType = null;
      if (t !== 'move') UI.moveUid = null;
      UI.previewCache = null; UI.hotCache = null;
      document.querySelectorAll('.tool[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
      $('expandBtn').classList.toggle('on', t === 'expand');
      UI.updateCards();
      UI.hideTip();
      const cv = $('game');
      cv.style.cursor = t === 'build' ? 'crosshair' : t === 'bulldoze' ? 'not-allowed' : t === 'move' ? 'move' : t === 'expand' ? 'pointer' : 'default';
    },
    bindTools() {
      document.querySelectorAll('.tool[data-tool]').forEach((b) => { b.onclick = () => { UI.setTool(UI.tool === b.dataset.tool ? 'select' : b.dataset.tool); TE.Audio.play('click'); }; });
      $('undoBtn').onclick = () => UI.undo();
    },
    undo() {
      const r = G().undo(UI.S());
      if (r.ok) { UI.toast(`↩️ Undone — refunded ${fmt(r.refund)}`, 'good'); TE.Audio.play('demolish'); UI.dirtyPanels(); }
      else UI.toast(r.reason, 'bad');
    },

    /* ---------- Top bar ---------- */
    bindTopbar() {
      document.querySelectorAll('.speed button').forEach((b) => { b.onclick = () => UI.setSpeed(+b.dataset.speed); });
      $('overlayBtn').onclick = (e) => { e.stopPropagation(); UI.toggleOverlayMenu(); };
      $('expandBtn').onclick = () => { UI.setTool(UI.tool === 'expand' ? 'select' : 'expand'); if (UI.tool === 'expand') UI.toast('Click a highlighted land section to buy it.', 'gold', '🏷️'); };
      $('collectionBtn').onclick = () => UI.showCollection();
      $('statsBtn').onclick = () => UI.showStats();
      $('menuBtn').onclick = () => UI.showMenu();
      $('happyChip').onclick = () => UI.showReport('happiness');
      $('safeChip').onclick = () => UI.showReport('safety');
      $('polChip').onclick = () => UI.showReport('pollution');
      $('popChip').onclick = () => UI.showReport('neighborhoods');
      $('trafficChip').onclick = () => UI.showReport('traffic');
      $('powerChip').onclick = () => UI.showReport('traffic');
      $('incomeBtn').onclick = () => UI.showIncome();
      $('levelChip').onclick = () => { UI.sideCollapsed = false; UI.selectedUid = null; UI.tileInfo = null; UI.sideSig = ''; };
      document.addEventListener('click', () => { $('overlayMenu').hidden = true; });
    },
    setSpeed(s) {
      if (s === 0) { UI.paused = !UI.paused; }
      else { UI.paused = false; UI.speed = s; }
      document.querySelectorAll('.speed button').forEach((b) => {
        const sp = +b.dataset.speed;
        b.classList.toggle('on', sp === 0 ? UI.paused : (!UI.paused && sp === UI.speed));
      });
      $('pauseBtn').textContent = UI.paused ? '▶' : '⏸';
      $('pauseBtn').title = UI.paused ? 'Resume (Space)' : 'Pause (Space)';
    },
    toggleOverlayMenu() {
      const m = $('overlayMenu');
      if (!m.hidden) { m.hidden = true; return; }
      const items = [[null, 'No overlay']].concat(Object.keys(TE.Render.OVERLAYS).map((k) => [k, TE.Render.OVERLAYS[k].name]));
      m.innerHTML = items.map(([k, n]) => `<button type="button" data-ov="${k || ''}" class="${UI.overlay === k ? 'on' : ''}">${esc(n)}</button>`).join('') + '<button type="button" disabled><kbd>Press O to cycle</kbd></button>';
      const r = $('overlayBtn').getBoundingClientRect();
      m.style.top = (r.bottom + 6) + 'px'; m.style.left = Math.min(window.innerWidth - 210, r.left) + 'px';
      m.hidden = false;
      m.querySelectorAll('button[data-ov]').forEach((b) => { b.onclick = () => { UI.setOverlay(b.dataset.ov || null); m.hidden = true; }; });
    },
    setOverlay(k) {
      UI.overlay = k;
      $('overlayBtn').classList.toggle('on', !!k);
      const lg = $('legend');
      if (!k) { lg.hidden = true; return; }
      const ov = TE.Render.OVERLAYS[k];
      lg.innerHTML = `<div>${esc(ov.name)}${k === 'quality' ? ' (homes)' : ''}</div><div class="grad"></div><div class="ends"><span>${esc(ov.legend[0])}</span><span>${esc(ov.legend[1])}</span></div>`;
      lg.hidden = false;
    },
    cycleOverlay() {
      const keys = [null].concat(Object.keys(TE.Render.OVERLAYS));
      UI.setOverlay(keys[(keys.indexOf(UI.overlay) + 1) % keys.length]);
      if (UI.overlay) UI.toast(`🗺️ Overlay: ${TE.Render.OVERLAYS[UI.overlay].name}`, 'gold');
    },

    /* ---------- Per-frame & periodic updates ---------- */
    frame(dt) {
      const S = UI.S();
      // smooth money counter
      const diff = S.money - UI.shownMoney;
      UI.shownMoney += Math.abs(diff) < 1 ? diff : diff * Math.min(1, dt * 8);
      const mt = fmt(UI.shownMoney);
      if ($('money').textContent !== mt) $('money').textContent = mt;
      UI._acc = (UI._acc || 0) + dt;
      if (UI._acc > 0.25) { UI._acc = 0; UI.periodic(); }
    },
    periodic() {
      const S = UI.S(), R = S.R; if (!R) return;
      const T = R.totals;
      const inc = $('incomeBtn');
      inc.textContent = (T.net >= 0 ? '+' : '') + rate(T.net) + (T.globalMult.mult > 1.001 || T.globalMult.mult < 0.999 ? `  ×${T.globalMult.mult.toFixed(2)}` : '');
      inc.classList.toggle('neg', T.net < 0);
      $('popVal').textContent = Math.floor(T.population);
      $('popChip').title = `Population ${Math.floor(T.population)} / capacity ${Math.floor(T.capacity)}`;
      $('happyVal').textContent = Math.round(T.happiness);
      $('happyBar').style.width = T.happiness + '%';
      $('happyBar').style.background = T.happiness >= 65 ? 'var(--good)' : T.happiness >= 40 ? 'var(--ok)' : 'var(--bad)';
      $('safeVal').textContent = Math.round(T.safety);
      $('safeBar').style.width = T.safety + '%';
      $('safeBar').style.background = T.safety >= 65 ? 'var(--good)' : T.safety >= 40 ? 'var(--ok)' : 'var(--bad)';
      $('polVal').textContent = Math.round(T.pollution);
      $('polBar').style.width = Math.min(100, T.pollution) + '%';
      const tr = T.traffic || { avg: 0, jammed: 0 }, pw = T.power || { demand: 0, supply: 0 };
      $('trafficVal').textContent = Math.round(tr.avg * 100) + '%';
      $('trafficBar').style.width = Math.min(100, tr.avg * 80) + '%';
      $('trafficChip').title = `Traffic: streets are ${Math.round(tr.avg * 100)}% full on average, ${tr.jammed} jammed. Click for the city report.`;
      $('trafficChip').classList.toggle('alert', tr.jammed > 0);
      $('powerVal').textContent = Math.round(pw.demand) + '/' + Math.round(pw.supply);
      $('powerChip').classList.toggle('alert', !!pw.short);
      $('powerChip').title = `Power: ${Math.round(pw.demand)} used of ${Math.round(pw.supply)} supplied${pw.short ? ' — SHORTAGE! Build a Power Plant or Solar Farm.' : ''}`;
      $('levelVal').textContent = S.level;
      $('levelName').textContent = TE.LEVELS[S.level - 1].name;
      const lp = TE.Progress.levelProgress(S);
      $('levelBar').style.width = lp ? Math.round(100 * lp.reduce((a, p) => a + Math.min(1, p.have / p.need), 0) / lp.length) + '%' : '100%';
      $('comboCount').textContent = Object.keys(S.discovered).length + '/' + TE.COMBOS.length;
      const day = Math.floor(S.time / TE.BALANCE.dayLength) + 1, nf = TE.Render.nightFactor(S);
      $('clock').textContent = (nf > 0.5 ? '🌙' : nf > 0 ? '🌆' : '☀️') + ' Day ' + day;
      $('undoBtn').disabled = !S.undo;
      UI.updateCards();
      UI.renderSide();
      UI.renderAdvisor();
      UI.renderEvent();
      if (UI._comboScanR !== S.R._id && (!UI._comboScanAt || performance.now() - UI._comboScanAt > 3000)) { UI._comboScanAt = performance.now(); UI._comboScanR = S.R._id; UI.scanComboTypes(); }
    },
    dirtyPanels() { UI.sideSig = ''; UI.advSig = ''; UI.previewCache = null; UI.hotCache = null; UI._comboScanAt = 0; },

    /* ---------- Notifications from the simulation ---------- */
    processNotes() {
      const S = UI.S();
      const notes = S.notes || [];
      if (!notes.length) return;
      S.notes = [];
      notes.forEach((n) => {
        switch (n.kind) {
          case 'discovery': {
            const c = TE.Combos.byId(n.id);
            n.members.forEach((uid) => { const b = S.buildings[uid]; if (b) TE.Render.burst(b.x, b.y, ['#ffd60a', '#ff006e', '#3a86ff', '#80ffdb'], 22, 30); });
            TE.Audio.play('discover');
            UI.queueModal(() => UI.showDiscovery(c));
            UI.dirtyPanels();
            break;
          }
          case 'comboFormed': {
            const c = TE.Combos.byId(n.id);
            const b = S.buildings[n.anchor || n.members[0]];
            n.members.forEach((uid) => { const m = S.buildings[uid]; if (m) TE.Render.burst(m.x, m.y, ['#ffd60a', '#ffffff'], 10, 25); });
            if (b) TE.Render.floatText(b.x, b.y, `${c.icon} ${c.name}!`, '#ffd60a', 12, 50);
            TE.Audio.play('coin');
            break;
          }
          case 'level': {
            TE.Audio.play('level');
            UI.queueModal(() => UI.showLevelUp(n));
            UI.buildCards(); UI.dirtyPanels();
            break;
          }
          case 'unlock': UI.toast(`🔓 New building: ${TE.BUILDINGS[n.type].name}!`, 'gold', TE.BUILDINGS[n.type].icon); TE.Audio.play('coin'); UI.buildCards(); break;
          case 'quest': {
            const r = n.quest.reward;
            UI.toast(`Objective complete: ${n.quest.text} — ${UI.rewardText(r)}`, 'gold', '🎯');
            TE.Audio.play('coin');
            break;
          }
          case 'daily': UI.toast(`Daily challenge done: ${n.text} — ${UI.rewardText(n.reward)}`, 'gold', '📅'); TE.Audio.play('coin'); break;
          case 'event': TE.Audio.play('event'); break;
          case 'eventEnd': UI.toast(n.text, n.good ? 'good' : 'bad', TE.EVENTS[n.id].icon); break;
          case 'fire': {
            const b = S.buildings[n.uid];
            UI.toast(n.text, n.contained ? 'good' : 'bad', null, (!n.contained && b) ? [{ label: `Repair ${fmt(G().repairCost(b))}`, fn: () => UI.doRepair(b) }, { label: 'Show', fn: () => { TE.Render.centerOn(b.x, b.y); UI.select(b.uid); } }] : null, n.contained ? 4000 : 9000);
            if (b && n.contained) TE.Render.floatText(b.x, b.y, '🚒 Saved!', '#80ffdb', 12, 40);
            TE.Audio.play(n.contained ? 'coin' : 'error');
            break;
          }
          case 'repaired': { const b = S.buildings[n.uid]; if (b) TE.Render.floatText(b.x, b.y, 'Reopened!', '#80ffdb', 11, 40); break; }
          default: break;
        }
      });
    },
    rewardText(r) {
      if (!r) return '';
      const parts = [];
      if (r.money) parts.push('+' + fmt(r.money));
      if (r.buff) parts.push(`${r.buff.name}: +${Math.round(r.buff.mult * 100)}% income for ${Math.round(r.buff.seconds / 60 * 10) / 10} min`);
      return parts.join(' & ');
    },

    /* ---------- Toasts ---------- */
    toast(text, kind, icon, actions, ms) {
      const box = $('toasts');
      const el = document.createElement('div');
      el.className = 'toast ' + (kind || '');
      el.innerHTML = (icon ? `<span class="ti">${icon}</span>` : '') + `<span>${esc(text)}</span>`;
      (actions || []).forEach((a) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn primary'; b.textContent = a.label;
        b.onclick = () => { a.fn(); el.remove(); };
        el.appendChild(b);
      });
      box.appendChild(el);
      while (box.children.length > 4) box.firstChild.remove();
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms || 3800);
    },
    noFunds(reason) {
      UI.toast(reason || 'Not enough money', 'bad', '💸');
      const m = $('money'); m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake');
      setTimeout(() => m.classList.remove('shake'), 450);
      TE.Audio.play('error');
    },
    fail(r) { if (r.funds) UI.noFunds(r.reason); else { UI.toast(r.reason, 'bad'); TE.Audio.play('error'); } },

    /* ---------- Tooltips ---------- */
    showTip(html, sx, sy) {
      const t = $('tooltip');
      t.innerHTML = html; t.hidden = false;
      const w = t.offsetWidth, h = t.offsetHeight;
      let x = sx + 18, y = sy + 18;
      if (x + w > window.innerWidth - 8) x = sx - w - 18;
      if (y + h > window.innerHeight - 8) y = sy - h - 18;
      t.style.left = Math.max(8, x) + 'px'; t.style.top = Math.max(8, y) + 'px';
    },
    hideTip() { $('tooltip').hidden = true; },
    likesFor(type) {
      const likes = [], dislikes = [], boosts = [];
      const nameOf = (key) => key.startsWith('tag:') ? ({ home: 'homes', shop: 'shops', food: 'food places', fun: 'leisure', industry: 'industry' }[key.slice(4)] || key.slice(4)) : (TE.BUILDINGS[key] ? TE.BUILDINGS[key].name + 's' : key);
      TE.SYNERGIES.forEach((r) => {
        const range = `${r.radius} tile${r.radius > 1 ? 's' : ''}`;
        const amt = r.flat != null ? `${pct(r.flat)} with ${r.minCount}+${r.distinct ? ' kinds' : ''}` : `${pct(r.per)} each${r.max > 1 ? `, up to ${r.max}` : ''}`;
        if (G().matches(type, r.target)) {
          (r.per < 0 ? dislikes : likes).push(`${r.icon} ${nameOf(r.source)} within ${range} (${amt})`);
        } else if (G().matches(type, r.source) && (r.per > 0 || r.flat > 0)) boosts.push(nameOf(r.target));
      });
      return { likes, dislikes, boosts: boosts.filter((v, i, a) => a.indexOf(v) === i) };
    },
    cardTip(type, e) {
      const S = UI.S(), def = TE.BUILDINGS[type];
      const st = G().unlockStatus(S, type), cost = G().costOf(S, type);
      const L = UI.likesFor(type);
      let h = `<div class="tt"><span>${def.icon} ${esc(def.name)}</span><span>${fmt(cost)}</span></div><div>${esc(def.desc)}</div><hr>`;
      if (def.residents) h += `<div class="tl"><span>Residents</span><b>${def.residents} × ${rate(def.taxPerResident)} tax</b></div>`;
      else if (def.income) h += `<div class="tl"><span>Base income</span><b>${rate(def.income)}</b></div>`;
      if (def.upkeep) h += `<div class="tl"><span>Upkeep</span><b class="neg">−${rate(def.upkeep)}</b></div>`;
      if (def.customers) h += `<div class="tl"><span>Needs customers</span><b>${def.customers}</b></div>`;
      if (def.workers) h += `<div class="tl"><span>Needs workers</span><b>${def.workers}</b></div>`;
      if (def.service) h += `<div class="tl"><span>Reach</span><b>${def.service.radius} tiles ${def.service.travel === 'road' ? 'by road' : def.service.travel === 'walk' ? 'on foot' : ''}</b></div>`;
      if (def.parking) h += `<div class="tl"><span>Parking needed</span><b>${def.parking} spaces</b></div>`;
      if (def.parkingSupply) h += `<div class="tl"><span>Parking spaces</span><b>${def.parkingSupply.cap} within ${def.parkingSupply.radius} tiles</b></div>`;
      if (def.transit) h += `<div class="tl"><span>Car trips nearby</span><b class="pos">−${Math.round(def.transit.cut * 100)}% within ${def.transit.radius}</b></div>`;
      if (def.road && !def.road.walk) h += `<div class="tl"><span>Traffic capacity</span><b>${def.road.cap}</b></div>`;
      if (def.power) h += `<div class="tl"><span>Power use</span><b>${def.power}</b></div>`;
      if (def.powerSupply) h += `<div class="tl"><span>Power supplied</span><b class="pos">+${def.powerSupply}</b></div>`;
      const placeTxt = { water: 'Build on the river', shore: 'Build right next to the water' }[def.place || ''] || (def.needsRoad ? 'Must be next to a street' : '');
      if (placeTxt) h += `<div class="combo">📍 ${placeTxt}</div>`;
      if (def.emits && def.emits.pollution) h += `<div class="tl"><span>Pollution</span><b class="neg">${def.emits.pollution[0]} within ${def.emits.pollution[1]} tiles</b></div>`;
      if (def.costGrowth) h += `<div class="tl"><span>Land value</span><b>×${G().landValue(S).toFixed(2)}</b></div>`;
      if (L.likes.length) h += `<hr><div><b>Likes:</b><br>${L.likes.slice(0, 5).map(esc).join('<br>')}</div>`;
      if (L.dislikes.length) h += `<div class="err" style="font-weight:700"><b>Dislikes:</b><br>${L.dislikes.map(esc).join('<br>')}</div>`;
      if (L.boosts.length) h += `<div><b>Boosts:</b> ${L.boosts.map(esc).join(', ')}</div>`;
      if (!st.ok) h += `<hr><div class="err">🔒 Unlocks with: ${st.missing.map(esc).join(', ')}</div>`;
      UI.showTip(h, e.clientX, e.clientY - 40);
    },
    /* Placement preview tooltip */
    buildTip(x, y, sx, sy) {
      const S = UI.S(), type = UI.buildType, def = TE.BUILDINGS[type];
      const chk = G().canPlace(S, type, x, y);
      const cost = G().costOf(S, type);
      let h = `<div class="tt"><span>${def.icon} ${esc(def.name)}</span><span>${fmt(cost)}</span></div>`;
      UI.highlight = null;
      if (!chk.ok) { UI.showTip(h + `<div class="err">${esc(chk.reason)}</div>`, sx, sy); return false; }
      const key = type + ':' + x + ':' + y + ':' + S.R._id;
      let pv = UI.previewCache && UI.previewCache.key === key ? UI.previewCache.pv : null;
      if (!pv) { pv = TE.Economy.preview(S, type, x, y); UI.previewCache = { key, pv }; }
      if (!pv) { UI.hideTip(); return true; }
      if (def.residents) {
        h += `<div class="tl"><span>Tax income</span><b class="pos">+${rate(pv.own)}</b></div>`;
        h += `<div class="tl"><span>Neighborhood quality</span><b>${Math.round(pv.quality || 0)}</b></div>`;
        const nd = pv.needs;
        if (nd) h += `<div>${Object.keys(TE.NEEDS).map((k) => `<span title="${TE.NEEDS[k].name}" style="opacity:${nd.active[k] ? 1 : 0.35}">${TE.NEEDS[k].icon}<span class="${statusClass(nd.active[k] ? nd[k] : null)}" style="display:inline-block;width:8px;height:8px;border-radius:4px;margin:0 6px 0 2px"></span></span>`).join('')}</div>`;
      } else if (def.income) h += `<div class="tl"><span>Income</span><b class="pos">+${rate(pv.own)}</b></div>`;
      if (pv.upkeep) h += `<div class="tl"><span>Upkeep</span><b class="neg">−${rate(pv.upkeep)}</b></div>`;
      h += `<div class="tl"><span>City net change</span><b class="${pv.netDelta >= 0 ? 'pos' : 'neg'}">${pv.netDelta >= 0 ? '+' : ''}${rate(pv.netDelta)}</b></div>`;
      const bonuses = (pv.bonuses || []).filter((b) => Math.abs(b.value) > 0.001);
      if (bonuses.length) h += '<hr>' + bonuses.slice(0, 6).map((b) => `<div class="tl"><span>${b.icon} ${esc(b.label)}</span><b class="${b.value > 0 ? 'pos' : 'neg'}">${pct(b.value)}</b></div>`).join('');
      const up = pv.neighbors.filter((n) => n.delta > 0), down = pv.neighbors.filter((n) => n.delta < 0);
      if (up.length || down.length) {
        h += '<hr>';
        if (up.length) h += `<div class="pos" style="font-weight:800">▲ Boosts ${up.length} neighbor${up.length > 1 ? 's' : ''} (+${rate(up.reduce((a, n) => a + n.delta, 0))})</div>`;
        if (down.length) h += `<div class="neg" style="font-weight:800">▼ Hurts ${down.length} neighbor${down.length > 1 ? 's' : ''} (${rate(down.reduce((a, n) => a + n.delta, 0))})</div>`;
        UI.highlight = pv.neighbors.map((n) => { const b = S.buildings[n.uid]; return { x: b.x, y: b.y, color: n.delta > 0 ? 'rgba(128,237,153,0.55)' : 'rgba(255,99,99,0.55)' }; });
      }
      const fx = [];
      if (Math.abs(pv.happinessDelta) >= 0.2) fx.push(`<span class="${pv.happinessDelta > 0 ? 'pos' : 'neg'}">😊 ${pv.happinessDelta > 0 ? '+' : ''}${pv.happinessDelta.toFixed(1)}</span>`);
      if (Math.abs(pv.safetyDelta) >= 0.2) fx.push(`<span class="${pv.safetyDelta > 0 ? 'pos' : 'neg'}">🛡️ ${pv.safetyDelta > 0 ? '+' : ''}${pv.safetyDelta.toFixed(1)}</span>`);
      if (Math.abs(pv.pollutionDelta) >= 0.2) fx.push(`<span class="${pv.pollutionDelta < 0 ? 'pos' : 'neg'}">🏭 ${pv.pollutionDelta > 0 ? '+' : ''}${pv.pollutionDelta.toFixed(1)}</span>`);
      if (fx.length) h += `<div style="display:flex;gap:10px;font-weight:800;margin-top:4px">${fx.join('')}</div>`;
      if (pv.newCombos.length) {
        h += '<hr>' + pv.newCombos.map((id) => {
          const c = TE.Combos.byId(id);
          return S.discovered[id] ? `<div class="combo">${c.icon} Forms ${esc(c.name)}</div>` : '<div class="combo">✨ Completes a secret combination!</div>';
        }).join('');
      }
      if (S.money < cost) h += `<div class="err">Need ${fmt(cost - S.money)} more</div>`;
      if (!def.road && !def.paint) h += '<div class="tip">R rotates · faces the street automatically</div>';
      UI.showTip(h, sx, sy);
      return true;
    },

    /* ---------- Map interaction (called from input.js) ---------- */
    hoverAt(tile, sx, sy, picked) {
      const S = UI.S();
      UI.hover = tile; UI.hoverChunk = null; UI.ghostValid = null; UI.highlight = null;
      if (!tile) { UI.hideTip(); return; }
      const [x, y] = tile;
      if (UI.tool === 'build') {
        UI.ghostValid = UI.buildTip(x, y, sx, sy);
      } else if (UI.tool === 'move' && UI.moveUid) {
        const b = S.buildings[UI.moveUid];
        const chk = b ? G().canPlace(S, b.type, x, y, { ignoreUid: b.uid, free: true }) : { ok: false };
        UI.ghostValid = chk.ok;
        UI.showTip(`<div class="tt">Move ${esc(TE.BUILDINGS[b.type].name)}</div>${chk.ok ? '<div>Click to place here (free)</div>' : `<div class="err">${esc(chk.reason || '')}</div>`}<div class="tip">Esc to cancel</div>`, sx, sy);
      } else if (UI.tool === 'expand' || !G().isOwned(S, x, y)) {
        const [cx, cy] = G().chunkOf(x, y);
        const st = G().chunkStatus(S, cx, cy);
        if (G().inBounds(S, x, y) && !st.owned && (st.ok || st.funds || st.capped)) {
          UI.hoverChunk = [cx, cy];
          const cont = G().chunkContents(S, cx, cy);
          const res = cont.resources.map((r) => TE.RESOURCES[r].icon + ' ' + TE.RESOURCES[r].name).join(', ');
          UI.showTip(`<div class="tt"><span>🏷️ Land for sale</span><span>${fmt(st.cost || G().expansionCost(S))}</span></div>
            <div>${TE.BALANCE.chunkSize}×${TE.BALANCE.chunkSize} tiles · ${cont.trees} trees · ${cont.rocks} rocks${cont.ponds ? ' · pond' : ''}</div>
            ${res ? `<div class="combo">${esc(res)}</div>` : ''}
            ${st.ok ? '<div class="pos" style="font-weight:800">Click to buy</div>' : `<div class="err">${esc(st.reason)}</div>`}`, sx, sy);
        } else UI.hideTip();
      } else if (UI.tool === 'bulldoze') {
        const b = picked || G().buildingAt(S, x, y), t = G().tile(S, x, y);
        if (b && !TE.BUILDINGS[b.type].fixed) UI.showTip(`<div class="tt">🚜 Demolish ${esc(TE.BUILDINGS[b.type].name)}</div><div>Refund ${fmt(Math.floor(b.spent * TE.BALANCE.demolishRefund))}</div>`, sx, sy);
        else if (t && t.f && TE.FEATURES[t.f].clearCost != null) UI.showTip(`<div class="tt">🚜 Clear ${esc(TE.FEATURES[t.f].name)}</div><div>Cost ${fmt(TE.FEATURES[t.f].clearCost)}</div>`, sx, sy);
        else UI.hideTip();
      } else {
        const b = picked || G().buildingAt(S, x, y);
        if (b && TE.BUILDINGS[b.type].road) {
          const d = TE.BUILDINGS[b.type], i = y * S.size + x, c = S.R.cong[i] || 0;
          UI.showTip(`<div class="tt"><span>${d.icon} ${esc(d.name)}</span></div>${d.road.walk ? '<div>Pedestrians only</div>' : `<div class="tl"><span>Traffic</span><b class="${c > 1 ? 'neg' : 'pos'}">${Math.round(c * 100)}% of capacity</b></div>`}<div class="tip">Click for details</div>`, sx, sy);
        } else if (b) {
          const info = S.R.b[b.uid], def = TE.BUILDINGS[b.type];
          let h = `<div class="tt"><span>${def.icon} ${esc(def.name)}</span><span>Lv ${b.level}</span></div>`;
          if (info.income > 0) h += `<div class="tl"><span>Income</span><b class="pos">+${rate(info.income)}</b></div>`;
          if (info.upkeep) h += `<div class="tl"><span>Upkeep</span><b class="neg">−${rate(info.upkeep)}</b></div>`;
          if (def.residents) h += `<div class="tl"><span>Residents</span><b>${Math.round(b.occ)}/${Math.round(TE.Citizens.capacity(b))}</b></div><div class="tl"><span>${esc(info.nb ? info.nb.name : '')}</span><b>Quality ${Math.round(b.qs || 0)}</b></div>`;
          const top = (info.bonuses || []).filter((x) => Math.abs(x.value) > 0.001).slice(0, 4);
          if (top.length) h += '<hr>' + top.map((x) => `<div class="tl"><span>${x.icon} ${esc(x.label)}</span><b class="${x.value > 0 ? 'pos' : 'neg'}">${pct(x.value)}</b></div>`).join('');
          h += '<div class="tip">Click for details</div>';
          UI.showTip(h, sx, sy);
        } else {
          const t = G().tile(S, x, y);
          if (t && t.r) UI.showTip(`<div class="tt">${TE.RESOURCES[t.r].icon} ${esc(TE.RESOURCES[t.r].name)}</div><div>${esc(TE.RESOURCES[t.r].desc)}</div>`, sx, sy);
          else if (t && t.f) UI.showTip(`<div class="tt">${esc(TE.FEATURES[t.f].name)}</div><div>${TE.FEATURES[t.f].clearCost != null ? `Bulldoze to clear (${fmt(TE.FEATURES[t.f].clearCost)}). Wild trees clean the air a little.` : 'Ponds make nearby homes happier.'}</div>`, sx, sy);
          else UI.hideTip();
        }
      }
    },
    async clickAt(tile, picked, opts) {
      const S = UI.S();
      opts = opts || {};
      if (!tile) return;
      const [x, y] = tile;
      if (UI.tool === 'build') return UI.tryPlace(UI.buildType, x, y, opts.stroke);
      if (UI.tool === 'move') {
        const b = S.buildings[UI.moveUid];
        if (!b) return UI.setTool('select');
        const r = G().move(S, b, x, y);
        if (r.ok) { TE.Audio.play('place'); TE.Render.dust(x, y); UI.setTool('select'); UI.select(b.uid); UI.toast(`Moved ${TE.BUILDINGS[b.type].name}`, 'good', '📦'); }
        else UI.fail(r);
        return;
      }
      if (UI.tool === 'expand' || !G().isOwned(S, x, y)) {
        if (!G().inBounds(S, x, y)) return;
        const [cx, cy] = G().chunkOf(x, y);
        const st = G().chunkStatus(S, cx, cy);
        if (st.owned) { if (UI.tool === 'expand') UI.setTool('select'); return; }
        if (!st.ok) return UI.fail(st);
        const cont = G().chunkContents(S, cx, cy);
        const ok = await UI.confirm({ title: 'Buy this land?', icon: '🏷️',
          body: `Expand your city with ${TE.BALANCE.chunkSize * TE.BALANCE.chunkSize} new tiles${cont.resources.length ? ' including ' + cont.resources.map((r) => TE.RESOURCES[r].icon + ' ' + TE.RESOURCES[r].name).join(', ') : ''}.`,
          yes: `Buy for ${fmt(st.cost)}` });
        if (!ok) return;
        const r = G().buyChunk(S, cx, cy);
        if (r.ok) {
          TE.Audio.play('upgrade');
          for (let i = 0; i < 4; i++) TE.Render.burst(cx * 4 + Math.random() * 4, cy * 4 + Math.random() * 4, ['#80ed99', '#ffd60a', '#ffffff'], 10, 5);
          UI.toast(`New land! ${cont.resources.length ? 'Look for the special tiles.' : ''}`, 'good', '🏞️');
          UI.dirtyPanels();
          if (UI.tool === 'expand' && !G().chunkStatusAny(S)) UI.setTool('select');
        } else UI.fail(r);
        return;
      }
      if (UI.tool === 'bulldoze') {
        const b = picked || G().buildingAt(S, x, y);
        if (b) return UI.doDemolish(b, opts.stroke);
        const t = G().tile(S, x, y);
        if (t && t.f) {
          const r = G().clearFeature(S, x, y);
          if (r.ok) { TE.Audio.play('demolish'); TE.Render.dust(x, y); } else UI.fail(r);
        }
        return;
      }
      // select
      const b = picked || G().buildingAt(S, x, y);
      if (b) { UI.select(b.uid); TE.Audio.play('click'); }
      else { UI.selectedUid = null; UI.tileInfo = [x, y]; UI.sideSig = ''; if (window.innerWidth >= 760) UI.sideCollapsed = false; }
    },
    async tryPlace(type, x, y, stroke) {
      const S = UI.S();
      const chk = G().canPlace(S, type, x, y);
      if (!chk.ok) {
        if (stroke && !chk.funds) return; // painting over occupied tiles is fine
        return UI.fail(chk);
      }
      const B = TE.BALANCE;
      if (S.settings.confirm && !stroke && chk.cost >= B.expensiveConfirmMin && chk.cost >= S.money * B.expensiveConfirmFraction) {
        const ok = await UI.confirm({ title: `Build ${TE.BUILDINGS[type].name}?`, icon: TE.BUILDINGS[type].icon,
          body: `This costs ${fmt(chk.cost)} — ${Math.round(100 * chk.cost / S.money)}% of your cash. (You can turn this check off in Settings.)`, yes: `Build for ${fmt(chk.cost)}` });
        if (!ok) return;
      }
      const pvNeighbors = UI.previewCache && UI.previewCache.key.startsWith(type + ':' + x + ':' + y + ':') ? UI.previewCache.pv : null;
      const r = G().place(S, type, x, y, { stroke, rot: UI.rot, manualRot: UI.manualRot });
      if (!r.ok) return UI.fail(r);
      TE.Audio.play(type === 'road' ? 'road' : 'place');
      if (type !== 'road') {
        TE.Render.dust(x, y);
        TE.Render.floatText(x, y, '-' + fmt(r.cost), '#ff8fa3', 10, 20);
        if (['tree', 'park', 'streetlight'].indexOf(type) >= 0) TE.Render.burst(x, y, type === 'streetlight' ? ['#fff3b0', '#ffd60a'] : ['#80ed99', '#b7e4c7', '#ffffff'], 12, 15);
      }
      TE.Sim.ensure(S);
      // Floating synergy feedback on the new building and affected neighbors
      const info = S.R.b[r.building.uid];
      const syn = (info.bonuses || []).filter((b) => b.kind === 'syn' || b.kind === 'combo').reduce((a, b) => a + b.value, 0);
      if (syn > 0.001) TE.Render.floatText(x, y, `+${Math.round(syn * 100)}% synergy`, '#80ffdb', 11, TE.Render.heightOf(type, 1) + 14);
      if (pvNeighbors) pvNeighbors.neighbors.forEach((n) => {
        const b = S.buildings[n.uid]; if (!b) return;
        TE.Render.floatText(b.x, b.y, (n.delta > 0 ? '▲ +' : '▼ ') + rate(n.delta), n.delta > 0 ? '#80ffdb' : '#ff8fa3', 10, TE.Render.heightOf(b.type, b.level) + 8);
      });
      UI.dirtyPanels();
    },
    async doDemolish(b, stroke) {
      const S = UI.S(), def = TE.BUILDINGS[b.type];
      if (def.fixed) return UI.fail({ reason: `The ${def.name} is the heart of your city and can't be demolished.` });
      const refund = Math.floor(b.spent * TE.BALANCE.demolishRefund);
      if (!stroke && S.settings.confirm && b.spent >= 400) {
        const ok = await UI.confirm({ title: `Demolish ${def.name}?`, icon: '🚜', body: `You get ${fmt(refund)} back (half of the ${fmt(b.spent)} invested).`, yes: 'Demolish', danger: true });
        if (!ok) return;
      }
      const r = G().demolish(S, b);
      if (r.ok) { TE.Audio.play('demolish'); TE.Render.dust(b.x, b.y); TE.Render.floatText(b.x, b.y, '+' + fmt(r.refund), '#ffd60a', 10, 10); UI.dirtyPanels(); }
      else UI.fail(r);
    },
    doRepair(b) {
      const r = G().repair(UI.S(), b);
      if (r.ok) { TE.Audio.play('upgrade'); TE.Render.burst(b.x, b.y, ['#80ffdb', '#ffffff'], 14, 20); UI.toast(`Repaired ${TE.BUILDINGS[b.type].name}`, 'good', '🛠️'); UI.dirtyPanels(); }
      else UI.fail(r);
    },
    select(uid) {
      UI.selectedUid = uid; UI.tileInfo = null; UI.sideSig = '';
      UI.sideCollapsed = false;
      if (UI.tool !== 'select') UI.setTool('select');
    },

    /* ---------- View for the renderer ---------- */
    view() {
      const S = UI.S();
      const v = {
        tool: UI.tool, hover: UI.hover, hoverChunk: UI.hoverChunk, ghostValid: UI.ghostValid, selected: UI.selectedUid,
        overlay: UI.overlay, paused: UI.paused, speed: UI.speed, highlight: UI.highlight, moving: null, grid: UI.tool === 'build' || UI.tool === 'move',
      };
      const COV_COL = { police: '#4361ee', fire: '#e85d04', hospital: '#f72585', light: '#ffd60a', rec: '#2d6a4f', school: '#7209b7', library: '#9d4edd', grocery: '#e76f51' };
      /* Area of effect of a building type at (x,y): travel-based for services, squares for transit/parking/barriers. */
      const covFor = (type, x, y, level, b) => {
        const def = TE.BUILDINGS[type];
        if (def.service) {
          if (def.service.kind === 'light') return { x, y, radius: 2, color: COV_COL.light, square: true };
          if (b && S.R.reachCache && S.R.reachCache[b.uid]) return { tiles: S.R.reachCache[b.uid].tiles, radius: S.R.reachCache[b.uid].radius, color: COV_COL[def.service.kind] || '#2d6a4f' };
          let r = def.service.radius + (def.noUpgrade ? 0 : level - 1);
          if (def.service.travel === 'road' && S.R && !S.R.connected[y * S.size + x]) r = Math.ceil(r / 2);
          return { tiles: TE.Citizens.reach(S, S.R, x, y, r, def.service.travel || 'walk'), radius: r, color: COV_COL[def.service.kind] || '#2d6a4f' };
        }
        if (def.transit) return { x, y, radius: def.transit.radius, color: def.transit.kind === 'train' ? '#7209b7' : '#2a9d8f', square: true };
        if (def.parkingSupply) return { x, y, radius: def.parkingSupply.radius, color: '#1d4ed8', square: true };
        if (type === 'floodbarrier') return { x, y, radius: TE.RIVER.barrierRadius, color: '#00b4d8', square: true };
        if (def.emits && def.emits.pollution && def.emits.pollution[0] >= 20) return { x, y, radius: def.emits.pollution[1], color: '#6a4c93', square: true };
        return null;
      };
      if (UI.tool === 'build' && UI.buildType) {
        if (UI.hover && G().inBounds(S, UI.hover[0], UI.hover[1])) {
          const t = G().tile(S, UI.hover[0], UI.hover[1]);
          if (!t.b) {
            const rot = UI.manualRot ? UI.rot : G().autoRot(S, UI.hover[0], UI.hover[1], UI.rot);
            v.ghost = { type: UI.buildType, x: UI.hover[0], y: UI.hover[1], invalid: UI.ghostValid === false, rot };
            const cv = covFor(UI.buildType, UI.hover[0], UI.hover[1], 1);
            if (cv) v.coverage = [cv];
          }
        }
        const key = UI.buildType + ':' + (S.R && S.R._id);
        if (!UI.hotCache || UI.hotCache.key !== key) UI.hotCache = { key, hs: TE.Economy.hotspots(S, UI.buildType) };
        v.hotspots = UI.hotCache.hs;
      }
      if (UI.tool === 'move' && UI.moveUid && S.buildings[UI.moveUid]) {
        const b = S.buildings[UI.moveUid];
        v.moving = b.uid;
        if (UI.hover) v.ghost = { type: b.type, x: UI.hover[0], y: UI.hover[1], b, invalid: UI.ghostValid === false };
      }
      if (UI.selectedUid && S.buildings[UI.selectedUid] && UI.tool === 'select') {
        const b = S.buildings[UI.selectedUid];
        const cv = covFor(b.type, b.x, b.y, b.level, b);
        if (cv) v.coverage = [cv];
      }
      return v;
    },

    /* ---------- Advisor ---------- */
    renderAdvisor() {
      const S = UI.S(), W = (S.R && S.R.warnings) || [];
      const sig = W.map((w) => w.text).join('|') + UI.advisorOpen;
      if (sig === UI.advSig) return;
      UI.advSig = sig;
      const box = $('advisor'); box.innerHTML = '';
      if (!W.length) return;
      const tg = document.createElement('button'); tg.type = 'button'; tg.className = 'advisor-toggle';
      tg.textContent = (UI.advisorOpen ? '▾ ' : '▸ ') + `Advisor (${W.length})`;
      tg.onclick = () => { UI.advisorOpen = !UI.advisorOpen; UI.advSig = ''; UI.renderAdvisor(); };
      box.appendChild(tg);
      if (!UI.advisorOpen) return;
      W.slice(0, 4).forEach((w) => {
        const el = document.createElement('button'); el.type = 'button';
        el.className = 'warn s' + w.sev;
        el.innerHTML = `<span class="wi">${w.icon}</span><span><div class="wt">${esc(w.text)}</div><div class="wf">${esc(w.fix)}</div></span>`;
        el.title = w.focus ? 'Show me where' : '';
        el.onclick = () => { if (w.focus) { TE.Render.centerOn(w.focus.x, w.focus.y); const b = G().buildingAt(S, w.focus.x, w.focus.y); if (b) UI.select(b.uid); } };
        box.appendChild(el);
      });
      if (W.length > 4) { const m = document.createElement('button'); m.type = 'button'; m.className = 'advisor-toggle'; m.textContent = `+${W.length - 4} more in the city report`; m.onclick = () => UI.showReport('happiness'); box.appendChild(m); }
    },

    /* ---------- Event banner ---------- */
    renderEvent() {
      const S = UI.S(), ev = S.event, el = $('eventBanner');
      document.body.classList.toggle('has-event', !!ev);
      if (!ev) { el.hidden = true; UI._evSig = ''; return; }
      const def = TE.EVENTS[ev.id];
      const left = Math.max(0, Math.ceil(ev.end - S.time));
      const sig = ev.id + ev.start + (ev.choice || '');
      if (sig !== UI._evSig) {
        UI._evSig = sig;
        el.innerHTML = `<span class="ei">${def.icon}</span><span class="en">${esc(def.name)}</span><span class="et" id="evTime"></span><span class="ed">${esc(def.desc)}<br><b>Tip:</b> ${esc(def.tip)}${ev.choice ? `<br><b>Your choice:</b> ${esc(def.choices.find((c) => c.id === ev.choice).label)}` : ''}</span>`;
        if (def.choices && !ev.choice) {
          const row = document.createElement('div'); row.className = 'ec';
          def.choices.forEach((c, i) => {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (i === 0 ? ' primary' : '');
            b.innerHTML = `${esc(c.label)}<small>${esc(c.desc)}</small>`;
            b.onclick = () => { TE.Events.choose(S, c.id); TE.Audio.play('click'); UI._evSig = ''; };
            row.appendChild(b);
          });
          el.appendChild(row);
        }
        el.hidden = false;
      }
      const t = $('evTime'); if (t) t.textContent = left + 's';
    },

    /* ---------- Side panel ---------- */
    renderSide() {
      const S = UI.S(), el = $('side');
      let sig, render;
      if (UI.sideCollapsed) {
        sig = 'collapsed';
        render = () => { el.innerHTML = '<button type="button" class="btn" id="sideOpen">📋 Objectives</button>'; $('sideOpen').onclick = () => { UI.sideCollapsed = false; UI.sideSig = ''; }; };
      } else if (UI.selectedUid && S.buildings[UI.selectedUid]) {
        const b = S.buildings[UI.selectedUid], info = S.R.b[b.uid];
        sig = 'b' + b.uid + b.type + (b.rot || 0) + ':' + b.level + ':' + Object.keys(b.perks).join() + ':' + (info.income || 0).toFixed(2) + ':' + Math.round(b.occ || 0) + ':' + Math.round(b.qs || 0) + ':' + Math.floor(S.money / 50) + ':' + (b.damagedUntil > S.time ? Math.ceil(b.damagedUntil - S.time) : 0) + ':' + S.R._id;
        render = () => UI.renderBuilding(el, b);
      } else if (UI.tileInfo) {
        sig = 't' + UI.tileInfo.join() + S.R._id + Math.floor(S.money / 50);
        render = () => UI.renderTile(el, UI.tileInfo[0], UI.tileInfo[1]);
      } else {
        const q = TE.Progress.activeQuests(S).map((x) => Math.floor(TE.Progress.metric(S, x.metric) * 10)).join();
        const lp = (TE.Progress.levelProgress(S) || []).map((p) => Math.floor(p.have)).join();
        const d = S.daily ? S.daily.items.map((it) => (it.done ? 'd' : Math.floor(TE.Progress.dailyCounter(S, it) / Math.max(1, it.target / 50)))).join() : '';
        sig = 'o' + q + lp + d + S.level + S.buffs.map((x) => Math.ceil(x.until - S.time)).join() + UI.tipIdx;
        render = () => UI.renderObjectives(el);
      }
      el.classList.toggle('collapsed', UI.sideCollapsed);
      if (sig === UI.sideSig) return;
      UI.sideSig = sig;
      const st = el.scrollTop;
      render();
      el.scrollTop = st;
    },
    closeBtn(el) {
      const c = el.querySelector('.close');
      if (c) c.onclick = () => { UI.selectedUid = null; UI.tileInfo = null; UI.sideSig = ''; if (window.innerWidth < 760) UI.sideCollapsed = true; };
    },
    renderObjectives(el) {
      const S = UI.S();
      const next = TE.Progress.nextLevel(S);
      let h = `<div class="head"><h2>${esc(TE.LEVELS[S.level - 1].name)}</h2><button type="button" class="close" title="Hide panel" id="sideHide">–</button></div>`;
      if (next) {
        h += `<div class="sec"><h3>Next: Level ${next.level} · ${esc(next.name)}</h3>`;
        TE.Progress.levelProgress(S).forEach((p) => {
          const L = TE.REQ_LABELS[p.key];
          const val = p.key === 'totalEarned' ? fmt(p.have) + ' / ' + fmt(p.need) : p.key === 'income' ? rate(p.have) + ' / ' + rate(p.need) : Math.floor(p.have) + ' / ' + p.need;
          h += `<div class="quest ${p.done ? 'done' : ''}"><span class="qt">${L[1]} ${esc(L[0])}</span><span class="qr">${val}</span><span class="qp"><i style="width:${Math.min(100, 100 * p.have / p.need)}%"></i></span></div>`;
        });
        const unl = Object.keys(TE.BUILDINGS).filter((t) => (TE.BUILDINGS[t].unlock || {}).level === next.level).map((t) => TE.BUILDINGS[t].icon + ' ' + TE.BUILDINGS[t].name);
        h += `<div class="tip">Unlocks ${esc(unl.join(', '))}${next.landCap > TE.LEVELS[S.level - 1].landCap ? ' and more land' : ''}. Reward: ${fmt(next.reward)}.</div></div>`;
      } else h += '<div class="tip">You built a Metropolis! Keep optimizing, discover every combination and build the Grand Clocktower.</div>';
      h += '<div class="sec"><h3>Objectives</h3>';
      const qs = TE.Progress.activeQuests(S);
      if (!qs.length) h += '<div class="tip">All objectives complete. Impressive!</div>';
      qs.forEach((q) => {
        const have = TE.Progress.metric(S, q.metric);
        const showHave = q.metric === 'totalEarned' || q.metric.startsWith('earned:') ? fmt(have) + ' / ' + fmt(q.target) : q.metric === 'income' ? rate(have) + ' / ' + rate(q.target) : Math.floor(have) + ' / ' + q.target;
        h += `<div class="quest"><span class="qt">${esc(q.text)}</span><span class="qr">${esc(UI.rewardText(q.reward).replace(/: .*/, ''))}</span><span class="qp"><i style="width:${Math.min(100, 100 * have / q.target)}%"></i></span><span class="qtip">${esc(showHave)}${q.tip ? ' · ' + esc(q.tip) : ''}</span></div>`;
      });
      h += '</div>';
      if (S.daily) {
        h += `<div class="sec"><h3>Daily challenges · ${esc(S.daily.date)}</h3>`;
        S.daily.items.forEach((it) => {
          const have = TE.Progress.dailyCounter(S, it);
          h += `<div class="quest ${it.done ? 'done' : ''}"><span class="qt">${esc(TE.Progress.dailyText(it))}</span><span class="qr">${it.done ? '✔' : fmt(TE.DAILY_REWARD(S.level).money)}</span><span class="qp"><i style="width:${Math.min(100, 100 * have / it.target)}%"></i></span></div>`;
        });
        h += '</div>';
      }
      const buffs = S.buffs.filter((b) => b.until > S.time);
      if (buffs.length) h += `<div class="sec"><h3>Active bonuses</h3>${buffs.map((b) => `<div class="bonus pos">⚡ ${esc(b.name)}<span class="val">+${Math.round(b.mult * 100)}% · ${Math.ceil(b.until - S.time)}s</span></div>`).join('')}</div>`;
      h += `<div class="sec"><h3>Tip</h3><div class="tip">${esc(TE.TIPS[UI.tipIdx])}</div></div>`;
      el.innerHTML = h;
      $('sideHide').onclick = () => { UI.sideCollapsed = true; UI.sideSig = ''; };
    },
    renderTile(el, x, y) {
      const S = UI.S(), t = G().tile(S, x, y);
      if (!t) { UI.tileInfo = null; return; }
      let h = `<div class="head"><h2>${t.f ? esc(TE.FEATURES[t.f].name) : t.r ? esc(TE.RESOURCES[t.r].name) : 'Empty land'}</h2><button type="button" class="close" title="Close">✕</button></div>`;
      if (t.r) h += `<div class="tip">${TE.RESOURCES[t.r].icon} ${esc(TE.RESOURCES[t.r].desc)}</div>`;
      if (t.f && TE.FEATURES[t.f].clearCost != null) h += `<div class="tip">Clear it with the bulldozer to build here.</div><button type="button" class="btn primary" id="clearBtn">🚜 Clear for ${fmt(TE.FEATURES[t.f].clearCost)}</button>`;
      if (t.f === 'pond') h += '<div class="tip">Ponds can\'t be removed. Homes next to them enjoy the view (+recreation).</div>';
      if (S.R) {
        const nd = TE.Citizens.needsAt(S, S.R, y * S.size + x);
        h += `<div class="sec"><h3>If you built a home here</h3>${UI.needsHtml(nd)}<div class="row"><span class="k">Happiness</span><span class="v">${Math.round(nd.happiness)}</span></div><div class="row"><span class="k">Noise</span><span class="v">${Math.round(nd.noise)}</span></div><div class="row"><span class="k">Road access</span><span class="v">${nd.connected ? '✔ connected' : '✖ none'}</span></div></div>`;
      }
      el.innerHTML = h;
      UI.closeBtn(el);
      const cb = $('clearBtn');
      if (cb) cb.onclick = () => { const r = G().clearFeature(S, x, y); if (r.ok) { TE.Audio.play('demolish'); TE.Render.dust(x, y); UI.sideSig = ''; } else UI.fail(r); };
    },
    needsHtml(nd) {
      return '<div class="needs">' + Object.keys(TE.NEEDS).map((k) => {
        const N = TE.NEEDS[k], on = nd.active[k], v = nd[k];
        return `<div class="need" title="${esc(N.name)}"><span class="ic">${N.icon}</span><span class="lab">${esc(N.name)}${on ? '' : ' (from level ' + N.activeFromLevel + ')'}</span><span class="nv">${on ? Math.round(v) : '—'}</span><span class="bar"><i class="${statusClass(on ? v : null)}" style="width:${on ? v : 100}%"></i></span></div>`;
      }).join('') + '</div>';
    },
    /* Extra rows for parking, traffic, power, district, water. */
    cityRows(b, def, info) {
      const S = UI.S(), R = S.R, i = b.y * S.size + b.x;
      let h = '';
      const row = (k, v, cls) => `<div class="row"><span class="k">${k}</span><span class="v ${cls || ''}">${v}</span></div>`;
      const pk = R.parking[b.uid];
      if (pk) h += row('🅿️ Parking', `${Math.round(Math.min(pk.demand, pk.street + pk.lots))} / ${Math.round(pk.demand)} spaces`, pk.ratio < 0.9 ? 'neg' : 'pos');
      if (R.lots[b.uid]) { const L = R.lots[b.uid]; h += row('🅿️ Spaces used', `${Math.round(L.used)} / ${L.cap}`, L.used >= L.cap ? 'neg' : ''); }
      const trips = TE.Transport.tripsOf(S, b);
      if (trips > 0) h += row('🚗 Car trips', `${(trips * (1 - R.transitCut[i])).toFixed(1)}${R.transitCut[i] > 0 ? ` <small class="pos">(−${Math.round(R.transitCut[i] * 100)}% transit)</small>` : ''}`);
      if (!def.road) { const jam = TE.Transport.adjacentCongestion(S, R, b.x, b.y); if (jam > 0) h += row('🚦 Street outside', `${Math.round(jam * 100)}% full`, jam > 1 ? 'neg' : jam > TE.TRAFFIC.jamStart ? '' : 'pos'); }
      const pw = TE.Utilities.powerUse(b);
      if (pw > 0) h += row('⚡ Power use', pw.toFixed(1) + (R.power.short ? ' <small class="neg">(shortage!)</small>' : ''));
      if (def.powerSupply) h += row('⚡ Power supplied', '+' + def.powerSupply, 'pos');
      const d = TE.Districts.at(S, R, b.x, b.y);
      if (d && d.type && !def.road) h += row('🗺️ District', TE.DISTRICTS[d.type].icon + ' ' + TE.DISTRICTS[d.type].name);
      if (R.floodZone && R.floodZone[i] && !def.road) h += row('🌧️ Flood risk', R.floodSafe[i] ? '✔ Protected' : '✖ Unprotected', R.floodSafe[i] ? 'pos' : 'neg');
      if (def.place === 'water' || TE.WATERFRONT[b.type]) { const p = def.place === 'water' ? R.riverPol[i] : TE.Water.nearbyRiverPollution(S, R, b.x, b.y); if (G().nearWater(S, b.x, b.y) || def.place === 'water') h += row('🌊 River', p > 25 ? `Dirty (${Math.round(p)})` : 'Clean', p > 25 ? 'neg' : 'pos'); }
      return h;
    },
    /* Panel for streets, paths and bridges: traffic and conversions. */
    renderRoad(el, b) {
      const S = UI.S(), def = TE.BUILDINGS[b.type], R = S.R, i = b.y * S.size + b.x;
      let h = `<div class="head"><span id="sideIcon"></span><div><h2>${esc(def.name)}</h2><div class="sub">${def.road.walk ? 'For pedestrians' : 'Capacity ' + def.road.cap + ' · ' + (def.road.parking ? def.road.parking + ' street parking spaces' : 'no street parking')}</div></div><button type="button" class="close" title="Close (Esc)">✕</button></div>`;
      h += `<div class="tip">${esc(def.desc)}</div>`;
      if (!def.road.walk) {
        const c = R.cong[i] || 0;
        h += `<div class="sec"><h3>Traffic</h3><div class="big-income ${c > 1 ? 'neg' : ''}" style="color:${c > 1 ? 'var(--brick)' : c > TE.TRAFFIC.jamStart ? 'var(--ok)' : 'var(--teal)'}">${Math.round(c * 100)}% full</div>
          <div class="row"><span class="k">Cars per minute (load)</span><span class="v">${(R.load[i] || 0).toFixed(1)} / ${def.road.cap}</span></div>
          <div class="row"><span class="k">Connected to Town Hall</span><span class="v ${R.roadConn[i] ? 'pos' : 'neg'}">${R.roadConn[i] ? '✔ Yes' : '✖ No'}</span></div>
          ${c > 1 ? '<div class="bonus neg">🚗 Jammed: nearby homes are unhappy and businesses lose customers.</div>' : ''}</div>`;
        const opts = G().roadOptions(b);
        if (opts.length) {
          h += '<div class="sec"><h3>Change road type</h3>';
          opts.forEach((t) => {
            const d2 = TE.BUILDINGS[t], ok = G().isUnlocked(S, t);
            h += `<div class="perk"><span class="ic">${d2.icon}</span><span class="t">${esc(d2.name)}</span><span class="d">${esc(d2.road.cap + ' capacity · ' + (d2.road.parking ? d2.road.parking + ' parking' : 'no parking'))}${ok ? '' : ' · ' + esc(G().unlockStatus(S, t).missing.join(', '))}</span><button type="button" class="btn primary" data-road="${t}" ${!ok || S.money < d2.cost ? 'disabled' : ''}>${fmt(d2.cost)}</button></div>`;
          });
          h += '</div>';
        }
      }
      h += `<div class="btn-row"><button type="button" class="btn danger" id="demoBtn">🚜 Remove (+${fmt(Math.floor(b.spent * TE.BALANCE.demolishRefund))})</button></div>`;
      el.innerHTML = h;
      $('sideIcon').replaceWith(UI.icon(b.type, 64));
      UI.closeBtn(el);
      el.querySelectorAll('button[data-road]').forEach((btn) => {
        btn.onclick = () => {
          const r = G().convertRoad(S, b, btn.dataset.road);
          if (r.ok) { TE.Audio.play('upgrade'); TE.Render.dust(b.x, b.y); UI.toast(`Converted to ${TE.BUILDINGS[b.type].name}`, 'good', TE.BUILDINGS[b.type].icon); UI.dirtyPanels(); }
          else UI.fail(r);
        };
      });
      $('demoBtn').onclick = () => UI.doDemolish(b);
    },
    rotate() {
      const S = UI.S();
      if (UI.tool === 'build') { UI.rot = UI.rot ? 0 : 1; UI.manualRot = true; UI.previewCache = null; TE.Audio.play('click'); return; }
      const b = UI.selectedUid && S.buildings[UI.selectedUid];
      if (b) { const r = G().rotate(S, b); if (r.ok) { TE.Audio.play('click'); UI.sideSig = ''; } }
    },
    renderBuilding(el, b) {
      const S = UI.S(), def = TE.BUILDINGS[b.type], info = S.R.b[b.uid];
      if (def.road) return UI.renderRoad(el, b);
      const maxL = G().maxLevel(b.type);
      let h = `<div class="head"><span id="sideIcon"></span><div><h2>${esc(def.name)}</h2><div class="sub">${maxL > 1 ? `Level ${b.level}/${maxL} · ` : ''}${esc(def.cat[0].toUpperCase() + def.cat.slice(1))}</div></div><button type="button" class="close" title="Close (Esc)">✕</button></div>`;
      if (b.damagedUntil > S.time) h += `<div class="bonus neg">🔥 Closed by fire for ${Math.ceil(b.damagedUntil - S.time)}s<button type="button" class="btn primary" id="repairBtn" style="margin-left:auto">Repair ${fmt(G().repairCost(b))}</button></div>`;
      // Income / upkeep
      if (def.income || def.residents) h += `<div class="sec"><div class="big-income">+${rate(info.income || 0)}</div>`;
      else if (info.upkeep) h += `<div class="sec"><div class="big-income neg">−${rate(info.upkeep)} upkeep</div>`;
      else h += '<div class="sec">';
      h += `<div class="row"><span class="k">Construction value</span><span class="v">${fmt(b.spent)}</span></div>`;
      if (info.upkeep && (def.income || def.residents)) h += `<div class="row"><span class="k">Upkeep</span><span class="v neg">−${rate(info.upkeep)}</span></div>`;
      if (!def.residents && def.income) {
        h += `<div class="row"><span class="k">Base output (Lv ${b.level})</span><span class="v">${rate(info.base)}</span></div>`;
        const df = TE.Economy.demandFactor(S.R, def), D = S.R.totals.demand;
        if (def.customers) h += `<div class="row"><span class="k">Customers available</span><span class="v ${df < 1 ? 'neg' : 'pos'}">${Math.round(D.shopRatio * 100)}% → ×${df.toFixed(2)}</span></div>`;
        if (def.workers) h += `<div class="row"><span class="k">Workers available</span><span class="v ${df < 1 ? 'neg' : 'pos'}">${Math.round(D.workRatio * 100)}% → ×${df.toFixed(2)}</span></div>`;
      }
      if (def.income || def.residents) h += `<div class="row"><span class="k">City multiplier</span><span class="v">×${S.R.totals.globalMult.mult.toFixed(2)}</span></div>`;
      h += `<div class="row"><span class="k">Road access</span><span class="v ${info.connected ? 'pos' : 'neg'}">${info.connected ? '✔ Connected' : '✖ Not connected'}</span></div>`;
      h += UI.cityRows(b, def, info) + '</div>';
      // Residents
      if (def.residents && info.needs) {
        const cap = TE.Citizens.capacity(b), target = TE.Citizens.targetRatio(b) * cap;
        const trend = target > b.occ + 0.3 ? '▲ growing' : target < b.occ - 0.3 ? '▼ shrinking' : '● stable';
        h += `<div class="sec"><h3>Households</h3>
          <div class="row"><span class="k">Residents</span><span class="v">${Math.round(b.occ)} / ${Math.round(cap)} <small class="${trend[0] === '▲' ? 'pos' : trend[0] === '▼' ? 'neg' : ''}">${trend}</small></span></div>
          <div class="row"><span class="k">Neighborhood</span><span class="v">${esc(info.nb.name)}</span></div>
          <div class="row"><span class="k">Quality</span><span class="v">${Math.round(b.qs)} <small>(→ ${Math.round(info.quality)})</small></span></div>
          <div class="row"><span class="k">Happiness · Safety</span><span class="v">${Math.round(info.needs.happiness)} · ${Math.round(info.needs.safety)}</span></div>
          ${def.expectation ? `<div class="tip">Residents here expect quality above ${def.expectation + 20} to move in.</div>` : ''}
          ${b.neglected ? '<div class="bonus neg">🏚️ Neglected: few residents. Nearby homes feel less safe.</div>' : ''}
          ${info.nb.notes.map((n) => `<div class="bonus ${n.v > 0 ? 'pos' : 'neg'}">${esc(n.text)}<span class="val">${n.v > 0 ? '+' : ''}${n.v}</span></div>`).join('')}
        </div><div class="sec"><h3>Needs</h3>${UI.needsHtml(info.needs)}</div>`;
        const fixes = Object.keys(TE.NEEDS).filter((k) => info.needs.active[k] && info.needs[k] < TE.NEED_THRESHOLDS.good).sort((a, c) => info.needs[a] - info.needs[c]);
        if (info.needs.noise >= 12) fixes.push('noise');
        if (fixes.length) h += `<div class="sec"><h3>How to improve</h3><ul class="fixlist">${fixes.map((k) => `<li>${k === 'noise' ? '🔊 Noise ' + Math.round(info.needs.noise) + ': plant trees or parks between this home and roads/industry.' : TE.NEEDS[k].icon + ' ' + esc(TE.NEEDS[k].fix)}</li>`).join('')}</ul></div>`;
        const i = b.y * S.size + b.x, F = S.R.f;
        const svc = [['🚓 Police', F.police[i]], ['🚒 Fire', F.fire[i]], ['🏥 Hospital', F.hospital[i]], ['🛒 Grocery', F.grocery[i]], ['🎓 School', F.school[i]], ['📚 Library', F.library[i]], ['🌳 Parks & play', Math.min(1, F.rec[i])], ['🚌 Public transport', S.R.transit[i]], ['💡 Streetlights', Math.min(1, F.lights[i] / 2)]];
        h += `<div class="sec"><h3>Nearby services</h3>${svc.map(([n, v]) => `<div class="row"><span class="k">${n}</span><span class="v ${v > 0 ? 'pos' : 'neg'}">${v > 0 ? Math.round(v * 100) + '%' : 'none'}</span></div>`).join('')}</div>`;
      }
      // Service coverage
      if (def.service) {
        let homes = 0;
        S.R.homes.forEach((uid) => { const hb = S.buildings[uid]; const d = Math.hypot(hb.x - b.x, hb.y - b.y); if (d <= def.service.radius + b.level - 1 + 0.5) homes++; });
        h += `<div class="sec"><h3>Coverage</h3><div class="row"><span class="k">Radius</span><span class="v">${def.service.radius + b.level - 1} tiles${!info.connected && ['police', 'fire', 'hospital'].indexOf(def.service.kind) >= 0 ? ' (halved: no road!)' : ''}</span></div><div class="row"><span class="k">Homes in range</span><span class="v">${homes}</span></div><div class="tip">The colored area on the map shows where it helps.</div></div>`;
      }
      // Bonuses
      const bon = (info.bonuses || []).filter((x) => Math.abs(x.value) > 0.001);
      if (def.income || def.residents) {
        h += '<div class="sec"><h3>Neighbor bonuses & effects</h3>';
        if (!bon.length) h += '<div class="tip">No bonuses yet. Hover the cards below to see what this building likes.</div>';
        bon.forEach((x) => { h += `<div class="bonus ${x.value > 0 ? 'pos' : 'neg'}">${x.icon} ${esc(x.label)}<span class="val">${pct(x.value)}</span></div>`; });
        if (b.perks.automation) h += '<div class="bonus pos">⚙️ Automation<span class="val">base ×1.3</span></div>';
        h += '</div>';
      }
      // Negative effects it causes
      const neg = [];
      if (def.emits && def.emits.pollution) {
        let n = 0; S.R.homes.forEach((uid) => { const hb = S.buildings[uid]; if (Math.max(Math.abs(hb.x - b.x), Math.abs(hb.y - b.y)) <= def.emits.pollution[1]) n++; });
        neg.push(`🏭 Pollutes within ${def.emits.pollution[1]} tiles${b.perks.filters ? ' (filtered −60%)' : ''}: ${n} home${n === 1 ? '' : 's'} affected`);
      }
      if (def.emits && def.emits.noise && b.type !== 'road') neg.push(`🔊 Noise within ${def.emits.noise[1]} tile${def.emits.noise[1] > 1 ? 's' : ''}`);
      if (def.upkeep) neg.push(`💸 Upkeep ${rate(info.upkeep)}`);
      TE.SYNERGIES.forEach((r) => { if (r.per < 0 && G().matches(b.type, r.source)) neg.push(`${r.icon} ${r.label}: −${Math.round(-r.per * 100)}% to nearby ${r.target.replace('tag:', '')} (${r.radius} tiles)`); });
      if (neg.length) h += `<div class="sec"><h3>Side effects</h3>${neg.map((t) => `<div class="bonus neg">${esc(t)}</div>`).join('')}</div>`;
      // Combos
      const combos = (S.R.membership[b.uid] || []).map((id) => TE.Combos.byId(id));
      if (combos.length) h += `<div class="sec"><h3>Part of</h3>${combos.map((c) => `<div class="bonus pos">${c.icon} ${esc(c.name)}<span class="val">${esc(c.effects.income ? pct(c.effects.income) : '')}</span></div>`).join('')}</div>`;
      // Upgrades
      const upCost = G().upgradeCost(S, b);
      if (maxL > 1) {
        h += '<div class="sec"><h3>Upgrades</h3>';
        if (upCost != null) {
          let gain = '';
          if (def.residents) gain = `+${Math.round(def.residents * (TE.BALANCE.residentCapMult[b.level] - TE.BALANCE.residentCapMult[b.level - 1]))} residents capacity`;
          else if (def.service) gain = `+1 tile coverage, upkeep → ${rate(def.upkeep * TE.BALANCE.serviceUpkeepMult[b.level])}`;
          else if (def.income) {
            const lm = TE.BALANCE.levelIncomeMult;
            const g = info.base * (lm[b.level] / lm[b.level - 1] - 1) * info.mult * TE.Economy.demandFactor(S.R, def) * S.R.totals.globalMult.mult;
            gain = `+${rate(g)} income (better equipment)`;
          }
          h += `<div class="perk"><span class="ic">⬆️</span><span class="t">Level ${b.level + 1}</span><span class="d">${esc(gain)}</span><button type="button" class="btn primary" id="upBtn" ${S.money < upCost ? 'disabled' : ''}>${fmt(upCost)}</button></div>`;
        } else h += '<div class="bonus pos">⭐ Max level reached</div>';
        G().perksFor(b.type).forEach((pid) => {
          const p = TE.PERKS[pid], owned = b.perks[pid], cost = G().perkCost(b, pid), lockd = b.level < p.minLevel;
          h += `<div class="perk ${owned ? 'owned' : ''}"><span class="ic">${p.icon}</span><span class="t">${esc(p.name)}</span><span class="d">${esc(p.desc)}${lockd ? ` Needs level ${p.minLevel}.` : ''}</span>${owned ? '<span class="btn" style="grid-row:span 2">✔</span>' : `<button type="button" class="btn primary" data-perk="${pid}" ${lockd || S.money < cost ? 'disabled' : ''}>${fmt(cost)}</button>`}</div>`;
        });
        h += '</div>';
      }
      if (!def.fixed && !def.road) h += `<div class="btn-row"><button type="button" class="btn" id="rotBtn" title="Rotate (R)">🔄 Rotate</button><button type="button" class="btn" id="moveBtn">📦 Relocate</button><button type="button" class="btn danger" id="demoBtn">🚜 Demolish (+${fmt(Math.floor(b.spent * TE.BALANCE.demolishRefund))})</button></div>`;
      el.innerHTML = h;
      $('sideIcon').replaceWith(UI.icon(b.type, 64));
      UI.closeBtn(el);
      const up = $('upBtn');
      if (up) up.onclick = () => {
        const r = G().upgrade(S, b);
        if (r.ok) { TE.Audio.play('upgrade'); TE.Render.burst(b.x, b.y, ['#ffd60a', '#80ffdb', '#ffffff'], 16, 30); TE.Render.floatText(b.x, b.y, `Level ${b.level}!`, '#ffd60a', 13, TE.Render.heightOf(b.type, b.level) + 10); UI.dirtyPanels(); }
        else UI.fail(r);
      };
      el.querySelectorAll('button[data-perk]').forEach((btn) => {
        btn.onclick = () => {
          const r = G().buyPerk(S, b, btn.dataset.perk);
          if (r.ok) { TE.Audio.play('upgrade'); TE.Render.burst(b.x, b.y, ['#c77dff', '#ffffff'], 14, 30); TE.Render.floatText(b.x, b.y, TE.PERKS[btn.dataset.perk].icon + ' ' + TE.PERKS[btn.dataset.perk].name, '#e0aaff', 11, 40); UI.dirtyPanels(); }
          else UI.fail(r);
        };
      });
      const rb = $('rotBtn'); if (rb) rb.onclick = () => { G().rotate(S, b); TE.Audio.play('click'); UI.sideSig = ''; };
      const mv = $('moveBtn'); if (mv) mv.onclick = () => { UI.setTool('move'); UI.moveUid = b.uid; UI.toast('Click an empty tile to move it there (free). Esc cancels.', 'gold', '📦'); };
      const dm = $('demoBtn'); if (dm) dm.onclick = () => UI.doDemolish(b);
      const rp = $('repairBtn'); if (rp) rp.onclick = () => UI.doRepair(b);
    },

    /* ---------- Dialogs ---------- */
    modal(html, cls) {
      const m = $('modal'), card = m.querySelector('.modal-card');
      card.className = 'modal-card ' + (cls || '');
      card.innerHTML = html;
      m.hidden = false;
      const close = card.querySelector('[data-close]');
      if (close) setTimeout(() => close.focus(), 30);
      card.querySelectorAll('[data-close]').forEach((b) => { b.onclick = () => UI.closeModal(); });
      m.onclick = (e) => { if (e.target === m && !UI._modalLocked) UI.closeModal(); };
      return card;
    },
    closeModal() {
      $('modal').hidden = true;
      if (UI._modalResolve) { const r = UI._modalResolve; UI._modalResolve = null; r(false); }
      UI._modalLocked = false;
      if (UI._queue && UI._queue.length) { const next = UI._queue.shift(); setTimeout(next, 150); }
    },
    /* Celebration dialogs wait for each other instead of replacing each other. */
    queueModal(fn) {
      UI._queue = UI._queue || [];
      if (UI.modalOpen()) UI._queue.push(fn); else fn();
    },
    modalOpen() { return !$('modal').hidden; },
    confirm(o) {
      return new Promise((resolve) => {
        if (UI._modalResolve) UI._modalResolve(false);
        const card = UI.modal(`<div class="mhead"><span style="font-size:30px">${o.icon || '❓'}</span><h2>${esc(o.title)}</h2></div><p>${esc(o.body)}</p>
          <div class="btn-row"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn ${o.danger ? 'danger' : 'primary'}" id="yesBtn">${esc(o.yes || 'OK')}</button></div>`, 'narrow');
        UI._modalResolve = resolve;
        card.querySelector('#yesBtn').onclick = () => { UI._modalResolve = null; $('modal').hidden = true; resolve(true); };
        setTimeout(() => card.querySelector('#yesBtn').focus(), 30);
      });
    },
    showDiscovery(c) {
      UI.modal(`<div class="discover" style="display:flex;flex-direction:column;gap:10px"><div class="big">${c.icon}</div><h3>New combination discovered!</h3><h2>${esc(c.name)}</h2><p>${esc(c.desc)}</p><p class="pos" style="font-weight:800">+${fmt(c.reward)} reward · ongoing bonus active</p><button type="button" class="btn primary" data-close>Awesome!</button></div>`, 'narrow');
    },
    showLevelUp(n) {
      const items = n.unlocks.map((t) => `<div class="bonus">${TE.BUILDINGS[t].icon} ${esc(TE.BUILDINGS[t].name)}</div>`).join('');
      const land = TE.LEVELS[n.level - 1].landCap - (TE.LEVELS[n.level - 2] ? TE.LEVELS[n.level - 2].landCap : 0);
      UI.modal(`<div class="discover" style="display:flex;flex-direction:column;gap:10px"><div class="big">⭐</div><h3>City level ${n.level}</h3><h2>${esc(n.name)}</h2><p>Your city is growing! Reward: <b>${fmt(n.reward)}</b>${land > 0 ? ` · ${land > 100 ? 'all remaining' : land} more land expansion${land > 1 ? 's' : ''} available` : ''}.</p>${items ? `<h3>New buildings</h3><div class="grid2" style="width:100%">${items}</div>` : ''}<button type="button" class="btn primary" data-close>Let's build!</button></div>`, 'narrow');
      const S = UI.S();
      G().eachBuilding(S, (b) => { if (b.type === 'townhall') TE.Render.burst(b.x, b.y, ['#ffd60a', '#ff006e', '#3a86ff', '#80ffdb'], 40, 40); });
    },
    showCollection() {
      const S = UI.S();
      const found = Object.keys(S.discovered).length;
      const active = {}; (S.R.combos || []).forEach((c) => { active[c.id] = (active[c.id] || 0) + 1; });
      const cards = TE.COMBOS.map((c) => S.discovered[c.id]
        ? `<div class="combo-card found"><span class="ci">${c.icon}</span><span class="cn">${esc(c.name)} ${active[c.id] ? `<small class="pos">· ${active[c.id]} active</small>` : ''}</span><span class="cd">${esc(c.desc)} Reward: ${fmt(c.reward)}.</span></div>`
        : `<div class="combo-card unknown"><span class="ci">${c.icon}</span><span class="cn">??? Undiscovered</span><span class="cd">Hint: ${esc(c.hint)}</span></div>`).join('');
      UI.modal(`<div class="mhead"><h2>✨ Combinations</h2><button type="button" class="close" data-close>✕</button></div><p>${found} of ${TE.COMBOS.length} discovered. Place the right buildings within 2 tiles of each other. While building, ✨ marks tiles that complete a secret combo.</p><div class="grid2" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${cards}</div>`);
    },
    showStats() {
      const S = UI.S(), T = S.R.totals, st = S.stats;
      const owned = {}; G().eachBuilding(S, (b) => { const c = TE.BUILDINGS[b.type].cat; if (b.type !== 'road' && b.type !== 'townhall') owned[c] = (owned[c] || 0) + 1; });
      const mins = Math.floor(st.playTime / 60);
      const stat = (k, v) => `<div class="stat"><div class="sv">${v}</div><div class="sk">${k}</div></div>`;
      // City health: one meter per city-wide quantity, green = good
      const R = S.R, tr = T.traffic || {}, pk = T.parking || {}, pw = T.power || {};
      let homesWithTransit = 0, homes = 0;
      (R.homes || []).forEach((uid) => { const b = S.buildings[uid]; if (!b) return; homes++; if (R.transit && R.transit[b.y * S.size + b.x] > 0.2) homesWithTransit++; });
      const congestion = tr.roads ? Math.round(100 * Math.min(1, tr.avg || 0)) : 0;
      const health = [
        ['😊', 'Happiness', Math.round(T.happiness), T.happiness / 100, `${Math.floor(T.population)} residents · room for ${Math.floor(T.capacity)}`],
        ['🛡️', 'Safety', Math.round(T.safety), T.safety / 100, 'Police, fire stations, streetlights and road access'],
        ['🏭', 'Pollution', Math.round(T.pollution), 1 - T.pollution / 60, `Average at homes ${Math.round(T.avgHomePollution)}`],
        ['🚗', 'Traffic', congestion + '%', 1 - Math.min(1, tr.avg || 0), `${tr.jammed || 0} of ${tr.roads || 0} streets jammed · ${Math.round(tr.removed || 0)} car trips taken by bus, train or bike`],
        ['🅿️', 'Parking', pk.need > 0 ? Math.round(100 * Math.min(1, pk.ratio)) + '%' : '—', pk.need > 0 ? Math.min(1, pk.ratio) : 1, pk.need > 0 ? `${Math.round(pk.have)} spaces for ${Math.round(pk.need)} cars` : 'No busy shops or offices yet'],
        ['⚡', 'Power', `${Math.round(pw.demand || 0)}/${Math.round(pw.supply || 0)}`, Math.min(1, pw.ratio == null ? 1 : pw.ratio), pw.short ? 'Shortage: build a Power Plant or Solar Farm' : 'Enough supply'],
        ['🌊', 'River', Math.round(100 - Math.min(100, T.river || 0)) + '% clean', 1 - Math.min(1, (T.river || 0) / 40), 'Factories near the water pollute it downstream'],
        ['🚌', 'Public transport', homes ? Math.round(100 * homesWithTransit / homes) + '%' : '—', homes ? homesWithTransit / homes : 0, 'Homes in reach of a bus stop or train station'],
      ];
      const tone = (v) => (v >= 0.65 ? 'var(--good)' : v >= 0.4 ? 'var(--ok)' : 'var(--bad)');
      const healthHtml = health.map(([ic, k, v, frac, note]) => `<div class="stat"><div class="sk">${ic} ${esc(k)}</div><div class="sv">${esc(v)}</div><i class="meter wide"><i style="width:${Math.round(Math.max(0.03, Math.min(1, frac)) * 100)}%;background:${tone(frac)}"></i></i><div class="sk">${esc(note)}</div></div>`).join('');
      const dcount = {}; (R.districts || []).forEach((d) => { if (d.type && TE.DISTRICTS[d.type] && S.chunks[d.cy * G().chunkCount(S) + d.cx]) dcount[d.type] = (dcount[d.type] || 0) + 1; });
      const dHtml = Object.keys(dcount).map((k) => `<div class="bonus">${TE.DISTRICTS[k].icon || ''} ${esc(TE.DISTRICTS[k].name)}<span class="val">${dcount[k]}</span></div>`).join('');
      UI.modal(`<div class="mhead"><h2>📊 City statistics</h2><button type="button" class="close" data-close>✕</button></div>
        <h3>City health</h3><div class="grid2">${healthHtml}</div>
        ${dHtml ? `<h3>Neighborhoods</h3><div class="grid2">${dHtml}</div>` : ''}
        <h3>Progress</h3>
        <div class="grid2">${[
          stat('Total money earned', fmt(S.totalEarned)), stat('Net income', rate(T.net)), stat('Peak income', rate(st.peakIncome)),
          stat('Population', Math.floor(T.population)), stat('Buildings owned', Object.keys(S.buildings).length - G().count(S, 'road') - 1), stat('Roads', G().count(S, 'road')),
          stat('Combos discovered', Object.keys(S.discovered).length + ' / ' + TE.COMBOS.length), stat('Combos formed', st.combosFormed), stat('Upgrades bought', st.upgrades),
          stat('Land expansions', S.expansions), stat('Objectives done', Object.keys(S.questsDone).length + ' / ' + TE.QUESTS.length), stat('Events handled', st.eventsHandled),
          stat('Fires contained', st.firesContained), stat('Demolished', st.demolished), stat('Time played', mins >= 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + ' min'),
        ].join('')}</div>
        <h3>Buildings by category</h3><div class="grid2">${Object.keys(owned).map((c) => `<div class="bonus"><span style="width:10px;height:10px;border-radius:3px;background:${TE.CATEGORY_COLORS[c]}"></span>${esc(c)}<span class="val">${owned[c]}</span></div>`).join('')}</div>
        <h3>Money earned by category</h3><div class="grid2">${Object.keys(S.earnedByCat).filter((c) => S.earnedByCat[c] > 1).map((c) => `<div class="bonus">${esc(c)}<span class="val">${fmt(S.earnedByCat[c])}</span></div>`).join('')}</div>
        ${S.eventLog.length ? `<h3>Recent events</h3>${S.eventLog.slice(0, 5).map((e) => `<div class="bonus ${e.good ? 'pos' : 'neg'}">${TE.EVENTS[e.id].icon} ${esc(e.text)}</div>`).join('')}` : ''}`);
    },
    showIncome() {
      const S = UI.S(), T = S.R.totals, D = T.demand;
      const cats = Object.keys(T.byCat).filter((c) => T.byCat[c] > 0.001).sort((a, b) => T.byCat[b] - T.byCat[a]);
      UI.modal(`<div class="mhead"><h2>📈 Income</h2><button type="button" class="close" data-close>✕</button></div>
        <div class="grid2"><div class="stat"><div class="sv pos">+${rate(T.gross)}</div><div class="sk">Gross income</div></div><div class="stat"><div class="sv neg">−${rate(T.upkeep)}</div><div class="sk">Service upkeep</div></div><div class="stat"><div class="sv">${rate(T.net)}</div><div class="sk">Net income</div></div></div>
        <h3>By category</h3>${cats.map((c) => `<div class="bonus">${esc(c)}<span class="val">${rate(T.byCat[c])}</span></div>`).join('')}
        <h3>City multiplier ×${T.globalMult.mult.toFixed(2)}</h3>${T.globalMult.parts.map((p) => `<div class="bonus ${p.value >= 0 ? 'pos' : 'neg'}">${esc(p.label)}<span class="val">${pct(p.value)}</span></div>`).join('')}
        <h3>Demand</h3>
        <div class="bonus ${D.shopFactor < 1 ? 'neg' : 'pos'}">🛍️ Customers for shops & leisure: ${Math.round(D.customers)} of ${Math.round(D.need)} needed<span class="val">×${D.shopFactor.toFixed(2)}</span></div>
        <div class="bonus ${D.workFactor < 1 ? 'neg' : 'pos'}">👷 Workers for offices & industry: ${Math.round(D.workers)} of ${Math.round(D.jobs)} needed<span class="val">×${D.workFactor.toFixed(2)}</span></div>
        <p class="tip">Every resident is a customer (plus ${TE.BALANCE.baseCustomers} visitors) and 70% of residents work. Hotels bring ${TE.BALANCE.customersPerHotel} tourists each. Upgraded businesses serve more people.</p>`);
    },
    /* City report: explains happiness, safety and pollution with clear causes. */
    showReport(focus) {
      const S = UI.S(), R = S.R, T = R.totals, F = R.f, C = TE.CITIZENS;
      const pens = { traffic: 0, river: 0, power: 0 };
      let pop = 0; const need = {}, safe = { police: 0, lights: 0, fire: 0, neglect: 0, road: 0, combo: 0 }; let noise = 0, mods = 0;
      Object.keys(TE.NEEDS).forEach((k) => { need[k] = 0; });
      R.homes.forEach((uid) => {
        const b = S.buildings[uid], nd = R.b[uid].needs, w = b.occ || 0, i = b.y * S.size + b.x;
        pop += w;
        Object.keys(TE.NEEDS).forEach((k) => { need[k] += (nd.active[k] ? nd[k] : 60) * w; });
        noise += nd.pen.noise * w; mods += nd.mods * w; pens.traffic += nd.pen.traffic * w; pens.river += nd.pen.river * w; pens.power += nd.pen.power * w;
        safe.police += C.policeSafety * F.police[i] * w; safe.lights += C.lightSafety * Math.min(C.maxLights, F.lights[i]) * w;
        safe.fire += C.fireSafety * F.fire[i] * w; safe.neglect += C.neglectSafety * Math.min(2, Math.max(0, F.neglect[i] - (b.neglected ? 1.5 : 0))) * w;
        safe.road += (nd.connected ? 0 : C.noRoadSafety) * w; safe.combo += ((R.comboFx[uid] || {}).safety || 0) * w;
      });
      const avg = (v) => (pop ? v / pop : 0);
      const wsum = Object.keys(TE.NEEDS).reduce((a, k) => a + TE.NEEDS[k].weight, 0);
      const bar = (label, v, scale, unit) => {
        const w = Math.min(50, Math.abs(v) / scale * 50);
        return `<div class="rbar"><span>${label}</span><span class="track"><span class="mid"></span><i style="left:${v >= 0 ? 50 : 50 - w}%;width:${w}%;background:${v >= 0 ? 'var(--good)' : 'var(--bad)'}"></i></span><span class="rv ${v >= 0 ? 'pos' : 'neg'}">${v >= 0 ? '+' : ''}${v.toFixed(1)}${unit || ''}</span></div>`;
      };
      let happyBars = '', safeBars = '';
      if (pop > 0) {
        Object.keys(TE.NEEDS).forEach((k) => {
          const N = TE.NEEDS[k], a = avg(need[k]);
          happyBars += bar(`${N.icon} ${N.name} (${Math.round(a)})`, (a - 50) * N.weight / wsum, 12);
        });
        happyBars += bar('🔊 Noise', -avg(noise), 12);
        happyBars += bar('🚗 Traffic jams', -avg(pens.traffic), 12);
        happyBars += bar('🌊 Dirty river', -avg(pens.river), 12);
        happyBars += bar('⚡ Power cuts', -avg(pens.power), 12);
        happyBars += bar('🎉 Combos, events, landmarks', avg(mods), 12);
        safeBars = [bar('Base safety', C.baseSafety - 50, 30), bar('🚓 Police coverage', avg(safe.police), 30), bar('💡 Streetlights', avg(safe.lights), 30),
          bar('🚒 Fire coverage', avg(safe.fire), 30), bar('🏚️ Neglected homes', avg(safe.neglect), 30), bar('🚧 Homes without roads', avg(safe.road), 30), bar('🛡️ Safe Streets combos', avg(safe.combo), 30)].join('');
      }
      const factories = []; G().eachBuilding(S, (b) => { const d = TE.BUILDINGS[b.type]; if (d.emits && d.emits.pollution) factories.push(b); });
      const nbs = R.neighborhoods.map((n) => `<div class="nb-row"><span>🏘️ ${esc(n.name)} <small>(${n.members.length} homes)</small></span><span>👥 ${Math.round(n.pop)}</span><span class="${n.quality >= 65 ? 'pos' : n.quality < 40 ? 'neg' : ''}">Q ${Math.round(n.quality)}</span></div>`).join('');
      const warns = (R.warnings || []).map((w) => `<div class="warn s${w.sev}" style="box-shadow:none"><span class="wi">${w.icon}</span><span><div class="wt">${esc(w.text)}</div><div class="wf">${esc(w.fix)}</div></span></div>`).join('');
      const sections = {
        happiness: `<h3>😊 Happiness ${Math.round(T.happiness)} — what moves it (points vs. a neutral 50)</h3>${pop ? `<div class="report-bars">${happyBars}</div><p class="tip">City income bonus from happiness: ${pct((T.happiness - 50) * TE.BALANCE.happinessIncomeFactor)}.</p>` : '<p class="tip">Build homes to get residents.</p>'}`,
        safety: `<h3>🛡️ Safety ${Math.round(T.safety)} — where it comes from</h3>${pop ? `<div class="report-bars">${safeBars}</div><p class="tip">Police and emergency coverage is halved when the station or the home has no road to the Town Hall.</p>` : ''}`,
        pollution: `<h3>🏭 Pollution ${Math.round(T.pollution)}</h3><div class="bonus">Average pollution where residents live<span class="val">${Math.round(T.avgHomePollution)}</span></div><div class="bonus">Citywide smog from all industry<span class="val">${R.smog.toFixed(1)}</span></div><div class="bonus">Polluting buildings<span class="val">${factories.length}</span></div><div class="bonus">Dirtiest river stretch<span class="val">${Math.round(R.riverMax || 0)}</span></div><p class="tip">Parks (−15 within 2 tiles) and trees (−6 next to them) absorb pollution. Busy streets pollute too (EV chargers cut that by 35%). Industry within 2 tiles of the river dumps waste that flows downstream; Recycling Centers on the bank halve it.</p>`,
        traffic: UI.trafficReport(),
        neighborhoods: `<h3>🏘️ Neighborhoods</h3>${nbs || '<p class="tip">No neighborhoods yet.</p>'}<p class="tip">Quality combines happiness, safety, clean air, quiet and road access. High quality fills homes (more tax) and unlocks Apartments (55) and Luxury Condos (72).</p>`,
      };
      const order = [focus].concat(Object.keys(sections).filter((k) => k !== focus));
      UI.modal(`<div class="mhead"><h2>City report</h2><button type="button" class="close" data-close>✕</button></div>${order.map((k) => sections[k]).join('')}${warns ? `<h3>Advisor</h3>${warns}` : ''}`);
    },
    trafficReport() {
      const S = UI.S(), R = S.R, T = R.totals, tr = R.trafficStats, pk = R.parkingStats, pw = R.power;
      const row = (k, v, cls) => `<div class="bonus ${cls || ''}">${k}<span class="val">${v}</span></div>`;
      let h = '<h3>🚗 Traffic, parking & power</h3>';
      h += row('Average street use', Math.round(tr.avg * 100) + '%', tr.avg > TE.TRAFFIC.jamStart ? 'neg' : 'pos');
      h += row('Jammed streets', tr.jammed + ' of ' + tr.roads, tr.jammed ? 'neg' : 'pos');
      h += row('Car trips (after transit)', Math.round(tr.trips - tr.removed) + ' of ' + Math.round(tr.trips));
      h += row('Trips taken by bus, train & bike', tr.trips ? Math.round(100 * tr.removed / tr.trips) + '%' : '0%', tr.removed > 0 ? 'pos' : '');
      h += row('Parking spaces where needed', pk.need ? Math.round(pk.ratio * 100) + '% (' + Math.round(pk.have) + ' of ' + Math.round(pk.need) + ')' : 'no demand', pk.ratio < 0.9 ? 'neg' : 'pos');
      h += row('Power used / supplied', Math.round(pw.demand) + ' / ' + Math.round(pw.supply), pw.short ? 'neg' : 'pos');
      const hd = TE.Citizens.housingDemand(S, R);
      if (hd > 0) h += row('People who want to move in', hd, 'pos');
      h += '<p class="tip">Every home, shop and office sends car trips onto the streets next to it. A street holds 10, an avenue 26, a roundabout 32. Bus stops (−25% trips within 4 tiles), train stations (−40% within 7) and bike lanes (−12% within 2) take cars off the road and reduce the parking businesses need.</p>';
      return h;
    },
    showMenu() {
      const S = UI.S();
      const card = UI.modal(`<div class="mhead"><h2>☰ Menu</h2><button type="button" class="close" data-close>✕</button></div>
        <div class="btn-row"><button type="button" class="btn primary" data-close>▶ Resume</button><button type="button" class="btn" id="mSave">💾 Save now</button><button type="button" class="btn" id="mLoad">📂 Load last save</button></div>
        <h3>Settings</h3>
        ${[['confirm', 'Confirm expensive purchases & demolitions'], ['floaters', 'Show floating income numbers'], ['arrows', 'Show upgrade arrows above buildings'], ['bubbles', 'Show unmet-need bubbles above homes'], ['dayNight', 'Day & night cycle'], ['floods', 'River floods (events)'], ['sound', 'Sound effects'], ['autosave', 'Autosave every 30 seconds']]
          .map(([k, l]) => `<label class="setting" for="set_${k}">${esc(l)}<input type="checkbox" id="set_${k}" data-set="${k}" ${S.settings[k] !== false ? 'checked' : ''}></label>`).join('')}
        <h3>Your city code</h3>
        <p class="tip">Copy this code to back up your city or move it to another browser. Paste a code and press Import to load it.</p>
        <textarea id="mCode" spellcheck="false" aria-label="City code"></textarea>
        <div class="btn-row"><button type="button" class="btn" id="mExport">📋 Copy code</button><button type="button" class="btn" id="mImport">📥 Import code</button></div>
        ${window.HW_BUILD && window.HW_BUILD.home != null ? `<a class="btn" href="${esc(window.HW_BUILD.home)}">← Back to Bas Games</a>` : ''}
        <h3>Help</h3>
        <div class="btn-row"><button type="button" class="btn" id="mHelp">❓ How to play</button><button type="button" class="btn danger" id="mNew">🌱 Start a new city</button></div>`);
      card.querySelectorAll('input[data-set]').forEach((i) => { i.onchange = () => { S.settings[i.dataset.set] = i.checked; }; });
      const code = card.querySelector('#mCode');
      code.value = TE.Save.exportCode(S);
      card.querySelector('#mSave').onclick = () => { UI.saveGame(true); };
      card.querySelector('#mLoad').onclick = () => {
        const L = TE.Save.load();
        if (!L) return UI.toast('No saved city found in this browser.', 'bad');
        TE.Main.startWith(L); UI.closeModal(); UI.toast('Loaded your last save.', 'good', '📂');
      };
      card.querySelector('#mExport').onclick = () => {
        code.value = TE.Save.exportCode(S);
        const done = () => UI.toast('City code copied to the clipboard.', 'good', '📋');
        try { navigator.clipboard.writeText(code.value).then(done, () => { code.select(); UI.toast('Code selected — press Ctrl+C to copy.', 'gold'); }); }
        catch (e) { code.select(); UI.toast('Code selected — press Ctrl+C to copy.', 'gold'); }
      };
      card.querySelector('#mImport').onclick = () => {
        try { const L = TE.Save.importCode(code.value); TE.Main.startWith(L); UI.closeModal(); UI.toast('City imported!', 'good', '📥'); }
        catch (e) { UI.toast('That code could not be read. Paste the full code and try again.', 'bad'); }
      };
      card.querySelector('#mHelp').onclick = () => UI.showHelp();
      card.querySelector('#mNew').onclick = async () => {
        const ok = await UI.confirm({ title: 'Start a new city?', icon: '🌱', body: 'Your current city will be replaced. Copy your city code first if you want to keep it.', yes: 'Start over', danger: true });
        if (ok) { TE.Save.clear(); TE.Main.startWith(TE.Game.newState()); UI.showWelcome(); }
      };
    },
    saveGame(loud) {
      const ok = TE.Save.save(UI.S());
      if (loud) UI.toast(ok ? 'City saved in this browser.' : 'Saving is blocked in this browser. Use the city code in the menu instead.', ok ? 'good' : 'bad', '💾');
      return ok;
    },
    showHelp() {
      UI.modal(`<div class="mhead"><h2>❓ How to play</h2><button type="button" class="close" data-close>✕</button></div>
        <p><b>Build</b> — pick a building in the tray at the bottom and click a green tile. Hover first: the tooltip previews its income, neighbor bonuses and effects. Bright green tiles are the best spots; ✨ marks a tile that completes a secret combination.</p>
        <p><b>Combine</b> — buildings earn more next to the right neighbors (bakeries love homes, offices love coffee) and less next to the wrong ones (cafés hate factories). Certain groups form discoverable <b>combinations</b> with permanent bonuses.</p>
        <p><b>Roads & traffic</b> — every building sends car trips onto the streets next to it. Red streets are jammed: click one to upgrade it to an Avenue or Roundabout, or add Bus Stops, Train Stations and Bike Lanes. Shops and offices need parking: build Parking Lots or Garages nearby.</p>
        <p><b>The river</b> — cross it with Road Bridges (cars, fire trucks) or Footbridges (people). Build promenades, waterfront parks and marinas on the bank. Industry next to the water pollutes everything downstream, and floods hit unprotected buildings on the bank unless you build Flood Barriers.</p>
        <p><b>Care for citizens</b> — homes need safety, healthcare, education, recreation, shops, jobs and clean air. Happy, safe neighborhoods fill up and pay more tax; poor ones slowly empty. Click a home to see what it needs.</p>
        <p><b>Grow</b> — reach the goals in the right panel to level up your city, unlock buildings and buy more land with the 🏷️ button.</p>
        <h3>Controls</h3>
        <div class="kbd-list"><kbd>Click</kbd><span>Build / select</span><kbd>Drag</kbd><span>Pan the map (or paint roads & trees with those tools)</span><kbd>Wheel</kbd><span>Zoom</span><kbd>1–5</kbd><span>Pick a building from the current tab</span><kbd>R</kbd><span>Rotate the building you're placing (or the selected one)</span><kbd>T</kbd><span>Street tool</span><kbd>B</kbd><span>Bulldozer</span><kbd>O</kbd><span>Cycle overlays</span><kbd>Space</kbd><span>Pause / resume</span><kbd>Ctrl+Z</kbd><span>Undo last placement</span><kbd>Esc</kbd><span>Cancel / close</span><kbd>WASD</kbd><span>Pan</span></div>
        <button type="button" class="btn primary" data-close>Got it</button>`);
    },
    showWelcome() {
      UI.modal(`<div class="discover" style="display:flex;flex-direction:column;gap:12px"><div class="big">🏘️</div><h2>Welcome to Tiny Empire</h2>
        <p>You have <b>$1,000</b>, a town hall and a little crossroads. Turn it into a thriving metropolis.</p>
        <div class="grid2" style="width:100%;text-align:left">
          <div class="bonus">🏠 Build a few homes</div><div class="bonus">🥐 Put a bakery next to them</div>
          <div class="bonus">🌳 Add a park for happy residents</div><div class="bonus">✨ Discover combinations</div></div>
        <p class="tip">A river runs just east of town: buy the land, cross it with a bridge and build a waterfront. Hover any tile while building to preview the money it makes. Your progress saves automatically.</p>
        <div class="btn-row" style="width:100%"><button type="button" class="btn" id="wHelp">How to play</button><button type="button" class="btn primary" data-close>Start building</button></div></div>`, 'narrow');
      $('wHelp').onclick = () => UI.showHelp();
      UI.S().seenIntro = true;
    },
    showOffline(o) {
      const mins = Math.round(o.seconds / 60);
      UI.modal(`<div class="discover" style="display:flex;flex-direction:column;gap:10px"><div class="big">🌙</div><h2>Welcome back!</h2><p>While you were away (${mins >= 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + ' min'}), your city earned</p><div class="big-income">+${fmt(o.amount)}</div><p class="tip">Offline earnings are ${Math.round(TE.BALANCE.offlineIncomeRate * 100)}% of your net income, up to ${TE.BALANCE.offlineMaxSeconds / 3600} hours.</p><button type="button" class="btn primary" data-close>Collect</button></div>`, 'narrow');
    },
  };
  /* Is there any purchasable land chunk left right now? */
  TE.Game.chunkStatusAny = function (S) {
    const cc = TE.Game.chunkCount(S);
    for (let cy = 0; cy < cc; cy++) for (let cx = 0; cx < cc; cx++) if (TE.Game.chunkStatus(S, cx, cy).ok) return true;
    return false;
  };
  TE.UI = UI;
})(window.TE = window.TE || {});
