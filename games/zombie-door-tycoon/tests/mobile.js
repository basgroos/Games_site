/* Device detection + touch controls (phone / tablet / computer) in jsdom with faked browser hints. */
const { loadPage, ok } = require('./helpers');
const UA = {
  phone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  tablet: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
};
function page(kind, W, H) {
  const touch = kind !== 'desktop';
  return loadPage({ before: (w) => {
    Object.defineProperty(w.navigator, 'userAgent', { value: UA[kind], configurable: true });
    Object.defineProperty(w.navigator, 'maxTouchPoints', { value: touch ? 5 : 0, configurable: true });
    w.matchMedia = (q) => ({ matches: /coarse/.test(q) ? touch : /hover: hover/.test(q) ? !touch : false, addListener() {}, removeListener() {} });
    Object.defineProperty(w, 'innerWidth', { value: W, configurable: true }); Object.defineProperty(w, 'innerHeight', { value: H, configurable: true });
    Object.defineProperty(w, 'screen', { value: { width: W, height: H }, configurable: true });
  } });
}
const ptr = (w, el, type, x, y) => { const e = new w.Event(type, { bubbles: true, cancelable: true }); Object.assign(e, { pointerId: 9, pointerType: 'touch', clientX: x, clientY: y, button: 0 }); el.dispatchEvent(e); };
(async () => {
  console.log('Zombie Door Tycoon — telefoon / tablet / computer');
  for (const [kind, W, H, want] of [['phone', 844, 390, 'phone'], ['android', 915, 412, 'phone'], ['tablet', 1180, 820, 'tablet'], ['desktop', 1400, 860, 'desktop']]) {
    const { w, E, errors } = page(kind, W, H);
    await new Promise((r) => setTimeout(r, 200));
    ok(E('G.Device.type') === want && w.document.body.classList.contains('dev-' + want), kind + ' → ' + want);
    ok(E('G.Device.touch') === (want !== 'desktop'), kind + ': touch controls ' + (want !== 'desktop' ? 'on' : 'off'));
    E('G.Profile.d.seenHelp = true'); const mc = w.document.getElementById('mClose'); if (mc) mc.click();
    E("G.Game.start('city','easy')");
    E("(function(){var m=G.Game.match;m.claimTimer=0.01;for(var k=0;k<5;k++)m.update(G.TICK);})()");
    const joy = w.document.getElementById('hJoy');
    ok(!!joy === (want !== 'desktop'), kind + ': joystick ' + (joy ? 'shown' : 'hidden'));
    if (joy) {
      joy.getBoundingClientRect = () => ({ left: 0, top: 0, width: 120, height: 120 });
      ptr(w, joy, 'pointerdown', 60, 60); ptr(w, joy, 'pointermove', 110, 60);
      ok(E('G.Game.match.players[0].kx') === 1 && E('G.Game.match.players[0].ky') === 0, kind + ': joystick walks right');
      ptr(w, joy, 'pointerup', 110, 60);
      ok(E('G.Game.match.players[0].kx') === 0, kind + ': releasing stops');
      const z = E('G.Game.zoom'); w.document.querySelector('#hAct [data-a="zoomin"]').click();
      ok(E('G.Game.zoom') > z, kind + ': zoom button');
      w.document.querySelector('#hAct [data-a="score"]').click();
      ok(!w.document.getElementById('hScore').classList.contains('hidden'), kind + ': scoreboard button');
      ok(!/druk op/i.test(w.document.getElementById('hHint').innerHTML), kind + ': hints talk about tapping, not keys');
    }
    ok(!errors.length, kind + ': no errors');
  }
  // manual override in the settings
  const { E } = page('desktop', 1400, 860);
  await new Promise((r) => setTimeout(r, 200));
  E("G.Profile.d.settings.device = 'phone'; G.Device.apply()");
  ok(E('G.Device.type') === 'phone' && E('G.Device.detected') === 'desktop', 'device can be chosen by hand in the settings');
  console.log('mobile OK');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
