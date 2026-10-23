/* Loads the Hollow Pines game code (no rendering) into Node, straight from src/ (or from the built page). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const CORE = ['01-world.js', '02-sim.js', '03-ai-monster.js', '04-ai-survivor.js', '10-net.js'];
function load() {
  const ctx = { console, performance, setTimeout, clearTimeout, clearInterval, Math, JSON, Date,
    setInterval: (f, ms) => { const t = setInterval(f, ms); if (t.unref) t.unref(); return t; } }; // timers must not keep the test process alive
  ctx.globalThis = ctx; ctx.window = undefined;
  vm.createContext(ctx);
  const built = process.env.HW_FILE && fs.existsSync(process.env.HW_FILE) ? fs.readFileSync(process.env.HW_FILE, 'utf8') : null;
  for (const f of CORE) {
    let code = fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
    // when the built page is given, check that it really contains this file
    if (built && !built.includes(code.slice(0, 200))) throw new Error('Built page does not contain ' + f);
    vm.runInContext(code, ctx, { filename: f });
  }
  return ctx.HG;
}
module.exports = { load };
