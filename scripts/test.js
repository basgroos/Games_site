#!/usr/bin/env node
/* Draait de tests van elk spel (staan in game.json onder "tests") tegen de gebouwde site.
   Gebruik: node scripts/test.js [sitemap]   (bouw eerst met node scripts/build.js) */
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const root = path.join(__dirname, '..'), site = path.resolve(process.argv[2] || path.join(root, 'site'));
let failed = 0;
for (const d of fs.readdirSync(path.join(root, 'games'))) {
  const gj = path.join(root, 'games', d, 'game.json'); if (!fs.existsSync(gj)) continue;
  const g = JSON.parse(fs.readFileSync(gj, 'utf8')), file = path.join(site, 'games', d, 'index.html');
  if (!fs.existsSync(file)) { console.log(`- ${g.name}: niet gebouwd, overgeslagen`); continue; }
  for (const t of g.tests || []) {
    console.log(`▶ ${g.name}: ${t}`);
    try { execSync(`node ${t}`, { cwd: path.join(root, 'games', d), stdio: 'inherit', env: Object.assign({}, process.env, { HW_FILE: file }) }); }
    catch (e) { failed++; console.log(`✖ ${g.name}: ${t} mislukt`); }
  }
}
if (failed) { console.log(`\n${failed} test(s) mislukt`); process.exit(1); }
console.log('\nAlle tests geslaagd');
