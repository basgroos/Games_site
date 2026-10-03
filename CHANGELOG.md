# Wijzigingen

## Heldenwacht 1.19.0 (2026-10-03)
- **Race: onbeperkt vijanden sturen**: geen cooldown meer. Zo vaak sturen als je geld hebt; knop ingedrukt houden (of toets Z/X/C/V/B) blijft sturen. Vijf soorten: handlangers, sprinters, schildwachten, tanks en juggernaut.
- **Inkomen**: elke zending verhoogt je inkomen; dat krijg je elke 6 seconden uitbetaald. Aanvallen loont dus.
- Gestuurde vijanden komen bij de ander netjes achter elkaar binnen (niet op één hoop); meldingen worden samengevoegd.
- **Splitscreen**: in een race zie je live het veld van je tegenstander naast het jouwe: zijn helden, zijn vijanden (die van jou met een rode ring) en zijn basis. Op een telefoon staat het eronder. Verbergen/tonen met één knop.
- Noodknop *Live terugzetten* staat standaard op de vorige live-versie.

## Heldenwacht 1.18.0 (2026-10-02)
- **Vrienden**: iedereen krijgt een vriendcode (bijv. K7Q-M2X) als hij zijn naam kiest. Vrienden toevoegen met een code, verzoeken accepteren of weigeren, online-status, verwijderen. Menu *Vrienden*.
- **Uitnodigingen**: nodig een vriend uit voor een Race of Co-op op een map en moeilijkheid naar keuze. Melding overal in het spel; uitnodigingen blijven 15 minuten geldig.
- **Race**: tegen elkaar op dezelfde map met precies dezelfde golven. Live stand van je tegenstander, vijanden naar hem sturen (sprinters, tanks, juggernaut). Eerste die alle golven haalt wint; valt je basis, dan verlies je.
- **Co-op**: samen één basis verdedigen. Ieder eigen geld en eigen helden (gele ring = jij, blauwe = je maatje); vijanden 1,5× sterker. De uitnodiger rekent het spel uit, de gast krijgt ~6× per seconde de stand.
- Database: `supabase/schema_social.sql` (spelers, vriendschappen, uitnodigingen; schrijven alleen via functies met een geheim spelers-token).
- Test: `tests/browser/multiplayer.js` speelt met twee browsers een volledige race en co-op tegen een nagebootste Supabase.

## Heldenwacht 1.17.0 (2026-10-01)
- **Animatie voor zeldzame helden**: silhouet, lichtstralen, ringen, flits en onthulling met naam, rarity en "Nieuwe held!". Hogere rarity's (Exotic, Ultra, Secret) krijgen een grotere, langere versie. Werkt bij gacha, shop, codes en beloningen; tikken slaat over.
- **Instelling**: vanaf welke rarity de animatie speelt (of nooit), en "alleen bij nieuwe helden". Met voorbeeldknop.

## Heldenwacht 1.16.0 (2026-10-01, staging)
- **Skill Tree** (menu *Skills*): permanente account-upgrades in 5 takken (Economie, Kracht, Techniek, Verdediging, Beloningen), 20 skills met 1 tot 5 levels en vereisten.
- **Skillpunten** verdien je met accountlevels (ook over prestige heen), sterren, achievements, prestige en dungeon-diepte. Resetten kost 50 gems.
- **Effecten 2.0**: sporen achter projectielen, mondingsvuur, inslag- en explosielicht, schroeiplekken, ability-signaturen per element, aura's vanaf upgrade 3, drop-in bij plaatsen, lichtzuil bij upgrades, spawn-, geraakt- en sterfanimaties, baasaura per fase, fase-markeringen op de baasbalk.
- **Prestaties**: een kwaliteitsregelaar schaalt effecten automatisch terug als tekenen te lang duurt; schadegetallen per vijand worden samengevoegd.
- Tests: nieuwe `tests/skills.js`.

## Heldenwacht 1.15.0
- Co-op en de oude Claude-ranglijst verwijderd; scores per potje en een wereldranglijst via Supabase; spelersnaam bij het eerste potje.

## Bas Games 1.0.0 (2026-10-01)
- Eerste versie van de site: startpagina, staging (`develop`) en live (`main`) via GitHub Pages.
- Heldenwacht 1.14.0 toegevoegd, met een STAGING-label en aparte voortgang op staging, plus een knop terug naar Bas Games.
- Dungeon Crawler aangekondigd als "binnenkort".

## Heldenwacht 1.14.0
- Rol-kenmerken voor alle helden, sterkere upgrades, ability-elementen (brand, bevriezing, schok, ...).
- Nieuwe vijanden (Stoorzender, Vriesgeest, Spiegelridder, Juggernaut, Berserker), elite-eigenschappen en baasfases.
- Eerder: wereld 2, shop, dungeon, Secret- en Mystery-helden, codes, Aura-paneel, auto-golf en trait-waarschuwing.
