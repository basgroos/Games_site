# Wijzigingen

## Heldenwacht 1.23.0 (2026-10-03, staging)
Negen nieuwe helden, met nieuwe soorten aanvallen:
- **Premiejager** (Rare): markeert steeds één vijand met een premie. Wordt die verslagen, dan krijg je extra geld; gemarkeerde vijanden krijgen 20% meer schade. Ability *Premiejacht*: 3 premies ×3.
- **Omkeerder** (Epic): klokschoten laten vijanden omdraaien; ze lopen een paar seconden terug naar het portaal. Ability *Tijdstroom*.
- **Wortelaar** (Epic): wortels zetten grondvijanden vast en vertragen ze daarna. Ability *Wortelwoud*.
- **Garnizoen** (Legendary): stuurt soldaten vanaf jullie basis over het pad naar het portaal. Ze houden vijanden tegen en vechten tot ze vallen. Ability *Uitval* (ridders) / ULTIMATE: een reus.
- **Oerkiem** (Legendary): wordt na elke golf sterker; vanaf 5 golven schokgolf, vanaf 10 verdoven, vanaf 15 meteoren, vanaf 25 de Oervorm. Ability *Oerbrul*; ULTIMATE geeft ook +2 groei.
- **Mesmera** (Mythic): hypnotiseert gewone vijanden; ze draaien om en vechten tegen hun eigen bende. Ability *Massahypnose*.
- **Singulara** (Mythic): zwaartekrachtputten trekken vijanden naar één punt (+15% schade op getrokken vijanden) en imploderen. Ability *Gebeurtenishorizon*.
- **De Drieling** (Exotic): drie helden in één vak — Vuist (dichtbij, splash), Pijl (ver, ook vliegers) en Vonk (overspringende bliksem) — die ieder een eigen doel aanvallen. Ability *Drievoud*.
- **Dronemeester** (Exotic): drones zoeken zelf vijanden en worden sterker met elke zege (tot level 20). Ability *Zwermprotocol*.
- Werkt ook in co-op: de gast ziet soldaten, gehypnotiseerde vijanden, putten, wortels en drones.
- Test: `tests/heroes4.js` speelt elke nieuwe held, alle abilities en een potje met ze allemaal.

## Heldenwacht 1.22.0 (2026-10-03)
- **Megabaas** (Vrienden → *Megabaas*): samen met een vriend tegen **De Oerverslinder**, een gigantische baas (90 miljoen HP op Normaal) die heel langzaam naar jullie basis loopt. 45 seconden voorbereiding, $9.000 startgeld en inkomen voor allebei, en steeds escortes.
  - Fase 1 (100–60%): aardbevingen verdoven helden in de buurt.
  - Fase 2 (60–25%): *Kosmisch pantser* — alleen Ultra- en Secret-helden kunnen hem raken.
  - Fase 3 (25–0%): *Oerschild* — alleen Secret-helden kunnen hem raken; hij loopt sneller.
  - Meedoen kan alleen met minstens 1 Ultra- of Secret-held in je team.
  - Schade per treffer en per seconde is begrensd (tegen %-schade en doorgeslagen buffs): een gevecht duurt minstens ~4 minuten. Gemeten: het sterkste duo wint op Normaal in ~8 minuten, een duo met 1 Ultra + 1 Secret per speler of één speler alleen haalt het niet.
  - Winst: 30.000 munten, 400 gems en 25 Reroll Tokens (× moeilijkheid) + volgende trait-reroll gegarandeerd Legendary of beter. Verlies: troostprijs naar gedane schade.
- Test: `tests/browser/multiplayer.js` speelt een Megabaas met twee spelers (eis, uitnodiging, fases, winst).

## Heldenwacht 1.21.0 (2026-10-03)
- **Fast Forward 5×, 7× en 10×** naast 1×, 2× en 3× (oranje knoppen). Toets F wisselt door alle snelheden.
- Bij hoge snelheid op een trage computer vertraagt het spel netjes in plaats van te haperen.
- Co-op: ook de gast kan de nieuwe snelheden kiezen.

## Heldenwacht 1.20.0 (2026-10-03)
- **Race: oneindig golven**: een race tegen een vriend heeft geen laatste golf meer. Net als in Endless komen er elke 5 golven bazen en worden vijanden na golf 30 steeds sneller sterker. Wie het langst overeind blijft (of als de ander opgeeft) wint. De golfteller toont `Golf 12/∞`.
- **Bazen sturen**: twee nieuwe knoppen in de stuurbalk. Chaos-Opperheer voor $20k (toets N, +$300 inkomen) en Mega-Tiran voor $50k (toets M, +$800 inkomen). Vaste prijs, stijgt niet per golf. Lekt een gestuurde baas, dan kost dat 40 of 75 levens in plaats van direct verlies. De ontvanger krijgt een grote waarschuwing.
- Beloningen na een race rekenen met het aantal gehaalde golven.
- Test: `tests/browser/multiplayer.js` controleert oneindig golven en het sturen van beide bazen.

## Ashen Depths 1.0.0 (2026-10-03)
- **Nieuw spel**: Ashen Depths, een roguelite dungeon crawler in pixel-art (vervangt "Dungeon Crawler" uit Binnenkort).
- 6 classes (Warrior, Rogue, Mage, Ranger, Paladin, Necromancer), elk met 5 abilities met 5 ranks, een passive en eigen level-up keuzes.
- 10 gebieden met eigen tegels, vijanden, gevaren en muziek; 10 bazen met meerdere fases; procedurele kerkers met shops, fonteinen, geheime kamers, vallen, mimics en 7 soorten events.
- Willekeurige buit (Common tot Mythic, prefixes en suffixes, 12 unieke legendaries) en een Luck-stat met afnemende meeropbrengst.
- Kamp tussen runs: permanente upgrades met Soul Shards, 31 achievements, bestiary, armory, 6 moeilijkheden en Endless.
- Voortgang per apparaat in de browser; staging gebruikt een eigen save. Knop terug naar Bas Games in het kamp.
- Test: `games/ashen-depths/tests/smoke.js` speelt alle classes, alle bazen, shop, events, inventory en het einde van een run.

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
