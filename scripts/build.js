#!/usr/bin/env node
/* Bouwt de hele Bas Games-site naar een map.
   Gebruik: node scripts/build.js [live|staging] [uitvoermap]
   - Elk spel staat in games/<id>/ met een game.json en src/ORDER.txt.
   - Resultaat: <uitvoermap>/index.html (startpagina) en <uitvoermap>/games/<id>/index.html */
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const root = path.join(__dirname, '..');
const env = process.argv[2] || process.env.SITE_ENV || 'live';
const out = path.resolve(process.argv[3] || path.join(root, 'site'));
if (!['live', 'staging'].includes(env)) { console.error(`Onbekende omgeving: ${env} (gebruik live of staging)`); process.exit(1); }

let commit = process.env.SITE_COMMIT || process.env.GITHUB_SHA || '';
if (!commit) { try { commit = execSync('git rev-parse HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { commit = ''; } }
const date = new Date().toISOString();
// Online instellingen (openbaar: de Supabase-URL en de 'anon'-sleutel mogen in de site staan)
const onlineFile = path.join(root, 'config', 'online.json');
const online = fs.existsSync(onlineFile) ? JSON.parse(fs.readFileSync(onlineFile, 'utf8')) : {};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const gamesDir = path.join(root, 'games');
const games = fs.readdirSync(gamesDir).filter(d => fs.existsSync(path.join(gamesDir, d, 'game.json')))
  .map(d => Object.assign({ dir: d }, JSON.parse(fs.readFileSync(path.join(gamesDir, d, 'game.json'), 'utf8'))))
  .filter(g => g.status !== 'hidden' && (env === 'staging' || g.status !== 'staging'))
  .sort((a, b) => (a.order || 99) - (b.order || 99) || a.name.localeCompare(b.name));

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const g of games) {
  const src = path.join(gamesDir, g.dir, 'src');
  const order = fs.readFileSync(path.join(src, 'ORDER.txt'), 'utf8').split(/\s+/).filter(Boolean);
  const info = { env, version: g.version, commit, date, home: '../../', online: online.url && online.key ? { url: online.url, key: online.key } : null };
  const html = [
    '<!doctype html>', '<html lang="nl">', '<meta name="viewport" content="width=device-width, initial-scale=1">',
    fs.readFileSync(path.join(src, 'p1.html'), 'utf8'),
    `<script>window.HW_BUILD = ${JSON.stringify(info)};</script>`,
    '<script>', ...order.map(f => fs.readFileSync(path.join(src, f), 'utf8')), 'boot();', '</script>', '</html>',
  ].join('\n');
  const dest = path.join(out, 'games', g.dir, 'index.html');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  const assets = path.join(gamesDir, g.dir, 'assets');
  if (fs.existsSync(assets)) fs.cpSync(assets, path.join(out, 'games', g.dir, 'assets'), { recursive: true });
  console.log(`  ${g.name.padEnd(16)} v${g.version}  ${(html.length / 1024).toFixed(0)} kB`);
}

// Startpagina
const tpl = fs.readFileSync(path.join(root, 'portal', 'index.html'), 'utf8');
const cards = games.map(g => `
      <a class="game" href="games/${esc(g.dir)}/" style="--c:${esc(g.color || '#ffd23f')}">
        <span class="game-art" aria-hidden="true"><span>${esc(g.name.slice(0, 1))}</span></span>
        <span class="game-body">
          <span class="game-tag">${esc(g.tagline || '')}</span>
          <span class="game-name">${esc(g.name)}</span>
          <span class="game-desc">${esc(g.description || '')}</span>
          <span class="game-meta">${(g.tags || []).map(t => `<span>${esc(t)}</span>`).join('')}<span class="ver">v${esc(g.version)}</span></span>
        </span>
        <span class="play">Spelen →</span>
      </a>`).join('');
const soon = (JSON.parse(fs.readFileSync(path.join(root, 'portal', 'coming-soon.json'), 'utf8')) || []).map(s => `
      <div class="game soon" style="--c:${esc(s.color || '#6b7280')}"><span class="game-art" aria-hidden="true"><span>?</span></span>
        <span class="game-body"><span class="game-tag">Binnenkort</span><span class="game-name">${esc(s.name)}</span><span class="game-desc">${esc(s.description || '')}</span></span></div>`).join('');
const portal = tpl
  .replace('<!--GAMES-->', cards + soon)
  .replace('<!--ENV-->', env === 'staging' ? `<div class="env-ribbon">STAGING${commit ? ' · ' + esc(commit.slice(0, 7)) : ''} · ${date.slice(0, 10)}</div>` : '')
  .replace('<!--TITLE-->', env === 'staging' ? '[Staging] Bas Games' : 'Bas Games')
  .replace('<!--FOOT-->', `${games.length} ${games.length === 1 ? 'spel' : 'spellen'} · ${env === 'staging' ? 'staging' : 'live'}${commit ? ' · ' + esc(commit.slice(0, 7)) : ''}`);
fs.writeFileSync(path.join(out, 'index.html'), portal);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`Bas Games gebouwd (${env}) → ${path.relative(root, out) || '.'}`);
