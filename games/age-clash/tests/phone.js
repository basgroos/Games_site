/* Age Clash op een telefoon: apparaat-detectie, compacte layout, draai-melding en
   een match bedienen met tikken (jsdom met een nagebootste iPhone). */
const { load, ok, run, done } = require('./helpers');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
function phone(w, h) {
  return load({ before(win) {
    Object.defineProperty(win.navigator, 'userAgent', { get: () => IPHONE });
    Object.defineProperty(win.navigator, 'maxTouchPoints', { get: () => 5 });
    Object.defineProperty(win, 'innerWidth', { configurable: true, get: () => w });
    Object.defineProperty(win, 'innerHeight', { configurable: true, get: () => h });
    Object.defineProperty(win.screen, 'width', { configurable: true, get: () => Math.min(w, h) });
    Object.defineProperty(win.screen, 'height', { configurable: true, get: () => Math.max(w, h) });
  } });
}
const P = phone(844, 390), w = P.w, AC = w.AC, $ = (s) => w.document.querySelector(s);
const step = (n) => { for (let i = 0; i < n; i++) AC.Main.step(1 / 30); };
const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const btn = (txt) => [...w.document.querySelectorAll('button')].find((b) => b.textContent.includes(txt));

(async () => {
  await run('detectie: iPhone = telefoon met touch, compacte layout', () => {
    step(5);
    ok(AC.Device.type === 'phone' && AC.Device.touch, 'type ' + AC.Device.type);
    ok(w.document.body.classList.contains('phone') && w.document.body.classList.contains('touch'), 'body-klassen');
    ok(AC.Main.W === 1000 && AC.Main.H === 462, 'podium ' + AC.Main.W + '×' + AC.Main.H);
    ok($('#rotate').style.display === 'none', 'draai-melding in liggend scherm');
    ok(/Telefoon-modus/.test($('.ver').textContent), 'label in menu');
  });
  await run('spelmodus: lokaal 1v1 verborgen op de telefoon', () => {
    AC.UI.show('mode'); step(2);
    ok(w.getComputedStyle($('.mode-local')).display === 'none', 'lokaal zichtbaar');
    ok(btn('START MATCH') && btn('ZOEK TEGENSTANDER'), 'bot/online ontbreken');
  });
  await run('match met tikken: unit, item, tower-menu klapt in, upgrade', () => {
    click(btn('START MATCH')); step(2);
    const sim = AC.Match.sim;
    click(w.document.querySelectorAll('.slot')[0]); step(2);
    ok(sim.units.some((u) => u.side === 0), 'unit');
    sim.players[0].iron = 9000; sim.players[0].itemCd = 0;
    click($('.islot')); step(2); ok(sim.players[0].st.items === 1, 'item');
    click([...w.document.querySelectorAll('.act')].find((b) => b.textContent.includes('Towers'))); step(1);
    ok(AC.Match.drawer[0] === 'tower', 'tower-menu opent niet');
    click(w.document.querySelector('.tbtn')); step(1);
    ok(AC.Match.towerMode && AC.Match.drawer[0] === null, 'menu klapt niet in na kiezen');
    ok(/Tik op een vrije plek/.test($('#hint').textContent), 'geen tik-uitleg');
    AC.Match.cmd(0, { t: 'tower', s: 1, k: AC.Match.towerMode.kind }); step(2);
    ok(sim.towerAt(0, 1), 'tower');
    click([...w.document.querySelectorAll('.act')].find((b) => b.textContent.includes('Upgrades'))); step(1);
    click(w.document.querySelector('.upbtn')); step(2);
    ok(sim.players[0].st.upgrades === 1, 'upgrade');
    ok(!w.document.getElementById('slotTip'), 'hover-tooltip op touch');
    ok(!P.errors.length, P.errors.join(' | '));
  });
  await run('rechtop gehouden: draai-melding, "toch doorgaan" sluit hem', () => {
    const Q = phone(390, 844), q$ = (s) => Q.w.document.querySelector(s);
    for (let i = 0; i < 3; i++) Q.w.AC.Main.step(1 / 30);
    ok(q$('#rotate').style.display === 'flex', 'geen draai-melding');
    q$('#rotate [data-act=go]').dispatchEvent(new Q.w.MouseEvent('click', { bubbles: true }));
    ok(q$('#rotate').style.display === 'none', 'niet te sluiten');
  });
  await run('handmatig kiezen in Instellingen: Computer → volledige layout', () => {
    AC.Match.end(); AC.UI.show('settings'); step(1);
    click(btn('🖥 Computer')); step(1);
    ok(AC.Main.W === 1600 && !w.document.body.classList.contains('phone'), 'override werkt niet');
    click(btn('Automatisch')); step(1);
    ok(AC.Main.W === 1000, 'terug naar automatisch');
  });
  done();
})();
