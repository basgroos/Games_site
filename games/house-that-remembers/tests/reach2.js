/* Part II: every object you can interact with must actually show its prompt when you stand next to it and look at it
   (nothing hidden inside a table top or behind its own visible model). */
const { boot, sleep, check, done } = require('./lib');
const errors = []; const w = boot('Reach', errors), E = s => w.eval(s);
(async () => {
  E("Game.setPart(2); $('btnNew').click()"); await sleep(200); E("T.step(7); T.close(); Story.p2ApplyPower(true)");
  const res = E(`(() => {
    const out = [];
    const items = W.interact.filter(m => m.userData.it && m.userData.it.id && /^(p2|mem)/.test(m.userData.it.id));
    const seen = {};
    for (const m of items) {
      const id = m.userData.it.id; if (seen[id]) continue;
      W.scene.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(m); const c = bb.getCenter(new THREE.Vector3());
      const lv = c.y < -1 ? -1 : 0; let ok = false;
      for (const dist of [1.0, 1.5, 0.7]) for (let k = 0; k < 16 && !ok; k++) {
        const a = k / 16 * Math.PI * 2; const px = c.x + Math.sin(a) * dist, pz = c.z + Math.cos(a) * dist;
        for (const cr of [false, true]) {
          P.crouch = cr; T.tp(px, lv, pz, 0); T.step(.1);
          for (let it = 0; it < 3; it++) { const cp = G.camera.position; const dx = c.x - cp.x, dy = c.y - cp.y, dz = c.z - cp.z; P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(dy, Math.hypot(dx, dz)); T.step(.05); }
          W.scene.updateMatrixWorld(true); updateInteraction();
          if (P.look && P.look.id === id && Math.hypot(P.pos.x - px, P.pos.z - pz) < .3) { ok = true; break; }
        }
      }
      P.crouch = false;
      seen[id] = ok; if (!ok) out.push(id + ' @' + c.toArray().map(v => v.toFixed(2)).join(','));
    }
    return { fail: out, n: Object.keys(seen).length };
  })()`);
  check(res.n > 40, 'all Part II things to interact with were found', res.n);
  check(!res.fail.length, 'every one of them shows its prompt when you walk up and look at it', res.fail);
  done(errors, 'Part II reachability test');
})();
