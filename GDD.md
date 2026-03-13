# Gazillionaire — Game Design Document

> Levend document. Bijhouden bij elke significante ontwerpkeuze of nieuwe feature.

---

## 1. Concept & Elevator Pitch

**Gazillionaire** is een Nederlandstalig, browsergebaseerd ruimtehandelsspel geïnspireerd op het klassieke Gazillionaire (Lunatic Software, 1994). De speler is een beginnend ruimtehandelaar die in 150 beurten zo rijk mogelijk probeert te worden door goederen te kopen en verkopen, risico's te nemen en zijn schip te upgraden.

**Kernloop:** Koop laag → verkoop hoog → upgrade schip → overleef gevaren → herhaal.

**Toon:** Toegankelijk, licht pulpy sci-fi. Niet te serieus, niet te kinderachtig. Nederlandse teksten door de hele game.

---

## 2. Setting & Lore

**Tijdperk:** Het jaar 3042.

**Locatie:** Een naamloze sector van de melkweg die bruist van handel en gevaar. Acht werelden zijn met elkaar verbonden via handelsroutes.

**De speler:** Een beginnend ruimtehandelaar die met 25.000 credits en een tweedehands schip zijn fortuin probeert te maken. Geen achtergrondverhaal — de speler schrijft zijn eigen verhaal via zijn handelsbeslissingen.

**Galactische context:**
- De **Galactische Handelsgilde** reguleert (of probeert te reguleren) de handel
- De **Galactische Bank** op Nexoria en Techton verstrekt leningen
- **Ruimtepiraten** opereren actief op interplanetaire routes
- Een levendige **zwarte markt** bloeit op Mortex Station
- **NPC-handelaren** concurreren actief met de speler (zie §7)

---

## 3. Spelregels & Kerncijfers

| Parameter | Waarde |
|---|---|
| Maximale beurten | 150 |
| Startkrediet | 25.000 credits |
| Maximale schuld | 8.000 credits |
| Rente | 5% per 20 beurten |
| Reistijd | `ceil(afstand / 18 / snelheid)` beurten |
| Startplaneet | Nexoria |

**Eindigingsvoorwaarden:**
- **Normaal einde:** 150 beurten bereikt — hoogste nettowaarde wint
- **Bankroet:** Krediet negatief en kan schuld niet terugbetalen
- Nettowaarde = credits + aandelenwaarde + ladingwaarde − schulden

**Schipkeuze:** De speler kiest bij aanvang een scheepstype (vracht/passagiers/snel) en koopt een Mark I. De resterende credits (25.000 − scheepsprijs) zijn het startkapitaal voor handel.

---

## 4. Planeten

| Naam | Kleur | Karakter | Bank | Werf | Gevaarlijk |
|---|---|---|---|---|---|
| **Nexoria** | Blauw | Grootste handelshub, startplaneet, galactische bank | ✓ | ✓ | — |
| **Ferrum** | Bruin-oranje | Mijnbouwplaneet, arbeidersvolk, sterke prijsfluctuaties | — | — | — |
| **Agria** | Groen | Landbouwplaneet, oogst bepaalt prijzen | — | — | — |
| **Techton** | Paars | Technologiecentrum, fabrieken en labs, hoge doorvoer | ✓ | ✓ | — |
| **Aqueron** | Cyaan | Oceaanplaneet, biotechnologie, prijsgevoelig voor aanbod | — | — | — |
| **Pyroflux** | Rood | Vulkanische planeet, energiereserves, onvoorspelbare markt | — | — | — |
| **Luxoria** | Goud | Rijkste resortplaneet, exclusieve clientèle, hoge omzet | ✓ | — | — |
| **Mortex Station** | Donkerrood | Vervallen ruimtestation, randgebied, zwarte markt, hoge risico/beloning | — | — | ✓ |

**Kaartposities** (relatief, 0–100):

```
Mortex (48,12)     Agria (80,22)
Ferrum (18,28)
          Nexoria (50,50)
Pyroflux (12,60)
Aqueron (25,75)               Techton (82,72)
               Luxoria (65,88)
```

---

## 5. Goederen

| Naam | Icoon | Basisprijs | Gewicht | Karakter |
|---|---|---|---|---|
| Ferroiet | 🔩 | 50 cr | 1 ton | Basismetaal, laagwaardig maar stabiel |
| Nebulakorrels | 🌾 | 32 cr | 2 ton | Voedsel/graan, zwaar, goedkoop |
| Aquapure | 💧 | 42 cr | 3 ton | Gezuiverd water, zwaarst per eenheid |
| Pyrogel | ⛽ | 82 cr | 2 ton | Ruimtebrandstof |
| Kristalliet | 💠 | 115 cr | 1 ton | Energiekristallen voor reactoren |
| Technoware | 🔌 | 145 cr | 1 ton | Elektronische componenten |
| Bioplasma | 💉 | 175 cr | 1 ton | Medische basistof |
| Lunasteen | 💎 | 310 cr | 1 ton | Zeldzame edelstenen, hoge marge |
| Quantumchips | 💾 | 375 cr | 1 ton | Geavanceerde processors, topwaarde |
| Luxuriet | 👑 | 440 cr | 1 ton | Luxeartikelen, duurste goed |

**Prijsmechanisme (stapeling, in volgorde):**
1. **Basisprijs** — specialiteitsplaneten: 40–55% korting; vraagplaneten: 165–200% opslag
2. **MarktModifiers** — kumulatief effect van koop/verkoop in vorige bezoeken; vervalt 12%/beurt terug naar 1.0; wordt pas toegepast bij vertrek (niet tijdens verblijf, voorkomt arbitrage)
3. **Voorraadfactor** — lage voorraad (+30% bij minimum), hoge voorraad (−25% bij maximum), neutraal bij het midden van de range
4. **Scheepsbonus** — Spearhead −8% aankoopkorting, alleen bij kopen
5. **Mortex-korting** — 35% basiskorting op alle goederen (zwarte markt)

**Voorraadesysteem:**
- Elke planeet heeft een reële voorraad per goed die schommelt elke reisbeurt (delta −4 tot +8)
- Ranges: basis 25–80 ton, specialiteit 60–150 ton, hoge vraag 8–30 ton
- Kopen verlaagt de planeetvoorraad; verkopen verhoogt die (max range+40)
- Marketing-bonus bij aankomst: +15 ton op alle goederen op die planeet
- Max-aankoop is min(betaalbaar, ruimte in ruim, beschikbare planeetvoorraad)

---

## 6. Schepen

### Mark-systeem

Schepen zijn ingedeeld in **3 types** met elk **4 Marks** (upgradeniveaus). Bij Mark III kies je een permanente **specialisatie** (a of b); bij Mark IV ga je door op die specialisatie. Upgraden kan alleen op Techton, stap voor stap (Mark I → II → III → IV), en alleen binnen hetzelfde type.

**Upgrade-regels:**
- Huidig schip ingeleverd voor 60% van de oorspronkelijke aankoopprijs
- Alleen upgraden naar het volgende Mark (niet overslaan)
- Scheepstype is permanent — niet wisselen van vracht naar pax e.d.
- Mark IV is het maximum; scheepswerf toont dit in de UI

---

### Vrachtschip 🚛

| Mark | Naam | Prijs | Snelheid | Laadruimte | Brandstof | Schild | HP | Specials |
|---|---|---|---|---|---|---|---|---|
| I | Vrachtschip Mark I | 16.000 | 1 | 60 ton | 100 L | 2 | 50 | — |
| II | Vrachtschip Mark II | 65.000 | 1 | 100 ton | 120 L | 3 | 70 | — |
| III-a | Tanker Mark III 🛢️ | 210.000 | 1 | 220 ton | 150 L | 3 | 90 | — |
| III-b | Secure Hauler Mark III 🔒 | 210.000 | 2 | 130 ton | 150 L | 5 | 90 | 🛡️ Piratenimmuun, 🔒 Mortex-lading nooit geconfisqueerd |
| IV-a | Tanker Mark IV 🛢️ | 680.000 | 2 | 350 ton | 180 L | 4 | 120 | — |
| IV-b | Secure Hauler Mark IV 🔒 | 680.000 | 2 | 170 ton | 180 L | 5 | 120 | 🛡️ Piratenimmuun, 🔒 Mortex-lading nooit geconfisqueerd |

---

### Passagiersschip 🛳️

| Mark | Naam | Prijs | Snelheid | Passagiers | Brandstof | Schild | HP | Specials |
|---|---|---|---|---|---|---|---|---|
| I | Passagiersschip Mark I | 18.000 | 2 | 10 | 90 L | 2 | 50 | — |
| II | Passagiersschip Mark II | 70.000 | 2 | 20 | 110 L | 2 | 65 | — |
| III-a | Luxury Liner Mark III 🥂 | 220.000 | 3 | 10 | 130 L | 3 | 85 | 🥂 Tickets ×3 |
| III-b | Space Bus Mark III 🚌 | 220.000 | 2 | 40 | 130 L | 2 | 85 | 🚌 Tickets ×0,5 (volume) |
| IV-a | Luxury Liner Mark IV 🥂 | 700.000 | 3 | 12 | 150 L | 4 | 110 | 🥂 Tickets ×3 |
| IV-b | Space Bus Mark IV 🚌 | 700.000 | 2 | 60 | 150 L | 2 | 110 | 🚌 Tickets ×0,5 (volume) |

---

### Snel Schip ✈️

| Mark | Naam | Prijs | Snelheid | Laadruimte | Brandstof | Schild | HP | Specials |
|---|---|---|---|---|---|---|---|---|
| I | Snel Schip Mark I | 19.000 | 3 | 20 ton | 70 L | 1 | 45 | — |
| II | Snel Schip Mark II | 75.000 | 5 | 30 ton | 85 L | 1 | 60 | — |
| III-a | Spearhead Mark III ⚡ | 235.000 | 8 | 40 ton | 100 L | 2 | 75 | ⚡ −8% aankoopprijzen |
| III-b | Shadow Mark III 🌑 | 235.000 | 7 | 45 ton | 95 L | 1 | 75 | 🛡️ Piratenimmuun, 🕵️ Douanekans 5% |
| IV-a | Spearhead Mark IV ⚡ | 740.000 | 10 | 50 ton | 115 L | 3 | 100 | ⚡ −8% aankoopprijzen |
| IV-b | Shadow Mark IV 🌑 | 740.000 | 9 | 60 ton | 110 L | 1 | 100 | 🛡️ Piratenimmuun, 🕵️ Douanekans 5% |

---

**HP-systeem:**
- HP daalt alleen bij event-schade (defect, asteroïden, etc.)
- HP herstelt volledig via reparatie bij een haven
- *(Bewuste keuze: passieve HP-slijtage per rit is verwijderd — voelde niet logisch)*

---

## 7. Upgrades

*(Oneindige upgrade-niveaus (motor/ruim/tank/passagiers/schild) zijn verwijderd in v5.0.0 — schipstats komen nu uitsluitend van het Mark-systeem. Zie §6.)*

Reparatie (bij haven) en verzekering zijn nog steeds beschikbaar als diensten. De Afgeschermd Vrachtruim-upgrade op Mortex bestaat nog steeds voor schepen die dit niet ingebouwd hebben (zie §8b).

---

## 8. Passagiers & Marketing

### Passagiers
- Beschikbaar als het schip passagierscapaciteit heeft
- Op elke planeet wachten een wisselend aantal passagiers met een ticketprijs
- Passagiers betalen bij aankomst op de volgende planeet
- Lifter-event tijdens reis: extra passagier die je meeneemt

### Marketing-campagne
- Koopbaar in de haven-tegel, kosten 500 credits
- De campagne richt zich altijd op de **geselecteerde reisbestemming** (zichtbaar in de knoptekst)
- Effect: +15 wachtende passagiers bij aankomst op de bestemmingsplaneet
- De campagne vervalt bij **elke aankomst** — ongeacht of je op de bestemmingsplaneet landt
- Bonus wordt alleen uitbetaald als je aankomt op de correcte bestemmingsplaneet
- Slechts één actieve campagne tegelijk mogelijk

---

## 8b. Bemanning (Crew)

Elk schip heeft een vaste bemanning afhankelijk van het type en Mark. De bemanning heeft dagelijks salaris nodig en een gelukswaarde die de sfeer aan boord weergeeft.

### Bemanningsgrootte per schip

| Scheepstype | Mark I | Mark II | Mark III | Mark IV |
|---|---|---|---|---|
| Vrachtschip | 3 | 4 | 5 | 6 |
| Passagiersschip | 4 | 5 | 6 | 7 |
| Snel Schip | 2 | 3 | 4 | 5 |

### Salaris & Betaling
- **Dagloon:** 100 credits per bemanningslid per dag (beurt)
- **Betaalinterval:** elke 7 beurten (wekelijks)
- **Weekbetaling:** `bemanningsgrootte × 100 × 7` credits
- De speler kan het dagloon aanpassen (±10 cr/dag per klik)
- Bij betaling worden credits automatisch afgetrokken van de beurs

### Gelukswaarde (0–100)
- Start op 80 bij aanvang of na een bemanningswissel
- Daalt passief met 1 punt per beurt
- Daalt met 15 punten bij een gemiste betaling
- Daalt met 2 punten voor elke extra dag na een gemiste betaling
- Bonus: +10 bij een extra beloning (optioneel, te activeren in de haven)
- Casino-uitje op Luxoria: +15 geluk voor de bemanning

### Consequenties van laag geluk
- Geluk < 30: risico op muiterij-event (sabotage, vertraging)
- Geluk 0: muiterij gegarandeerd bij de volgende beurt

### UI
- Financiën-tabblad toont: Dagloon (cr/pp/dag), Weekbetaling (totaal), volgende betaaldatum, huidige gelukswaarde
- Knoppen ▲/▼ om dagloon aan te passen (+/−10 cr/dag)

---

## 8c. Planeet-specifieke Diensten

### Luxoria — 🎰 Casino Stellaris

Een kaartspel waarbij de speler een kaart (1–13) trekt en de dealer ook. Hoogste kaart wint.

**Inzetniveaus:** 500 / 1.000 / 2.500 / 5.000 / 10.000 credits

**Regels:**
- Speler en dealer trekken elk één kaart (1–13)
- Hogere kaart wint het dubbele terug; bij gelijkspel krijgt de speler zijn inzet terug
- Het casino verdient statistisch gezien: bij verlies verliest de speler zijn inzet; het huis heeft een kleine voorsprong

**Beperkingen per bezoek:** maximaal 5 goktochten per Luxoria-landing

**Achievements:** Huisvoordeel (3 wins op rij, +1.200 cr), Jackpot (win ≥10.000 cr in één tocht, +2.500 cr)

---

### Mortex Station — 🕵 Zwarte Markt

Alle goederen zijn 35% goedkoper dan normaal (basiskorting op `_getPlanetGoedDoelFactor`). Goederen gekocht op Mortex zijn *verdacht* en worden gemarkeerd met ⚠️.

**Douanerisico bij aankomst elders:**
- 25% kans op douanecontrole per beurt met verdachte lading
- Bij betrapping: alle verdachte lading geconfisqueerd + boete van 500 credits
- Met **Afgeschermd Vrachtruim** daalt het risico van 25% naar 5%

**Illegale Scheepswerf — Afgeschermd Vrachtruim:**
- Kosten: 8.000 credits, eenmalig, alleen op Mortex Station
- Douanekans: 25% → 5%

**Achievement:** Zwarthandelaar (douane ontlopen met verdachte lading, +1.000 cr)

---

### Pyroflux — ⛽ Energieboorpost

Brandstof is hier de goedkoopste van alle planeten dankzij vulkanische energiereserves. Elke aankoop telt mee voor het achievement.

**Achievement:** Energieboer (10× getankt op Pyroflux, +600 cr)

---

### Techton — 🛸 Geavanceerde Scheepswerf

Schip upgraden naar het volgende Mark (zie §6). Alleen op Techton beschikbaar — niet meer op Nexoria.

---

### Nexoria / Techton — 🏛 Galactische Bank

Leningen tot 8.000 credits. Rente 5% per 20 beurten. Alleen op Nexoria en Techton beschikbaar.

---

### Nexoria — 📈 Galactische Beurs (exclusief)

Aandelen kunnen alleen worden gekocht en verkocht op Nexoria. Op alle andere planeten is het portfolio alleen-lezen zichtbaar in het **Financiën**-tabblad.

---

## 9. Aandelenbeurs

Zes bedrijven, elk gekoppeld aan een planeet of sector:

| Naam | Icoon | Basiskoers | Achtergrond |
|---|---|---|---|
| NexCorp Mining | ⛏️ | 100 cr | Mijnbouw op Ferrum |
| AquaTech | 💧 | 75 cr | Waterbehandeling |
| PyroEnergie NV | ⚡ | 110 cr | Brandstofproductie op Pyroflux |
| LuxTrading Corp | 💰 | 180 cr | Luxehandel gericht op Luxoria |
| TechStar Industries | 🌟 | 140 cr | Technologiepionier |
| BioMed Galax | 💊 | 85 cr | Farmaceutisch, basis op Aqueron |

Koersen fluctueren elke beurt via een volatiliteitsmodel. Geen limiet op het aantal aandelen per bedrijf.

---

## 10. NPC-Concurrenten

Vijf NPC-handelaren worden gesimuleerd op de ranglijst. Ze zijn **niet** zichtbaar op de kaart — hun vermogen fluctueert achter de schermen.

| Naam | Karakter | Snelheid | Volatiliteit | Startvermogen |
|---|---|---|---|---|
| **Handelaar Zax** 🦊 | Opportunist | 3 | Hoog | 4.500 cr |
| **Koopman Mira** 💼 | Strateeg | 2 | Zeer laag | 5.500 cr |
| **Kapitein Rok** ⚡ | Avonturier | 4 | Middel | 3.000 cr |
| **Makelaar Voss** 🎩 | Veteraan | 1 | Zeer laag | 7.000 cr |
| **Schaduw Nyx** 🕶️ | Mysterie | 3 | Zeer hoog | 5.000 cr |

---

## 11. Events

### Reisevents (tijdens vlucht)

| Type | Events |
|---|---|
| **Gevaar** | Ruimtepiraten, Stralingstorm, Mechanisch Defect, Asteroïdenveld, Goederen Bedorven, Ruimtehaven Gesloten, Noodlanding, Douaneboete, Containerlek, Ruimtediefstal |
| **Kans** | Ruimtewrak Gevonden, Sluiksmokkelaar, Handelstip, Galactische Subsidie, Ruimtelift Gevraagd |
| **Neutraal** | Ionennevel, Douanecontrole, Noodoproep Brandstof, Rustige Reis |

Sommige events hebben keuzes met consequenties. Totale kansen tellen op naar ~1.0 per reisbeurt.

### Aankomstevents (bij landing)

| Type | Events |
|---|---|
| **Gevaar** | Gewapend Conflict, Energiecrisis, Pirateninval, Galactische Handelsblokkade, Voedselschaarste |
| **Neutraal/Positief** | Handelsfestival, Overrijke Oogst, Technologische Doorbraak, Marktcrash, Zwarte Markt Actief, Mijnwerkerstaking |

---

## 12. Achievements

Achievements worden ontgrendeld bij het bereiken van mijlpalen en leveren een kredietbeloning op.

| Categorie | Voorbeelden |
|---|---|
| **Deals** | Eerste Deal, Actieve Handelaar (10 tx), Handelsmagnaat (50 tx), Winstmaker (1k/deal), Superdeal (5k/deal) |
| **Nettowaarde** | Rijkaard (10k), Groot Handelaar (100k), Galactische Millionair (1M), Schuldenvrij, Gazillionair (25M, +100k) |
| **Schip — Vracht** | Zware Vrachter (Mark II), Vloeibare Goudader (Tanker III), Onaantastbaar (Secure III), Galactisch Tankschip (Tanker IV), Fort Knox (Secure IV) |
| **Schip — Passagiers** | Ruimtevervoer (Mark II), Ruimte-elite (Luxury III), Ruimtetaxi (Bus III), Galactische Luxe (Luxury IV), Galactische Bus (Bus IV) |
| **Schip — Snel** | Ruimteraket (Mark II), Altijd Als Eerste (Spearhead III), Schaduwhandelaar (Shadow III), Snelste van de Sector (Spearhead IV), Ongrijpbaar (Shadow IV) |
| **Beurs** | Beursgoeroe (4 aandelen), Beurswinst (1k/deal), Beursmagnaat (10k/deal), Galactisch Belegger (250k totaal) |
| **Reizen & Events** | Wereldreiziger (alle 8 planeten), Ruimtereiziger (10 reizen), Piratenontkomer, Op de Rand (aankomst <10L), Taxiservice |
| **Casino** | Huisvoordeel (3 wins op rij, +1.200 cr), Jackpot (win ≥10.000 cr in één gokbeurt, +2.500 cr) |
| **Zwarte Markt** | Zwarthandelaar (douane ontlopen met verdachte lading, +1.000 cr) |
| **Pyroflux** | Energieboer (10× getankt op Pyroflux, +600 cr) |

---

## 13. Visuele Identiteit

**Kleurenpalet:**
```
Achtergrond:  #04060d  (diep zwart-blauw)
Paneel:       #07111f
Accent:       #00d4ff  (neon cyaan)
Goud:         #ffd700
Groen:        #39ff14  (neon groen)
Rood:         #ff3855
Oranje:       #ff8c42
Paars:        #a855f7
```

**Typografie:**
- `Orbitron` — titels, headers, logo
- `Share Tech Mono` — data, cijfers, tabellen
- `Exo 2` — bodytekst, beschrijvingen

**Stijl:** Dark space theme. Subtiele sterrenanimatie op de achtergrond. Sci-fi UI-elementen met neon accenten. Geen pixel art, geen 3D — platte vectorachtige look.

**Geluid:** Web Audio API (geen externe bestanden). Synthesized SFX per actie: koop (muntjes), verkoop (kassalade), reis (motorgebrom), landing (thud), achievement (pi-ping), etc.

---

## 14. Technische Architectuur

**Stack:** Pure HTML5 / CSS3 / Vanilla JavaScript. Geen frameworks, geen build tools.

**Bestandsstructuur:**
```
js/config.js      — Supabase keys (gitignored, geïnjecteerd door CI)
js/audio.js       — Web Audio API geluidsmodule
js/data.js        — PLANETEN, GOEDEREN, SCHEPEN, UPGRADES, EVENTS, AANDELEN, ACHIEVEMENTS
js/state.js       — GameState class + singleton `state`, alle spellogica
js/ui.js          — UI object, alle render-functies
js/db.js          — Supabase integratie (sessies, leaderboard)
js/main.js        — App object, event handlers, init
```

**Backend:** Supabase (PostgreSQL + RLS). Elke gamesessie wordt opgeslagen als rij in `game_sessions`. Update na elke landing.

**Deployment:** GitHub Actions → GitHub Pages. Secrets geïnjecteerd bij build.

---

## 15. Bewuste Ontwerpkeuzes

| Beslissing | Reden |
|---|---|
| HP-slijtage per rit verwijderd | Voelde niet logisch — schip beschadigt alleen bij events |
| Vrije Handelaar 9.000 → 6.000 cr | Was te duur voor het middenklasseschip; te weinig startkapitaal over |
| Vleugelschipper 9.500 → 7.500 cr | Balansfix: 500 cr startkapitaal was onbespeelbaar; nu 2.500 cr |
| Achievement upgrade-drempels verlaagd | Niveau 10/25/50 → 3/6/10 (motor/ruim/tank), 3/5/8 (passagiers); oude drempels waren onhaalbaar in een normaal spel |
| Verzekeringsprijs verlaagd | Formule 300+cap×8+pax×60 → 80+cap×2+pax×10; nu 170–340 cr in plaats van 780–1300 cr |
| `cr` → `credits` in UI | Duidelijker voor nieuwe spelers |
| 150 beurten vast | Geeft urgentie en zorgt voor zinvolle beslissingen; eindig is spannender |
| Supabase anon key is publiek | By design — beveiliging via RLS policies, niet via het verborgen houden van de key |
| Admin via Supabase Auth | Server-side authenticatie i.p.v. client-side wachtwoordcheck |
| UPDATE na elke landing | Live data in admin dashboard; betere inzichten in spelverloop |
| Geen automatische HP-slijtage | Zie boven — enkel event-gebaseerde schade |
| Handelsradar upgrade verwijderd (v4.0.0) | Prijs/meerwaardeverhouding klopte niet — spelers kochten hem zelden en de trendpijlen voegden weinig toe |
| Aandelenbeurs exclusief op Nexoria (v4.0.0) | Geeft Nexoria een unieke rol en dwingt spelers terug te keren; portfolio blijft elders leesbaar |
| Financiën-tabblad (v4.0.0) | Bank en aandelenportfolio samengevoegd in één tab — logischer dan beide verspreid over Ruimtehaven en een losse Beurs-tab |
| Logboek/Ranglijst/Prestaties naar topbalk (v4.0.0) | Vermindering tabbladen-rommel; deze schermen zijn secundair t.o.v. Handel/Haven/Planeet |
| Planeet-tab als tegellayout (v4.0.0) | Consistentie met Ruimtehaven; elke dienst krijgt zijn eigen afgebakende tile |
| Galactische markt: klikbare planeetkolommen (v4.0.0) | Snellere bestemming selecteren rechtstreeks vanuit de prijsoverzichtstabel |
| Oneindige upgrades verwijderd (v5.0.0) | Schipstats komen nu puur van het Mark-systeem — eenvoudiger, beter leesbaar, minder sluipende balansbreuk door gestapelde upgrades |
| Startkrediet 10.000 → 25.000 (v5.0.0) | Mark I-schepen kosten 16.000–19.000; met 10k was er nauwelijks startkapitaal over voor handel |
| Mark III = specialisatiekeuze (v5.0.0) | Dwingt een strategische beslissing op het moment dat je echt investeert; versterkt identiteit van elke route-stijl |
| Scheepswerf exclusief op Techton (v5.0.0) | Nexoria en Techton hadden te overlappende rollen; Techton is nu de enige werf, Nexoria behoudt bank + beurs |
| Scheepstype permanent (v5.0.0) | Voorkomt dat spelers vroeg switchen om het beste van alle types te combineren; versterkt commitment aan strategie |
| Marketing koppelt aan geselecteerde bestemming (v5.1.x) | Verwijdert de extra stap van aparte bestemmingskeuze — campagne volgt de reisbestemming die al gekozen is |
| Marketing vervalt bij elke aankomst (v5.1.x) | Voorkomt dat campagnes ophopen; houdt de mechaniek simpel en dwingt gerichte keuzes |
| Uitgesteld markteffect bij kopen/verkopen (v5.2.x) | Accumuleer marktimpact tijdens bezoek, flush bij vertrek — voorkomt arbitrage waarbij direct terugverkopen winst oplevert dankzij de eigen aankoop |
| Voorraadesysteem per planeet (v5.2.x) | Elke planeet heeft een reële voorraad die medebepalend is voor de prijs; geeft koopbeslissingen meer diepgang en maakt planeten-routing relevanter |
| Handel-tab als lokale markttabel (v5.2.x) | Aparte tabel voor lokale markt (met knoppen +1/+10/max en −1/−10/alles) maakt kopen/verkopen sneller en overzichtelijker dan invoervelden |
| Tooltips altijd gestijld via #top-tooltip (v5.2.x) | Gebruik nooit het `title=`-attribuut — browser-native tooltips zijn niet te stijlen; consistente `#top-tooltip`-aanpak geeft volledige controle over positie en opmaak |

---

## 16. Ideeën & Toekomstige Features

> Nog niet geprioriteerd. Ideeën bewaren voor later.

- [ ] Planeet-specifieke achtergrondafbeeldingen in de planeet-info kaart
- [ ] Haven-tegels verder aankleden met eigen afbeeldingen (upgrades, beurs, bank)
- [ ] Missiesysteem: opdrachten van NPC's met beloningen
- [ ] Reputatiesysteem per planeet (meer of minder vriendelijke prijzen)
- [ ] Seizoenen of galactische nieuwsberichten die markten beïnvloeden
- [ ] Tweede upgrade-categorie "Wapens" voor betere bescherming bij piraten
- [ ] Highscore-pagina publiek zichtbaar (nu alleen in-game ranglijst)
- [ ] Mobiele UX verder verbeteren

---

*Laatste update: v5.2.14*
