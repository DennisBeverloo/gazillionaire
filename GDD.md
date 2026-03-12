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

**De speler:** Een beginnend ruimtehandelaar die met 10.000 credits en een tweedehands schip zijn fortuin probeert te maken. Geen achtergrondverhaal — de speler schrijft zijn eigen verhaal via zijn handelsbeslissingen.

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
| Startkrediet | 10.000 credits |
| Maximale schuld | 8.000 credits |
| Rente | 5% per 20 beurten |
| Reistijd | `ceil(afstand / 18 / snelheid)` beurten |
| Startplaneet | Nexoria |

**Eindigingsvoorwaarden:**
- **Normaal einde:** 150 beurten bereikt — hoogste nettowaarde wint
- **Bankroet:** Krediet negatief en kan schuld niet terugbetalen
- Nettowaarde = credits + aandelenwaarde + ladingwaarde − schulden

**Schipkeuze:** De speler koopt bij aanvang een schip. De resterende credits (10.000 − scheepsprijs) zijn het startkapitaal voor handel.

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

**Prijsmechanisme:**
- Specialiteitsplaneten verkopen 40–55% onder basisprijs
- Vraagplaneten betalen 165–200% van basisprijs
- Prijzen fluctueren elke beurt via een volatiliteitsmodel
- Met Handelsradar zijn prijstrends zichtbaar (↑↓)

---

## 6. Schepen

| Naam | Prijs | Snelheid | Laadruimte | Passagiers | Brandstof | Schild | HP |
|---|---|---|---|---|---|---|---|
| **Rondsloffer** 🛸 | 3.000 cr | ★☆☆☆☆ | 30 ton | 4 | 80 L | ★☆☆☆☆ | 40 |
| **Vrije Handelaar** 🚀 | 6.000 cr | ★★☆☆☆ | 50 ton | 8 | 110 L | ★★☆☆☆ | 60 |
| **Vleugelschipper** ✈️ | 7.500 cr | ★★★★☆ | 35 ton | 12 | 70 L | ★☆☆☆☆ | 50 |

**Aankoop van een nieuw schip** (bij scheepswerf op Nexoria of Techton):
- Huidig schip wordt verkocht voor 60% van de originele aankoopprijs
- Alle upgrades van het oude schip vervallen

**HP-systeem:**
- HP daalt alleen bij event-schade (defect, asteroïden, etc.)
- HP herstelt volledig via reparatie bij een haven
- *(Bewuste keuze: passieve HP-slijtage per rit is verwijderd — voelde niet logisch)*

---

## 7. Upgrades

### Eenmalig
| Naam | Prijs | Effect |
|---|---|---|
| **Handelsradar** 📡 | 3.500 cr | Toont prijstrends (↑↓) op de handelsmarkt |

### Oneindig (stapelbaar per niveau)
| Categorie | Effect per niveau |
|---|---|
| **Motor** | +snelheid (kortere reistijd) |
| **Vrachtruim** | +laadruimte (meer ton cargo) |
| **Brandstoftank** | +tankinhoud |
| **Passagiersruimte** | +passagierscapaciteit |
| **Schild** | +bescherming bij events |

Upgradekosten stijgen exponentieel per niveau.

---

## 8. Passagiers

- Beschikbaar als het schip passagierscapaciteit heeft
- Op elke planeet wachten een wisselend aantal passagiers met een ticketprijs
- Passagiers betalen bij aankomst op de volgende planeet
- Marketing-campagne (koopbaar in haven) verhoogt het aantal wachtende passagiers bij de bestemming
- Lifter-event tijdens reis: extra passagier die je meeneemt

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
| **Nettowaarde** | Rijkaard (10k), Groot Handelaar (100k), Galactische Millionair (1M), Schuldenvrij |
| **Schip** | Motorfanaat/Veteraan/Lichtsnelheid (lvl 10/25/50), idem voor vrachtruim, tank, passagiers |
| **Beurs** | Beursgoeroe (4 aandelen), Beurswinst (1k/deal), Beursmagnaat (10k/deal), Galactisch Belegger (250k totaal) |
| **Reizen & Events** | Wereldreiziger (alle 8 planeten), Ruimtereiziger (10 reizen), Piratenontkomer, Op de Rand (aankomst <10L), Taxiservice |

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

*Laatste update: v3.0.9*
