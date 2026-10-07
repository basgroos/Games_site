# Wijzigingen

## Heldenwacht 1.32.0 (2026-10-07)
- **Eigen knop Portalen** in het hoofdmenu (met teller) en op het startscherm, met een eigen scherm in plaats van een tabblad bij Modi. Bovenaan staat in drie stappen hoe portalen werken.
- **Duidelijk wat je kunt krijgen**:
  - bij Spelen staat onder de moeilijkheid de *Portaal-kans* (bv. "0,6% kans op een Rare Underworld Portal");
  - na elk gewoon potje toont de uitslag een blok: "RARE … PORTAL GEVONDEN!" met de kans, of "niet dit keer", of bij verlies "win dit potje voor …% kans".
- **Uit potjes krijg je alleen Rare portalen.** Alleen als je een portaal *haalt*, heb je kans op het volgende (Rare → Epic 80%, Epic → Legendary 50%, Legendary → Secret 10%); de uitslag laat zien of het gelukt is.
- **The Devil en Moon Empress krijg je alleen uit het Secret portaal** (daar altijd). Rare, Epic en Legendary geven geen held meer, wel munten, gems en de kans op het volgende portaal.
- Test: `tests/portals.js` uitgebreid.

## Heldenwacht 1.31.0 (2026-10-06)
- **Portalen!** Win je een gewoon potje (alleen of in co-op) in wereld 1, dan heb je kans op een **Underworld Portal**; in wereld 2 een **Lunar Portal**. De kans loopt van **0,5%** op de eerste map tot **3%** op de laatste map van die wereld, en gaat **×1,2 omhoog per moeilijkheid** (op Afgrond bijna 9% op de laatste map).
- Een gevonden portaal is altijd **Rare**. Win je een portaal, dan krijg je munten en gems en heb je kans op het volgende portaal: **Rare → Epic 80%**, **Epic → Legendary 50%**, **Legendary → Secret 10%**. Een portaal is op als je hem opent, ook als je verliest.
- **Nieuwe Secret-helden**, alleen uit portalen: **The Devil** (Underworld) en **Moon Empress** (Lunar). Kans per gewonnen portaal: Rare 0,5%, Epic 2%, Legendary 6%, **Secret gegarandeerd**.
  - *The Devil*: hellevuur dat ontploft en laat branden; elke kill geeft een ziel (+0,4% schade, tot +50%) en zwakke vijanden maakt hij meteen af. Ability *Hellepoort*: zware schade op de hele map en bijna-dode vijanden worden geoogst (ULTIMATE *Apocalyps*: ook het hele pad in brand).
  - *Moon Empress*: maanstralen op 3 vijanden die vertragen; alles wat ze raakt krijgt 20% extra schade van iedereen. Ability *Eclips*: alle vijanden staan stil en krijgen 50% extra schade (ULTIMATE *Volle Maan*).
- **Eigen maps met meerdere routes**: in **De Onderwereld** komen vijanden van **2 kanten**, op **De Maan** van **3 kanten** (links, rechts en boven); de routes komen samen en lopen dan door naar je basis. Portaal-potjes hebben 20 golven: Rare = Moeilijk, Epic = Nachtmerrie, Legendary = Waanzin, Secret = Hel.
- **Samen spelen**: bij Modi → Portalen kies je *Met vriend*. De host gebruikt zijn portaal; als jullie winnen krijgen jullie **allebei** de beloning en allebei de kansen op de held en het volgende portaal.
- Nieuw tabblad **Modi → Portalen** met je portalen, kansen en beloningen.
- Test: `tests/portals.js` (+ portaal-co-op in de browsertest met twee spelers).

## Heldenwacht 1.30.0 (2026-10-06)
- **Boss Rush: 23 bazen in plaats van 12** (alle gewone en event-bazen, zonder raidbazen), met De Chaoskoning als eindbaas. Even lastig: de moeilijkheid loopt geleidelijker op, zodat de laatste baas en zijn escorte precies zo sterk zijn als de oude laatste fase.
- **Veel meer Boss Rush-beloningen**: per verslagen baas extra munten (oplopend), 6 gems per baas, Reroll Tokens en elke 6 bazen een Kosmisch Ticket. Alles verslagen: +150 gems, +10 Reroll Tokens en +2 Kosmische Tickets extra. Een volledige run levert ruim 7× zoveel munten op als voorheen.
- **Trekken gebruikt eerst je tickets**: heb je tickets van die gacha, dan worden die bij 1×, 10× en 100× openen automatisch eerst gebruikt en betaal je alleen voor de rest. In het gacha-scherm staat hoeveel tickets er meegaan.
- **Nieuwe Mystery-held: Rafael Verbrand** (Limited Gacha). Vuurballen die ontploffen en vijanden laten branden, ongeveer zo sterk als een Exotic. Ability *Brandbom*: het hele pad staat 8 seconden in brand met zware vuurschade (cooldown 60 s; ULTIMATE *Inferno*: 12 seconden en heter).
- **Balans: alle helden van Legendary en hoger** (Legendary, Mystery, Mythic, Exotic, Ultra, Secret, Godly en Prismatic) doen **30% minder schade** (ook brand en gif) en **vallen 30% langzamer aan**. Lagere rarities blijven gelijk.
- Test: `tests/bossrush.js`.

## Heldenwacht 1.29.0 (2026-10-06)
- **Nieuwe rarity: Prismatic** (boven Godly). Eén held: **Aurora Prismatica**, alleen in de **Basic Gacha** met **0,002%** kans. Mega sterk (ruim 2× de totale schade van De Koning der Elementen): prisma-schoten op 4 vijanden met grote explosies, en alles in haar regenbooggloed loopt 70% vertraagd. Ability *Regenboogstilte*: de hele map 90% vertraagd (ULTIMATE: 10 seconden).
- **Tweede Godly: De Eindrechter** — één doel tegelijk met enorme schade (≈ 7.600 per seconde op één vijand, bijna 5× zoveel per doel als de Koning), kritieke treffers en +50% tegen bazen. Ability *Vonnis*: één schot van 40× op de sterkste vijand (ULTIMATE: 100× op de 3 sterkste).
- **Godly-helden zitten nu in de Kosmische Gacha** (0,01% per held) in plaats van de Basic Gacha.
- **Nieuwe Exotic: Stormram** — weinig schade, maar zijn windballen duwen vijanden ver terug (bazen minder, onstuitbare vijanden niet). Ability *Orkaanstoot*: alles in bereik 4 vakjes terug (ULTIMATE 7).
- **Endless: hooguit 100.000 munten per potje.** Je kunt verder spelen, maar je krijgt niet meer munten dan dat (zichtbaar als regel bij de beloningen).
- **100× openen zonder animaties**: de zeldzame-held-animaties bleven in de wachtrij staan en speelden pas bij je volgende trekking. Bij 100× is er nu geen animatie meer.
- Test: `tests/prismatic.js`.

## Heldenwacht 1.28.0 (2026-10-05)
- **Nieuwe rarity: Godly** (boven Secret). Er is er één: **De Koning der Elementen**, alleen te krijgen in de **Basic Gacha** met **0,01%** kans. Elk schot is om de beurt vuur (brand), ijs (vertraagt en bevriest) of gif, op 3 vijanden tegelijk met explosies; ongeveer 7× zo sterk als een Ultra. Ability *Elementenstorm*, ULTIMATE *Kroon der Elementen* (vuur, ijs en gif over de hele map).
- **Vier element-helden in Ultra**: *Pyra* (vuur: brandende explosies, *Vuurregen*), *Glaciëra* (ijs: vertraagt en bevriest, *IJstijd*), *Venoma* (gif: schade per seconde en pantser weg, *Gifwolk*) en *Voltara* (bliksem: springt van vijand naar vijand, *Donderslag*).
- **Gif** is een nieuwe status: schade per seconde en vijanden verliezen pantser (groene belletjes boven hun hoofd).
- **Legendary-, Epic- en Mythic Gacha verwijderd.** Hun tickets worden automatisch omgezet, ook die je al had en die je nog krijgt: Epic → 2 Rare, Legendary → 3 Rare, Mythic → 1 Kosmisch Ticket.
- **Endless: De Nul groeit niet meer mee.** Zijn uitwissen, %-schade op bazen en de ability *Uitwissen* schaalden met de (exponentiële) levens van endless-vijanden, waardoor zijn schade steeds verder steeg en de ability de hele map wegvaagde. In endless en race: uitwissen alleen nog bij vijanden met hooguit 10× zijn klap aan levens, %-bonus hooguit 2× zijn schade, en de ability doet zware gewone schade (12×, ULTIMATE 25×). Buiten endless blijft hij hetzelfde.
- **100× openen** in elke gacha: kost 90× de prijs, met de gewone garantie in elk blok van 10. Je krijgt een overzicht per held (met aantallen) in plaats van 100 losse kaarten.
- Test: `tests/godly.js`.

## Heldenwacht 1.27.0 (2026-10-04)
- **Endless kan niet meer eindeloos**: met de beste helden kon je tot in het oneindige doorgaan (getest: golf 2000 zonder een leven te verliezen). Nu wordt het steeds lastiger en rond golf 1000 onmogelijk, geleidelijk:
  - golf 50–450: uitwissen, executie, hypnose en %-max-HP-schade worden steeds zwakker en werken daarna niet meer;
  - vanaf golf 60: vijanden lopen sneller (tot 2,5×) en krijgen meer pantser;
  - golf 150–650: steeds meer vijanden zijn *onstuitbaar* (geen verdoving, vertraging of terugduwen), vanaf 650 allemaal;
  - golf 200–500: de basis genezen werkt steeds minder, daarna niet meer;
  - vanaf golf 300: één treffer kan maar een deel van de levens van een vijand weghalen (21% bij golf 500, 0,5% bij golf 1000);
  - vanaf golf 550: elke vijand heeft een minimale tijd nodig om te sterven (1 s bij 650, 11 s bij 1000) en lekken kost meer levens. Bazen kosten in endless hooguit 20 levens × die factor (niet meer 999).
  - Mijlpaal-meldingen bij golf 150, 300, 500, 750 en 900.
- Gemeten met volledig gemaxte teams (één golf per test): het allersterkste team (2× alle Ultra's/Secrets) houdt het tot golf 900, verliest bij 950 ~60 levens en haalt golf 1000 niet meer. Een sterk team (Ultra's + Exotics + Mythics) gaat rond golf 500–600 onderuit.
- Geldt ook voor de Race (die is ook eindeloos).
- Test: `tests/endless.js`.

## Heldenwacht 1.26.0 (2026-10-03)
- **Megabaas makkelijker**: De Oerverslinder heeft nog maar 15 miljoen HP op Normaal (was 90 miljoen, −83%).
- **Ultra-helden en hoger raken hem altijd**: in fase 3 kunnen nu ook Ultra's hem raken (niet meer alleen Secret). Een Secret is dus niet meer nodig; vanaf fase 2 doen helden onder Ultra nog steeds geen schade.
- Gemeten op Normaal (max level, upgrade 5): duo met 1 Ultra per speler wint in ~2:15, met 2 Ultra's per speler in ~1:30; één speler met 1 Ultra + 1 Secret in ~5:20. Zonder Ultra's lukt het niet.
- **Winkel → Valuta: veel gems kopen met munten**, zonder weeklimiet: 50 gems (10.000), 300 gems (54.000), 1.000 gems (165.000) en 5.000 gems (780.000 munten). Vervangt de oude aanbieding van 25 gems (max. 4 per week). Prijs per gem ligt altijd boven wat je voor gems terugkrijgt, dus heen-en-weer ruilen levert niets op.

## Heldenwacht 1.25.0 (2026-10-03)
- **Meer gems**, bovenop de bestaande beloningen (in alle modi behalve de Megabaas, die al een eigen grote beloning heeft):
  - Elke verslagen baas: 5 gems + 3 per moeilijkheidsniveau (Normaal 8, Nachtmerrie 14). Je ziet "+gems" boven de baas als hij valt.
  - Elk potje: 1 gem per 2 gehaalde golven, ook als je verliest.
  - Winst: 15 + 5 per moeilijkheidsniveau (Normaal 20, Nachtmerrie 30).
  - Voorbeeld: winst op Normaal met 4 bazen geeft 62 gems extra; verlies na 9 golven met 1 baas 12 (vroeger 0).
- Test: `tests/gems.js`.

## Heldenwacht 1.24.0 (2026-10-03)
Twee nieuwe **Mystery**-helden, alleen te krijgen in de **Limited Gacha**:
- **Levo de Jingeling**: jongen met toverstaf en bril. Oneindig bereik, schade en snelheid ongeveer als een Exotic. Ability *Loeky Aanval*: 5 honden rennen vanaf de basis over het pad naar het portaal en bijten elke vijand die ze passeren. ULTIMATE *Loeky Aura*: 10 seconden lang blijven er honden komen, met de grote Loeky voorop.
- **BoosGras**: jongen die plasmaballen schiet met een mega-explosie (ongeveer zo sterk als een Exotic). Ability *Boze Grasjes*: boos gras groeit 8 seconden op het pad rond hem; het schiet omhoog met een klap (4× schade), houdt vijanden even vast, vertraagt 55% en doet veel schade. ULTIMATE *Angry Gras*: het hele pad, 12 seconden, 8× schade bij het opschieten, 70% vertraging.
- Helden kunnen nu een bril dragen.
- Test: `tests/mystery.js`.

## Heldenwacht 1.23.0 (2026-10-03)
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
