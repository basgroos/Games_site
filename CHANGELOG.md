# Wijzigingen

## The Last Shift 1.0.2 (2026-10-23)
- Twee hints in Henks briefje klopten niet: het cijfer in de toiletten zit in het **achterste** hokje (niet het middelste), dat in kantoor B **tussen de twee ramen** (niet eronder).

## The Last Shift 1.0.1 (2026-10-23)
- **Verstoppen in kasten en wc-hokjes werkt.** Bij de kasten verscheen geen *Verstoppen in de kast*; alleen onder bureaus en tafels kon je je verstoppen. Nu: kijk naar de kastdeur en druk op E.
- Late doelteksten overschrijven het huidige doel niet meer (bv. als je het briefje in hoofdstuk 3 heel snel leest).
- Test: de smoke-test verstopt zich nu zoals een speler (kijken naar de kast, E).

## The Last Shift 1.0.0 (2026-10-23)
- **Nieuw spel: The Last Shift**, een psychologisch horrorspel in 3D. Je draait je laatste nachtdienst in kantoorpand De Wachter, de nacht voor de sloop. Precies dertig jaar geleden verdween hier ook een nachtwaker.
- Vijf hoofdstukken (ongeveer 20 minuten): de aankomst, de eerste afwijkingen, iets is hier, de jacht en de laatste uitgang. Puzzels: de volgorde van de hoofdschakelaar, de controleklokken, de doorgebrande zekering en een code die op vier plekken in de muren gekrast staat (elke keer anders).
- **Een monster dat zoekt, luistert en verdwijnt.** Het ziet je als je licht geeft of rent, hoort voetstappen (metaal en water luider, tapijt zachter), deuren en gegooide flessen, en muren dempen het geluid. Verstop je in kasten, hokjes of onder bureaus; ziet het je wegkruipen, dan vindt het je. Een regisseur bouwt de druk op en geeft rust na een achtervolging. Gepakt: terug naar het laatste checkpoint.
- **Twee eindes**: de laatste keuze is welke uitgang de noodstroom krijgt.
- Alle geluiden (screams, voetstappen per ondergrond, krakende deuren, gefluister, TL-zoem) worden in de browser gemaakt en klinken ruimtelijk, met galm en demping door muren. Een limiter en een aparte schuif voor schrikgeluiden.
- **Samen spelen (online co-op, 2–4 spelers)**: host een dienst of doe mee via de lijst of de code. Je ziet elkaar met naam en zaklamp; sleutels, deuren, stroom, puzzels en het verhaal zijn gedeeld. Het monster jaagt op jullie allemaal. Pakt het één van jullie, dan staat die weer op bij het laatste checkpoint en spelen de anderen door. Persoonlijke schrikmomenten (de spiegel, het camerabeeld, voetstappen achter je) krijg je op je eigen scherm. Kanalen `bg-tls-<env>-lobby` en `bg-tls-<env>-<code>` via Supabase Realtime, alleen broadcast (geen presence); geen nieuwe tabellen.
- Three.js r159 via jsDelivr; voor de tests staat r159 als `three-r159` in de devDependencies.
- Tests: `tests/smoke.js` speelt het hele verhaal alleen uit (alle puzzels, verstoppen, gepakt worden met checkpoint en beide eindes), `tests/coop.js` speelt met een host en een gast via een nep-verbinding (lobby, gedeelde sleutel, deuren en stroom, de gast laat de host dingen doen, het monster vangt de gast, opstaan en het gezamenlijke einde).

## The House That Remembers 1.0.1 (2026-10-23)
- **Samen spelen werkt nu ook in het huis.** Na ongeveer een halve minuut (rond het moment dat je naar binnen ging) sloot Supabase de verbinding van de spelers af: het spel stuurde elke 4 seconden een presence-update, en Supabase knipt clients af die dat te vaak doen (`ClientPresenceRateLimitReached` in de Realtime-logs). Daarna zag je elkaar niet meer bewegen en liep het verhaal niet meer gelijk.
  - Het spel gebruikt geen Supabase-presence meer. Wie er in de kamer is, komt nu uit gewone berichten: een hartslag met naam en positie, een afscheidsbericht bij weggaan, en wie 12 seconden niets stuurt, is weg.
  - Nieuwe spelers zien elkaar meteen (je stuurt direct een hartslag terug als er iemand bijkomt).
  - Met meer spelers gaan de updates per speler omlaag, zodat een huis met 3 of 4 spelers onder de limiet van Supabase blijft (100 berichten per seconde voor het hele project).
- Nieuwe test `tests/coop-supa.js`: samen spelen via de echte Supabase-code van het spel (met een nagebootste supabase-js). Twee spelers lopen van het hek het huis in en zien elkaar daar nog; de test faalt als het spel Supabase-presence gebruikt.

## The House That Remembers 1.0.0 (2026-10-23)
- **Nieuw spel: The House That Remembers**, een psychologisch horrorspel in 3D. Je opa is verdwenen en jij erft zijn oude huis. Hoe langer je blijft, hoe meer het huis verandert: foto's veranderen, gangen worden langer en iets dat je familie nadoet loopt door de kamers.
- Zeven hoofdstukken (ongeveer 20 minuten): aankomst, de woonkamer, de eetkamer, de gang boven, de afgesloten slaapkamer, de kelder en de laatste herinnering. Puzzels: foto's op volgorde, de muziekdoos en de drie sokkels.
- **Drie achtervolgingen** door The Forgotten: de gang boven (vlucht de afgesloten kamer in), de gang in de kledingkast (haal het deurtje) en de kelder (verstop je waar het je niet kan volgen). Word je gepakt, dan begin je opnieuw vlak voor de achtervolging; het monster wordt dan iets trager.
- **Drie eindes**, waarvan één geheim: vind alle zes de verborgen herinneringen voor einde C.
- **Samen spelen (online co-op)**: host een huis of doe mee via de lijst of de code. Je ziet elkaar met naam en zaklamp, sleutels, deuren en puzzels zijn gedeeld, en wie achterloopt wordt meegetrokken naar het volgende hoofdstuk. Kanalen `bg-thtr-<env>-lobby` en `bg-thtr-<env>-<code>` via Supabase Realtime; geen nieuwe tabellen.
- Je naam komt uit het gedeelde Bas Games-profiel; staging heeft een eigen save.
- Tests: `tests/smoke.js` speelt het hele verhaal alleen uit (alle puzzels, alle achtervolgingen inclusief gepakt worden, checkpoints en alle drie de eindes), `tests/coop.js` speelt met een host en een gast via een nep-verbinding.

## Hollow Pines 1.0.0 (2026-10-23)
- **Nieuw spel: Hollow Pines**, een survival-horrorspel in 3D. Vijf overlevenden zitten vast in een oud huis in een donker dennenbos. Ze moeten de generator repareren, de radio bouwen, het hek openen en de weg halen voor vijf uur 's nachts. Ondertussen jaagt er iets tussen de bomen.
- **Online spelen: wie de kamer maakt, is het monster.** Maak een kamer en geef de code van vier letters aan maximaal vijf vrienden; zij spelen de overlevenden. Lege plekken worden opgevuld met AI-overlevenden. Loopt een vriend weg, dan neemt een AI het over.
- Ook alleen te spelen: als overlevende met vier AI-teamgenoten, of als het monster tegen vijf AI-overlevenden. Moeilijkheid Easy tot Nightmare, drie lengtes, mist, regen of helder weer.
- Het monster heeft drie aanvallen (uithalen, springen, grijpen en wegslepen; losrukken door snel op E te drukken) en zeven vaardigheden (dash, kruipen, geest, rennen, besluipen, schreeuw, duisternis).
- Alle geluiden zijn ruimtelijk en worden gedempt door muren. Een koptelefoon wordt aangeraden.
- Tests: volledige potjes met alleen bots (overlevende en monster), alle aanvallen, en online spelen met een volle kamer, bewegen, zoeken, deuren, taken, grijpen en losrukken, een gast die weggaat of naar een ander tabblad gaat, de host die weggaat, en het aantal berichten per seconde (onder de limiet van Supabase).

## House Sitting 1.3.1 (2026-10-22)
- **Het monster verdwijnt zodra je bij de overbuurman naar binnen stapt.** Eerder verdween het alleen als je eerst de voordeur dichtdeed; ging je meteen met de buurman praten, dan bleef het op het gazon van de Hendersons staan. Nu: je stapt binnen, je kijkt achterom, het gazon is leeg. Daarna praat je met hem (of ga je zitten) en pas als je naar de wc vraagt, verandert hij.
  - De voordeur hoef je niet meer zelf dicht te doen; die zwaait na een paar seconden achter jullie dicht.
  - Taak bij binnenkomst: *Talk to the neighbor (or sit down and rest)*.
  - Samen spelen: het monster verdwijnt voor iedereen zodra één van jullie binnen is.

## House Sitting 1.3.0 (2026-10-22)
- **Er staat altijd een taak linksboven in beeld.** Overal waar de lijst eerder leeg of afgevinkt bleef (na de afwas, na de stoppen, bij de figuur in de tuin, voor het slapengaan, na het doorzoeken met de agenten, in de geopende kamer, tijdens het gesprek met de buurman en als hij verandert) staat nu wat je moet doen, bv. *Something is out in the garden. Look through the glass door.*, *Rest and talk with the neighbor* en *Get away from him!*. Is alles toch eens afgevinkt, dan staat er *Look around. Something will happen soon.*
- Samen spelen: de voetstappen boven (na de afwas) en in de gang (tijdens de nacht) hoort nu iedereen, niet alleen de host.
- Test: tijdens de hele doorspeeltest moet er steeds een open taak in beeld staan.

## House Sitting 1.2.1 (2026-10-22)
- **Het monster verdwijnt als je de voordeur van de buurman dichtdoet.** Terwijl je de straat oversteekt, staat het op het gazon van de Hendersons naar je te kijken. Binnen bij de buurman vraagt die je de deur dicht te doen (*Close the front door behind you*); zodra die dicht is en iedereen binnen is, is het weg. Pas daarna ga je zitten, drink je wat en praat je met hem, en pas als je naar de wc vraagt verandert hij.
  - Doe je de deur niet dicht, dan vraagt hij het na 10 seconden; na een halve minuut slaat de wind hem dicht.
- **Try again en Continue bij de laatste achtervolging beginnen nu op de bank naast de buurman**, vlak voordat hij opstaat en verandert. Eerder stond je meteen in de woonkamer met het monster al binnen, waardoor het leek alsof het gewoon bij de buurman binnenkwam.
- Na de verandering heb je 2 seconden (was 1,3) voordat het achter je aan komt; de keukendeur houdt het 10 seconden tegen (was 8), de achterdeur 3,5 (was 2,5).

## House Sitting 1.2.0 (2026-10-22)
- **Even chillen bij de buurman, dan pas het monster.** De buurman loopt naar binnen en gaat op de bank zitten. Je kunt naast hem gaan zitten (of in de leunstoel): druk op E bij de bank, met W sta je weer op. Er speelt een plaat, hij schenkt water in en praat een tijdje rustig met je, met stiltes waarin je de vreemde dingen opmerkt (hij knippert niet, zijn schaduw, zijn vingers, het druppen, de deur op slot).
  - Pas als je naar de wc vraagt, staat hij op van de bank, vlak naast je, en verandert hij in het monster. Iedereen die zit, wordt overeind getrokken.
  - Het monster uit het huis van de Hendersons is weg zodra je bij de buurman binnenkomt; je ziet het pas weer als hij verandert.
  - Samen spelen: zitten doe je alleen op je eigen scherm. Hij begint te praten als iemand gaat zitten of als iedereen even binnen is.
- Mensen in het spel hebben nu knieën (zitten, lopen).
- Tests: de buurman zit, jij zit, geen monster tijdens het praten, opstaan met W, en de ontsnapping na het opstaan blijft te halen (ook in co-op).

## House Sitting 1.1.1 (2026-10-22)
- **De laatste achtervolging (bij de buurman) is nu te halen.** Je werd eerder bijna altijd gepakt: zelfs een perfect spelende bot haalde het hek niet, en na *Try again* stond je op 1,4 m van het monster met 1,5 s om weg te rennen.
  - Ren naar de **keuken**: zodra iedereen binnen is, slaat de keukendeur dicht en houdt die het monster zo'n **8 seconden** tegen. Je hoort en voelt het tegen de deur beuken. Pak in die tijd de sleutel (haakje bij de keukendeur), duw de kast weg en open de achterdeur.
  - De kast hoeft nog maar **2 keer** geduwd te worden (was 3), het hek **2 keer** (was 3).
  - Ben je allemaal buiten, dan slaat de achterdeur achter jullie dicht en houdt die het monster nog even tegen.
  - Het monster is in deze achtervolging iets minder snel bij zijn uitvallen.
  - Het checkpoint begint nu met afstand tot het monster en 2 seconden om te rennen. De sleutel, kast en deuren werken meteen.
  - Duidelijkere taken: *Grab the back door key (hook by the kitchen door)* en *Push the shelf away from the back door*.
- Tests: een bot rent beide achtervolgingen uit (ook met 2 s per E-druk) en moet ontsnappen; de co-op-test controleert dat de keukendeur pas dichtslaat als iedereen binnen is.

## House Sitting 1.1.0 (2026-10-22)
- **Samen spelen (online co-op, 2–4 spelers, via Supabase)**: hoofdmenu → *Play together (online)*. Maak een kamer en geef de code van 4 letters aan je vrienden, of doe mee met een code. De host start een nieuw spel of gaat verder vanaf zijn checkpoint.
  - Jullie lopen samen door hetzelfde huis en zien elkaar, met naam en eigen zaklamp. Voetstappen van anderen hoor je uit de goede richting.
  - Iedereen kan het verhaal verder brengen: het spel kijkt door de ogen van alle spelers ("iemand loopt de keuken in", "iemand kijkt naar het raam"). Druk op E en de host doet het voor je; deuren, lampen, spullen, zakken en taken zijn voor iedereen hetzelfde.
  - Een briefje dat je leest zie alleen jij. Tussenfilmpjes, ondertitels en geluiden krijgt iedereen; iedereen kan een filmpje doorklikken.
  - Het monster jaagt op wie het dichtstbij is en volgt die speler precies. **Pakt het één van jullie, dan beginnen jullie allemaal opnieuw** vanaf het checkpoint (de host klikt op Try again).
  - Het pauzemenu stopt het spel niet als je samen speelt. Gaat de host weg, dan gaan de anderen terug naar het menu; gaat een gast weg, dan speelt de rest door.
  - Kamer = Realtime-kanaal `bg-room-hs-<env>-<CODE>`; er zijn geen nieuwe tabellen nodig. Je naam komt uit het gedeelde Bas Games-profiel.
- Muisvergrendeling valt pas na drie mislukte pogingen terug op slepen (eerder al na één keer, bv. direct na Esc).
- Lange menu's scrollen nu goed op lage schermen.
- Tests: `tests/smoke.js` speelt het hele verhaal alleen uit, `tests/coop.js` speelt met host en gast via een nep-verbinding. Ze draaien het echte spel in jsdom met Three.js uit `node_modules` (nieuw: devDependency `three@0.128.0`) en een nep-WebGL.

## House Sitting 1.0.0 (2026-10-22)
- **Nieuw spel: House Sitting**, een first-person horrorspel in 3D (Three.js r128 via cdnjs). Je past een weekend op het huis van de Hendersons, met drie vreemde regels.
- Negen hoofdstukken: aankomst, vijf klusjes (vuilnis, afwas, was, stoppen, alles afsluiten), de nacht, de geopende kamer, een achtervolging door het huis, de politie, de agenten, de buurman en een laatste achtervolging met einde.
- Lopen, sprinten met uithoudingsvermogen, zaklamp met batterij, zakken voor sleutels, taken, interactie met deuren, lichtknoppen, ramen, gootsteen, wasmachine, stoppenkast en hek.
- Het monster volgt precies het pad dat jij liep, wisselt traag lopen af met sprints en moet dichte deuren eerst inbeuken.
- Alle geluid wordt in de browser gemaakt en komt uit de juiste richting (koptelefoon aangeraden).
- Automatische checkpoints; staging heeft een eigen save (`hs_ckpt_staging`). Link terug naar Bas Games in het hoofdmenu.
- Alleen toetsenbord en muis; niet voor telefoon of tablet.
- Test: `games/house-sitting/tests/smoke.js` (controleert de gebouwde pagina; jsdom heeft geen WebGL).

## Heldenwacht 1.33.1 (2026-10-13)
- **Samen spelen werkt weer, ook als Supabase Realtime hapert.** Op 13-10-2026 had Supabase een storing in Realtime: het bijhouden wie er in een kamer is (*presence*) liep in een timeout, waardoor een co-op/race/portaal-potje na het accepteren nooit startte. Spelers melden zich nu ook met een "hi"-bericht (broadcast, elke 3 s); de kamer start zodra je elkaar via presence óf via die berichten ziet, en je vriend telt pas als "weg" als je 12 s niets meer van hem hoort.
- Niet veroorzaakt door PULSE//SHIFT: dat spel gebruikt eigen kamers (`bg-room-ps-…`) en raakt de Heldenwacht-kamers en de online-lijst niet.
- Browsertest: co-op met kapotte presence.

## Tiny Empire 2.0.0 (2026-10-12)
- **Nieuw spel: Tiny Empire**, een ontspannen stadsbouwer. Begin met $1.000, een gemeentehuis en een kruispunt en bouw een metropool.
- **Rivier en bruggen**: een kronkelende rivier loopt over de kaart. Steek over met **autobruggen** (ook voor brandweer en politie) of **voetgangersbruggen**. Bouw **promenades**, **parken aan het water** en **jachthavens** op de oever; restaurants, cafés en hotels aan het water verdienen meer.
- **Vervuilde rivier**: fabrieken en centrales vlak bij het water lozen afval dat stroomafwaarts meedrijft. Bewoners naast vies water zijn minder blij; een **recyclingcentrum** op de oever halveert het.
- **Overstromingen** (uit te zetten): bij een waarschuwing heb je 35 seconden om **dijken** te bouwen; gebouwen op de oever zonder bescherming gaan 40 seconden dicht.
- **Ruim 45 gebouwen** in woningen, winkels, vrije tijd, werk, energie, voorzieningen, parken en vervoer: o.a. rijtjeshuis, woontoren, supermarkt, boerderij, energiecentrale, zonnepark, school, bibliotheek, speeltuin, sportveld, zwembad, station, bushalte, parkeergarage en laadpaal. Elk gebouw heeft bouwkosten, onderhoud en een eigen effect.
- **Wegen en verkeer**: straat, avenue, straat met fietspad, rotonde en wandelpad. Elk gebouw maakt autoritten op de straten ernaast; volle straten **lopen vast** (rood in de verkeerskaart), wat inwoners en winkels kost. Klik op een straat om hem om te bouwen. Bus, trein en fiets halen auto's van de weg.
- **Parkeren**: winkels en kantoren hebben parkeerplekken nodig (straat, parkeerterrein of -garage) of goed openbaar vervoer, anders lopen ze klanten mis.
- **Stroom**: de meeste gebouwen gebruiken stroom; bij een tekort verdienen bedrijven minder en zijn inwoners ontevreden.
- **Inwoners** willen veiligheid, zorg, onderwijs, recreatie, winkels, werk en schone lucht. Lawaai, files, vieze rivier en stroomstoringen kosten geluk. Blije steden trekken nieuwe inwoners.
- **23 combinaties** om te ontdekken, waaronder *Waterfront Boulevard*, *Park & Shop*, *Family District* en *City Center*.
- **Wijken**: elk stuk land wordt Downtown, Suburbs, Industrial Area, Waterfront, Shopping District of Countryside, met een eigen bonus.
- **Bankje met bloemen**: goedkope decoratie (ook te slepen langs een straat) die recreatie geeft aan huizen ernaast en straatlawaai dempt.
- **Statistieken**: nieuw blok *Stadsgezondheid* met geluk, veiligheid, vervuiling, verkeer, parkeren, stroom, rivier en openbaar vervoer, elk met een meter en uitleg, plus hoeveel wijken van elk type je hebt.
- Gebouwen draaien automatisch naar de straat (R om te draaien), dag en nacht, auto's, bussen, fietsers, voetgangers en bootjes, 13 kaartlagen, adviseur, statistieken en stadsrapport.
- Staging heeft een eigen save (`tinyEmpire.save.v1.staging`).
- Test: `games/tiny-empire/tests/smoke.js` en `tests/sim.js`.

## Heldenwacht 1.33.0 (2026-10-12)
- **Fast Forward 50×** (knop naast 10×, ook via de sneltoets F). Boven 10× rekent het spel met iets grotere stappen (hooguit ~0,035 s), zodat het ook op een telefoon echt 50× zo snel gaat. Op smalle schermen loopt de snelheidsbalk door op een tweede regel.
- **Prestige 2+: portaal-kans 2× zo groot.** Vanaf je 2e prestige is de kans op een Rare portaal uit gewone potjes verdubbeld. Je ziet het bij Spelen ("×2 door Prestige 2!") en op het Portalen-scherm.
- Tests: `tests/portals.js` uitgebreid (prestige-kans, 50×).

## PULSE//SHIFT 1.1.0 (2026-10-11)
- **Co-op met deathlink (online, via Supabase)**: Modi → *Co-op · Deathlink*. Maak een kamer en geef de code van 4 letters aan een vriend, of doe mee met een code. De host kiest baas en moeilijkheid. Jullie zien elkaar live, schade aan de baas telt voor allebei en **gaat één van jullie neer, dan zijn jullie allebei af**. Allebei dezelfde aanvallen (zelfde seed); gerichte aanvallen gaan om de beurt op jou en op je vriend. In co-op kun je niet pauzeren (Esc opent een menu, het gevecht loopt door).
  - Kamer = Realtime-kanaal `bg-room-ps-<env>-<CODE>`; er zijn geen nieuwe tabellen nodig. Je naam komt uit het gedeelde Bas Games-profiel.
- **% van je beste**: tijdens het gevecht staat links van de levensbalk hoe ver je bent (% van de baas weg) en rechts je beste %, met een gouden streepje op de balk waar je beste poging eindigde. "NEW BEST!" als je verder komt. Ook in de uitslag. In Survival: je beste tijd en % daarvan.
- **The Metronome is een stuk makkelijker**: lager tempo (116/126/136 bpm), minder en langzamere kogels, bredere gaten in de schokgolven, langzamer draaiende muren, en hij krijgt 35% meer schade (korter gevecht).
- **Weg: de laserwanden die snel van de ene kant van het scherm naar de andere gingen** (Pendulum Wall en Cross Sweep).
- **Nieuwe speciale aanvallen**:
  - Metronome: *Tick · Tock* (een raster bommen waarvan de helften om de beurt ontploffen) en *Gear Teeth* (de 16 tanden vliegen er één voor één af, rondje heen en terug).
  - Static Seraph: *Mirror Shards* (kogels die één keer tegen de muur kaatsen; met een ring eromheen) en *Halo Rain* (rijen vallende kogels met een opening die heen en weer schuift).
  - The Offbeat: *Rewind* (kogels vliegen weg, knipperen en komen precies terug) en *Bouncers* (grote kogels die 3 keer kaatsen).
  - Survival kreeg ze er ook bij.
- Test: `tests/coop.js` (twee spelers in één test, met een nep-verbinding in plaats van Supabase).

## PULSE//SHIFT 1.0.0 (2026-10-11)
- **Nieuw spel: PULSE//SHIFT**, een ritme-actie bullet hell. Alles (aanvallen, muziek, beeld) loopt op één gedeelde beat.
- **Bewegen**: dash (Spatie/J/Z) door alles heen, met een **Perfect Shift** als je op het laatste moment door een roze aanval dasht (tijd vertraagt, dash laadt meteen op, Resonance). **Hop** (K/X/Shift) over paarse golven op de vloer voor een **Perfect Hop**.
- **Break** (L/C/E): met 50 Resonance kaats je cyaan ruitjes terug naar de baas. Gouden **Beat Cores** raken de baas ook.
- **Drie bazen met elk drie fases**: The Metronome, Static Seraph en The Offbeat, met dash-checks zoals Pendulum Wall, Clock Hands, Ten Gates, Prism Cage en Wrong Walls.
- **Modi**: Tutorial, Practice (met ghost van je beste run), Survival en Boss Rush. Easy/Normal/Hard en modifiers (Double Time, Glass Core, Remix). Rangen C t/m S+, records, ontgrendelbare kleuren en dash-sporen.
- Staging heeft een eigen save (`pulseshift-staging.`).
- Test: `games/pulse-shift/tests/smoke.js`.

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
