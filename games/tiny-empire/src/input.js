/* =====================================================================
   INPUT — mouse, touch and keyboard: camera pan & zoom, clicks,
   drag-painting roads/trees, keyboard shortcuts.
   ===================================================================== */
(function (TE) {
  'use strict';
  const Input = {
    init(canvas) {
      const UI = TE.UI, Rn = TE.Render;
      const pointers = new Map();
      let drag = null, pinch = null, stroke = 0, lastPaint = null;
      const paintable = () => UI.tool === 'build' && !!(TE.BUILDINGS[UI.buildType] && TE.BUILDINGS[UI.buildType].paint);
      const rel = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

      canvas.addEventListener('pointerdown', (e) => {
        canvas.setPointerCapture(e.pointerId);
        const [sx, sy] = rel(e);
        pointers.set(e.pointerId, [sx, sy]);
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), zoom: Rn.cam.zoom };
          drag = null; return;
        }
        const panButton = e.button === 1 || e.button === 2;
        drag = { sx, sy, camX: Rn.cam.x, camY: Rn.cam.y, moved: false, pan: panButton, button: e.button, paint: !panButton && (paintable() || (UI.tool === 'bulldoze' && e.pointerType === 'mouse')) };
        if (drag.paint) {
          stroke++;
          const t = Rn.screenToTile(sx, sy);
          lastPaint = t.join();
          if (UI.tool === 'bulldoze') { /* bulldozer acts on click; drag clears roads */ } else UI.clickAt(t, null, { stroke });
        }
      });
      canvas.addEventListener('pointermove', (e) => {
        const [sx, sy] = rel(e);
        if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [sx, sy]);
        if (pinch && pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          Rn.cam.zoom = pinch.zoom * d / pinch.d; Rn.clampCam(TE.S);
          return;
        }
        if (drag) {
          const dx = sx - drag.sx, dy = sy - drag.sy;
          if (Math.hypot(dx, dy) > 6) drag.moved = true;
          if (drag.paint && !drag.pan) {
            const t = Rn.screenToTile(sx, sy), k = t.join();
            if (k !== lastPaint) {
              lastPaint = k;
              if (UI.tool === 'bulldoze') {
                const b = TE.Game.buildingAt(TE.S, t[0], t[1]);
                if (b && TE.BUILDINGS[b.type].road) UI.doDemolish(b, stroke);
              } else UI.clickAt(t, null, { stroke });
            }
            UI.hoverAt(t, e.clientX, e.clientY, null);
            return;
          }
          if (drag.moved) {
            Rn.cam.x = drag.camX - dx / Rn.cam.zoom; Rn.cam.y = drag.camY - dy / Rn.cam.zoom; Rn.clampCam(TE.S);
            canvas.style.cursor = 'grabbing';
            TE.UI.hideTip();
            return;
          }
        }
        const t = Rn.screenToTile(sx, sy);
        const picked = UI.tool === 'select' || UI.tool === 'bulldoze' ? Rn.pickBuilding(TE.S, sx, sy) : null;
        const key = t.join() + ':' + (picked ? picked.uid : '');
        if (key !== Input._hk || UI.tool === 'build') { Input._hk = key; UI.hoverAt(TE.Game.inBounds(TE.S, t[0], t[1]) ? t : null, e.clientX, e.clientY, picked); }
        else if (!document.getElementById('tooltip').hidden) UI.showTip(document.getElementById('tooltip').innerHTML, e.clientX, e.clientY);
      });
      const end = (e) => {
        const [sx, sy] = rel(e);
        pointers.delete(e.pointerId);
        if (pinch) { if (pointers.size < 2) pinch = null; drag = null; return; }
        if (!drag) return;
        const d = drag; drag = null;
        UI.setTool(UI.tool); // restore cursor
        if (d.pan) { if (!d.moved && d.button === 2 && UI.tool !== 'select') UI.setTool('select'); return; }
        if (d.paint) { if (UI.tool === 'bulldoze' && !d.moved) { const t = Rn.screenToTile(sx, sy); UI.clickAt(t, Rn.pickBuilding(TE.S, sx, sy)); } return; }
        if (d.moved) return;
        const t = Rn.screenToTile(sx, sy);
        const picked = (UI.tool === 'select' || UI.tool === 'bulldoze') ? Rn.pickBuilding(TE.S, sx, sy) : null;
        UI.clickAt(TE.Game.inBounds(TE.S, t[0], t[1]) ? t : null, picked);
        Input._hk = null;
      };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); drag = null; pinch = null; });
      canvas.addEventListener('pointerleave', () => { if (!drag) { UI.hover = null; UI.hideTip(); } });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const [sx, sy] = rel(e);
        const [wx, wy] = Rn.screenToWorld(sx, sy);
        Rn.cam.zoom *= Math.exp(-e.deltaY * 0.0015);
        Rn.clampCam(TE.S);
        // keep the point under the cursor fixed
        const [wx2, wy2] = Rn.screenToWorld(sx, sy);
        Rn.cam.x += wx - wx2; Rn.cam.y += wy - wy2;
      }, { passive: false });

      const keys = {};
      window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        const k = e.key.toLowerCase();
        if (UI.modalOpen()) { if (k === 'escape') UI.closeModal(); return; }
        if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); UI.undo(); return; }
        if (k === 'escape') {
          if (UI.tool !== 'select') UI.setTool('select');
          else if (UI.selectedUid || UI.tileInfo) { UI.selectedUid = null; UI.tileInfo = null; UI.sideSig = ''; }
          else UI.showMenu();
          return;
        }
        if (k === ' ') { e.preventDefault(); UI.setSpeed(0); return; }
        if (k === 'o') { UI.cycleOverlay(); return; }
        if (k === 'r') { UI.rotate(); return; }
        if (k === 't') { UI.selectBuild('road'); return; }
        if (k === 'b') { UI.setTool(UI.tool === 'bulldoze' ? 'select' : 'bulldoze'); return; }
        if (k === '+' || k === '=') { Rn.cam.zoom *= 1.15; Rn.clampCam(TE.S); return; }
        if (k === '-') { Rn.cam.zoom /= 1.15; Rn.clampCam(TE.S); return; }
        if (/^[1-9]$/.test(k)) {
          const menu = TE.MENU.find((m) => m.id === UI.tab);
          const type = menu.items[+k - 1];
          if (type) UI.selectBuild(type);
          return;
        }
        keys[k] = true;
      });
      window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
      Input.keys = keys;
    },
    /* Keyboard panning, called every frame. */
    update(dt) {
      const k = Input.keys || {}, Rn = TE.Render, sp = 520 * dt / Rn.cam.zoom;
      if (k.w || k.arrowup) Rn.cam.y -= sp;
      if (k.s || k.arrowdown) Rn.cam.y += sp;
      if (k.a || k.arrowleft) Rn.cam.x -= sp;
      if (k.d || k.arrowright) Rn.cam.x += sp;
      if (k.w || k.s || k.a || k.d || k.arrowup || k.arrowdown || k.arrowleft || k.arrowright) Rn.clampCam(TE.S);
    },
  };
  TE.Input = Input;
})(window.TE = window.TE || {});
