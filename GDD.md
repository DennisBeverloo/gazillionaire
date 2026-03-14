# Gazillionaire — Game Design Document

> Levend document. Bijhouden bij elke significante ontwerpkeuze of nieuwe feature.

---

## 1. Concept & Elevator Pitch

**Gazillionaire** is een Nederlandstalig, browsergebaseerd ruimtehandelsspel geïnspireerd op het klassieke Gazillionaire (Lunatic Software, 1994). De speler is een beginnend ruimtehandelaar die in 150 beurten zo rijk mogelijk probeert te worden door goederen te kopen en verkopen, risico's te nemen en zijn schip te upgraden.

**Kernloop:** Koop laag → verkoop hoog → verbeter schip → overleef gevaren → herhaal.

**Toon:** Toegankelijk, licht pulpy sci-fi. Niet te serieus, niet te kinderachtig. Nederlandse teksten door de hele game.

---

## 2. Setting & Lore

**Tijdperk:** Het jaar 3042.

**Locatie:** Een naamloze sector van de melkweg die bruist van handel en gevaar. Acht werelden zijn met elkaar verbonden via handelsroutes.

**De speler:** Een beginnend ruimtehandelaar die met 25.000 credits en een tweedehands schip zijn fortuin probeert te maken. Geen achtergrondverhaal — de speler schrijft zijn eigen verhaal via zijn handelsbeslissingen.

**Galactische context:**
- De **Galactische Handelsgilde** reguleert (of probeert te reguleren) de handel
- De **Galactische Bank** op Nexoria, Techton en Luxoria verstrekt leningen
- **Ruimtepiraten** opereren actief op interplanetaire routes
- Een levendige **zwarte markt** bloeit op Mortex Station
- **NPC-handelaren** concurreren actief met de speler (zie §10)

---

## 3. Spelregels & Kerncijfers

| Parameter | Waarde |
|---|---|
| Maximale beurten | 150 |
| Startkrediet | 25.000 credits |
| Maximale schuld | 8.000 credits (kan stijgen via event) |
| Rente lening | 5% per 20 beurten |
| Reistijd | `ceil(afstand / 18 / snelheid)` beurten |
| Startplaneet | Nexoria |

**Eindigingsvoorwaarden:**
- **Normaal einde:** 150 beurten bereikt — hoogste nettowaarde wint
- **Bankroet:** Nettowaarde daalt onder −2.000 credits
- **Gazillionair-drempel:** speler die ≥ 25.000.000 credits netto waarde bereikt, haalt de prestigetitel "Gazillionair" (ongeacht eindscore)
- Nettowaarde = credits + aandelenwaarde + ladingwaarde − schulden

**Schipkeuze:** De speler kiest bij aanvang een scheepstype (vracht/passagiers/snel) en koopt een Mark I. De resterende credits (25.000 − scheepsprijs) zijn het startkapitaal voor handel.

**Economische schaal:** De Gazillionair-drempel is ~1.000× het startkapitaal — dezelfde ratio als in het originele Gazillionaire (1994). Dit is een prestigemijlpaal, geen verwachte uitkomst voor een gemiddelde run.

---

## 4. Planeten

| Naam | Kleur | Karakter | Bank | Speciale dienst | Gevaarlijk |
|---|---|---|---|---|---|
| **Nexoria** | Blauw | Grootste handelshub, startplaneet | ✓ | Galactische Beurs (exclusief) | — |
| **Ferrum** | Bruin-oranje | Mijnbouwplaneet, sterke prijsfluctuaties | — | Ertsverwerkingsfaciliteit | — |
| **Agria** | Groen | Landbouwplaneet, oogst bepaalt prijzen | — | Oogstveiling (60% kans) | — |
| **Techton** | Paars | Technologiecentrum, fabrieken en labs | ✓ | Geavanceerde Scheepswerf (enige werf) | — |
| **Aqueron** | Cyaan | Oceaanplaneet, biotechnologie | — | — | — |
| **Pyroflux** | Rood | Vulkanische planeet, energiereserves | — | Energieboorpost (goedkoopste brandstof) | — |
| **Luxoria** | Goud | Rijkste resortplaneet, exclusieve clientèle | ✓ | Casino Stellaris | — |
| **Mortex Station** | Donkerrood | Vervallen ruimtestation, zwarte markt | — | Zwarte Markt + Afgeschermd Vrachtruim | ✓ |

**Specialiteit / Vraag per planeet** (bepalend voor prijzen):

| Planeet | Specialiteit (goedkoop) | Vraag (duur) |
|---|---|---|
| Nexoria | — | — |
| Ferrum | Ferroiet, Lunasteen | Nebulakorrels, Aquapure |
| Agria | Nebulakorrels, Aquapure | Technoware, Quantumchips |
| Techton | Technoware, Quantumchips | Pyrogel, Ferroiet |
| Aqueron | Bioplasma, Aquapure | Luxuriet, Lunasteen |
| Pyroflux | Pyrogel, Kristalliet | Nebulakorrels, Bioplasma |
| Luxoria | Luxuriet, Lunasteen | Ferroiet, Pyrogel |
| Mortex | — (35% korting op alles) | — |

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

| Naam | Icoon | Basisprijs | Karakter |
|---|---|---|---|
| Ferroiet | 🔩 | 50 cr | Basismetaal voor bouw en productie |
| Nebulakorrels | 🌾 | 32 cr | Voedzame graankorrels; basisvoedsel voor kolonies |
| Aquapure | 💧 | 42 cr | Gezuiverd water voor menselijke kolonies |
| Pyrogel | ⛽ | 82 cr | Hoogenergetische ruimtebrandstof |
| Kristalliet | 💠 | 115 cr | Energiekristallen voor reactoren en shields |
| Technoware | 🔌 | 145 cr | Elektronische componenten en modules |
| Bioplasma | 💉 | 175 cr | Medische basistof voor behandelingen |
| Lunasteen | 💎 | 310 cr | Zeldzame edelstenen van buitenste manen |
| Quantumchips | 💾 | 375 cr | Geavanceerde kwantumprocessors |
| Luxuriet | 👑 | 440 cr | Allerhande luxe artikelen en statussymbolen |

**Prijsmechanisme (stapeling, in volgorde):**
1. **Basisprijs** — specialiteitsplaneten: doelfactor 0,55 (bereik 10–95% van basis); vraagplaneten: doelfactor 1,80 (bereik 105–300% van basis)
2. **MarktModifiers** — kumulatief effect van koop/verkoop in vorige bezoeken; wordt pas toegepast bij vertrek (niet tijdens verblijf, voorkomt arbitrage)
3. **Voorraadfactor** — lage voorraad (+30% bij minimum), hoge voorraad (−25% bij maximum)
4. **Scheepsbonus** — Spearhead −8% aankoopkorting, alleen bij kopen
5. **Mortex-korting** — 35% basiskorting op alle goederen (zwarte markt)

**Voorraadesysteem:**
- Elke planeet heeft een reële voorraad per goed die schommelt elke reisbeurt
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

| Mark | Naam | Prijs | Snelheid | Laadruimte | Pax | Brandstof | Schild | HP | Specials |
|---|---|---|---|---|---|---|---|---|---|
| I | Vrachtschip Mark I | 16.000 | 1 | 60 ton | 2 | 100 L | 2 | 50 | — |
| II | Vrachtschip Mark II | 65.000 | 1 | 100 ton | 3 | 120 L | 3 | 70 | — |
| III-a | Tanker Mark III 🛢️ | 210.000 | 1 | 220 ton | 2 | 150 L | 3 | 90 | — |
| III-b | Secure Hauler Mark III 🔒 | 210.000 | 2 | 130 ton | 2 | 150 L | 5 | 90 | 🛡️ Piratenimmuun, 🔒 Mortex-lading nooit geconfisqueerd |
| IV-a | Tanker Mark IV 🛢️ | 680.000 | 2 | 350 ton | 3 | 180 L | 4 | 120 | — |
| IV-b | Secure Hauler Mark IV 🔒 | 680.000 | 2 | 170 ton | 3 | 180 L | 5 | 120 | 🛡️ Piratenimmuun, 🔒 Mortex-lading nooit geconfisqueerd |

---

### Passagiersschip 🛳️

| Mark | Naam | Prijs | Snelheid | Pax-cap | Laadruimte | Brandstof | Schild | HP | Specials |
|---|---|---|---|---|---|---|---|---|---|
| I | Passagiersschip Mark I | 18.000 | 2 | 20 | 15 ton | 90 L | 2 | 50 | — |
| II | Passagiersschip Mark II | 70.000 | 2 | 40 | 20 ton | 110 L | 2 | 65 | — |
| III-a | Luxury Liner Mark III 🥂 | 220.000 | 3 | 20 | 20 ton | 130 L | 3 | 85 | 🥂 Tickets ×3 |
| III-b | Space Bus Mark III 🚌 | 220.000 | 2 | 80 | 20 ton | 130 L | 2 | 85 | 🚌 Tickets ×0,5 (volume) |
| IV-a | Luxury Liner Mark IV 🥂 | 700.000 | 3 | 24 | 25 ton | 150 L | 4 | 110 | 🥂 Tickets ×3 |
| IV-b | Space Bus Mark IV 🚌 | 700.000 | 2 | 120 | 25 ton | 150 L | 2 | 110 | 🚌 Tickets ×0,5 (volume) |

*Passagiersschepen trekken van nature ~60% meer passagiers aan dan andere scheepstypen.*

---

### Snel Schip ✈️

| Mark | Naam | Prijs | Snelheid | Laadruimte | Pax | Brandstof | Schild | HP | Specials |
|---|---|---|---|---|---|---|---|---|---|
| I | Snel Schip Mark I | 19.000 | 3 | 20 ton | 4 | 70 L | 1 | 45 | — |
| II | Snel Schip Mark II | 75.000 | 5 | 30 ton | 6 | 85 L | 1 | 60 | — |
| III-a | Spearhead Mark III ⚡ | 235.000 | 8 | 40 ton | 6 | 100 L | 2 | 75 | ⚡ −8% aankoopprijzen |
| III-b | Shadow Mark III 🌑 | 235.000 | 7 | 45 ton | 4 | 95 L | 1 | 75 | 🛡️ Piratenimmuun, 🕵️ Douanekans 5% |
| IV-a | Spearhead Mark IV ⚡ | 740.000 | 10 | 50 ton | 8 | 115 L | 3 | 100 | ⚡ −8% aankoopprijzen |
| IV-b | Shadow Mark IV 🌑 | 740.000 | 9 | 60 ton | 4 | 110 L | 1 | 100 | 🛡️ Piratenimmuun, 🕵️ Douanekans 5% |

---

- HP daalt alleen bij event-schade (defect, asteroïden, etc.)
- HP herstelt volledig via reparatie bij een haven
- *(Bewuste keuze: passieve HP-slijtage per rit is verwijderd — voelde niet logisch)*

---

## 7. Upgrades

*(Oneindige upgrade-niveaus (motor/ruim/tank/passagiers/schild) zijn verwijderd in v5.0.0 — schipstats komen nu uitsluitend van het Mark-systeem. Zie §6.)*

Reparatie (bij haven) en verzekering zijn nog steeds beschikbaar als diensten. De Afgeschermd Vrachtruim-upgrade op Mortex bestaat nog steeds voor schepen die dit niet ingebouwd hebben (zie §8c).

---

## 8. Passagiers & Marketing

### Passagiers
- Beschikbaar als het schip passagierscapaciteit heeft (alle scheepstypen hebben minimaal enige capaciteit)
- Op elke planeet wachten een wisselend aantal passagiers: basis 3–8, aangepast door ticketniveau en scheepstype
- **Passagiersschepen trekken +60% extra passagiers aan** bovenop het basisaantal
- Passagiers betalen bij aankomst op de volgende planeet
- Ticketprijs vóór multiplier: 150–250 cr per passagier (basisrange)
- Lifter-event tijdens reis: extra passagier die je meeneemt

### Ticketniveau (laag / midden / hoog)
De speler stelt het ticketniveau in. Dit bepaalt de verhouding tussen passagiersaantal en ticketprijs:

| Niveau | Aantalmultiplier | Prijsmultiplier |
|---|---|---|
| Laag | ×1,6 | ×0,65 |
| Midden | ×1,0 | ×1,0 |
| Hoog | ×0,6 | ×1,5 |

### Ticket Multipliers per schip
- Luxury Liner (III/IV): ×3 op ticketprijs
- Space Bus (III/IV): ×0,5 op ticketprijs
- Alle andere schepen: ×1

### Marketing-campagne
- Koopbaar in de haven-tegel, kosten 500 credits
- De campagne richt zich altijd op de **geselecteerde reisbestemming** (zichtbaar in de knoptekst)
- Effect: +15 wachtende passagiers + hogere ticketprijs bij aankomst op de bestemmingsplaneet
- De campagne vervalt bij **elke aankomst** — ongeacht of je op de bestemmingsplaneet landt
- Bonus wordt alleen uitbetaald als je aankomt op de correcte bestemmingsplaneet
- Slechts één actieve campagne tegelijk mogelijk

---

## 8b. Bemanning (Crew)

Elk schip heeft een vaste bemanning afhankelijk van het type, Mark én specialisatie. De bemanning heeft wekelijks salaris nodig en een gelukswaarde die de sfeer aan boord weergeeft.

### Bemanningsgrootte per schip

| Schip-ID | Naam | Crew |
|---|---|---|
| vracht_1 | Vrachtschip Mark I | 3 |
| vracht_2 | Vrachtschip Mark II | 5 |
| vracht_3a | Tanker Mark III | 8 |
| vracht_3b | Secure Hauler Mark III | 7 |
| vracht_4a | Tanker Mark IV | 12 |
| vracht_4b | Secure Hauler Mark IV | 10 |
| pax_1 | Passagiersschip Mark I | 4 |
| pax_2 | Passagiersschip Mark II | 6 |
| pax_3a | Luxury Liner Mark III | 10 |
| pax_3b | Space Bus Mark III | 7 |
| pax_4a | Luxury Liner Mark IV | 14 |
| pax_4b | Space Bus Mark IV | 10 |
| snel_1 | Snel Schip Mark I | 2 |
| snel_2 | Snel Schip Mark II | 3 |
| snel_3a | Spearhead Mark III | 5 |
| snel_3b | Shadow Mark III | 4 |
| snel_4a | Spearhead Mark IV | 7 |
| snel_4b | Shadow Mark IV | 6 |

### Salaris & Betaling
- **Dagloon:** 100 credits per bemanningslid per dag (beurt)
- **Betaalinterval:** elke 7 beurten (wekelijks)
- **Weekbetaling:** `bemanningsgrootte × 100 × 7` credits
- De speler kan het dagloon aanpassen (±10 cr/dag per klik); verhoging geeft +10 happiness
- Bij betaling worden credits automatisch afgetrokken van de beurs

### Gelukswaarde (0–100)
- **Start op 75** bij aanvang of na een bemanningswissel
- Daalt passief met **1 punt per beurt** (sleet van het reizen)
- Daalt met **15 punten** bij een gemiste betaling (eerste gemiste dag)
- Daalt met **2 punten** voor elke extra dag na een gemiste betaling
- Bonus **+5** bij succesvolle weeksalaris-betaling
- Bonus **+25** voor een casino-uitje op Luxoria (cooldown: 15 beurten)
- Bonus **+30** bij crew-opstand afgehandeld met dubbel salaris
- Bonus **+10** bij succesvolle onderhandeling tijdens crew-opstand

### Consequenties van laag geluk
- Geluk **< 25**: risico op muiterij-event (18% kans per beurt)
- Geluk **0**: muiterij gegarandeerd bij de volgende beurt

### Muiterij-event opties
- **Betaal dubbel salaris** (2× weekbetaling): crew tevreden, happiness +30
- **Onderhandel** (50% kans): succes → happiness +10, uitstel; mislukking → crew plukt zelf loon uit de kluis

### UI
- Financiën-tabblad toont: Dagloon (cr/pp/dag), Weekbetaling (totaal), volgende betaaldatum, huidige gelukswaarde
- Knoppen ▲/▼ om dagloon aan te passen (+/−10 cr/dag)

---

## 8c. Planeet-specifieke Diensten

### Nexoria — 📈 Galactische Beurs (exclusief)

Aandelen kunnen alleen worden gekocht en verkocht op Nexoria. Op alle andere planeten is het portfolio alleen-lezen zichtbaar in het **Financiën**-tabblad.

---

### Nexoria / Techton / Luxoria — 🏛 Galactische Bank

Leningen tot 8.000 credits (kan via event stijgen). Rente 5% per 20 beurten. Spaarrekening beschikbaar met variabele rente (start 2%, min 0%, max 5%).

---

### Techton — 🛸 Geavanceerde Scheepswerf

Schip upgraden naar het volgende Mark (zie §6). **Enige scheepswerf in de sector** — Nexoria heeft geen scheepswerf meer.

---

### Ferrum — ⚙️ Ertsverwerkingsfaciliteit

Ruwe Ferroiet omzetten naar hoogwaardige Kristalliet.

- **Conversie:** 3 ton 🔩 Ferroiet → 1 ton 💠 Kristalliet
- **Kosten:** 120 credits per batch
- **Beschikbaarheid:** Alleen op Ferrum
- Achievement: Alchemist (30 ton Ferroiet totaal verwerkt)

---

### Agria — 🔨 Oogstveiling

Bij elke landing op Agria is er een kans (60%) dat er een verse oogstveiling plaatsvindt.

- **Veilinggoed:** Nebulakorrels of Aquapure (willekeurig)
- **Hoeveelheid:** variabel (meerdere tonnen)
- **Deelnemers:** de speler biedt tegen een of meerdere NPC-kopers
- **Minimumprijs:** vastgesteld per veiling
- Achievement: Veilingmeester (1 veiling gewonnen)

---

### Pyroflux — ⛽ Energieboorpost

Brandstof is hier de goedkoopste van alle planeten dankzij vulkanische energiereserves. Elke aankoop telt mee voor het achievement.

- **Korting:** ~60% van de basisprijs voor brandstof
- Achievement: Energieboer (10× getankt op Pyroflux, +600 cr)

---

### Luxoria — 🎰 Casino Stellaris

Een kaartspel waarbij de speler een kaart (1–10) trekt en de dealer ook. Hoogste kaart wint.

**Inzetniveaus:** 100 / 1.000 / 2.500 / 5.000 credits

**Regels:**
- Speler en dealer trekken elk één kaart (1–10)
- Hogere kaart wint: speler ontvangt **1,9× de inzet** terug (netto +0,9× inzet)
- Bij gelijkspel: verlies (huis wint bij gelijke kaart)
- Maximaal **3 goktochten** per Luxoria-landing

**Crew-uitje:** Casino-uitje voor de bemanning geeft +25 happiness (cooldown: 15 beurten)

**Achievements:**
- Huisvoordeel (3 wins op rij, +1.200 cr)
- Jackpot (netto winst ≥ 3.000 cr in één gokbeurt, +2.500 cr)

---

### Mortex Station — 🕵 Zwarte Markt

Alle goederen zijn 35% goedkoper dan normaal. Goederen gekocht op Mortex zijn *verdacht* en worden gemarkeerd met ⚠️.

**Douanerisico bij aankomst elders:**
- 25% kans op douanecontrole per aankomst met verdachte lading
- Bij betrapping: alle verdachte lading geconfisqueerd + boete van 500 credits
- Met **Afgeschermd Vrachtruim** daalt het risico van 25% naar 5%
- Secure Hauler (III-b/IV-b): Mortex-lading is altijd immuun voor confiscatie
- Shadow (III-b/IV-b): douanekans structureel 5%

**Illegale Scheepswerf — Afgeschermd Vrachtruim:**
- Kosten: 8.000 credits, eenmalig, alleen op Mortex Station
- Douanekans: 25% → 5%

**Achievement:** Zwarthandelaar (douane ontlopen met verdachte lading, +1.000 cr)

---

## 9. Aandelenbeurs

Zes bedrijven, elk gekoppeld aan een planeet of sector:

| Naam | Icoon | Basiskoers | Achtergrond |
|---|---|---|---|
| NexCorp Mining | ⛏️ | 100 cr | Mijnbouwconglomeraat actief op Ferrum |
| AquaTech | 💧 | 75 cr | Waterbehandeling en distributie |
| PyroEnergie NV | ⚡ | 110 cr | Brandstofproducent op Pyroflux |
| LuxTrading Corp | 💰 | 180 cr | Premium luxehandel gericht op Luxoria |
| TechStar Industries | 🌟 | 140 cr | Technologiepionier en innovator |
| BioMed Galax | 💊 | 85 cr | Farmaceutisch concern met basis op Aqueron |

Koersen fluctueren elke beurt via een volatiliteitsmodel. Geen limiet op het aantal aandelen per bedrijf. Handel uitsluitend mogelijk op Nexoria.

---

## 10. NPC-Concurrenten

Vijf NPC-handelaren worden gesimuleerd op de ranglijst. Ze zijn **niet** zichtbaar op de kaart — hun vermogen fluctueert achter de schermen. Ze beïnvloeden actief de marktprijzen wanneer ze een planeet bezoeken.

| Naam | Icoon | Persoonlijkheid | Snelheid | Volatiliteit | Startvermogen |
|---|---|---|---|---|---|
| **Handelaar Zax** | 🦊 | Opportunist | 3 | 13% | 4.500 cr |
| **Koopman Mira** | 💼 | Strateeg | 2 | 5% | 5.500 cr |
| **Kapitein Rok** | ⚡ | Avonturier | 4 | 10% | 3.000 cr |
| **Makelaar Voss** | 🎩 | Veteraan | 1 | 4% | 7.000 cr |
| **Schaduw Nyx** | 🕶️ | Mysterie | 3 | 22% | 5.000 cr |

---

## 11. Events

### Reisevents (tijdens vlucht)

Kans op een event per reisbeurt: ~52% normaal, ~70% op gevaarlijke planeten (Mortex). Events zijn per categorie gegroepeerd.

| Categorie | Events |
|---|---|
| **Gevaar** | Ruimtepiraten ☠️, Stralingstorm ⚡, Mechanisch Defect 🔧, Asteroïdenveld 🪨, Goederen Bedorven 🤢, Ruimtehaven Gesloten 🚫, Noodlanding 🆘, Douaneboete 🚨, Containerlek 💨, Ruimtediefstal 🦹, Corrosieve Gaswolk ☁️, Botsing Ruimtepuin 🪨, Bedorven Lading 🤢, Lading Volledig Vernietigd 💥, Brandstoflek ⛽, Passagier Wangedrag 😠, Vakbondseis ✊, Galactische Smeekbede 👑, Galactische Naheffing 🧾, Sabotage door Concurrent 🦹, Bankcrisis ⚠️, Nulrentebeleid 🏛️, Intergalactische Recessie 📉, Bankbevriezing 🔒, Vermogensbelasting 💸, Incassobot 🤖, Valse Verzekeraar 🎭, Marketingsabotage 📢 |
| **Kans** | Ruimtewrak Gevonden 🛸, Sluiksmokkelaar 🤫, Handelstip 💡, Galactische Subsidie 🎁, Ruimtelift Gevraagd 🧳, Mysterieus Pakket 📦, Ruilaanbod Smokkelaar 🤫, Drijvend Scheepsonderdeel 🔧, VIP aan Boord 🎩, Vakbondsakkoord 🤝, Vrijwillige Crewbonus ✨, Beursinformant 📊, Verre Erfenis 📜, Galactische Loterij 🎟️, Ruimtespeculant 🤑, Mond-tot-Mondreclame 📣, Verzekeringsaanbieding 🛡️, Verhoogde Kredietlimiet 💳, Concurrent in Financiële Problemen 🏳️, Ruimtespion Te Huur 🕶️, Hoogconjunctuur 📈, Kredietexpansie 💹, GMU Verhoogt Rente 🏦, Spaarbonus 🎁 |
| **Neutraal** | Ionennevel 🌫️, Douanecontrole 🔍, Noodoproep Brandstof 🆘, Rustige Reis 🌟, Noodevacuatie 🚨, Beurscrash 📉 |

*Sommige events hebben keuzes met consequenties (bijv. piraten: betaal vs vlucht). Muiterij-event kan altijd optreden bij crew happiness < 25 (18% kans), ongeacht het normale event-systeem.*

### Aankomstevents (bij landing)

| Type | Events |
|---|---|
| **Gevaar** | Gewapend Conflict ⚔️ (tech +80%), Energiecrisis 🔋 (energie +100%), Pirateninval 💀 (10% lading gestolen), Galactische Handelsblokkade 🚫 (luxe +60%), Voedselschaarste 🆘 (voedsel +120%), Havenheffing 🚢 (−350 cr), Piratentol ☠️ (−500 cr), Medische Noodsituatie 🏥 (Bioplasma gevorderd) |
| **Neutraal/Positief** | Handelsfestival 🎪 (alles −15%), Overrijke Oogst 🌾 (voedsel −50%), Technologische Doorbraak 🔬 (tech −35%), Lokale Marktcrash 📉 (alles −20%), Zwarte Markt Actief 🕵️ (luxe/edelstenen −50%), Mijnwerkerstaking ✊ (mineralen +90%), Koloniedag 🎆 (alles +20%) |

---

## 12. Achievements

Achievements worden ontgrendeld bij het bereiken van mijlpalen en leveren een kredietbeloning op.

| Categorie | Achievement | Drempel | Beloning |
|---|---|---|---|
| **Deals** | Eerste Deal | 1 verkoop | 250 cr |
| | Actieve Handelaar | 10 transacties | 750 cr |
| | Handelsmagnaat | 50 transacties | 3.000 cr |
| | Winstmaker | 5.000 cr winst op 1 deal | 1.500 cr |
| | Superdeal | 25.000 cr winst op 1 deal | 5.000 cr |
| **Nettowaarde** | Rijkaard | 10.000 cr netto | 1.500 cr |
| | Groot Handelaar | 100.000 cr netto | 7.500 cr |
| | Galactische Millionair | 1.000.000 cr netto | 50.000 cr |
| | Schuldenvrij | Lening volledig afbetaald | 2.000 cr |
| | Gazillionair | 25.000.000 cr netto | 100.000 cr |
| **Schip — Vracht** | Zware Vrachter | Mark II | 2.000 cr |
| | Vloeibare Goudader | Tanker III | 8.000 cr |
| | Onaantastbaar | Secure Hauler III | 8.000 cr |
| | Galactisch Tankschip | Tanker IV | 40.000 cr |
| | Fort Knox | Secure Hauler IV | 40.000 cr |
| **Schip — Passagiers** | Ruimtevervoer | Mark II | 2.000 cr |
| | Ruimte-elite | Luxury Liner III | 8.000 cr |
| | Ruimtetaxi | Space Bus III | 8.000 cr |
| | Galactische Luxe | Luxury Liner IV | 40.000 cr |
| | Galactische Bus | Space Bus IV | 40.000 cr |
| **Schip — Snel** | Ruimteraket | Mark II | 2.000 cr |
| | Altijd Als Eerste | Spearhead III | 8.000 cr |
| | Schaduwhandelaar | Shadow III | 8.000 cr |
| | Snelste van de Sector | Spearhead IV | 40.000 cr |
| | Ongrijpbaar | Shadow IV | 40.000 cr |
| **Beurs** | Beursgoeroe | ≥4 aandelen tegelijk | 2.500 cr |
| | Beurswinst | 1.000 cr op 1 aandelenverkoop | 1.000 cr |
| | Beursmagnaat | 10.000 cr op 1 aandelenverkoop | 5.000 cr |
| | Beursspeculant | 25.000 cr totaal via aandelen | 3.000 cr |
| | Galactisch Belegger | 250.000 cr totaal via aandelen | 20.000 cr |
| **Financiën** | Stevige Spaarpot | Banksaldo 100.000 cr | 5.000 cr |
| | Galactisch Vermogen | Banksaldo 250.000 cr | 10.000 cr |
| | Ruimtebankier | Banksaldo 500.000 cr | 25.000 cr |
| **Reizen & Events** | Wereldreiziger | Alle 8 planeten bezocht | 5.000 cr |
| | Ruimtereiziger | 10 reizen | 1.500 cr |
| | Piratenontkomer | 1× ontsnapt aan piraten | 1.000 cr |
| | Op de Rand | Aankomst met <10 L brandstof | 300 cr |
| | Taxiservice | 1 passagier afgeleverd | 600 cr |
| | Veilingmeester | 1 veiling op Agria gewonnen | 1.000 cr |
| | Alchemist | 30 ton Ferroiet verwerkt op Ferrum | 1.500 cr |
| | Energieboer | 10× getankt op Pyroflux | 600 cr |
| **Casino** | Huisvoordeel | 3 wins op rij (Casino Stellaris) | 1.200 cr |
| | Jackpot | Netto ≥ 3.000 cr in één gokbeurt | 2.500 cr |
| **Zwarte Markt** | Zwarthandelaar | Douane ontlopen met verdachte lading | 1.000 cr |

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

## 15. Tutorial Systeem

Progressief feature-unlocken op basis van beurtnummer:

| Beurt | Feature | Wat wordt ontgrendeld |
|---|---|---|
| 0 | basis | Handel, reizen, intro-dialoog |
| 2 | brandstof | Brandstoftips en -events |
| 4 | passagiers | Passagierssysteem |
| 6 | leningen | Galactische Bank (leningen) |
| 8 | onderhoud | HP-schade events, reparatie |
| 10 | verzekering | Verzekering, douane-events |
| 12 | bemanning | Crew-systeem, muiterij-events |
| 14 | bank | Spaarrekening |
| 16 | marketing | Marketing-campagne |
| 18 | beurs | Aandelenbeurs (Nexoria) |
| 20 | planeet_diensten | Planeet-specifieke intro-dialogen |
| 24 | missies | Missie-systeem |

---

## 16. Missies

Bij elke landing worden nieuwe beschikbare missies gegenereerd (maximaal 3 actieve tegelijk):

- **Cargo-missies (2x):** Lever X ton van een specifiek goed af op een bepaalde planeet. Hoeveelheid: 5–20 ton. Beloning: variabel op basis van goedwaarde.
- **VIP-missies (1x):** Transporteer een VIP-passagier naar een specifieke planeet. Vereist vrije passagiersruimte. Beloning: 800–2.000 cr.
- **Deadline:** 20–31 beurten na acceptatie.

---

## 17. Bewuste Ontwerpkeuzes

| Beslissing | Reden |
|---|---|
| HP-slijtage per rit verwijderd | Voelde niet logisch — schip beschadigt alleen bij events |
| Achievement upgrade-drempels verlaagd | Niveau 10/25/50 → 3/6/10; oude drempels waren onhaalbaar in een normaal spel |
| Verzekeringsprijs verlaagd | Formule: `80 + laadruimte×2 + pax-cap×10` cr; nu betaalbaar voor alle scheepstypen |
| `cr` → `credits` in UI | Duidelijker voor nieuwe spelers |
| 150 beurten vast | Geeft urgentie en zorgt voor zinvolle beslissingen |
| Supabase anon key is publiek | By design — beveiliging via RLS policies |
| Admin via Supabase Auth | Server-side authenticatie |
| UPDATE na elke landing | Live data in admin dashboard |
| Handelsradar upgrade verwijderd (v4.0.0) | Prijs/meerwaardeverhouding klopte niet |
| Aandelenbeurs exclusief op Nexoria (v4.0.0) | Geeft Nexoria een unieke rol; dwingt terugkeer |
| Financiën-tabblad (v4.0.0) | Bank en portfolio samengevoegd — logischer |
| Logboek/Ranglijst/Prestaties naar topbalk (v4.0.0) | Vermindering tabbladen-rommel |
| Planeet-tab als tegellayout (v4.0.0) | Consistentie met Ruimtehaven |
| Galactische markt: klikbare planeetkolommen (v4.0.0) | Snellere bestemmingselectie |
| Oneindige upgrades verwijderd (v5.0.0) | Schipstats komen nu puur van het Mark-systeem |
| Startkrediet 10.000 → 25.000 (v5.0.0) | Mark I-schepen kosten 16.000–19.000; met 10k was er nauwelijks handelsfloat |
| Mark III = specialisatiekeuze (v5.0.0) | Dwingt strategische beslissing; versterkt route-identiteit |
| Scheepswerf exclusief op Techton (v5.0.0) | Nexoria en Techton hadden overlappende rollen |
| Scheepstype permanent (v5.0.0) | Voorkomt vroeg switchen om beste combinatie te pakken |
| Marketing koppelt aan geselecteerde bestemming (v5.1.x) | Verwijdert extra stap van aparte bestemmingskeuze |
| Marketing vervalt bij elke aankomst (v5.1.x) | Voorkomt ophopen van campagnes |
| Uitgesteld markteffect bij kopen/verkopen (v5.2.x) | Voorkomt arbitrage: marktimpact geflusht bij vertrek |
| Voorraadesysteem per planeet (v5.2.x) | Reële voorraad maakt routing relevanter |
| Handel-tab als lokale markttabel (v5.2.x) | Sneller en overzichtelijker dan invoervelden |
| Tooltips altijd gestijld via #top-tooltip (v5.2.x) | Browser-native tooltips niet te stijlen |
| Gazillionair-drempel 25.000.000 credits (v5.0.0) | 1.000× startkapitaal — zelfde ratio als origineel Gazillionaire (1994) |
| Bankieren beschikbaar op Nexoria + Techton + Luxoria | Luxoria krijgt een extra nutsfunctie naast casino |
| Casino max 3 rondes (niet 5) | Hogere spanning per bezoek, kortere sessietijd |
| Casino kaarten 1–10 (niet 1–13) | Eenvoudiger kansberekening, gelijkere verdeling |
| Casino payout 1,9× (niet 2×) | Huis houdt licht voordeel — statistisch realistischer |
| Jackpot-drempel 3.000 cr netto (niet 10.000 cr) | Haalbaar bij hogere inzetniveaus; motiverend |

---

## 18. Ideeën & Toekomstige Features

> Nog niet geprioriteerd. Ideeën bewaren voor later.

- [ ] **Mark-systeem implementeren** — Vrachtschip/Passagiersschip/Snel Schip met Mark I–IV en specialisatie bij Mark III (zie §6)
- [ ] **Spearhead bezorgmissies** — tijdgevoelige missies: persoon of item zo snel mogelijk van planeet A naar B
- [ ] Planeet-specifieke achtergrondafbeeldingen in de planeet-info kaart
- [ ] Haven-tegels verder aankleden met eigen afbeeldingen
- [ ] Reputatiesysteem per planeet (meer of minder vriendelijke prijzen)
- [ ] Seizoenen of galactische nieuwsberichten die markten beïnvloeden
- [ ] Highscore-pagina publiek zichtbaar (nu alleen in-game ranglijst)
- [ ] Mobiele UX verder verbeteren

---

*Laatste update: v5.3.1 (GDD gesynchroniseerd met code)*
