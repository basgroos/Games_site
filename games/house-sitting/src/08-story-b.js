// ================= STORY II: chapters 4–5 (the open room, the first chase) =================
function storyInitB(){
  const insp = (obj, key, text) => addInter(obj, 'Look closer', () => { G.flags['seen_' + key] = true; think(text, 5.5); }, () => G.step === 'room' || G.step === 'investigate');
  insp(hitbox(0.1, 1.6, 2.2, 6.16, 4.5, 10.3), 'photos', 'Photographs of Dana and Rob. 1962. 1987. 2004. Same faces, same age in every one. In the newer ones their eyes are scratched out. In one, someone very tall stands behind them.');
  insp(hitbox(0.1, 1.4, 1.1, 9.86, 4.6, 9.75), 'marks', 'Scratches. Five at a time, side by side, all the way up to the ceiling. And tally marks. Hundreds of them. Someone was counting.');
  insp(PROPS.cornerChair.g, 'chair', 'A chair turned to face the corner. The seat is still warm.');
  insp(PROPS.keyboard, 'keys', "Keys. Dozens of them, each on its own nail, each tagged with an address. Every house on Alder Lane. One tag says 40 ALDER LANE. The house across the street.");
  insp(PROPS.brokenMirror, 'mirror', 'A mirror, smashed from the middle outward. As if something could not stand to look at itself.');
  insp(hitbox(0.95, 0.4, 1.95, 9.4, 3.2, 10.6), 'mattress', 'A mattress. A blanket. Empty bottles and plates scraped clean. Someone has been living in here. For a long time.');
  addInter(hitbox(0.45, 0.14, 0.45, 7.1, 3.05, 10.95), 'Read the note', () => showNote("IT DOESN'T LIVE IN THE ROOM.\n\nTHE ROOM IS THE ONLY THING KEEPING IT HERE.", 'scrawl', () => { if (G.step === 'room' || G.step === 'investigate') after(0.8, reveal1); }), () => G.step === 'room' || G.step === 'investigate');
  // chase clutter (hidden until the chase)
  const cl = grp(0, 0, 0); cl.visible = false; PROPS.clutterMeshes = cl;
  const ch = grp(5.5, 0.22, 5.35, 0.6, cl); ch.rotation.z = Math.PI / 2; B(0.44, 0.05, 0.44, M.darkWood, 0, 0, 0, { parent: ch }); B(0.44, 0.5, 0.04, M.darkWood, 0, 0, -0.2, { parent: ch });
  B(0.4, 0.3, 0.35, M.fabricTan, 2.9, 0, 5.4, { parent: cl, ry: 0.4 }); B(0.3, 0.2, 0.3, M.fabricTan, 3.2, 0, 5.1, { parent: cl, ry: 1.2 });
  const fl = grp(4.2, 0.08, 6.9, 0.3, cl); B(0.04, 1.5, 0.04, M.darkMetal, 0, 0, 0, { parent: fl, rz: Math.PI / 2 });
  B(0.5, 0.3, 0.4, M.fabricGrey, 12.6, 0, 7.8, { parent: cl, ry: 0.7 });
}
const CLUTTER = [{ x: 5.5, z: 5.35, r: 0.42, level: 0 }, { x: 3.0, z: 5.3, r: 0.45, level: 0 }, { x: 4.2, z: 6.9, r: 0.4, level: 0 }, { x: 12.6, z: 7.8, r: 0.4, level: 0 }];

function reveal1(){
  saveCheckpoint('chase1'); G.step = 'reveal1'; S.revT = 0; G.flags.revSwap = false;
  if (D.bedroom.open) setDoor(D.bedroom, false, { slam: true, speed: 18 }); else SND.doorClose(D.bedroom.center, true);
  player.shake = 0.4; AMB.master = 0.25;
  after(0.6, () => think('A door slammed. Somewhere behind you.', 2.5));
  after(1.6, () => { monStand(8, 3, 8.55); SND.breath(new V3(8, 5.4, 8.6), 0.9); after(1.2, () => scare('Something is breathing behind you.', 3)); S.revArmed = true; });
}
function revealSwap(){
  if (G.flags.revSwap) return; G.flags.revSwap = true;
  FX.locked.on = false; SND.pop(FX.locked.pos); SND.sting(0.24);
  const cands = [new V3(9.45, 3, 11.45), new V3(6.6, 3, 9.6), new V3(9.45, 3, 9.6)];
  cands.sort((a, b) => Math.hypot(b.x - player.pos.x, b.z - player.pos.z) - Math.hypot(a.x - player.pos.x, a.z - player.pos.z));
  const c = cands[0];
  after(0.9, () => { monStand(c.x, 3, c.z); FX.locked.on = true; FX.locked.unstable = 0.35; scare('RUN.', 2); SND.heartbeat(0.8); });
  after(1.7, startChase1);
}
function startChase1(){
  G.step = 'chase1'; AMB.master = 0.6; D.front.jammed = true; D.back.jammed = true; D.front.jamThought = D.back.jamThought = "It won't open! It isn't even locked. It just won't move!";
  setObjectives([{ text: 'Get out of the house!', cls: 'urgent' }]); flashObj();
  monChase({ slow: 1.4, walk: 3.7, burst: 6.8, catchup: 5.0, catchupDist: 11, closeCap: 4.9, catch: 0.9, doorStall: 1.5 });
  G.clutter = CLUTTER.map(c => Object.assign({}, c)); PROPS.clutterMeshes.visible = true;
  player.stamina = Math.max(player.stamina, 80);
}
function loadChase1(){
  resetWorld(); stateNight(); saveCheckpoint('chase1'); G.step = 'room'; setPlayer(7.6, 3, 10.4, Math.PI); player.battery = Math.max(player.battery, 70);
  objective('...'); after(0.4, reveal1);
}
function breakWindow(){
  if (G.flags.winBroken) return; G.flags.winBroken = true; MON.mode = 'watch'; W.kitchenWin.glass.visible = false; SND.shatter(W.kitchenWin.center); player.shake = 0.6; player.frozen = true;
  for (let i = 0; i < 8; i++) B(rnd(0.05, 0.12), 0.004, rnd(0.05, 0.12), M.glass, 8 + rnd(-0.7, 0.7), 0.905, 11.6 + rnd(-0.2, 0.2), { ry: Math.random() * 3, cast: false });
  after(0.35, escape1);
}
function escape1(){
  fade(1, 0.2);
  after(0.3, () => {
    stopChaseMusic(); G.clutter = null; MON.mode = 'watch'; monPlace(8, 0, 10.85, 0);
    setPlayer(8, 0, 13.8, 0); player.frozen = false; player.stumble = 0.6; SND.thud(player.pos, 0.9); AMB.master = 1; AMB.rain = 0.75;
    fade(0, 1.1); G.step = 'escaped'; objective('Get help. Run.', 'urgent');
    after(2.0, () => think("It isn't following. It's just... standing at the window. Watching.", 4.5));
    after(7, () => think('The police station. Twelve blocks. Go.', 3));
  });
}
function storyUpdateB(dt){
  const p = player.pos, f = G.flags;
  if (G.step === 'investigate'){
    if (player.level === 1 && p.x > 6 && p.x < 10 && p.z < 8.9 && p.z > 0.2 && !f.winKnock){
      f.winKnock = true; S.knockT = 0; SND.glassTap(new V3(8, 4.5, -0.05), 3); after(1.6, () => SND.glassTap(new V3(8, 4.5, -0.05), 3));
      after(0.8, () => think('Someone is knocking on the window. Up here. On the second floor.', 4)); after(5, () => think('Rule three. Do not look outside.', 3.5));
    }
    if (f.winKnock && !f.knockDone){
      S.knockT += dt;
      if (S.knockT > 1 && S.knockT < 9 && inView(new V3(8, 4.5, 0), 16, 10, false)){ f.knockDone = true; ghostShow(8, 1.75, -0.7, true); SND.sting(0.26); flashFx('#000', 0.4, 0.6); after(0.45, () => { ghostHide(); think('You looked.', 3); }); }
      if (S.knockT >= 9){ f.knockDone = true; think('The knocking stops.', 2.5); }
    }
    if (player.level === 1 && p.z > 9.1){ G.step = 'room'; think('It is so much colder in here.', 3); objective('Search the room'); }
  }
  if (G.step === 'reveal1' && S.revArmed && !f.revSwap){
    S.revT += dt; const head = new V3(MON.pos.x, 5.5, MON.pos.z);
    if (looked('rev', inView(head, 32, 8, false), dt, 0.7) || S.revT > 7 || Math.hypot(p.x - MON.pos.x, p.z - MON.pos.z) < 1.5) revealSwap();
  }
  if (G.step === 'chase1'){
    if (player.level === 0 && !f.shelfFell){ f.shelfFell = true; PROPS.hallShelf.visible = false; PROPS.hallShelfCol.on = false; PROPS.fallenShelf.visible = true; PROPS.fallenShelfCol.on = true;
      SND.bang(new V3(7, 1, 5.5)); SND.scrape(new V3(7, 0.5, 5.5), 0.6); lightBurst(FX.hall.pos); player.shake = 0.6; }
    if (player.level === 0 && p.x < 5.9 && !f.livBurst){ f.livBurst = true; lightBurst(FX.livLamp.pos, 0xffc27a); }
    if (player.level === 0 && p.x > 6.2 && p.z > 6.2 && !f.kitBurst){ f.kitBurst = true; lightBurst(FX.kitchen.pos, 0xe8f2ff); after(0.4, () => think('The window over the sink!', 2.5)); }
  }
  if (G.step === 'escaped' && p.z < -9){ G.step = 'toStation'; ch6Start(); }
}
