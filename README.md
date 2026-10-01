# Bas Games

Een website met browsergames. Alles draait direct in de browser; voortgang wordt per apparaat bewaard.

| Omgeving | Branch | Adres |
|---|---|---|
| **Live** | `main` | https://basgroos.github.io/Games_site/ |
| **Staging** | `develop` | https://basgroos.github.io/Games_site/staging/ |

## Spellen

| Spel | Map | Status |
|---|---|---|
| Heldenwacht | `games/heldenwacht/` | live |
| Dungeon Crawler | – | binnenkort |

## Hoe het werkt

- **Werken** gebeurt op `develop`. Elke push naar `develop` wordt getest en komt op **staging**.
- **Live zetten**: maak een pull request van `develop` naar `main` en merge die. Dan gaat het naar **live**.
- Bij elke push draait GitHub Actions (`.github/workflows/deploy.yml`):
  1. alle spellen bouwen en testen,
  2. live bouwen uit `main` en staging uit `develop`,
  3. alles samen online zetten via GitHub Pages.
- Elke deploy staat onder **Actions** en **Deployments** in GitHub, met welke commit live en op staging staat.
- Staging heeft een oranje **STAGING**-label en een **eigen voortgang** (andere save), zodat testen nooit je echte voortgang raakt.

## Mappen

```
portal/                 startpagina (index.html) en "binnenkort"-lijst
games/<spel>/game.json  naam, versie, beschrijving, kleur, tests
games/<spel>/src/       broncode; ORDER.txt bepaalt de volgorde van de bestanden
games/<spel>/tests/     tests (draaien tegen de gebouwde versie)
scripts/build.js        bouwt de hele site: node scripts/build.js [live|staging] [map]
scripts/test.js         draait de tests van alle spellen
```

## Zelf bouwen en testen

```bash
npm ci
npm run check            # bouwt live naar site/ en draait alle tests
npm run build:staging    # bouwt de staging-versie naar site/
```

## Een nieuw spel toevoegen

1. Maak `games/<id>/` met een `game.json` (kijk naar `games/heldenwacht/game.json`).
2. Zet de code in `games/<id>/src/` met een `p1.html` (head en body) en een `ORDER.txt` met de scriptbestanden.
3. Zet `"status": "staging"` om het spel eerst alleen op staging te tonen; zet het later op `"live"`.
4. Haal het spel uit `portal/coming-soon.json` als het daar stond.

## Bekende beperking

De ranglijst en co-op van Heldenwacht werken alleen in de Claude-artifactversie. Op deze site speel je alles behalve die online onderdelen.
