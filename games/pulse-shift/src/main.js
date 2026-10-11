// =============================================================
//  MAIN — boots the game and runs the loop.
//  boot() is called by the Bas Games build (scripts/build.js).
// =============================================================
function boot() {
  PS.Profile.load();

  const canvas = document.getElementById('game');
  const game = (PS.game = new PS.Game(canvas));

  PS.Input.init();
  PS.Menus.init();

  // global shortcuts
  PS.Input.onAction = (a) => {
    const el = document.activeElement;
    if (el && el.tagName === 'INPUT') return; // typing a name or room code
    if (a === 'pause') {
      if (game.state === 'playing' && game.coop && PS.Menus.current === 'pause') game.resume();
      else if (game.state === 'playing') game.pause();
      else if (game.state === 'paused' && PS.Menus.current === 'pause') game.resume();
    }
    if (a === 'retry' && game.state === 'results') game.restart();
  };

  // auto-pause when the tab is hidden
  document.addEventListener('visibilitychange', () => { if (document.hidden && !game.coop) game.pause(); });

  // keep a 16:9 canvas that fills the window, sharp on high-DPI screens
  function resize() {
    const s = Math.min(window.innerWidth / PS.CONFIG.width, window.innerHeight / PS.CONFIG.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = Math.floor(PS.CONFIG.width * s) + 'px';
    canvas.style.height = Math.floor(PS.CONFIG.height * s) + 'px';
    canvas.width = Math.floor(PS.CONFIG.width * s * dpr);
    canvas.height = Math.floor(PS.CONFIG.height * s * dpr);
    document.documentElement.style.setProperty('--ui-scale', s.toFixed(3));
  }
  window.addEventListener('resize', resize);
  resize();

  PS.Menus.show('title');

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); // clamp big gaps (tab switch, lag spikes)
    last = now;
    game.update(dt);
    game.draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
