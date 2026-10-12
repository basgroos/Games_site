/* =====================================================================
   MAIN — boots the game and runs the frame loop.
   ===================================================================== */
(function (TE) {
  'use strict';
  const Main = {
    startWith(S) {
      TE.S = S;
      TE.Sim.init(S);
      TE.UI.shownMoney = S.money;
      TE.UI.selectedUid = null; TE.UI.tileInfo = null;
      TE.UI.setTool('select');
      TE.UI.buildCards();
      TE.UI.dirtyPanels();
      // Center the camera on the town hall
      TE.Game.eachBuilding(S, (b) => { if (b.type === 'townhall') TE.Render.centerOn(b.x, b.y); });
    },
    boot(hotData) {
      const canvas = document.getElementById('game');
      TE.Render.init(canvas);
      let S = null, loaded = false;
      if (hotData && hotData.save) { try { S = TE.Save.deserialize(hotData.save); loaded = true; } catch (e) { S = null; } }
      if (!S) { S = TE.Save.load(); loaded = !!S; }
      if (!S) S = TE.Game.newState();
      TE.S = S;
      TE.Sim.init(S);
      TE.UI.init();
      TE.Input.init(canvas);
      Main.startWith(S);
      if (hotData && hotData.cam) Object.assign(TE.Render.cam, hotData.cam);
      if (loaded && !(hotData && hotData.save)) {
        const off = TE.Save.offlineEarnings(S);
        if (off) { S.money += off.amount; S.totalEarned += off.amount; TE.UI.shownMoney = S.money - off.amount; TE.UI.showOffline(off); }
      }
      if (!S.seenIntro) TE.UI.showWelcome();
      // Keep state across live updates of the page (artifact viewer hot reload)
      if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
        try { window.claude.hot.snapshot(() => ({ save: TE.Save.serialize(TE.S), cam: Object.assign({}, TE.Render.cam) })); } catch (e) { /* optional */ }
      }
      window.addEventListener('beforeunload', () => { if (TE.S.settings.autosave) TE.Save.save(TE.S); });
      document.addEventListener('visibilitychange', () => { if (document.hidden && TE.S.settings.autosave) TE.Save.save(TE.S); });
      Main.last = performance.now();
      Main.autosaveAt = 0;
      requestAnimationFrame(Main.loop);
    },
    loop(now) {
      const dt = Math.min(0.1, (now - Main.last) / 1000);
      Main.last = now;
      const S = TE.S, UI = TE.UI;
      try {
        const simDt = UI.paused || UI.modalOpen() && UI._modalResolve ? 0 : dt * UI.speed;
        TE.Sim.step(S, simDt);
        TE.Sim.ensure(S);
        UI.processNotes();
        TE.Input.update(dt);
        UI.frame(dt);
        TE.Render.draw(S, UI.view(), dt);
        Main.autosaveAt += dt;
        if (Main.autosaveAt > TE.BALANCE.autosaveSeconds) { Main.autosaveAt = 0; if (S.settings.autosave) TE.Save.save(S); }
      } catch (err) {
        console.error(err);
      }
      requestAnimationFrame(Main.loop);
    },
  };
  TE.Main = Main;
  function start(data) { Main.boot(data); }
  function go() {
    const hot = window.claude && window.claude.hot;
    if (hot && hot.ready) hot.ready(start); else start(hot && hot.data ? hot.data : null);
  }
  /* On the Bas Games site the build script calls boot() itself (window.HW_BUILD is set). */
  window.boot = go;
  if (!window.HW_BUILD) {
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', go); else go();
  }
})(window.TE = window.TE || {});
