/* House Sitting smoke test. The game needs WebGL, which jsdom does not have, so this test checks the built page:
   the script compiles, Three.js is loaded, the menu and the link back to the site exist, and every chapter is present. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const file = process.env.HW_FILE || path.join(__dirname, '..', '..', '..', 'site', 'games', 'house-sitting', 'index.html');
const html = fs.readFileSync(file, 'utf8');
let failed = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) failed++; };
ok(html.includes('cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'), 'Three.js r128 is loaded from cdnjs');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const game = scripts.find(s => s.includes('function boot('));
ok(!!game, 'game script with boot() is present');
try { new vm.Script(game); ok(true, 'game script compiles'); } catch (e) { ok(false, 'game script compiles: ' + e.message); }
ok(/boot\(\);\s*$/.test(game.trim() + '\n') || game.trim().endsWith('boot();'), 'boot() is called');
for (const id of ['bNew', 'bCont', 'bHome', 'pause', 'dead', 'ending', 'hud', 'objList', 'invList']) ok(html.includes(`id="${id}"`), `#${id} exists`);
for (const fn of ['startCh1', 'takeTrash', 'washPlate', 'powerOut', 'restorePower', 'gardenEvent', 'startSleep', 'wakeUp', 'reveal1', 'startChase1', 'escape1', 'ch6Start', 'policeScene', 'ch7', 'neighborCall', 'ch8', 'twistB', 'startChase2', 'endChase', 'finalEnding', 'gameOver', 'loadCheckpoint'])
  ok(new RegExp('function ' + fn + '\\(').test(game), `chapter function ${fn}() exists`);
ok(html.includes('BUT YOU NEVER FOUND OUT WHO WAS HOUSE-SITTING FOR WHOM.'), 'ending text is present');
ok(game.includes("'hs_ckpt_staging'"), 'staging uses its own save');
if (failed){ console.log(failed + ' check(s) failed'); process.exit(1); }
console.log('House Sitting smoke test passed');
