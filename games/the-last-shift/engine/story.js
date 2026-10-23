// Verhaal, puzzels, scripted horror-momenten, checkpoints en de twee eindes.
import * as THREE from 'three';
import { scratchMat, signMat } from './textures.js';

const ROMAN = ['I', 'II', 'III', 'IV'];

// Kandidaatplekken voor de gekraste cijfers (wereldpositie op de muur + rotatie + hint)
const SCRATCH_SPOTS = [
  { g: 0, room: 'officeA', x: 11.01, y: 0.75, z: 7.4, rot: Math.PI / 2, hint: 'Kantoor A — laag op de westmuur, tussen de bureaus.' },
  { g: 0, room: 'officeB', x: 25.6, y: 1.05, z: 1.01, rot: 0, hint: 'Kantoor B — onder het raam aan de noordkant.' },
  { g: 0, room: 'security', x: 9.99, y: 1.25, z: 8.6, rot: -Math.PI / 2, hint: 'De beveiligingsruimte — naast het prikbord.' },
  { g: 0, room: 'lobby', x: 2.6, y: 0.8, z: 11.01, rot: 0, hint: 'De hal — bij het dichtgelaste trappenhuis.' },
  { g: 1, room: 'archive', x: 41.99, y: 1.2, z: 12.4, rot: -Math.PI / 2, hint: 'Het archief — achterin, oostmuur.' },
  { g: 1, room: 'passage', x: 47.01, y: 1.3, z: 24.5, rot: Math.PI / 2, hint: 'De natte dienstgang achter de serverruimte.' },
  { g: 2, room: 'toilets', x: 17.99, y: 1.45, z: 26.8, rot: -Math.PI / 2, hint: 'De toiletten — in het middelste hokje.' },
  { g: 2, room: 'kantine', x: 27.4, y: 1.0, z: 28.99, rot: Math.PI, hint: 'De kantine — zuidmuur, achter de tafels.' },
  { g: 3, room: 'storage', x: 37.4, y: 1.2, z: 28.99, rot: Math.PI, hint: 'De opslag — achterste hoek.' },
  { g: 3, room: 'dock', x: 1.01, y: 1.3, z: 28.2, rot: Math.PI / 2, hint: 'De laaddock — westmuur, achter de pallets.' },
  { g: 3, room: 'service', x: 27.5, y: 1.2, z: 30.01, rot: 0, hint: 'De achtergang — halverwege, bij de plas.' },
];

export class Story {
  constructor(game) {
    this.g = game; this.flags = {}; this.timers = []; this.fearBias = 0;
    this.items = {}; this.amb = {};
    this.lf = {}; // lokale vlaggen: persoonlijke scares, niet gedeeld in co-op
    this.readHooks = {}; this.itemDefs = {};
  }
  get L() { return this.g.level; }
  get host() { return !this.g.isGuest(); }
  // ---- alle spelers (co-op) voor verhaal-triggers ----
  players() { return this.g.net.allPlayers(); }
  anyInRoom(id) { return this.players().some((q) => { const r = this.L.roomAt(q.pos.x, q.pos.z); return r && r.id === id; }); }
  anyNear(x, z, r) { return this.players().some((q) => Math.hypot(q.pos.x - x, q.pos.z - z) < r); }
  anyLooking(x, y, z, cosMin = 0.9, maxD = 30) {
    return this.players().some((q) => { const dx = x - q.eye.x, dy = y - q.eye.y, dz = z - q.eye.z, d = Math.hypot(dx, dy, dz); return d <= maxD && (dx * q.dir.x + dy * q.dir.y + dz * q.dir.z) / Math.max(0.01, d) > cosMin && this.L.hasLOS(q.eye.x, q.eye.z, x, z); });
  }
  after(t, fn) { this.timers.push({ t, fn }); }
  // ======================================================================
  build() {
    const g = this.g, L = this.L, M = g.M;
    // ----- spiegel: figuur alleen zichtbaar in de reflectie -----
    const mir = L.named.mirror, orig = mir.onBeforeRender;
    mir.onBeforeRender = (r, sc, cam) => {
      const mg = this.mirrorGhost, e = g.enemy;
      if (!mg) { orig.call(mir, r, sc, cam); return; }
      const save = { vis: e.root.visible, x: e.pos.x, z: e.pos.z, ry: e.root.rotation.y };
      e.root.visible = true; e.pos.set(mg.x, 0, mg.z); e.root.rotation.y = Math.atan2(g.player.pos.x - mg.x, g.player.pos.z - mg.z);
      e.root.updateMatrixWorld(true);
      orig.call(mir, r, sc, cam);
      e.root.visible = save.vis; e.pos.set(save.x, 0, save.z); e.root.rotation.y = save.ry; e.root.updateMatrixWorld(true);
    };
    // ----- willekeurige code -----
    const pick = (grp) => { const c = SCRATCH_SPOTS.filter((s) => s.g === grp); return c[Math.floor(Math.random() * c.length)]; };
    const spots = [pick(0), pick(1), pick(2), pick(3)];
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    let digits; do { digits = [0, 1, 2, 3].map(() => Math.floor(Math.random() * 10)); } while (new Set(digits).size < 3 || digits[0] === 0);
    this.scratches = spots.map((s, i) => ({ ...s, spot: SCRATCH_SPOTS.indexOf(s), idx: order[i], roman: ROMAN[order[i]], digit: digits[order[i]] }));
    this.code = digits.join('');

    // ----- beveiligingsruimte -----
    this.noteObj('logbook', this.paperMesh(0.3, 0.22, '#d8d0b8', true), L.named.logbookPos, 'Logboek nachtdienst', this.logbookHTML(), { rot: 0.2 });
    // sleutelkastje
    this.onKeyTech = () => {
      this.flags.keyTech = true;
      g.sfx('key_jingle', { pos: { x: 1.3, y: 1.4, z: 4.5 }, volume: 0.6 });
      this.objective('Ga naar de technische ruimte (oostkant van de hoofdgang) en zet de stroom aan.');
    };
    g.addInteract(L.named.keyBox, {
      local: true,
      prompt: () => (this.flags.keyTech ? null : 'Sleutelkastje openen'),
      enabled: () => !this.flags.keyTech,
      use: () => this.takeItem('key_tech', this.keyMesh('#c8a64a', 'TECHN.'), 'Sleutel technische ruimte', 'Een messing sleutel met label "TECHN. — HOOFDVERDEELKAST". Het label is in een ander handschrift overgeschreven.', this.onKeyTech),
    });
    // ----- stoppenkast / hoofdschakelaar -----
    this.flags.grp = [true, false, true]; this.flags.main = false;
    const bp = L.named.breakerPanel;
    this.switches = [];
    const mkSwitch = (z, y, big, label, idx) => {
      const g0 = new THREE.Group(); g0.position.set(48.82, y, z); L.dynamic.add(g0);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.04, big ? 0.22 : 0.12, big ? 0.12 : 0.07), M.darkMetal); g0.add(base);
      const lever = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.18 : 0.08, big ? 0.04 : 0.025, big ? 0.05 : 0.03), big ? M.red : M.beigePlastic);
      lever.position.x = -0.05; g0.add(lever);
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.06), signMat([[label, 60, true]], { w: 256, h: 96, bg: '#ddd8c4' })); lab.rotation.y = -Math.PI / 2; lab.position.set(-0.025, big ? -0.17 : -0.1, 0); g0.add(lab);
      const sw = { g: g0, lever, big, idx };
      this.switches.push(sw);
      g.addInteract(g0, { prompt: () => (big ? (this.flags.main ? 'Hoofdschakelaar uitzetten' : 'Hoofdschakelaar aanzetten') : `Groep ${label} ${this.flags.grp[idx] ? 'uit' : 'aan'}zetten`), enabled: () => this.flags.keyTechUsed !== undefined || true, use: () => this.useSwitch(sw) });
      return sw;
    };
    mkSwitch(3.95, 1.55, true, 'HOOFD', -1);
    mkSwitch(4.45, 1.55, false, 'I', 0); mkSwitch(4.7, 1.55, false, 'II', 1); mkSwitch(4.95, 1.55, false, 'III', 2);
    const sticker = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), signMat([['LET OP', 34, true], ['1. Eerst ALLE groepen UIT', 22], ['2. Dan hoofdschakelaar AAN', 22], ['3. Groepen één voor één AAN', 22]], { w: 384, h: 256, bg: '#f0e6b0' }));
    sticker.rotation.y = -Math.PI / 2; sticker.position.set(48.83, 1.12, 4.5); L.dynamic.add(sticker);
    this.noteHit(sticker, 'Etiket op de verdeelkast', '<p><b>LET OP — VOLGORDE BIJ INSCHAKELEN</b></p><p>1. Eerst <b>alle groepen UIT</b> (I, II, III).<br>2. Dan de <b>hoofdschakelaar AAN</b>.<br>3. Daarna de groepen <b>één voor één</b> inschakelen.</p><p>Bij verkeerde volgorde slaat de hoofdschakelaar direct af (overbelasting).</p><p class="hand">— groep I = hal, west, kantine &nbsp;·&nbsp; II = oost/archief &nbsp;·&nbsp; III = zuid/server</p>');
    this.updateSwitchVisuals();

    // ----- controleklokken -----
    this.clocks = [
      { id: 'officeA', x: 19.98, y: 1.4, z: 3.0, rot: -Math.PI / 2, name: 'Kantoor A' },
      { id: 'kantine', x: 28.98, y: 1.4, z: 22.6, rot: -Math.PI / 2, name: 'Kantine' },
      { id: 'toilets', x: 11.02, y: 1.4, z: 25.5, rot: Math.PI / 2, name: 'Toiletten' },
    ];
    for (const c of this.clocks) {
      const grp = new THREE.Group(); grp.position.set(c.x, c.y, c.z); grp.rotation.y = c.rot; L.dynamic.add(grp);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.1), M.darkMetal); b.position.z = 0.05; grp.add(b);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), signMat([['CONTROLE', 40, true], [c.name.toUpperCase(), 30]], { w: 256, h: 128, bg: '#c9c2a8' })); face.position.set(0, 0.06, 0.101); grp.add(face);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), M.yellow); slot.position.set(0, -0.06, 0.105); grp.add(slot);
      g.addInteract(grp, { prompt: () => (this.flags['stamp_' + c.id] ? 'Al gestempeld' : 'Stempelen'), enabled: () => this.flags.chapter >= 2, use: () => this.stamp(c) });
    }
    // ----- kantine-telefoon -----
    g.addInteract(L.named.kantinePhone.group, { local: true, prompt: () => (this.flags.phoneRinging ? 'Opnemen' : 'Hoorn opnemen'), use: () => this.answerPhone() });
    // ----- flessen (gooibaar) -----
    for (const [x, y, z] of [[19.35, 0.94, 21.4], [19.3, 0.94, 21.7], [8.0, 0.0, 29.2], [37.9, 0.8, 22.45], [31.3, 1.09, 17.3], [44.8, 0, 31.3]]) {
      const b = this.bottleMesh(); b.position.set(x, y, z); L.dynamic.add(b);
      const id = 'bottle_' + x + '_' + z;
      g.addInteract(b, { prompt: () => 'Oppakken: lege fles', enabled: () => !this.flags.taken?.[id], use: () => {
        if (!g.inv.add('bottle', 'Lege fles', 'Gooi met linkermuisknop of Q om geluid te maken en de aandacht af te leiden.', true)) return;
        g.sfx('bottle_clink', { volume: 0.5 }); (this.flags.taken ||= {})[id] = true; b.visible = false;
        if (!this.flags.bottleHint) { this.flags.bottleHint = true; g.ui.toast('Fles opgepakt — gooien met linkermuisknop of Q. Het geluid lokt de aanwezigheid weg.', 6); }
      } });
      this.items[id] = b;
    }
    // ----- kantoor B: ladekast met de archiefsleutel -----
    const dc = L.named.drawerCabinet;
    dc.drawers.forEach((d, i) => {
      g.addInteract(d.front, { prompt: () => (d.open ? 'Lade sluiten' : 'Lade openen'), use: () => this.toggleDrawer(d, i) });
    });
    const bottom = dc.drawers[0];
    const key = this.keyMesh('#9aa0a6', 'ARCHIEF'); key.position.set(0.08, 0.18, -0.2); key.rotation.set(-Math.PI / 2, 0, 0.5); bottom.group.add(key);
    this.itemHit(key, 'key_archive', 'Sleutel archief', 'Een stalen sleutel met een label: "ARCHIEF". Er zit iets donkers op, opgedroogd.', () => {
      this.flags.keyArchive = true;
      this.objective('Open het archief (noordkant van de hoofdgang, achter de stalen deur).');
      this.after(1.6, () => { g.sfx('knock', { pos: { x: 23, y: 1.6, z: 14.5 }, volume: 1 }); g.shake(0.1); });
      this.after(4.5, () => g.sfx('bang_door', { pos: { x: 23, y: 1.6, z: 14.6 }, volume: 0.8 }));
    });
    const n1 = this.paperMesh(0.15, 0.1, '#e0dccb'); n1.position.set(-0.1, 0.17, -0.3); n1.rotation.set(-Math.PI / 2, 0, -0.3); bottom.group.add(n1);
    this.noteHit(n1, 'Briefje in de la', `<p class="hand">Aan wie na mij komt,</p><p class="hand">Als je voetstappen achter je hoort die stoppen wanneer jij stopt: <b>draai je niet om</b>. Het wil dat je kijkt.</p><p class="hand">Het ziet je als je licht geeft of rent. In het donker, gehurkt, ben je bijna onzichtbaar.</p><p class="hand">— H.V. &nbsp; 13-11-'96</p>`);

    // ----- archief: Henks bureau -----
    const hd = L.named.henkDesk;
    this.noteObj('diary', this.paperMesh(0.28, 0.2, '#cfc6a8', true), new THREE.Vector3(hd.x - 0.1, hd.y, hd.z + 0.05), 'Dagboek van Henk Vos', this.diaryHTML(), { rot: -0.2, onRead: () => this.powerFailure() });
    this.noteObj('paper', this.paperMesh(0.32, 0.24, '#bdb59c'), new THREE.Vector3(hd.x + 0.4, hd.y, hd.z - 0.05), 'Krantenknipsel', this.newspaperHTML(), { rot: 0.4 });
    // foto
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.075), new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.6 })); photo.rotation.set(-Math.PI / 2, 0, 0.6); photo.position.set(hd.x - 0.55, hd.y + 0.002, hd.z + 0.2); L.dynamic.add(photo);
    this.noteHit(photo, 'Foto', '<p>Een vergeelde polaroid: twee mensen in beveiligingsuniform voor de hoofdingang. Op de achterkant:</p><p class="hand">"Henk &amp; Ria — kerst ’95. Laatste ploeg van De Wachter."</p><p>Het gezicht van de vrouw is weggekrast.</p>');

    // ----- opslag: reservezekeringen -----
    L.box(37.6, 0, 22.2, 0.8, 0.8, 0.7, M.wood2, { col: true });
    const fuse = this.fuseMesh(); fuse.position.set(37.6, 0.8, 22.0); L.dynamic.add(fuse);
    this.itemHit(fuse, 'fuse', 'Reservezekering 63A', 'Een keramische smeltpatroon, 63 ampère. De doos is verder leeg.', () => this.fuseTaken());
    // ----- technische ruimte: zekeringkast -----
    const fb = L.named.fuseBoxPos;
    this.fuses = [];
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.09, 10), i === 2 ? M.burnt : M.porcelain);
      f.rotation.z = Math.PI / 2; f.position.set(fb.x - 0.07, fb.y - 0.2 + i * 0.13, fb.z); L.dynamic.add(f);
      this.fuses.push(f);
      g.addInteract(f, { prompt: () => (this.flags.fuseFixed ? null : i === 2 && g.inv.has('fuse') ? 'Zwartgeblakerde zekering vervangen' : 'Zekering bekijken'), enabled: () => !this.flags.fuseFixed, use: () => this.useFuse(i) });
    }
    // ----- serverruimte -----
    const kp = L.box(42.25, 1.2, 17.93, 0.16, 0.24, 0.06, M.darkMetal, { dynamic: true });
    const kd = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.04), new THREE.MeshBasicMaterial({ color: 0x40ff60 })); kd.position.set(42.25, 1.38, 17.895); kd.rotation.y = Math.PI; L.dynamic.add(kd); this.kpLed = kd;
    g.addInteract(kp, { local: true, prompt: () => (this.flags.serverOpen ? null : 'Code invoeren'), enabled: () => !this.flags.serverOpen, use: () => this.openKeypad(L.named.door_server) });
    const sd = L.named.serverDeskPos;
    this.noteObj('dossier', this.folderMesh(), new THREE.Vector3(sd.x - 0.3, sd.y, sd.z - 0.05), 'Personeelsdossier', this.dossierHTML(), { rot: 0.3, onRead: () => this.dossierRead(), onReadLocal: () => this.dossierScareLocal() });
    this.noteObj('henkLast', this.paperMesh(0.15, 0.1, '#e0dccb'), new THREE.Vector3(sd.x + 0.35, sd.y, sd.z + 0.1), 'Laatste briefje van Henk', `<p class="hand">Ria is dood. Ze is hier verbrand, in deze ruimte, om 05:40.</p><p class="hand">Ze stuurt nog steeds berichten. Ze wil altijd dat je naar de laaddock gaat. <b>Ga niet.</b></p><p class="hand">Er is maar stroom voor één deur. Kies de oostelijke nooduitgang. Wat er buiten bij de roldeur staat is niet Ria.</p><p class="hand">— H. Vos, 14-11-'96, 05:38</p>`, { rot: -0.5 });
    g.addInteract(L.named.powerPanel, { local: true, prompt: () => (this.flags.choice ? null : 'Noodstroom inschakelen'), enabled: () => !this.flags.choice && this.flags.chapter >= 5, use: () => this.powerChoice() });
    const lev = (z, col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.05), col); m.position.set(45.78, 1.5, z); L.dynamic.add(m); return m; };
    this.levers = [lev(24.65, M.yellow), lev(25.35, M.red)];
    // ----- uitgangen -----
    const exitDoor = L.named.door_exit;
    const oldUse = exitDoor.playerUse.bind(exitDoor);
    exitDoor.playerUse = () => { if (this.flags.choice === 'exit' && this.flags.exitReady) this.endingExit(); else oldUse(); };
    g.addInteract(L.named.dockPanel, { prompt: () => 'Roldeur bedienen', use: () => { if (this.flags.choice === 'dock' && this.flags.exitReady) this.endingDock(); else { g.sfx('beep_err', { pos: { x: 8.9, y: 1.3, z: 32.8 } }); g.ui.toast(this.flags.choice === 'dock' ? 'ONTGRENDELEN… wacht op noodstroom.' : 'Roldeur — geen stroom. Bediening alleen vanuit de serverruimte.'); } } });
    // ----- gekraste cijfers -----
    for (const s of this.scratches) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), scratchMat(s.roman, s.digit));
      m.position.set(s.x, s.y, s.z); m.rotation.y = s.rot; m.visible = false; L.dynamic.add(m); s.mesh = m;
      g.addInteract(m, { prompt: () => 'Gekraste tekens bekijken', enabled: () => this.flags.chapter >= 4 && !this.flags['dig_' + s.roman], use: () => this.foundDigit(s) });
    }
    // briefje 3 (verschijnt na het verstopmoment)
    this.note3 = this.paperMesh(0.21, 0.15, '#e0dccb'); this.note3.position.set(45.3, 0.006, 8.6); this.note3.rotation.set(-Math.PI / 2, 0, 1.0); this.note3.visible = false; L.dynamic.add(this.note3);
    this.readHooks['Verfrommeld briefje'] = () => this.startChapter4();
    g.addInteract(this.note3, { local: true, prompt: () => 'Lezen', enabled: () => this.note3.visible, use: async () => { await g.ui.openNote('Verfrommeld briefje', this.note3HTML()); this.afterRead('Verfrommeld briefje'); } });
    // "VERSTOP JE" op de kast
    this.hideScrawl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshStandardMaterial({ map: scratchMat('VERSTOP', ' ').map, transparent: true, depthWrite: false }));
    this.hideScrawl.position.set(43.66, 1.45, 11.6); this.hideScrawl.rotation.y = Math.PI / 2; this.hideScrawl.visible = false; L.dynamic.add(this.hideScrawl);
  }
  // ======================================================================
  //  MESHES & HELPERS
  // ======================================================================
  paperMesh(w, h, col, book = false) {
    const g = new THREE.Group();
    const p = new THREE.Mesh(book ? new THREE.BoxGeometry(w, 0.02, h) : new THREE.BoxGeometry(w, 0.002, h), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 }));
    p.position.y = book ? 0.01 : 0.001; p.castShadow = true; g.add(p);
    if (book) { const c = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.004, h + 0.01), new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.7 })); g.add(c); }
    else for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 0.004), new THREE.MeshBasicMaterial({ color: 0x333333 })); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.0025, -h * 0.35 + i * h * 0.15); g.add(l); }
    return g;
  }
  folderMesh() { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.32), new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.8 })); m.position.y = 0.01; g.add(m); const l = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.04), new THREE.MeshBasicMaterial({ color: 0xddd8c8 })); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.021, -0.08); g.add(l); return g; }
  keyMesh(color, tag) {
    const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.3 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 8, 16), m); g.add(ring);
    const bow = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 14), m); bow.rotation.x = Math.PI / 2; bow.position.x = 0.03; g.add(bow);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.009, 0.003), m); blade.position.x = 0.07; g.add(blade);
    for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006 + (i % 2) * 0.004, 0.003), m); t.position.set(0.055 + i * 0.01, -0.007, 0); g.add(t); }
    const lab = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.002), signMat([[tag, 54, true]], { w: 128, h: 180, bg: '#e8dfb0' })); lab.position.set(-0.03, -0.03, 0); lab.rotation.z = 0.3; g.add(lab);
    g.scale.setScalar(1.6);
    return g;
  }
  fuseMesh() { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.09, 12), this.g.M.porcelain); c.rotation.z = Math.PI / 2; c.position.y = 0.025; g.add(c); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 12), this.g.M.greyMetal); e.rotation.z = Math.PI / 2; e.position.set(s * 0.05, 0.025, 0); g.add(e); } const box = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.12), this.g.M.cardboard); box.position.set(0.02, 0.0, 0.1); box.position.y = 0.025; g.add(box); return g; }
  bottleMesh() { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: 0x2e5a2a, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.85 }); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 10), m); b.position.y = 0.1; g.add(b); const n = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.08, 10), m); n.position.y = 0.24; g.add(n); return g; }
  // Notities lees je op je eigen scherm; wat het lezen in gang zet, doet de host.
  noteHit(mesh, title, html, onRead, onReadLocal) {
    if (onRead) this.readHooks[title] = onRead;
    this.g.addInteract(mesh, { local: true, prompt: () => 'Lezen', use: async () => { await this.g.ui.openNote(title, html); onReadLocal && onReadLocal(); this.afterRead(title); } });
  }
  afterRead(title) {
    if (!this.readHooks[title]) return;
    if (this.host) this.readHooks[title](); else this.g.net.beat('read', { t: title });
  }
  noteObj(id, mesh, pos, title, html, o = {}) {
    mesh.position.copy(pos); mesh.rotation.y = o.rot || 0; this.L.dynamic.add(mesh);
    this.items[id] = mesh;
    this.noteHit(mesh, title, html, () => { (this.flags.read ||= {})[id] = true; o.onRead && o.onRead(); }, o.onReadLocal);
    return mesh;
  }
  itemHit(mesh, id, name, desc, onTake) {
    this.items[id] = mesh;
    this.itemDefs[id] = { name, desc, onTake, mesh };
    this.g.addInteract(mesh, { local: true, prompt: () => 'Oppakken: ' + name, enabled: () => !this.flags.taken?.[id], use: () => this.takeItem(id, mesh, name, desc, onTake, true) });
  }
  async takeItem(id, mesh, name, desc, onTake, inWorld = false) {
    const g = this.g;
    this.itemDefs[id] = { name, desc, onTake, mesh: inWorld ? mesh : null };
    if (g.inv.items.length >= g.inv.max) { g.ui.toast('Inventaris vol.'); return; }
    g.audio.play('pickup', { volume: 0.7 });
    g.inspector.start(mesh);
    if (inWorld) mesh.visible = false;
    await g.ui.openInspect(name, desc);
    if (!this.host) { g.net.take(id); return; } // de host voegt het toe aan de gedeelde inventaris
    this.giveItem(id);
  }
  giveItem(id) {
    const g = this.g, d = this.itemDefs[id]; if (!d || this.flags.taken?.[id]) return;
    if (!g.inv.add(id, d.name, d.desc)) { if (d.mesh) d.mesh.visible = true; return; }
    (this.flags.taken ||= {})[id] = true;
    if (d.mesh) d.mesh.visible = false;
    d.onTake && d.onTake();
  }
  remoteTake(id) {
    if (!this.itemDefs[id] && id === 'key_tech') this.itemDefs[id] = { name: 'Sleutel technische ruimte', desc: 'Een messing sleutel met label "TECHN. — HOOFDVERDEELKAST".', onTake: this.onKeyTech };
    this.giveItem(id);
  }
  // berichten van co-op-gasten
  remoteBeat(d) {
    if (!d) return;
    if (d.b === 'read' && this.readHooks[d.t]) this.readHooks[d.t]();
    else if (d.b === 'phone') { this.flags.phoneRinging = false; this.flags.phoneDone = true; }
    else if (d.b === 'code' && String(d.c) === this.code && !this.flags.serverOpen) this.codeAccepted();
    else if (d.b === 'choice' && !this.flags.choice && (d.i === 0 || d.i === 1)) this.applyChoice(d.i);
  }
  toggleDrawer(d, i) {
    const g = this.g; d.open = !d.open;
    const start = d.group.position.z, end = d.open ? 0.31 + 0.38 : 0.31; const t0 = g.time;
    g.sfx(d.open ? 'drag' : 'door_close', { pos: { x: 21.7, y: 0.5 + i * 0.3, z: 10.5 }, volume: d.open ? 0.25 : 0.35, rate: d.open ? 2.2 : 1.4 });
    this.anim(0.35, (k) => { d.group.position.z = start + (end - start) * k; });
    if (d.open && i > 0 && !this.flags['drawerMsg' + i]) { this.flags['drawerMsg' + i] = true; this.after(0.4, () => g.ui.toast(['Lege hangmappen.', 'Oude roosters uit 1996. Op elke nacht staat dezelfde naam: H. Vos.', 'Een kapotte nietmachine en een pasje: "R. van Dam — ploegleider".'][i - 1], 4)); }
    void t0;
  }
  anim(dur, fn) { const g = this.g; let t = 0; const a = { fn: (dt) => { t += dt; const k = Math.min(1, t / dur); fn(k * k * (3 - 2 * k)); return k >= 1; } }; (this.anims ||= []).push(a); }
  objective(t) { this.g.ui.objective(t); }
  codeDisplay() {
    if (!this.flags.chapter || this.flags.chapter < 4) return '';
    return ROMAN.map((r) => `${r}: ${this.flags['dig_' + r] !== undefined ? this.flags['dig_' + r] : '?'}`).join(' &nbsp; ');
  }
  inRoom(id) { const r = this.L.roomAt(this.g.player.pos.x, this.g.player.pos.z); return r && r.id === id; }
  near(x, z, r) { const p = this.g.player.pos; return Math.hypot(p.x - x, p.z - z) < r; }
  looking(x, y, z, cosMin = 0.9, maxD = 30) {
    const cam = this.g.camera; const d = new THREE.Vector3(x - cam.position.x, y - cam.position.y, z - cam.position.z);
    const len = d.length(); if (len > maxD) return false;
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    return d.divideScalar(len).dot(f) > cosMin && this.L.hasLOS(cam.position.x, cam.position.z, x, z);
  }
  // ======================================================================
  //  AMBIENCE
  // ======================================================================
  startAmbience() {
    const g = this.g, a = g.audio;
    for (const k of Object.keys(this.amb)) { this.amb[k] && this.amb[k].stop(0.5); }
    this.amb = {};
    this.amb.drone = a.play('drone', { loop: true, volume: 0.25, bus: 'amb', reverb: 0 });
    this.amb.outside = a.play('outside', { loop: true, pos: { x: -0.5, y: 1.5, z: 16.5 }, volume: 0.35, bus: 'amb', ref: 2 });
    this.amb.drip = null;
    if (g.lights.power.B || g.lights.power.C) this.amb.vent = a.play('vent', { loop: true, volume: 0.22, bus: 'amb', reverb: 0.2 });
    if (this.flags.chapter >= 4) this.amb.tension = a.play('tension', { loop: true, volume: 0.12, bus: 'amb', reverb: 0 });
    if (this.flags.alarm) this.startAlarm();
    this.ambT = 8;
  }
  setVent(on) { const a = this.g.audio; if (on && !this.amb.vent) this.amb.vent = a.play('vent', { loop: true, volume: 0.22, bus: 'amb', reverb: 0.2 }); if (!on && this.amb.vent) { this.amb.vent.stop(1.5); this.amb.vent = null; } }
  randomAmbience(dt) {
    const g = this.g, a = g.audio, p = g.player.pos, ch = this.flags.chapter || 1;
    this.ambT -= dt;
    // druppels in de toiletten
    if (this.near(14, 24, 9) && Math.random() < dt * 0.8) a.play('drip', { pos: { x: 12.2 + Math.random() * 3, y: 2.6, z: 20.6 + Math.random() * 6 }, volume: 0.35, ref: 1 });
    if (this.near(27, 31, 6) && Math.random() < dt * 0.5) a.play('drip', { pos: { x: 27, y: 2.8, z: 30.6 }, volume: 0.3, ref: 1 });
    if (this.ambT > 0) return;
    this.ambT = (ch >= 4 ? 9 : 16) + Math.random() * (ch >= 4 ? 14 : 22);
    const ang = Math.random() * Math.PI * 2, r = 6 + Math.random() * 10;
    const pos = { x: p.x + Math.cos(ang) * r, y: 1 + Math.random() * 1.8, z: p.z + Math.sin(ang) * r };
    const pool = ch <= 1 ? ['floor_creak', 'metal_ping', 'thud_above'] : ch <= 3 ? ['floor_creak', 'metal_ping', 'thud_above', 'knock', 'scratch', 'whisper'] : ['floor_creak', 'metal_ping', 'knock', 'scratch', 'whisper', 'bang_metal', 'drag', 'thud_above'];
    let s = pool[Math.floor(Math.random() * pool.length)];
    if (s === 'thud_above') pos.y = 4.2;
    if (s === 'whisper' && g.lights.anyPowerAt(p.x, p.z)) s = 'floor_creak';
    a.play(s, { pos, volume: s === 'bang_metal' ? 0.5 : s === 'whisper' ? 0.35 : 0.5 });
  }
  startAlarm() {
    const a = this.g.audio;
    if (this.amb.alarm) return;
    this.amb.alarm = a.play('alarm', { loop: true, pos: { x: 30, y: 2.8, z: 16.5 }, volume: 0.55, occlude: true, ref: 6, rolloff: 0.6, bus: 'sfx' });
    this.amb.alarm2 = a.play('alarm', { loop: true, pos: { x: 25, y: 2.8, z: 30.8 }, volume: 0.45, occlude: true, ref: 6, rolloff: 0.6, bus: 'sfx', offset: 0.7 });
  }
  // ======================================================================
  //  HOOFDSTUK 1
  // ======================================================================
  begin() {
    const g = this.g;
    this.flags.chapter = 1;
    g.player.pos.set(3.2, 0, 16.5); g.player.yaw = -Math.PI / 2;
    g.ui.fadeTo('#000', 1, 0);
    this.startAmbience();
    g.saveCheckpoint(null);
    g.ui.el.chapter.classList.remove('show');
    this.intro();
  }
  async intro() {
    const g = this.g;
    g.cinematic = true; g.player.frozen = true;
    const card = document.getElementById('introCard'); card.classList.add('show');
    await wait(6500);
    card.classList.remove('show');
    await wait(800);
    g.ui.fadeTo('#000', 0, 3);
    g.cinematic = false; g.player.frozen = false;
    g.ui.chapter(1, 'De aankomst');
    this.after(3.5, () => g.ui.toast('F — zaklamp  ·  WASD — lopen  ·  E — interactie  ·  TAB — inventaris', 7));
    this.after(7, () => {
      g.ui.pager('Hoi Daan. Laatste dienst! Morgen komt de sloper. De stroom is vanmiddag afgesloten, ik heb gevraagd hem voor jou terug te zetten. Hoofdschakelaar zit in de technische ruimte, helemaal oost in de gang. De sleutel hangt in het sleutelkastje in de beveiligingsruimte. — Ria');
      if (!this.flags.keyTech) this.objective('Haal de sleutel van de technische ruimte uit het sleutelkastje in de beveiligingsruimte.');
    });
  }
  useSwitch(sw) {
    const g = this.g, f = this.flags;
    if (!this.flags.techOpened) { this.flags.techOpened = true; }
    g.sfx(sw.big ? 'breaker' : 'switch_click', { pos: { x: 48.8, y: 1.5, z: 4.5 }, volume: sw.big ? 0.9 : 0.7 });
    if (sw.big) {
      if (!f.main) {
        if (f.grp.some((x) => x)) {
          // overbelasting: slaat af
          this.after(0.25, () => { g.sfx('sparks', { pos: { x: 48.7, y: 1.5, z: 4.2 }, volume: 1 }); g.flash = 0.35; g.postMat.uniforms.flashColor.value.setRGB(0.8, 0.85, 1); g.shake(0.25); g.sfx('breaker', { pos: { x: 48.8, y: 1.5, z: 4.5 }, volume: 0.7 }); f.main = false; this.updateSwitchVisuals(); });
          f.main = true; this.updateSwitchVisuals();
          g.ui.toast('De hoofdschakelaar slaat met een vonk direct weer af. Lees het etiket.', 4.5);
          g.noise({ x: 48, z: 4.5 }, 10, 'other');
          return;
        }
        f.main = true; g.sfx('power_up', { volume: 0.6 });
        g.ui.toast('Hoofdschakelaar aan. Er bromt iets in de muren.', 3.5);
      } else {
        f.main = false; for (const c of ['A', 'B', 'C', 'D']) g.lights.setCircuit(c, false); this.setVent(false);
        g.sfx('power_down', { volume: 0.5 });
      }
    } else {
      f.grp[sw.idx] = !f.grp[sw.idx];
      if (f.main) this.applyGroups();
    }
    this.updateSwitchVisuals();
  }
  applyGroups() {
    const g = this.g, f = this.flags;
    const want = { A: f.grp[0], B: f.grp[0], C: f.grp[1] && !f.failC, D: f.grp[2] && !f.failC };
    for (const [c, on] of Object.entries(want)) g.lights.setCircuit(c, on);
    this.setVent(f.grp[0] || f.grp[1]);
    if (f.chapter === 1 && f.grp.every((x) => x)) this.after(3, () => this.startChapter2());
  }
  updateSwitchVisuals() {
    for (const sw of this.switches || []) {
      const on = sw.big ? this.flags.main : this.flags.grp[sw.idx];
      sw.lever.rotation.z = on ? 0.6 : -0.6; sw.lever.position.y = on ? 0.03 : -0.03;
    }
  }
  onDoorUnlocked(d) {
    const g = this.g;
    if (d.id === 'tech') { this.objective('Zet de stroom aan bij de hoofdverdeelkast.'); }
    if (d.id === 'archive') { this.flags.archiveUnlocked = true; this.after(0.5, () => this.startChapter3()); }
  }
  onDoorUsed(d, opening) {
    if (d.id === 'security' && opening && this.flags.chapter === 1 && !this.flags.secVisit) { this.flags.secVisit = true; this.after(2.5, () => this.g.sfx('thud_above', { pos: { x: 6, y: 4.3, z: 4 }, volume: 0.9 })); this.after(3.3, () => this.g.sfx('drag', { pos: { x: 7, y: 4.3, z: 3 }, volume: 0.5 })); }
  }
  // ======================================================================
  //  HOOFDSTUK 2
  // ======================================================================
  startChapter2() {
    const g = this.g;
    if (this.flags.chapter >= 2) return;
    this.flags.chapter = 2;
    g.ui.chapter(2, 'De eerste afwijkingen');
    g.saveCheckpoint('Stroom hersteld');
    this.after(4, () => {
      if (this.flags.chapter !== 2) return;
      g.ui.pager('Licht doet het weer? Mooi. Loop je ronde: stempel de drie controleklokken — kantoor A, de kantine en de toiletten. Daarna mag je koffie. Ik hou de camera’s in de gaten.');
      if (!(this.flags.stamps > 0)) this.objective('Stempel de controleklokken: kantoor A, kantine en toiletten (0/3).');
    });
    this.flags.ch2T = 0;
  }
  stamp(c) {
    const g = this.g;
    if (this.flags['stamp_' + c.id]) { g.ui.toast('Deze klok is al gestempeld.'); return; }
    this.flags['stamp_' + c.id] = true;
    g.sfx('stamp', { pos: { x: c.x, y: c.y, z: c.z }, volume: 0.8 });
    const n = this.clocks.filter((k) => this.flags['stamp_' + k.id]).length;
    this.flags.stamps = n;
    g.ui.toast(`Gestempeld: ${c.name} — ${g.clockString()}`);
    if (n < 3) this.objective(`Stempel de controleklokken: kantoor A, kantine en toiletten (${n}/3).`);
    if (n === 1) this.after(7 + Math.random() * 5, () => this.upstairsSteps());
    if (c.id === 'toilets') this.after(2 + Math.random() * 2, () => { const st = this.L.lockers.find((l) => l.stall); if (st && !g.player.hidden) { st.target = -1.1; g.sfx('creak_slow', { pos: { x: 16.4, y: 1, z: 23.6 }, volume: 0.6 }); } });
    if (n === 3) {
      g.saveCheckpoint('Ronde gelopen');
      this.after(5, () => {
        if (this.flags.chapter !== 2) return;
        g.ui.pager('Raar. De bewegingsmelder in het archief gaat steeds af. Zal een rat zijn, maar ik moet het melden. Wil je even kijken? De archiefsleutel ligt in kantoor B, in de ladekast — onderste la.');
        if (!this.flags.keyArchive) this.objective('Pak de archiefsleutel uit de onderste la van de ladekast in kantoor B.');
        this.flags.glassArmed = true;
      });
    }
  }
  upstairsSteps() {
    const g = this.g; if (this.flags.upstairs) return; this.flags.upstairs = true;
    const p = g.player.pos, f = g.player.forward();
    const start = { x: p.x + f.x * 8, z: p.z + f.z * 8 }, end = { x: p.x - f.x * 6, z: p.z - f.z * 6 };
    for (let i = 0; i < 9; i++) {
      const k = i / 8;
      this.after(i * 0.62, () => { g.sfx('estep_wood', { pos: { x: start.x + (end.x - start.x) * k, y: 4.4, z: start.z + (end.z - start.z) * k }, volume: 1.2, occlude: false, ref: 2 }); g.sfx('thud_above', { pos: { x: start.x + (end.x - start.x) * k, y: 4.4, z: start.z + (end.z - start.z) * k }, volume: 0.6, occlude: false }); });
    }
    this.after(9 * 0.62 + 0.5, () => g.sfx('drag', { pos: { x: end.x, y: 4.4, z: end.z }, volume: 0.6, occlude: false }));
    this.after(9 * 0.62 + 4, () => g.ui.subtitle('<i>Er hoort niemand op de eerste verdieping te zijn. Het trappenhuis is dichtgelast.</i>', 4));
  }
  ringPhone() {
    const g = this.g; if (this.flags.phoneDone || this.flags.phoneRinging) return;
    this.flags.phoneRinging = true; this.ringN = 0;
    const ring = () => {
      if (!this.flags.phoneRinging) return;
      if (this.ringN++ >= 7) { this.flags.phoneRinging = false; this.flags.phoneDone = true; return; }
      g.sfx('phone_ring', { pos: this.L.named.kantinePhonePos, volume: 0.9, ref: 1.5 });
      g.noise(this.L.named.kantinePhonePos, 10, 'other');
      this.after(3.6, ring);
    };
    ring();
  }
  codeAccepted() {
    const g = this.g; if (this.flags.serverOpen) return;
    g.sfx('beep_ok', { pos: { x: 42.25, y: 1.3, z: 17.9 } });
    this.flags.serverOpen = true;
    const d = this.L.named.door_server; d.locked = null;
    this.after(0.9, () => { d.toggle('normal', { pos: { x: 43.5, z: 17 } }); this.startChapter5(); });
  }
  answerPhone() {
    const g = this.g;
    g.audio.play('phone_pickup', { pos: this.L.named.kantinePhonePos, volume: 0.7 });
    if (!this.flags.phoneRinging) { g.ui.toast('Geen kiestoon. Alleen een zacht gesis.'); return; }
    this.flags.phoneRinging = false; this.flags.phoneDone = true;
    if (!this.host) g.net.beat('phone');
    if (this.flags.phone2 && this.flags.chapter >= 4) {
      const st2 = g.audio.play('static', { volume: 0.25, reverb: 0 });
      g.ui.subtitle('<i>[ruis]</i>', 2);
      this.after(2, () => { g.audio.play('whisper_0', { volume: 0.9, reverb: 0 }); g.ui.subtitle('<i>…het staat achter je…</i>', 3); });
      this.after(4.5, () => { st2 && st2.stop(0.05); g.audio.play('scream_cutoff', { volume: 0.6, reverb: 0.1 }); });
      return;
    }
    const st = g.audio.play('static', { volume: 0.25, reverb: 0 });
    g.ui.subtitle('<i>[ruis]</i>', 2);
    this.after(2.2, () => { g.audio.play('breath_enemy', { volume: 0.5, reverb: 0 }); g.ui.subtitle('<i>[zware, natte ademhaling]</i>', 3.5); });
    this.after(6, () => { g.audio.play('whisper_2', { volume: 0.8, reverb: 0 }); g.ui.subtitle('<i>…Daan…</i>', 2.5); });
    this.after(8.8, () => { g.audio.play('whisper_4', { volume: 0.8, reverb: 0 }); g.ui.subtitle('<i>…zij zegt dat het jouw laatste dienst is…</i>', 3.5); });
    this.after(12.5, () => { st && st.stop(0.05); g.audio.play('phone_pickup', { volume: 0.6 }); g.ui.subtitle('<i>[klik]</i>', 1.5); this.lf.echoArmed = true; });
  }
  onPlayerStep() {
    // echo-voetstappen achter de speler
    if (!this.echo || !this.echo.active) return;
    const g = this.g, p = g.player.pos, f = g.player.forward();
    const back = this.echo.dir;
    this.after(0.22 + Math.random() * 0.06, () => {
      if (!this.echo || !this.echo.active) return;
      g.sfx('estep_lino', { pos: { x: p.x - back.x * 5.5, y: 0.1, z: p.z - back.z * 5.5 }, volume: 0.85, ref: 2 });
    });
    void f;
  }
  // ======================================================================
  //  HOOFDSTUK 3
  // ======================================================================
  startChapter3() {
    const g = this.g; if (this.flags.chapter >= 3) return;
    this.flags.chapter = 3;
    g.ui.chapter(3, 'Iets is hier');
    g.saveCheckpoint('Archief');
    this.objective('Doorzoek het archief. Waarom gaat de bewegingsmelder af?');
    this.after(40, () => { if (!this.flags.failC) this.powerFailure(); });
  }
  powerFailure() {
    const g = this.g; if (this.flags.failC) return;
    this.flags.failC = true;
    this.after(1.2, () => {
      g.sfx('power_down', { volume: 1 });
      g.sfx('sparks', { pos: { x: 48, y: 1.5, z: 8 }, volume: 0.8 });
      g.lights.setCircuit('C', false); g.lights.setCircuit('D', false);
      this.setVent(false); g.audio.duck(0.15, 4);
      g.shake(0.15);
    });
    this.after(7, () => {
      g.ui.pager('Daan? Mijn scherm zegt dat groep II en III eruit liggen. Er liggen reservezekeringen in de opslagruimte aan de zuidkant. Vervang de doorgebrande in de zekeringkast in de technische ruimte.');
      if (!this.flags.taken?.fuse) this.objective('Zoek een reservezekering in de opslag (zuidkant van de hoofdgang).');
      this.flags.silhouetteArmed = true;
    });
  }
  fuseTaken() {
    const g = this.g;
    this.objective('Vervang de doorgebrande zekering in de technische ruimte.');
    const burst = () => {
      if (this.flags.burst) return; this.flags.burst = true;
      const L = this.L.named.burstLocker;
      L.target = -2.3; L.speed = 16;
      g.sfx('locker_burst', { pos: { x: 38.5, y: 1.2, z: 20.25 }, volume: 1 });
      g.flashlight.glitch(0.6); g.shake(0.5); g.ui.flashVignette(0.7); this.fearSpike(0.6, 3);
      g.lights.flickerNear(36, 22, 5, 1.5);
      this.after(2.5, () => g.sfx('run_away', { pos: { x: 35, y: 0.1, z: 30.8 }, volume: 0.8 }));
    };
    if (Math.random() < 0.5) this.after(0.15, burst);
    else this.flags.burstArmed = g.time;
    this.burstFn = burst;
  }
  useFuse(i) {
    const g = this.g;
    if (i !== 2) { g.ui.toast('Deze zekering is nog heel.'); g.sfx('switch_click', { pos: this.L.named.fuseBoxPos }); return; }
    if (!g.inv.has('fuse')) { g.ui.toast('Deze zekering is zwartgeblakerd en doorgebrand. Je hebt een reserve nodig.'); return; }
    g.inv.remove('fuse');
    this.flags.fuseFixed = true;
    this.fuses[2].material = g.M.porcelain;
    g.sfx('breaker', { pos: this.L.named.fuseBoxPos, volume: 0.9 });
    this.flags.failC = false;
    this.after(0.8, () => { this.applyGroups(); g.sfx('power_up', { volume: 0.6 }); });
    this.after(1.5, () => { g.saveCheckpoint('Zekering vervangen'); });
    this.after(5, () => this.hideSequence());
  }
  hideSequence() {
    const g = this.g, e = g.enemy;
    this.flags.hideSeq = true;
    g.sfx('bang_door_hard', { pos: { x: 42.5, y: 1.4, z: 10.5 }, volume: 1 });
    g.shake(0.3); this.fearSpike(0.4, 4);
    this.hideScrawl.visible = true;
    this.objective('Verstop je! (een kast in de technische ruimte — E)');
    g.ui.toast('Iets komt eraan. Verstop je — en doe je zaklamp UIT.', 6);
    this.after(3.0, () => g.sfx('estep_concrete', { pos: { x: 45.5, y: 0.1, z: 19 }, volume: 1.2 }));
    this.after(4.2, () => g.sfx('estep_lino', { pos: { x: 45.5, y: 0.1, z: 17.8 }, volume: 1.2 }));
    this.after(5.5, () => {
      e.place(45.5, 17.2, Math.PI);
      e.scriptGoto([[45.5, 16.5], [45.5, 14.5], [45.5, 12.5], [46.2, 10], [46.6, 7.5], [45, 6], [44.4, 9.5], [44.2, 11.0]], 1.15, () => {
        // bij de kasten: rammelen aan de deur
        const sp = g.player.hidden;
        if (sp && sp.id.startsWith('tech')) { g.sfx('handle_rattle', { pos: { x: sp.pos.x, y: 1.1, z: sp.pos.z }, volume: 1, occlude: false }); g.shake(0.2); this.fearSpike(0.5, 4); }
        else g.sfx('handle_rattle', { pos: { x: 43.4, y: 1.1, z: 11.9 }, volume: 0.9 });
        e.scriptIdle(true);
        this.after(4.5, () => {
          if (e.mode !== 'scripted') return;
          const d = this.L.named.door_archTech; d.locked = null;
          e.scriptGoto([[44.5, 10.5], [43.5, 10.5], [42.5, 10.5], [40.5, 10.5], [37, 11.5]], 1.2, () => { e.deactivate(); this.afterHide(); }, true);
        });
      }, true);
    });
  }
  afterHide() {
    const g = this.g; if (this.flags.afterHide) return; this.flags.afterHide = true;
    this.note3.visible = true;
    this.after(3, () => {
      if (this.flags.chapter !== 3) return; // briefje al gelezen
      g.ui.pager('Daan?? De camera in de technische ruimte… er stond iemand naast je. Ik krijg de deuren niet meer open vanaf hier. Kom naar de laaddock, ik probeer de roldeur van buitenaf te openen. Het systeem vraagt om de code van de serverruimte.');
      this.objective('Er ligt een verfrommeld briefje op de vloer van de technische ruimte.');
    });
  }
  onHideSurvived() { if (this.flags.chapter === 3 && this.flags.hideSeq && !this.flags.afterHide) this.afterHide(); }
  onChase() { if (this.flags.chapter === 3 && this.flags.hideSeq) this.flags.ch3Chased = true; }
  // ======================================================================
  //  HOOFDSTUK 4
  // ======================================================================
  startChapter4() {
    const g = this.g; if (this.flags.chapter >= 4) return;
    this.flags.chapter = 4;
    g.ui.chapter(4, 'De jacht');
    for (const s of this.scratches) s.mesh.visible = true;
    this.amb.tension = g.sfx('tension', { loop: true, volume: 0.12, bus: 'amb', reverb: 0 });
    this.flags.cctvArmed = true;
    g.saveCheckpoint('De jacht');
    this.spawnHunter(22);
    this.objective('Vind de vier gekraste cijfers (0/4) en open de serverruimte.');
  }
  spawnHunter(minD) {
    const g = this.g, e = g.enemy;
    e.activate(); e.chaseSpeed = 3.75; e.silent = false;
    if (!e.relocate(minD)) e.place(25, 30.5);
    e.wait = 4; g.director.relief(20);
  }
  foundDigit(s) {
    const g = this.g;
    this.flags['dig_' + s.roman] = s.digit;
    g.sfx('paper', { volume: 0.4 });
    g.ui.toast(`In de muur gekrast: ${s.roman} = ${s.digit}`, 4);
    const n = ROMAN.filter((r) => this.flags['dig_' + r] !== undefined).length;
    if (n < 4) this.objective(`Vind de vier gekraste cijfers (${n}/4) en open de serverruimte.`);
    else this.objective(`Code compleet: ${this.code}. Voer hem in op het paneel naast de serverruimte (zuidkant hoofdgang, oost).`);
    g.saveCheckpoint(`Cijfer ${s.roman}`);
    // eerste vondst: de aanwezigheid hoort je
    if (n === 1) this.after(2, () => g.sfx('scream_human', { pos: { x: g.player.pos.x > 25 ? 8 : 42, y: 1.5, z: 30 }, volume: 0.7 }));
  }
  async openKeypad(door) {
    const g = this.g;
    if (this.flags.serverOpen) return;
    if ((this.flags.chapter || 0) < 4) { g.sfx('beep_err', { pos: { x: 42.25, y: 1.3, z: 17.9 } }); g.ui.toast('Het paneel vraagt om een viercijferige code.'); }
    while (true) {
      const v = await g.ui.openKeypad();
      if (v === null) return;
      if (v === this.code) {
        g.audio.play('beep_ok', { pos: { x: 42.25, y: 1.3, z: 17.9 } }); g.ui.keypadResult(true);
        if (this.host) this.codeAccepted(); else g.net.beat('code', { c: v });
        return;
      }
      g.sfx('beep_err', { pos: { x: 42.25, y: 1.3, z: 17.9 }, volume: 1 }); g.ui.keypadResult(false);
      g.noise({ x: 42.25, z: 17.5 }, 9, 'other');
      await wait(950);
    }
  }
  // ======================================================================
  //  HOOFDSTUK 5
  // ======================================================================
  startChapter5() {
    const g = this.g; if (this.flags.chapter >= 5) return;
    this.flags.chapter = 5; this.flags.serverOpen = true;
    g.ui.chapter(5, 'De laatste uitgang');
    g.enemy.deactivate();
    g.director.relief(40);
    g.saveCheckpoint('Serverruimte');
    this.objective('Doorzoek de serverruimte.');
    this.after(6, () => g.ui.pager('Je bent binnen! Er zit een noodstroompaneel aan de muur. Zet de roldeur van de laaddock aan, dan haal ik je op. Snel, Daan.'));
  }
  dossierRead() {
    const g = this.g; if (this.flags.dossierScare) return;
    this.flags.dossierScare = true;
    this.objective('Kies op het noodstroompaneel welke uitgang je ontgrendelt.');
    this.after(2, () => {
      for (const fx of this.L.fixtures) if (fx.room && fx.room.id === 'server') fx.dead = true;
      g.sfx('sparks', { pos: { x: 42.5, y: 2.8, z: 23 }, volume: 1 });
    });
    this.after(7, () => g.ui.pager('Daan. Waarom lees je dat. Kom naar de laaddock. NU.'));
    this.after(14, () => g.ui.pager('Ik wacht op je.'));
  }
  // jumpscare voor wie het dossier leest: direct, of pas wanneer je je omdraait naar de deur
  dossierScareLocal() {
    const g = this.g; if (this.lf.dossierScare) return;
    this.lf.dossierScare = true;
    const scare = () => {
      const e = g.enemy, cam = g.camera.position, hadVis = e.root.visible, hadMode = e.mode;
      const f = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion); f.y = 0; f.normalize();
      if (g.net.active) e.puppetHold = true;
      e.place(cam.x + f.x * 0.85, cam.z + f.z * 0.85, Math.atan2(-f.x, -f.z));
      if (!g.net.active) e.scriptIdle(false); else e.root.visible = true;
      e.pose = 'scream'; e.silent = true;
      g.audio.play('scream_monster_1', { volume: 1, bus: 'scare' }); g.audio.play('stinger', { volume: 0.7 });
      g.shake(1); g.flash = 0.5; g.postMat.uniforms.flashColor.value.setRGB(1, 1, 1);
      g.ui.faceFlash(70, true);
      this.after(0.55, () => {
        e.pose = 'walk'; e.silent = false;
        if (g.net.active) { e.puppetHold = false; e.root.visible = false; if (!g.isGuest() && hadVis) { e.mode = hadMode; e.root.visible = true; e.relocate(18); } }
        else e.deactivate();
        g.flashlight.kill(0.8); g.audio.duck(0.05, 3);
      });
    };
    if (Math.random() < 0.5) this.after(0.4, scare);
    else { this.lf.dossierScareArmed = g.time; this.dossierScareFn = scare; }
  }
  async powerChoice() {
    const g = this.g;
    const i = await g.ui.choice('NOODSTROOM — accucapaciteit voor één circuit', [
      { label: 'ROLDEUR LAADDOCK', sub: 'Ria wacht buiten bij de laaddock.' },
      { label: 'NOODUITGANG OOST', sub: 'Henk: "Ga niet naar de laaddock."' },
    ]);
    if (this.flags.choice) return;
    if (!this.host) { g.net.beat('choice', { i }); return; }
    this.applyChoice(i);
  }
  applyChoice(i) {
    const g = this.g;
    this.flags.choice = i === 0 ? 'dock' : 'exit';
    this.setLevers();
    g.sfx('breaker', { pos: { x: 45.8, y: 1.5, z: 25 }, volume: 1 });
    this.startCountdown();
    g.saveCheckpoint('Noodstroom gekozen');
  }
  setLevers() { const i = this.flags.choice === 'dock' ? 0 : this.flags.choice === 'exit' ? 1 : -1; this.levers.forEach((l, k) => { l.rotation.z = k === i ? 0.8 : 0; l.position.y = k === i ? 1.45 : 1.5; }); }
  startCountdown() {
    const g = this.g;
    this.flags.alarm = true; this.flags.exitReady = false;
    this.flags.countdown = 45;
    this.startAlarm();
    g.lights.alarm = true;
    const target = this.flags.choice === 'dock' ? 'de roldeur van de laaddock (zuidwest)' : 'de nooduitgang (oostkant van de hoofdgang)';
    this.objective(`ALARM. Overleef tot ${target} ontgrendelt — en ren erheen.`);
    if (this.flags.choice === 'dock') this.after(3, () => g.ui.pager('Goed zo. Ik sta buiten. Ik wacht.'));
    else this.after(3, () => g.ui.pager('NEE. NEE NEE NEE. DAAN.'));
    // de entiteit komt op het alarm af
    const e = g.enemy;
    this.after(4, () => { e.activate(); e.chaseSpeed = 3.6; if (!e.relocate(20)) e.place(5, 30.5); e.investigate({ x: 43, z: 17 }, 2.2); e.suspicion = 0.6; });
  }
  async endingExit() {
    const g = this.g; if (this.endingStarted) return; this.endingStarted = true;
    if (this.host) { this.flags.ending = 'exit'; g.net.sendEnding('exit'); g.net.sendState(true); }
    this.flags.noDeath = true; g.enemy.puppetHold = true; g.cinematic = true; g.player.frozen = true;
    g.enemy.deactivate();
    this.amb.alarm && this.amb.alarm.stop(0.1); this.amb.alarm2 && this.amb.alarm2.stop(0.1); g.lights.alarm = false;
    const d = this.L.named.door_exit; d.locked = null;
    g.audio.play('bang_metal', { pos: d.center, volume: 0.8 });
    d.target = d.openAngle = 1.6; d.speed = 1.2;
    g.player.lookLock = new THREE.Vector3(52, 1.6, 16.5);
    g.audio.stopAll();
    g.audio.play('outside', { loop: true, volume: 0.8, bus: 'amb' });
    this.after(0.4, () => { g.flash = 0; g.postMat.uniforms.flashColor.value.setRGB(1, 0.97, 0.9); });
    await wait(1200);
    let k = 0; const iv = setInterval(() => { k += 0.02; g.flash = Math.min(1, k); if (k >= 1) clearInterval(iv); }, 40);
    await wait(2600);
    await g.ui.fadeTo('#fff', 1, 1.5);
    this.showEnding('ZONSOPGANG', `
      <p>Het is 05:41 als je de koude ochtendlucht in strompelt. Achter je valt de nooduitgang met een droge klap dicht. Het alarm stopt.</p>
      <p>Om zeven uur rollen de sloopmachines het terrein op. Je zegt niets. Wie zou je geloven?</p>
      <p>Drie dagen later belt de politie. Onder de vloer van de serverruimte hebben de slopers het lichaam van een man in beveiligingsuniform gevonden. Hij lag er al dertig jaar. In zijn hand: een pieper, de batterij allang leeg.</p>
      <p>Op je eigen pieper verschijnt die avond nog één bericht. Geen afzender.</p>
      <p class="hand">"Bedankt dat je naar me luisterde. — H."</p>`, 'good');
  }
  async endingDock() {
    const g = this.g; if (this.endingStarted) return; this.endingStarted = true;
    if (this.host) { this.flags.ending = 'dock'; g.net.sendEnding('dock'); g.net.sendState(true); }
    this.flags.noDeath = true; g.enemy.puppetHold = true; g.cinematic = true; g.player.frozen = true; g.flashlight.on = true;
    const e = g.enemy; e.deactivate();
    this.amb.alarm && this.amb.alarm.stop(0.5); this.amb.alarm2 && this.amb.alarm2.stop(0.5); g.lights.alarm = false;
    g.audio.play('roller_gate', { pos: { x: 5.5, y: 1.5, z: 32.8 }, volume: 1 });
    g.player.lookLock = new THREE.Vector3(5.5, 1.4, 34);
    // figuur buiten, met de rug naar je toe
    e.place(5.5, 34.6, 0); e.scriptIdle(false); e.silent = true;
    const gate = this.L.named.gate;
    this.anim(5.2, (k) => { gate.position.y = k * 2.6; gate.scale.y = 1 - k * 0.85; });
    await wait(5500);
    if (this.host) g.ui.pager('Daar ben je.');
    g.audio.play('outside', { loop: true, volume: 0.5, bus: 'amb' });
    await wait(2500);
    g.audio.duck(0.0, 3);
    // langzaam omdraaien
    this.anim(1.6, (k) => { e.yaw = Math.PI * k; e.root.rotation.y = e.yaw; });
    await wait(1900);
    this.anim(0.25, (k) => { e.pos.z = 34.6 - k * 2.6; });
    e.pose = 'scream';
    g.audio.play('scream_monster_2', { volume: 1, bus: 'scare' }); g.audio.play('stinger', { volume: 0.8 });
    g.player.lookLock = new THREE.Vector3(5.5, 1.75, 32);
    g.shake(1.2); g.ui.faceFlash(140, true);
    await wait(650);
    g.audio.stopAll();
    await g.ui.fadeTo('#000', 1, 0.05);
    await wait(2200);
    this.showEnding('DE LAATSTE DIENST', `
      <p>Het pand De Wachter werd op 15 november gesloopt. Van de nachtwaker die er zijn laatste dienst draaide, werd nooit meer iets teruggevonden. Zijn auto stond nog weken op de parkeerplaats.</p>
      <p>Een jaar later. Een ander gebouw. Een andere stad.</p>
      <p>23:52. Een nieuwe nachtwaker begint aan zijn laatste dienst. Zijn pieper gaat.</p>
      <p class="hand">"Hoi. De stroom is afgesloten, de hoofdschakelaar zit in de technische ruimte. Sleutel hangt in het kastje. Ik hou de camera's in de gaten. — Daan"</p>`, 'bad');
  }
  runEnding(k) { this.g.ui.closeModal && this.g.ui.modal && this.g.ui.closeModal(); if (this.g.player.hidden) { this.g.player.hideT = 9; this.g.player.unhide(); } if (k === 'exit') this.endingExit(); else if (k === 'dock') this.endingDock(); }
  showEnding(title, html, kind) {
    const g = this.g;
    g.state = 'ended'; g.input.unlock();
    const m = Math.floor(g.playTime / 60), s = Math.floor(g.playTime % 60);
    document.getElementById('endTitle').textContent = title;
    document.getElementById('endText').innerHTML = html;
    document.getElementById('endStats').textContent = `Speeltijd ${m}:${String(s).padStart(2, '0')} · Einde ${kind === 'good' ? '1/2' : '2/2'} — ${kind === 'good' ? 'je vertrouwde Henk.' : 'je vertrouwde Ria.'} Speel opnieuw om het andere einde te zien (de code is elke keer anders).`;
    const scr = document.getElementById('endScreen'); scr.className = 'screen show ' + kind;
  }
  fearSpike(a, t) { this.fearBias = a; this.fearT = t; }
  // ======================================================================
  //  UPDATE: triggers per hoofdstuk
  // ======================================================================
  update(dt) {
    const g = this.g, f = this.flags, lf = this.lf, p = g.player.pos, e = g.enemy, H = this.host;
    // timers
    const due = []; for (const t of this.timers) { t.t -= dt; if (t.t <= 0) due.push(t); }
    if (due.length) { this.timers = this.timers.filter((t) => t.t > 0); for (const t of due) t.fn(); }
    if (this.anims) this.anims = this.anims.filter((a) => !a.fn(dt));
    if (this.fearT > 0) { this.fearT -= dt; if (this.fearT <= 0) this.fearBias = 0; }
    this.randomAmbience(dt);
    for (const L of this.L.lockers) if (L.speed && Math.abs(L.target - L.angle) > 0.01) { const d = L.target - L.angle; L.angle += Math.sign(d) * Math.min(Math.abs(d), dt * L.speed); L.pivot.rotation.y = L.angle; if (Math.abs(L.target - L.angle) < 0.02) L.speed = 0; }
    // alarm: rode zwaailichten
    if (g.lights.alarm) { const k = 0.5 + 0.5 * Math.sin(g.time * 7); for (const l of g.lights.pool) { l.color.setRGB(1, 0.15 + 0.6 * (1 - k), 0.1 + 0.5 * (1 - k)); } }
    else if (this._wasAlarm !== false) { for (const l of g.lights.pool) l.color.set(0xe4ece4); }
    this._wasAlarm = g.lights.alarm;

    // ======== PERSOONLIJK (elke speler op het eigen scherm) ========
    // H1: draaiende stoel in de hal
    if (f.chapter === 1 && f.keyTech && !lf.chairTurned && !this.inRoom('security') && !g.isVisibleToPlayer(new THREE.Vector3(6.8, 0.8, 12.4))) {
      lf.chairTurned = true; this.L.named.receptionChair.rotation.y = Math.PI * 0.85;
    }
    if (f.chapter === 1 && lf.chairTurned && !lf.chairSeen && this.looking(6.8, 0.8, 12.4, 0.95, 8)) { lf.chairSeen = true; g.audio.play('stinger_soft', { volume: 0.4 }); }
    if (f.chapter === 2) {
      // echo-voetstappen achter je (na het telefoontje)
      if (lf.echoArmed && !lf.echoDone && this.inRoom('corridor') && !this.echo) { this.echo = { active: true, dir: g.player.forward(), t: 0 }; lf.echoDone = true; }
      if (this.echo && this.echo.active) {
        this.echo.t += dt;
        if (g.player.moving) this.echo.dir.lerp(g.player.forward(), dt * 0.5).normalize();
        const back = this.echo.dir.clone().negate(), fwd = g.player.forward();
        if (fwd.dot(back) > 0.55 || this.echo.t > 45 || !this.inRoom('corridor')) {
          this.echo.active = false;
          if (fwd.dot(back) > 0.55) { this.after(0.1, () => g.audio.play('stinger_soft', { volume: 0.5 })); this.after(1.2, () => g.audio.play('whisper_1', { pos: { x: p.x + back.x * 2, y: 1.6, z: p.z + back.z * 2 }, volume: 0.6 })); }
        }
      }
      // spiegel in de toiletten: de figuur staat achter je — maar alleen in de spiegel
      if (!lf.mirror && this.inRoom('toilets') && this.looking(11.1, 1.6, 21.2, 0.9, 4.5)) {
        lf.mirrorLooks = (lf.mirrorLooks || 0) + dt;
        if (lf.mirrorLooks > 0.5 + Math.random() * 0.8) { lf.mirror = true; this.mirrorGhost = { t: 0, x: 15.7, z: Math.min(25.5, Math.max(22.2, p.z + 1.6)) }; }
      }
      if (this.mirrorGhost) {
        const mg = this.mirrorGhost; mg.t += dt;
        const fwd = g.player.forward();
        if (fwd.x > 0.2 || mg.t > 2.2 || !this.inRoom('toilets')) {
          const turned = fwd.x > 0.2;
          this.mirrorGhost = null;
          if (turned) { g.audio.play('whisper_3', { pos: { x: p.x + 1.2, y: 1.6, z: p.z + 0.5 }, volume: 0.7 }); this.fearSpike(0.35, 2); }
          else { g.ui.faceFlash(45); g.audio.play('sub_boom', { volume: 0.45 }); }
          g.lights.flickerNear(13.5, 21, 3, 0.6);
        }
      }
    }
    if (f.chapter === 4) {
      // camerabeeld: iets staat achter je
      if (!lf.cctvDone && this.inRoom('security') && g.lights.power.A && p.z < 4.2 && this.looking(5.5, 1.0, 1.4, 0.8, 4)) {
        lf.cctvDone = true; this.cctvScare = { t: 0, done: false };
        if (H && e.mode !== 'inactive' && e.distToPlayer() < 20) e.relocate(22);
        const mon = g.cctv[1]; mon.cam = 2; mon.t = 30;
      }
      if (this.cctvScare && !this.cctvScare.done) {
        const c = this.cctvScare; c.t += dt;
        const back = this.looking(5.5, 1.5, 10.5, 0.6, 12);
        if ((back && c.t > 1.5) || c.t > 14) {
          c.done = true; this.cctvScare = null;
          if (back) g.audio.play('stinger_soft', { volume: 0.4 });
          this.after(0.6, () => g.audio.play('run_away', { pos: { x: 5.5, y: 0.1, z: 13 }, volume: 1 }));
          this.after(2.8, () => g.audio.play('door_slam', { pos: { x: 5.5, y: 1, z: 10.5 }, volume: 0.9 }));
          g.cctv[1].t = 2;
        }
      }
    }
    if (f.chapter === 5 && lf.dossierScareArmed && !this.dossierFired) {
      if ((g.time - lf.dossierScareArmed > 2 && this.looking(43.5, 1.5, 18.5, 0.75, 12)) || g.time - lf.dossierScareArmed > 12) { this.dossierFired = true; this.dossierScareFn(); }
    }
    if (!H) return;

    // ======== GEDEELD (alleen de host; gasten krijgen de toestand) ========
    if (f.chapter === 2) {
      f.ch2T = (f.ch2T || 0) + dt;
      // deur die openstond is nu dicht
      if (!f.doorClosed && f.ch2T > 20) {
        const d = this.L.named.door_tech.isOpen ? this.L.named.door_tech : this.L.named.door_officeA;
        if (d.isOpen && !g.isVisibleToAny(d.center) && !this.anyNear(d.center.x, d.center.z, 14)) { d.setOpen(false); f.doorClosed = d.id; }
      }
      // telefoon
      if (!f.phoneDone && !f.phoneRinging && (f.stamps || 0) >= 1 && this.anyInRoom('kantine') && !f.phoneArmedT) { f.phoneArmedT = g.time + 2 + Math.random() * 3; }
      if (f.phoneArmedT && !f.phoneRinging && !f.phoneDone && g.time > f.phoneArmedT) this.ringPhone();
      // silhouet achter het matglas van kantoor B
      if (f.glassArmed && !f.glassDone && this.players().some((q) => q.pos.z > 14.5 && q.pos.z < 18 && q.pos.x > 15 && q.pos.x < 32) && (this.anyLooking(23, 1.5, 14.5, 0.8, 14) || g.time - (f.glassArmT ||= g.time) > 30)) {
        f.glassDone = true;
        e.place(21.7, 13.3, Math.PI / 2);
        e.scriptGoto([[21.7, 13.3], [25.5, 13.2], [27.5, 11.5]], 1.0, () => { e.deactivate(); this.after(1.5, () => { if (!this.L.named.door_officeB.isOpen) this.L.named.door_officeB.toggle('slow', { pos: { x: 25.5, z: 12 } }); }); });
        e.silent = false;
      }
    }
    if (f.chapter === 3) {
      // silhouet aan het einde van de gang (alleen in het zaklamplicht zichtbaar)
      if (f.silhouetteArmed && !f.silDone && !this.sil && this.players().some((q) => { const r = this.L.roomAt(q.pos.x, q.pos.z); return r && r.id === 'corridor' && q.pos.x > 28 && q.pos.x < 44; })) {
        this.sil = { t: 0, lit: 0, seen: false };
        e.place(48.2, 16.5, -Math.PI / 2); e.scriptIdle(false); e.silent = true;
        f.silDone = true;
      }
      if (this.sil) {
        const s = this.sil; s.t += dt;
        const vis = g.isVisibleToAny(e.head);
        if (vis && e.targets().some((t) => e.litByFlashlight(t))) { s.lit += dt; s.seen = true; }
        if (vis) s.seen = true;
        const d = e.distToPlayer();
        let gone = false;
        if (s.lit > 1.3 || d < 9) { gone = true; g.flashlight.kill(0.35); g.sfx('sub_boom', { volume: 0.9 }); this.fearSpike(0.5, 2); }
        else if ((s.seen && !vis && s.t > 2) || s.t > 25) gone = true;
        if (gone) {
          e.deactivate(); e.silent = false; this.sil = null;
          this.after(4 + Math.random() * 2, () => g.sfx('scream_human', { pos: { x: 42, y: 1.5, z: 24.5 }, volume: 0.9 }));
          this.after(7.5, () => g.sfx('scream_cutoff', { pos: { x: 41, y: 1.5, z: 25 }, volume: 0.7 }));
        }
      }
      // vertraagde kast-jumpscare: als je je omdraait om te vertrekken
      if (f.burstArmed && !f.burst && g.time - f.burstArmed > 1.5 && !this.anyLooking(38.6, 1.2, 20.25, 0.6, 10)) this.burstFn && this.burstFn();
      if (f.burstArmed && !f.burst && g.time - f.burstArmed > 7) this.burstFn && this.burstFn();
      // na de jacht in hoofdstuk 3: verder als de vijand weg is
      if (f.hideSeq && !f.afterHide && e.mode === 'patrol') { e.deactivate(); this.afterHide(); }
    }
    if (f.chapter === 4) {
      if (Math.random() < dt / 70 && !f.phone2 && this.anyNear(23, 23, 14)) { f.phone2 = true; f.phoneDone = false; this.ringPhone(); this.flags.phoneDone = true; }
    }
    if (f.chapter === 5) {
      if (f.alarm && !f.exitReady && f.countdown > 0) {
        f.countdown -= dt;
        if (f.countdown <= 0) {
          f.exitReady = true;
          g.sfx('beep_ok', { volume: 0.8 }); g.sfx('unlock', { pos: f.choice === 'exit' ? { x: 49, y: 1, z: 16.5 } : { x: 8.9, y: 1.3, z: 32.8 }, volume: 1 });
          if (f.choice === 'exit') { this.L.named.door_exit.locked = 'exit'; this.objective('De nooduitgang is ontgrendeld! Ren naar de oostkant van de hoofdgang.'); this.toastAll('*klik* — het magneetslot van de nooduitgang laat los.'); }
          else { this.objective('De roldeur is ontgrendeld! Ren naar het bedieningspaneel van de laaddock.'); this.toastAll('*klik* — ergens in het westen begint een motor te zoemen.'); }
          // de laatste achtervolging
          const t = e.nearest();
          if (e.mode !== 'inactive' && t) { e.chaseSpeed = 4.0; e.lastKnown.set(t.pos.x, 0, t.pos.z); e.lastSeenT = g.time; e.chaseId = t.id; e.setMode('chase'); }
        }
      }
    }
  }
  toastAll(t, dur = 4) { this.g.ui.toast(t, dur); this.g.net.ui('toast', [t, dur]); }
  beforeCCTV(c, cam) {
    const g = this.g, e = g.enemy;
    this._ccSave = null;
    // de figuur in de deuropening (alleen op het scherm)
    if (this.cctvScare && c === g.cctv[1] && c.cam === 2) {
      this._ccSave = { vis: e.root.visible, x: e.pos.x, z: e.pos.z, yaw: e.yaw };
      e.root.visible = true; e.pos.set(5.5, 0, 10.55); e.root.rotation.y = Math.PI; e.parts.head.rotation.z = 0.5;
    }
    // de figuur bij de roldeur (serverruimte-scherm)
    if (c.server && !this.flags.ending) {
      this._ccSave = { vis: e.root.visible, x: e.pos.x, z: e.pos.z, yaw: e.yaw };
      e.root.visible = true; e.pos.set(5.5, 0, 32.2); e.root.rotation.y = Math.PI * 0.95;
    }
    void cam;
  }
  afterCCTV() {
    const e = this.g.enemy; const s = this._ccSave; if (!s) return;
    e.root.visible = s.vis; e.pos.set(s.x, 0, s.z); e.root.rotation.y = s.yaw; this._ccSave = null;
  }
  // ======================================================================
  //  CO-OP: GEDEELDE TOESTAND (host → gasten)
  // ======================================================================
  snapshot() {
    const g = this.g, L = this.L, f = {};
    for (const k in this.flags) if (!/^(ch2T|countdown|glassArmT|phoneArmedT|burstArmed)$/.test(k)) f[k] = this.flags[k];
    const cp = g.checkpoint && g.checkpoint.player;
    return {
      f, inv: g.inv.items,
      d: L.doors.map((d) => [d.target !== 0 ? 1 : 0, d.locked || 0, +d.openAngle.toFixed(2)]),
      pw: Object.keys(g.lights.power).filter((c) => g.lights.power[c]).join(''),
      fx: L.fixtures.map((x, i) => (x.dead ? i : -1)).filter((i) => i >= 0),
      sc: this.scratches.map((s) => [s.spot, s.idx, s.digit]), code: this.code,
      cp: cp ? { x: +cp.x.toFixed(1), z: +cp.z.toFixed(1), yaw: +cp.yaw.toFixed(2) } : null,
      dr: L.named.drawerCabinet.drawers.map((d) => (d.open ? 1 : 0)),
      al: g.lights.alarm ? 1 : 0, cd: Math.ceil(this.flags.countdown || 0), ob: g.ui.currentObjective || '',
    };
  }
  applyShared(st) {
    const g = this.g, L = this.L;
    if (!st || !st.f) return;
    const prevCh = this.flags.chapter;
    this.flags = JSON.parse(JSON.stringify(st.f));
    if (st.cd) this.flags.countdown = st.cd;
    if (Array.isArray(st.inv)) g.inv.items = st.inv.filter((i) => i && typeof i.id === 'string');
    if (Array.isArray(st.d)) st.d.forEach((v, i) => {
      const d = L.doors[i]; if (!d || !Array.isArray(v)) return;
      d.locked = v[1] || null;
      const open = !!v[0];
      if (open !== (d.target !== 0)) {
        if (open) { d.openAngle = +v[2] || d.openAngle; d.target = d.openAngle; d.speed = 2.4; g.audio.play('creak', { pos: d.center, volume: 0.6 }); }
        else { d.target = 0; d.speed = 2.4; d.pendingCloseSound = 'normal'; }
      }
    });
    if (typeof st.pw === 'string') for (const c of ['A', 'B', 'C', 'D']) g.lights.setCircuit(c, st.pw.includes(c));
    if (Array.isArray(st.fx)) { const dead = new Set(st.fx); L.fixtures.forEach((x, i) => { x.dead = dead.has(i); }); }
    if (Array.isArray(st.sc) && st.code && st.code !== this.code) this.applyScratchCfg(st.sc, st.code);
    if (st.cp) this.netCp = st.cp;
    if (Array.isArray(st.dr)) L.named.drawerCabinet.drawers.forEach((d, i) => { const o = !!st.dr[i]; if (o !== d.open) { d.open = o; const a = d.group.position.z, b2 = o ? 0.69 : 0.31; this.anim(0.35, (k) => { d.group.position.z = a + (b2 - a) * k; }); } });
    g.lights.alarm = !!st.al;
    if (st.al && !this.amb.alarm) this.startAlarm();
    if (!st.al && this.amb.alarm) { this.amb.alarm.stop(0.3); this.amb.alarm2 && this.amb.alarm2.stop(0.3); this.amb.alarm = this.amb.alarm2 = null; }
    this.applyVisuals();
    this.setVent(g.lights.power.B || g.lights.power.C);
    if ((this.flags.chapter || 1) >= 4 && !this.amb.tension && g.audio.ctx) this.amb.tension = g.audio.play('tension', { loop: true, volume: 0.12, bus: 'amb', reverb: 0 });
    if (this.flags.phoneRinging && !this._ringing) this._ringing = true;
    void prevCh;
  }
  applyVisuals() {
    const g = this.g, f = this.flags;
    for (const [id, m] of Object.entries(this.items)) if (m) m.visible = !f.taken?.[id];
    this.updateSwitchVisuals();
    this.fuses[2].material = f.fuseFixed ? g.M.porcelain : g.M.burnt;
    this.note3.visible = !!f.afterHide;
    this.hideScrawl.visible = !!f.hideSeq;
    for (const sc of this.scratches) sc.mesh.visible = (f.chapter || 1) >= 4;
    const bl = this.L.named.burstLocker; if (f.burst && bl.target === 0) { bl.target = -2.3; bl.speed = 16; }
    this.setLevers();
    if (f.serverOpen) this.kpLed.material.color.set(0x40ff60);
  }
  applyScratchCfg(cfg, code) {
    this.code = code;
    cfg.forEach((c, i) => {
      const s = this.scratches[i], sp = SCRATCH_SPOTS[c[0]]; if (!s || !sp) return;
      Object.assign(s, sp, { spot: c[0], idx: c[1], roman: ROMAN[c[1]], digit: c[2] });
      s.mesh.position.set(sp.x, sp.y, sp.z); s.mesh.rotation.y = sp.rot;
      s.mesh.material = scratchMat(s.roman, s.digit);
    });
  }
  // een gast stapt in een lopende dienst
  beginGuest(st) {
    const g = this.g;
    this.applyShared(st);
    const hp = g.net.room && g.net.room.peers().find((q) => q.peer === g.net.hostPeer);
    const pr = hp && hp.presence;
    if (pr && Array.isArray(pr.p)) { g.player.pos.set(+pr.p[0] + 0.8, 0, +pr.p[1] + 0.4); g.player.yaw = +pr.yw || 0; }
    else if (this.netCp) g.player.pos.set(this.netCp.x, 0, this.netCp.z);
    g.player.collide(g.player.pos, 0.27, 1.7);
    this.startAmbience();
    g.ui.fadeTo('#000', 1, 0); g.ui.fadeTo('#000', 0, 2);
    if (st.ob) g.ui.objective(st.ob, 8);
    g.ui.toast('Je bent bij de dienst van je collega ingestapt.', 5);
  }
  // ======================================================================
  //  OPSLAAN / LADEN
  // ======================================================================
  save() { return { flags: JSON.parse(JSON.stringify(this.flags)), drawers: this.L.named.drawerCabinet.drawers.map((d) => d.open), chair: this.L.named.receptionChair.rotation.y }; }
  load(s) {
    const g = this.g;
    this.timers = []; this.anims = []; this.echo = null; this.sil = null; this.cctvScare = null; this.mirrorGhost = null; this.fearBias = 0;
    this.flags = JSON.parse(JSON.stringify(s.flags));
    this.L.named.drawerCabinet.drawers.forEach((d, i) => { d.open = s.drawers[i]; d.group.position.z = d.open ? 0.69 : 0.31; });
    this.L.named.receptionChair.rotation.y = s.chair;
    for (const [id, m] of Object.entries(this.items)) if (m && this.flags.taken?.[id] !== undefined) m.visible = !this.flags.taken[id];
    for (const id of ['key_archive', 'fuse']) if (this.items[id]) this.items[id].visible = !this.flags.taken?.[id];
    this.updateSwitchVisuals();
    this.fuses[2].material = this.flags.fuseFixed ? g.M.porcelain : g.M.burnt;
    this.note3.visible = !!this.flags.afterHide;
    this.hideScrawl.visible = !!this.flags.hideSeq;
    for (const sc of this.scratches) sc.mesh.visible = this.flags.chapter >= 4;
    const bl = this.L.named.burstLocker; if (this.flags.burst) { bl.target = bl.angle = -2.3; bl.pivot.rotation.y = -2.3; }
    g.lights.alarm = !!this.flags.alarm;
    if (this.flags.phoneRinging) { this.flags.phoneRinging = false; this.flags.phoneDone = true; }
    // vijand op een eerlijke plek terugzetten
    if (this.flags.chapter === 3 && this.flags.hideSeq && !this.flags.afterHide) { this.hideSequence(); }
    if (this.flags.chapter === 4) this.spawnHunter(22);
    if (this.flags.chapter === 5 && this.flags.choice && !this.flags.ending) { this.flags.countdown = 45; this.flags.exitReady = false; this.startCountdownResume(); }
  }
  startCountdownResume() {
    const g = this.g, e = g.enemy;
    this.after(5, () => { e.activate(); e.chaseSpeed = 3.6; if (!e.relocate(20)) e.place(5, 30.5); e.investigate({ x: 43, z: 17 }, 2.2); });
    this.objective(this.flags.choice === 'dock' ? 'ALARM. Overleef tot de roldeur van de laaddock ontgrendelt — en ren erheen.' : 'ALARM. Overleef tot de nooduitgang ontgrendelt — en ren erheen.');
  }
  // ======================================================================
  //  TEKSTEN
  // ======================================================================
  logbookHTML() {
    return `<table class="log">
      <tr><td>12-11</td><td>23:58</td><td>Dienst begonnen. Alles rustig.</td><td>D.V.</td></tr>
      <tr><td>12-11</td><td>02:10</td><td>Archief: deur stond open. Gesloten.</td><td>D.V.</td></tr>
      <tr><td>13-11</td><td>00:03</td><td>Stroom valt af en toe weg, sloper gebeld.</td><td>D.V.</td></tr>
      <tr><td>13-11</td><td>03:47</td><td>Geluid op 1e verdieping. Trappenhuis is dichtgelast?? Niet gecontroleerd.</td><td>D.V.</td></tr>
      <tr><td>14-11</td><td>00:14</td><td class="hand shaky">Ronde gelopen. Alles rustig.</td><td class="hand shaky">H. Vos</td></tr>
    </table><p class="small">Het is nu 23:56. De laatste regel is geschreven met blauwe balpen. Het handschrift trilt. Wie is H. Vos?</p>`;
  }
  diaryHTML() {
    return `<p class="hand">10 nov '96 — Ria zegt dat ik me aanstel. Maar de voetstappen in de gang lopen gelijk op met de mijne. Als ik stop, stoppen ze. Eén tel te laat.</p>
      <p class="hand">12 nov — Het staat 's nachts aan het einde van de hoofdgang, bij de nooduitgang. Alleen als ik er met de zaklamp op schijn zie ik het. Als ik wegkijk is het weg.</p>
      <p class="hand">13 nov — Het hoort alles. Rennen, deuren, glas. Ik heb een fles door de gang gegooid en het ging erop af. Dat werkt.</p>
      <p class="hand">14 nov — Ria is niet thuisgekomen na haar dienst. Haar pieper stuurt me nog steeds berichten. Ze wil dat ik naar de laaddock kom.</p>
      <p class="hand">Ik ga het licht uitdoen. Ik ga</p>`;
  }
  newspaperHTML() {
    return `<p class="paper-h">BRABANTS DAGBLAD — 16 NOVEMBER 1996</p><p class="paper-t">Nachtwaker spoorloos verdwenen uit kantoorpand De Wachter</p>
      <p>TILBURG — De politie zoekt naar de 52-jarige nachtwaker Henk V., die sinds de nacht van 13 op 14 november wordt vermist. Zijn auto stond nog op het parkeerterrein. In dezelfde nacht woedde er een korte brand in de serverruimte van het pand, waarbij één dodelijk slachtoffer viel. De identiteit van het slachtoffer is nog niet vrijgegeven.</p>
      <p>Collega's omschrijven Vos als "betrouwbaar en nuchter". Volgens het logboek liep hij om 00:14 nog zijn ronde.</p>
      <p class="small">Vandaag is het 14 november. Precies dertig jaar later.</p>`;
  }
  note3HTML() {
    const lines = [...this.scratches].sort((a, b) => a.idx - b.idx).map((s) => `<li><b>${s.roman}</b> — ${s.hint}</li>`).join('');
    return `<p class="hand">De serverruimte. Daar is het begonnen. Alleen van daaruit gaan de deuren open.</p>
      <p class="hand">De code heb ik in de muren gekrast, op vier plekken, zodat het hem niet vindt. Romeinse cijfers geven de volgorde:</p>
      <ul class="hand">${lines}</ul>
      <p class="hand">Doe je licht uit als het dichtbij is. Het hoort alles — gooi iets om het weg te lokken. Verstop je in kasten of onder bureaus. Als het je daar ziet kruipen, helpt niets meer.</p>
      <p class="hand">— H.</p>`;
  }
  dossierHTML() {
    return `<p class="paper-h">PERSONEELSDOSSIER — VERTROUWELIJK</p>
      <table class="log"><tr><td>Naam</td><td>R. (Ria) van Dam</td></tr><tr><td>Functie</td><td>Ploegleider beveiliging</td></tr><tr><td>In dienst</td><td>1 maart 1988</td></tr><tr><td>Uit dienst</td><td><b>14 november 1996 — overleden</b></td></tr></table>
      <p>Toelichting: omgekomen bij de brand in de serverruimte, nacht van 13 op 14 november 1996, ca. 05:40 uur. Collega H. Vos (nachtdienst) sindsdien vermist.</p>
      <p class="hand">Er zit een pieper in het dossier geniet. Het schermpje licht op. "1 nieuw bericht — Daan".</p>`;
  }
}

// tests zetten window.__fast: dan wachten intro en eindes vrijwel niet
function wait(ms) { return new Promise((r) => setTimeout(r, window.__fast ? 1 : ms)); }
