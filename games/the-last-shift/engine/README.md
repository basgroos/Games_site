# The Last Shift — broncode

De spelcode staat hier als ES-modules. `src/game.js` is een gebundelde versie daarvan
(zonder three.js) en wordt door `scripts/build.js` in de pagina gezet, zoals bij de andere spellen.

Na een wijziging hier opnieuw bundelen (vanuit de hoofdmap van de repo):

```bash
npm run bundle:the-last-shift
```

three.js komt als globale `THREE` uit het scripttag in `src/p1.html` (r159); `three-shim.cjs`
koppelt `import ... from 'three'` daaraan. De addons (BufferGeometryUtils, Reflector) komen uit `three-r159`.

| Bestand | Inhoud |
|---|---|
| `main.js` | renderer, game-loop, input, zaklamp, CCTV, post-processing, checkpoints, `boot()` |
| `level.js` | plattegrond, deuren, meubilair, verstopplekken, spiegel, licht, A*, zichtlijn |
| `player.js` | first-person controller, botsingen, voetstappen, verstoppen |
| `enemy.js` | monster: model, animatie, AI (meerdere spelers) en de regisseur |
| `story.js` | hoofdstukken, puzzels, scares, eindes, opslaan/laden, gedeelde co-op-toestand |
| `net.js` | co-op: lobby, Supabase-kamers, avatars, berichten tussen host en gasten |
| `audio.js`, `dsp.js` | ruimtelijk audiosysteem en procedurele geluidssynthese |
| `textures.js`, `ui.js` | procedurele textures en HUD/menu's |
