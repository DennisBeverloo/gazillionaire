// =============================================================================
// GAZILLIONAIRE: STER DER HANDEL - Game State & Logic
// =============================================================================

const MAX_BEURTEN = 150;
const START_KREDIET = 10000;
const MAX_SCHULD = 8000;
const RENTE_PERCENTAGE = 0.05;
const RENTE_INTERVAL = 20;

class GameState {
    constructor() {
        this.reset();
    }

    get schipBeschadigd() {
        return (this.schipHP ?? 0) < (this.schip?.maxHP ?? 0);
    }

    reset() {
        this.fase = 'intro'; // intro | schipSelectie | spel | reis | einde
        this.speler = { naam: 'Kapitein', krediet: START_KREDIET, schuld: 0 };
        this.schip = null;
        this.lading = {};
        this.schipHP = 0;
        this.locatie = 'nexoria';
        this.beurt = 0;
        this.planetPrijzen = {};
        this.vorigePrijzen = {};
        this.aandeelKoersen = {};
        this.vorigeKoersen = {};
        this.aandelenPortefeuille = {};
        this.logboek = [];
        this.activeTab = 'handel';
        this.reisData = null; // { naar, stappen, stap, events }
        this.huidigAankomstEvent = null;
        this.gekochteUpgrades = [];
        this.geselecteerdePlaneet = null; // for map click
        this.tipsGezien = {};
        this.statistieken = { handelstransacties: 0, gereisd: 0, eventsMeegemaakt: 0, passagiersAfgeleverd: 0, verkopen: 0, cargoTonVervoerd: 0, ferroietVerwerkt: 0, veilingenGewonnen: 0 };
        this.planeetBezoeken = {};

        // Nieuwe velden
        this.aankoopPrijzen = {};       // gemiddelde aankoopprijs per goed
        this.aankoopAantallen = {};     // hoeveel van elk goed in cargo (voor gewogen gemiddelde)
        this.aandeelGeschiedenis = {};  // prijsgeschiedenis per aandeel (max 50 punten)
        this.bezochteplaneten = new Set(['nexoria']);
        this.achievements = new Set();
        this._laatsteWinst = 0;
        this._oitLeningGehad = false;
        this._piratenOntkomingen = 0;
        this._aangekomendMetLageBrandstof = false;
        this._beursWinstTotaal = 0;
        this._beursBesteDeal = 0;

        // Aandeel aankoopprijs tracking
        this.aandeelAankoopPrijzen = {};    // weighted avg purchase price per stock
        this.aandeelAankoopAantallen = {};  // quantities for weighted avg

        // Marketing
        this.marketingActief = null;        // { planeet: planeetId, kosten } of null

        // Agria veiling
        this.agriaVeiling = null;

        // Verzekering
        this.verzekering = null;            // null of { actief: true }

        // Oneindige upgrade niveaus
        this.upgradeNiveaus = { motor: 0, ruim: 0, brandstofTank: 0, passagiers: 0, schild: 0 };

        // Concurrenten
        this.concurrenten = [];             // [{id, locatie, krediet, waardeGeschiedenis}]
        this.nettoWaardeGeschiedenisSpeler = [];

        // Passagiers
        this.passagiers = 0;               // aantal aan boord (int)
        this.passagiersTicketprijs = 0;    // prijs per passagier voor huidige rit
        this.wachtendePassagiers = {};     // {planeetId: { aantal: int, prijs: int }}

        // Brandstof
        this.brandstof = 0;                 // huidige brandstof
        this.brandstofPrijzen = {};         // {planeetId: prijs per eenheid}

        // Init goods in cargo to 0
        GOEDEREN.forEach(g => { this.lading[g.id] = 0; });

        // Init stock portfolio to 0
        AANDELEN.forEach(a => { this.aandelenPortefeuille[a.id] = 0; });
    }

    init(spelerNaam, schipId) {
        this.speler.naam = spelerNaam || 'Kapitein';
        const schipTemplate = SCHEPEN.find(s => s.id === schipId);
        this.schip = {
            ...schipTemplate,
            maxSnelheid: schipTemplate.snelheid,
            maxLaadruimte: schipTemplate.laadruimte,
        };
        this.speler.krediet -= schipTemplate.prijs;
        this.schipHP = schipTemplate.maxHP;
        this.fase = 'spel';
        this.initPrijzen();
        this.initAandelen();
        this.initPassagiers();
        this.initBrandstof();
        this._initConcurrenten();
        this.nettoWaardeGeschiedenisSpeler = [this.berekenNettowaarde()];
        this.voegBerichtToe(`Welkom, ${this.speler.naam}! Je reis begint op Nexoria. Veel handelsgeluk!`, 'info');
        this.voegBerichtToe(`Je hebt een ${schipTemplate.naam} gekocht voor ${this.formatteerKrediet(schipTemplate.prijs)}`, 'goud');
    }

    _initConcurrenten() {
        if (typeof CONCURRENTEN === 'undefined') return;
        this.concurrenten = CONCURRENTEN.map(c => {
            const startPlaneet = PLANETEN[Math.floor(Math.random() * PLANETEN.length)].id;
            return {
                id: c.id,
                locatie: startPlaneet,
                krediet: c.startKrediet,
                waardeGeschiedenis: [c.startKrediet],
            };
        });
    }

    // =========================================================================
    // PRIJZEN
    // =========================================================================

    initPrijzen() {
        PLANETEN.forEach(planeet => {
            this.planetPrijzen[planeet.id] = {};
            this.vorigePrijzen[planeet.id] = {};
            GOEDEREN.forEach(goed => {
                const prijs = this.berekenBasePrijs(planeet, goed);
                this.planetPrijzen[planeet.id][goed.id] = prijs;
                this.vorigePrijzen[planeet.id][goed.id] = prijs;
            });
        });
    }

    _getPlanetGoedDoelFactor(planeet, goedId) {
        if (planeet.specialiteit?.includes(goedId)) return 0.55;
        if (planeet.vraag?.includes(goedId))        return 1.80;
        return 1.0;
    }

    berekenBasePrijs(planeet, goed) {
        const doelFactor = this._getPlanetGoedDoelFactor(planeet, goed.id);
        const doel = goed.basisPrijs * doelFactor;
        return Math.max(5, Math.round(doel * (0.85 + Math.random() * 0.30)));
    }

    updatePrijzen(uitgeslotenPlaneet = null) {
        PLANETEN.forEach(planeet => {
            if (uitgeslotenPlaneet && planeet.id === uitgeslotenPlaneet) return;
            GOEDEREN.forEach(goed => {
                const huidig = this.planetPrijzen[planeet.id][goed.id];
                this.vorigePrijzen[planeet.id][goed.id] = huidig;

                // Fluctuatie ±14% per beurt
                let factor = 0.86 + Math.random() * 0.28;

                // 5% kans op dramatische marktbeweging
                if (Math.random() < 0.05) {
                    factor *= (Math.random() < 0.5) ? 1.3 : 0.7;
                }

                // Graviteer naar planeet-specifiek doelniveau
                const doelFactor = this._getPlanetGoedDoelFactor(planeet, goed.id);
                const doel = goed.basisPrijs * doelFactor;
                const gravitatieSterkte = (doelFactor !== 1.0) ? 0.14 : 0.07;
                const afstand = (doel - huidig) / goed.basisPrijs;
                factor += afstand * gravitatieSterkte;

                let nieuw = Math.round(huidig * factor);

                // Grenzen: afhankelijk van planeet-specialisatie
                let min, max;
                if (doelFactor === 0.55) {
                    min = Math.max(5, Math.round(goed.basisPrijs * 0.10));
                    max = Math.round(goed.basisPrijs * 0.95);
                } else if (doelFactor === 1.80) {
                    min = Math.round(goed.basisPrijs * 1.05);
                    max = Math.round(goed.basisPrijs * 3.0);
                } else {
                    min = Math.max(5, Math.round(goed.basisPrijs * 0.25));
                    max = Math.round(goed.basisPrijs * 2.2);
                }
                nieuw = Math.max(min, Math.min(max, nieuw));

                this.planetPrijzen[planeet.id][goed.id] = nieuw;
            });
        });
    }

    getPrijs(planeetId, goedId) {
        return this.planetPrijzen[planeetId]?.[goedId] ?? 0;
    }

    getTrend(planeetId, goedId) {
        const huidig = this.planetPrijzen[planeetId]?.[goedId] ?? 0;
        const vorig = this.vorigePrijzen[planeetId]?.[goedId] ?? huidig;
        if (huidig > vorig * 1.02) return 'op';
        if (huidig < vorig * 0.98) return 'neer';
        return 'gelijk';
    }

    // =========================================================================
    // REIZEN
    // =========================================================================

    berekenAfstand(id1, id2) {
        const p1 = PLANETEN.find(p => p.id === id1);
        const p2 = PLANETEN.find(p => p.id === id2);
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    berekenReistijd(vanId, naarId) {
        return 1;
    }

    reisNaar(planeetId) {
        if (planeetId === this.locatie) return false;
        const bestemming = PLANETEN.find(p => p.id === planeetId);
        const verbruik = this.berekenBrandstofVerbruik(this.locatie, planeetId);
        if (this.brandstof < verbruik) {
            return { succes: false, reden: `Onvoldoende brandstof! Nodig: ${verbruik}, Aanwezig: ${this.brandstof}` };
        }
        this.brandstof -= verbruik;
        const eventId = this.genereerReisEvents(planeetId);
        this.reisData = {
            van: this.locatie,
            naar: planeetId,
            stappen: 1,
            stap: 0,
            events: eventId ? [eventId] : [],
            brandstofVerbruikt: verbruik,
        };
        this.fase = 'reis';
        this.statistieken.gereisd++;
        this.voegBerichtToe(`Vertrek naar ${bestemming.naam}. Brandstof: −${verbruik} (rest: ${this.brandstof})`, 'info');
        return true;
    }

    genereerReisEvents(naarId) {
        const naarPlaneet = PLANETEN.find(p => p.id === naarId);
        const eventKans = naarPlaneet?.isGevaarlijk ? 0.70 : 0.52;
        if (Math.random() > eventKans) return null;

        const pool = EVENTS.filter(e => e.id !== 'niets');
        const gevaarBonus = naarPlaneet?.isGevaarlijk ? 1.4 : 1.0;
        const totaal = pool.reduce((s, e) => s + e.kans * (e.type === 'gevaar' ? gevaarBonus : 1.0), 0);
        const r = Math.random() * totaal;
        let acc = 0;
        for (const e of pool) {
            acc += e.kans * (e.type === 'gevaar' ? gevaarBonus : 1.0);
            if (r < acc) return e.id;
        }
        return pool[pool.length - 1].id;
    }

    // Geeft null terug als er een event is; anders true als reis klaar is
    volgendeReisStap() {
        if (!this.reisData) return 'aankomst';

        this.reisData.stap++;
        this.beurt++;
        this.updatePrijzen(this.reisData.naar);
        this.updateAandeelKoersen();
        this.updateBrandstofPrijzen();
        this.controleerRente();

        this._simuleerConcurrenten();

        const eventId = this.reisData.events[this.reisData.stap - 1];

        if (eventId && eventId !== 'niets') {
            const event = EVENTS.find(e => e.id === eventId);
            this.statistieken.eventsMeegemaakt++;
            return { event };
        }

        return 'aankomst';
    }

    _simuleerConcurrenten() {
        if (!this.concurrenten?.length || typeof CONCURRENTEN === 'undefined') return;

        const bestemmingId = this.reisData?.naar;
        const playerSpeed = this.schip?.snelheid || 1;

        // Sample speler nettowaarde bij start van deze beurt
        this.nettoWaardeGeschiedenisSpeler.push(this.berekenNettowaarde());
        if (this.nettoWaardeGeschiedenisSpeler.length > 160) this.nettoWaardeGeschiedenisSpeler.shift();

        this.concurrenten.forEach(npc => {
            const sjab = CONCURRENTEN.find(c => c.id === npc.id);
            if (!sjab) return;

            // Beweeg naar random planeet
            const andere = PLANETEN.filter(p => p.id !== npc.locatie);
            if (andere.length > 0 && Math.random() < 0.3 + sjab.snelheid * 0.1) {
                npc.locatie = andere[Math.floor(Math.random() * andere.length)].id;
            }

            // Concurrentie: kans dat NPC ook jouw bestemming aandoet
            if (bestemmingId && Math.random() < 0.38) {
                const interferentieKans = sjab.snelheid / (sjab.snelheid + playerSpeed);
                if (Math.random() < interferentieKans) {
                    this._npcStoringPrijzen(sjab, bestemmingId);
                }
            }

            // Simuleer NPC-handel: gebaseerde winst + volatiliteit + zeldzame grote events
            const variatie = (Math.random() * 2 - 1) * sjab.volatiliteit * npc.krediet;
            let delta = sjab.baseWinstPerBeurt + variatie;
            if (Math.random() < 0.04) {
                delta += npc.krediet * (Math.random() < 0.55 ? 1 : -1) * (0.15 + Math.random() * 0.25);
            }
            npc.krediet = Math.max(500, Math.round(npc.krediet + delta));
            npc.waardeGeschiedenis.push(npc.krediet);
            if (npc.waardeGeschiedenis.length > 160) npc.waardeGeschiedenis.shift();
        });
    }

    _npcStoringPrijzen(sjab, planeetId) {
        const planeetNaam = PLANETEN.find(p => p.id === planeetId)?.naam ?? planeetId;
        const kandidaten = [...GOEDEREN].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2));
        kandidaten.forEach(goed => {
            const huidig = this.planetPrijzen[planeetId]?.[goed.id];
            if (!huidig) return;
            const factor = 1.08 + Math.random() * 0.16;
            const max = Math.round(goed.basisPrijs * 2.2);
            this.planetPrijzen[planeetId][goed.id] = Math.min(max, Math.round(huidig * factor));
            const pct = Math.round((factor - 1) * 100);
            this.voegBerichtToe(`💼 ${sjab.naam} arriveerde eerder op ${planeetNaam} — ${goed.icoon} ${goed.naam} +${pct}%`, 'waarschuwing');
        });
    }

    aankomst() {
        this.locatie = this.reisData.naar;
        const planeet = PLANETEN.find(p => p.id === this.locatie);
        this.fase = 'spel';
        this.reisData = null;
        this.bezochteplaneten.add(this.locatie);
        this.planeetBezoeken[this.locatie] = (this.planeetBezoeken[this.locatie] ?? 0) + 1;

        // Lever passagiers af
        let passagiersInfo = null;
        if (this.passagiers > 0) {
            const totaal = this.passagiers * this.passagiersTicketprijs;
            this.speler.krediet += totaal;
            this.statistieken.passagiersAfgeleverd += this.passagiers;
            passagiersInfo = { aantal: this.passagiers, totaal };
            this.voegBerichtToe(`${this.passagiers} passagier(s) afgeleverd. +${this.formatteerKrediet(totaal)}`, 'goud');
            this.passagiers = 0;
            this.passagiersTicketprijs = 0;
        }

        if (this.brandstof < 10) this._aangekomendMetLageBrandstof = true;
        this.voegBerichtToe(`Aangekomen op ${planeet.naam}! Brandstof: ${this.brandstof}/${this.schip.brandstofTank}`, 'succes');

        // Controleer marketingcampagne — geldt alleen als we op de geplande planeet aankomen
        let bonusAantal = 0, bonusPrijs = 0;
        if (this.marketingActief && this.marketingActief.planeet === this.locatie) {
            bonusAantal = 8;
            bonusPrijs = 50;
            this.voegBerichtToe(`📢 Reclamecampagne actief! Meer passagiers en hogere ticketprijs.`, 'info');
            this.marketingActief = null;
        }
        this.genereerPassagiersVoorPlaneet(this.locatie, bonusAantal, bonusPrijs);

        // Planeet aankomst event
        const aankomstEvent = this._bepaalAankomstEvent();
        if (aankomstEvent) {
            this._pasAankomstEventToe(aankomstEvent);
        }
        this.huidigAankomstEvent = aankomstEvent;

        // Verzekering vervalt bij aankomst
        this.verzekering = null;

        // Planeet-specifieke diensten initialiseren
        if (this.locatie === 'agria') this.initAgriaVeiling();

        this.controleerAchievements();
        this.controleerSpelEinde();
        return { passagiersInfo };
    }

    _bepaalAankomstEvent() {
        if (typeof PLANEET_EVENTS === 'undefined') return null;
        for (const event of PLANEET_EVENTS) {
            if (Math.random() < event.kans) return event;
        }
        return null;
    }

    _pasAankomstEventToe(event) {
        const pid = this.locatie;
        const eff = event.effect;
        if (eff.type === 'prijsVerhoging' || eff.type === 'prijsVerlaging') {
            eff.goederen.forEach(gid => {
                if (this.planetPrijzen[pid]?.[gid] !== undefined) {
                    const goed = GOEDEREN.find(g => g.id === gid);
                    const min = Math.max(5, Math.round(goed.basisPrijs * 0.15));
                    const max = Math.round(goed.basisPrijs * 4.5);
                    this.planetPrijzen[pid][gid] = Math.max(min, Math.min(max,
                        Math.round(this.planetPrijzen[pid][gid] * eff.factor)));
                }
            });
        } else if (eff.type === 'kortingAlles') {
            GOEDEREN.forEach(goed => {
                this.planetPrijzen[pid][goed.id] = Math.max(5,
                    Math.round(this.planetPrijzen[pid][goed.id] * eff.factor));
            });
        } else if (eff.type === 'ladingStelen') {
            const gestolen = [];
            GOEDEREN.forEach(goed => {
                const n = this.lading[goed.id] || 0;
                if (n > 0) {
                    const verlies = Math.max(1, Math.floor(n * eff.fractie));
                    this.lading[goed.id] = n - verlies;
                    gestolen.push(`${verlies}× ${goed.icoon} ${goed.naam}`);
                }
            });
            if (gestolen.length > 0) {
                event._gestelenTekst = gestolen.join(', ');
            } else {
                return; // Niets te stelen — event toch tonen maar zonder detail
            }
        }
        this.voegBerichtToe(`${event.icoon} ${event.naam}: ${event.beschrijving}`, 'waarschuwing');
    }

    genereerPassagiersVoorPlaneet(planeetId, bonusAantal = 0, bonusPrijs = 0) {
        const aantal = Math.floor(Math.random() * 6) + 3 + bonusAantal;  // 3-8 wachtend
        const prijs  = Math.round(150 + Math.random() * 100 + bonusPrijs);
        this.wachtendePassagiers[planeetId] = { aantal, prijs };
    }

    initPassagiers() {
        PLANETEN.forEach(p => { this.wachtendePassagiers[p.id] = { aantal: 0, prijs: 0 }; });
        this.genereerPassagiersVoorPlaneet(this.locatie);
    }

    boardPassagiers() {
        const cap = this.schip?.passagiersCapaciteit || 0;
        if (cap === 0) return;
        const wachtend = this.wachtendePassagiers[this.locatie] || { aantal: 0, prijs: 0 };
        const instappers = Math.min(wachtend.aantal, cap - this.passagiers);
        if (instappers > 0) {
            this.passagiers += instappers;
            this.passagiersTicketprijs = wachtend.prijs;
            this.wachtendePassagiers[this.locatie].aantal -= instappers;
            this.voegBerichtToe(`${instappers} passagier(s) aan boord. Ticketprijs: ${this.formatteerKrediet(wachtend.prijs)}/pp`, 'info');
        }
    }

    // =========================================================================
    // MARKETING
    // =========================================================================

    berekenMarketingKosten(planeetId) {
        const afstand = this.berekenAfstand(this.locatie, planeetId);
        return Math.round(200 + afstand * 8);
    }

    koopMarketing(planeetId) {
        if ((this.schip?.passagiersCapaciteit || 0) <= 0) return { succes: false, reden: 'Je schip heeft geen passagiersruimte.' };
        const kosten = this.berekenMarketingKosten(planeetId);
        if (this.speler.krediet < kosten) return { succes: false, reden: 'Onvoldoende krediet!' };
        const planeetNaam = PLANETEN.find(p => p.id === planeetId)?.naam ?? planeetId;
        this.speler.krediet -= kosten;
        this.marketingActief = { planeet: planeetId, kosten };
        this.voegBerichtToe(`📢 Reclamecampagne gestart voor ${planeetNaam} (${this.formatteerKrediet(kosten)}). Bij aankomst wachten meer passagiers op je.`, 'info');
        return { succes: true };
    }

    // =========================================================================
    // BRANDSTOF
    // =========================================================================

    initBrandstof() {
        // Basisprijzen per planeet (kr per eenheid)
        const basis = {
            nexoria: 14, ferrum: 13, agria: 16, techton: 15,
            aqueron: 17, pyroflux: 8, luxoria: 20, mortex: 18,
        };
        PLANETEN.forEach(p => {
            const b = basis[p.id] ?? 14;
            this.brandstofPrijzen[p.id] = Math.round(b * (0.9 + Math.random() * 0.2));
        });
        this.brandstof = this.schip.brandstofTank; // start met volle tank
    }

    updateBrandstofPrijzen() {
        PLANETEN.forEach(p => {
            const basis = { nexoria: 14, ferrum: 13, agria: 16, techton: 15, aqueron: 17, pyroflux: 8, luxoria: 20, mortex: 18 }[p.id] ?? 14;
            const huidig = this.brandstofPrijzen[p.id];
            let factor = 0.92 + Math.random() * 0.16;
            // Graviteer terug naar basis
            factor += (basis - huidig) / basis * 0.06;
            let nieuw = Math.round(huidig * factor);
            nieuw = Math.max(Math.round(basis * 0.6), Math.min(Math.round(basis * 1.8), nieuw));
            this.brandstofPrijzen[p.id] = nieuw;
        });
    }

    berekenBrandstofVerbruik(vanId, naarId, extraFactor = 1.0) {
        const afstand = this.berekenAfstand(vanId, naarId);
        const base = Math.max(8, Math.round(afstand * 0.42));
        return Math.round(base * extraFactor);
    }

    koopBrandstof(aantal) {
        const prijs = this.brandstofPrijzen[this.locatie];
        const tankCapaciteit = this.schip.brandstofTank;
        const ruimte = tankCapaciteit - this.brandstof;
        const effectief = Math.min(aantal, ruimte);
        if (effectief <= 0) return { succes: false, reden: 'Tank is al vol!' };
        const totaal = prijs * effectief;
        if (totaal > this.speler.krediet) return { succes: false, reden: 'Onvoldoende krediet!' };
        this.speler.krediet -= totaal;
        this.brandstof += effectief;
        this.voegBerichtToe(`${effectief} liter brandstof getankt voor ${this.formatteerKrediet(totaal)}.`, 'info');
        return { succes: true, getankt: effectief };
    }

    vulTankVol() {
        const ruimte = this.schip.brandstofTank - this.brandstof;
        return this.koopBrandstof(ruimte);
    }

    // =========================================================================
    // PLANEET-SPECIFIEKE DIENSTEN
    // =========================================================================

    verwerkFerroiet(batches) {
        if (!Number.isInteger(batches) || batches < 1)
            return { succes: false, reden: 'Ongeldig aantal batches.' };
        if (this.locatie !== 'ferrum')
            return { succes: false, reden: 'Alleen beschikbaar op Ferrum.' };

        const ferroietNodig = batches * 3;
        const kosten        = batches * 120;
        const output        = batches; // 1 ton Kristalliet per batch

        if ((this.lading['ferroiet'] || 0) < ferroietNodig)
            return { succes: false, reden: `Onvoldoende Ferroiet. Nodig: ${ferroietNodig} ton.` };
        if (this.speler.krediet < kosten)
            return { succes: false, reden: `Onvoldoende credits voor verwerkingskosten (${this.formatteerKrediet(kosten)}).` };

        this.lading['ferroiet']    -= ferroietNodig;
        this.lading['kristalliet']  = (this.lading['kristalliet'] || 0) + output;
        this.speler.krediet        -= kosten;
        this.statistieken.ferroietVerwerkt = (this.statistieken.ferroietVerwerkt || 0) + ferroietNodig;

        this.voegBerichtToe(`⚙️ ${batches} batch(es) verwerkt: ${ferroietNodig}× Ferroiet → ${output}× Kristalliet (kosten: ${this.formatteerKrediet(kosten)})`, 'succes');
        this.controleerAchievements();
        return { succes: true, output, kosten };
    }

    initAgriaVeiling() {
        this.agriaVeiling = null;
        if (Math.random() > 0.60) return; // 60% kans

        const goedId = Math.random() < 0.5 ? 'nebulakorrels' : 'aquapure';
        const goed   = GOEDEREN.find(g => g.id === goedId);

        // Hoeveelheid in eenheden; kies opties die ~15-35 ton geven
        const unitOpties = goedId === 'nebulakorrels'
            ? [8, 10, 12, 14, 16]   // × 2 ton = 16/20/24/28/32 ton
            : [5, 7, 9, 11];         // × 3 ton = 15/21/27/33 ton
        const hoeveelheid = unitOpties[Math.floor(Math.random() * unitOpties.length)];

        const marktprijs   = this.getPrijs('agria', goedId);
        const minimumprijs = Math.round(marktprijs * hoeveelheid * 0.65);

        // 1–3 NPC-deelnemers
        const aantalNPCs = 1 + Math.floor(Math.random() * 3);
        const npcDeelnemers = [...CONCURRENTEN]
            .sort(() => Math.random() - 0.5)
            .slice(0, aantalNPCs)
            .map(npc => ({
                id:       npc.id,
                naam:     npc.naam,
                icoon:    npc.icoon,
                maxPrijs: Math.round(minimumprijs * (1.15 + Math.random() * 0.35)),
            }));

        this.agriaVeiling = {
            goedId,
            goedNaam:   goed.naam,
            goedIcoon:  goed.icoon,
            goedGewicht: goed.gewicht,
            hoeveelheid,
            minimumprijs,
            npcDeelnemers,
            fase: 'open',
            resultaat: null,
        };

        this.voegBerichtToe(`🔨 Er is een oogstveiling op Agria! Open de Planeet-tab voor details.`, 'goud');
    }

    plaatsVeilingBod(bod) {
        if (!this.agriaVeiling || this.agriaVeiling.fase !== 'open')
            return { succes: false, reden: 'Geen actieve veiling.' };

        const veiling = this.agriaVeiling;
        bod = Math.round(bod);

        if (isNaN(bod) || bod < veiling.minimumprijs)
            return { succes: false, reden: `Bod te laag — minimum is ${this.formatteerKrediet(veiling.minimumprijs)}.` };
        if (bod > this.speler.krediet)
            return { succes: false, reden: 'Onvoldoende credits voor dit bod.' };

        // NPC bieden elk hun geheime maximumprijs
        const alleBoden = [
            { naam: 'Jij', bod, isSpeler: true },
            ...veiling.npcDeelnemers.map(npc => ({ naam: `${npc.icoon} ${npc.naam}`, bod: npc.maxPrijs, isSpeler: false })),
        ].sort((a, b) => b.bod - a.bod || (a.isSpeler ? -1 : 1)); // tiebreak: speler wint

        const spelerWint = alleBoden[0].isSpeler;
        veiling.fase = 'resultaat';
        veiling.resultaat = { gewonnen: spelerWint, spelerBod: bod, alleBoden, goederenGeladen: false, ruimteTeVol: false };

        if (spelerWint) {
            this.speler.krediet -= bod;
            const benodigdGewicht = veiling.hoeveelheid * veiling.goedGewicht;
            const vrijeRuimte     = this.schip.laadruimte - this.getLadingGewicht();

            if (vrijeRuimte >= benodigdGewicht) {
                this.lading[veiling.goedId] = (this.lading[veiling.goedId] || 0) + veiling.hoeveelheid;
                veiling.resultaat.goederenGeladen = true;
                this.statistieken.veilingenGewonnen++;
                this.voegBerichtToe(`🔨 Veiling gewonnen! ${veiling.hoeveelheid}× ${veiling.goedNaam} geladen voor ${this.formatteerKrediet(bod)}.`, 'succes');
                this.controleerAchievements();
            } else {
                veiling.resultaat.ruimteTeVol = true;
                this.voegBerichtToe(`🔨 Veiling gewonnen maar ruim te vol! Goederen achtergelaten, ${this.formatteerKrediet(bod)} afgeschreven.`, 'waarschuwing');
            }
        } else {
            const winnaar = alleBoden[0];
            this.voegBerichtToe(`🔨 Veiling verloren. ${winnaar.naam} bood ${this.formatteerKrediet(winnaar.bod)}.`, 'info');
        }

        return { succes: true };
    }

    // =========================================================================
    // EVENT VERWERKING
    // =========================================================================

    verwerkevent(eventId, keuzeId) {
        const resultaat = { bericht: '', kredietDelta: 0, ladingDelta: {}, schade: false, extraBeurten: 0, tip: null };

        switch (eventId) {
            case 'piraten': {
                if (keuzeId === 'betaal') {
                    const bedrag = Math.min(Math.round(this.speler.krediet * 0.25 + 100), 800);
                    if (this.verzekering?.actief) {
                        resultaat.bericht = `Piraten eisen ${this.formatteerKrediet(bedrag)} losgeld — je verzekering vergoedt het! 🛡️`;
                    } else {
                        this.speler.krediet -= bedrag;
                        resultaat.kredietDelta = -bedrag;
                        resultaat.bericht = `Je betaalt ${this.formatteerKrediet(bedrag)} losgeld. De piraten laten je door.`;
                    }
                    resultaat.losgeldbedrag = bedrag;
                } else {
                    // Ontsnapping: kans gebaseerd op snelheid en schild
                    const kans = 0.25 + this.schip.snelheid * 0.08 + this.schip.schild * 0.05;
                    if (Math.random() < kans) {
                        this._piratenOntkomingen++;
                        resultaat.bericht = 'Je weet te ontsnappen! Goede piloot!';
                        this.controleerAchievements();
                    } else {
                        // Verlies willekeurige lading
                        const gevuldeGoederen = Object.keys(this.lading).filter(k => this.lading[k] > 0);
                        if (gevuldeGoederen.length > 0) {
                            const goedId = gevuldeGoederen[Math.floor(Math.random() * gevuldeGoederen.length)];
                            const verloren = Math.ceil(this.lading[goedId] * 0.4);
                            const goedNaam = GOEDEREN.find(g=>g.id===goedId).naam;
                            if (this.verzekering?.actief) {
                                resultaat.bericht = `Gepakt! Piraten grijpen naar ${verloren}× ${goedNaam} — je verzekering dekt het verlies! 🛡️`;
                            } else {
                                this.lading[goedId] = Math.max(0, this.lading[goedId] - verloren);
                                resultaat.ladingDelta[goedId] = -verloren;
                                resultaat.bericht = `Gepakt! Je verliest ${verloren} eenheden ${goedNaam}.`;
                            }
                        } else {
                            const bedrag = Math.min(200, this.speler.krediet);
                            if (this.verzekering?.actief) {
                                resultaat.bericht = `Piraten doorzoeken je ruim — ze vinden niks. Geluk!`;
                            } else {
                                this.speler.krediet -= bedrag;
                                resultaat.kredietDelta = -bedrag;
                                resultaat.bericht = `Ze vinden je lege ruim en pakken ${this.formatteerKrediet(bedrag)} uit je kluis.`;
                            }
                        }
                    }
                }
                break;
            }

            case 'stralingstorm': {
                const extraBrandstof = Math.round(12 + Math.random() * 18);
                if (this.verzekering?.actief) {
                    resultaat.bericht = `De storm dwingt een grote omweg af (−${extraBrandstof} l brandstof) — je verzekering vergoedt het! 🛡️`;
                } else {
                    const werkelijk = Math.min(extraBrandstof, this.brandstof);
                    this.brandstof = Math.max(0, this.brandstof - extraBrandstof);
                    resultaat.bericht = `De storm dwingt je een grote omweg te nemen. Extra brandstofverbruik: ${werkelijk} eenheden. Brandstof resterend: ${this.brandstof}.`;
                }
                break;
            }

            case 'ruimtewrak': {
                // Vind willekeurig goed, als er ruimte is
                const ruimteVrij = this.schip.laadruimte - this.getLadingGewicht();
                if (ruimteVrij > 0) {
                    const goedOpties = GOEDEREN.filter(g => g.gewicht <= ruimteVrij);
                    if (goedOpties.length > 0) {
                        const gevonden = goedOpties[Math.floor(Math.random() * goedOpties.length)];
                        const aantal = Math.min(Math.floor(ruimteVrij / gevonden.gewicht), 5 + Math.floor(Math.random() * 8));
                        this.lading[gevonden.id] = (this.lading[gevonden.id] || 0) + aantal;
                        resultaat.ladingDelta[gevonden.id] = aantal;
                        resultaat.bericht = `Je vindt ${aantal}× ${gevonden.naam} in het wrak. Gratis lading!`;
                    } else {
                        resultaat.bericht = 'Je vindt het wrak, maar je ruim is te vol voor de lading.';
                    }
                } else {
                    resultaat.bericht = 'Je ruim is vol — je moet de gratis lading helaas laten liggen.';
                }
                break;
            }

            case 'defect': {
                if (keuzeId === 'repareer') {
                    const kosten = 400;
                    const herstel = Math.min(20, (this.schip?.maxHP ?? 40) - this.schipHP);
                    if (this.verzekering?.actief) {
                        this.schipHP = Math.min(this.schip?.maxHP ?? 40, this.schipHP + herstel);
                        resultaat.bericht = `Noodreparatie (${this.formatteerKrediet(kosten)}) gedekt door je verzekering! +${herstel} HP 🛡️`;
                    } else {
                        this.speler.krediet -= kosten;
                        resultaat.kredietDelta = -kosten;
                        this.schipHP = Math.min(this.schip?.maxHP ?? 40, this.schipHP + herstel);
                        resultaat.bericht = `Noodreparatie voltooid voor ${this.formatteerKrediet(kosten)}. +${herstel} HP hersteld.`;
                    }
                } else {
                    const schade = Math.floor(Math.random() * 8) + 12; // 12-20 HP
                    this.schipHP = Math.max(1, this.schipHP - schade);
                    resultaat.schade = true;
                    resultaat.bericht = `Je reist door met het defect. Schip loopt ${schade} HP schade op (nu ${this.schipHP} HP). Repareer zo snel mogelijk!`;
                }
                break;
            }

            case 'smokkelbod': {
                if (keuzeId === 'koop') {
                    const ruimteVrij = this.schip.laadruimte - this.getLadingGewicht();
                    if (ruimteVrij > 0) {
                        const dure = GOEDEREN.filter(g => g.basisPrijs > 100 && g.gewicht <= ruimteVrij);
                        if (dure.length > 0 && this.speler.krediet > 100) {
                            const goed = dure[Math.floor(Math.random() * dure.length)];
                            const kortingsPrijs = Math.round(goed.basisPrijs * 0.35);
                            const maxAantal = Math.min(
                                Math.floor(ruimteVrij / goed.gewicht),
                                Math.floor(this.speler.krediet / kortingsPrijs),
                                10
                            );
                            if (maxAantal > 0) {
                                const totaal = kortingsPrijs * maxAantal;
                                this.speler.krediet -= totaal;
                                this.lading[goed.id] = (this.lading[goed.id] || 0) + maxAantal;
                                resultaat.kredietDelta = -totaal;
                                resultaat.ladingDelta[goed.id] = maxAantal;
                                resultaat.bericht = `Deal! Je koopt ${maxAantal}× ${goed.naam} voor slechts ${this.formatteerKrediet(kortingsPrijs)}/stuk.`;
                            } else {
                                resultaat.bericht = 'Je hebt geen krediet voor de deal.';
                            }
                        } else {
                            resultaat.bericht = 'De smokkeldeal valt tegen — niks wat bruikbaar is.';
                        }
                    } else {
                        resultaat.bericht = 'Je ruim zit vol. De smokkeldeal laat je met spijt aan je voorbij gaan.';
                    }
                } else {
                    resultaat.bericht = 'Je weigert de deal. Beter veilig dan sorry.';
                }
                break;
            }

            case 'nevel': {
                const extraNevel = Math.round(6 + Math.random() * 12);
                if (this.verzekering?.actief) {
                    resultaat.bericht = `Ionennevel verstoort de navigatie (−${extraNevel} l brandstof) — je verzekering vergoedt het! 🛡️`;
                } else {
                    this.brandstof = Math.max(0, this.brandstof - extraNevel);
                    resultaat.bericht = `De ionennevel dwingt je van koers. Extra brandstofverbruik: ${extraNevel} eenheden. Brandstof resterend: ${this.brandstof}.`;
                }
                break;
            }

            case 'tip': {
                // Geef een hint over een lucratieve route
                const tips = [
                    'Ruimtekapitein Mara: "Koop Ferroiet op Ferrum en verkoop het op Luxoria — die rijken smijten ermee!"',
                    'Oude handelaar: "Pyroflux heeft altijd goedkoop Pyrogel. Techton en Aqueron betalen er goed voor."',
                    'Sterrekaartenmaker: "Nebulakorrels koop je spotgoedkoop op Agria. Techton en Pyroflux hebben honger."',
                    'Piloot in de bar: "Techton heeft altijd goedkope Quantumchips. Mortex Station koopt ze duur op."',
                    'Mysterieuze vreemdeling: "Luxuriet verkopen op Aqueron — ze zijn er dol op. Koop het op Luxoria."',
                    'Koeriersdrone: "Bioplasma van Aqueron is goud waard op Ferrum en Mortex Station."',
                ];
                const tip = tips[Math.floor(Math.random() * tips.length)];
                resultaat.bericht = tip;
                resultaat.tip = tip;
                break;
            }

            case 'asteroiden': {
                const hpSchade = Math.floor(Math.random() * 12) + 15; // 15-26 HP
                const kredietSchade = Math.max(50, Math.round(this.speler.krediet * 0.04 + Math.random() * 150));
                this.schipHP = Math.max(1, this.schipHP - hpSchade);
                resultaat.schade = true;
                if (this.verzekering?.actief) {
                    resultaat.bericht = `Keiharde klappen! −${hpSchade} HP rompschade. Creditverlies (${this.formatteerKrediet(kredietSchade)}) gedekt door verzekering! 🛡️`;
                } else {
                    this.speler.krediet -= kredietSchade;
                    resultaat.kredietDelta = -kredietSchade;
                    resultaat.bericht = `Keiharde klappen! −${hpSchade} HP rompschade en ${this.formatteerKrediet(kredietSchade)} noodreparatiekosten. Schip: ${this.schipHP} HP.`;
                }
                break;
            }

            case 'douane': {
                // Mortex goederen zijn 'verdacht'
                const verdachteGoederen = ['quantumchips', 'bioplasma'];
                const heeftVerdacht = verdachteGoederen.some(g => (this.lading[g] || 0) > 0);
                if (heeftVerdacht && this.reisData?.van === 'mortex') {
                    const boete = Math.round(150 + Math.random() * 350);
                    this.speler.krediet -= boete;
                    resultaat.kredietDelta = -boete;
                    resultaat.bericht = `De douaniers vinden goederen van Mortex Station. Boete: ${this.formatteerKrediet(boete)}.`;
                } else {
                    resultaat.bericht = 'De douaniers controleren je manifest. Alles is in orde — veilige doorgang!';
                }
                break;
            }

            case 'bonus': {
                const bonus = Math.round(200 + Math.random() * 500);
                this.speler.krediet += bonus;
                resultaat.kredietDelta = bonus;
                resultaat.bericht = `Je ontvangt een handelssubsidie van de Galactische Handelsgilde: ${this.formatteerKrediet(bonus)}!`;
                break;
            }

            case 'brandstof_vraag': {
                if (keuzeId === 'geef') {
                    const geef = 20;
                    if (this.brandstof >= geef) {
                        this.brandstof -= geef;
                        // Kleine beloning: goodwill krediet
                        const beloning = Math.round(50 + Math.random() * 80);
                        this.speler.krediet += beloning;
                        resultaat.kredietDelta = beloning;
                        resultaat.bericht = `Je geeft ${geef} liter brandstof. De piloot is dankbaar en geeft je ${this.formatteerKrediet(beloning)} als dank.`;
                    } else {
                        resultaat.bericht = `Je hebt zelf niet genoeg brandstof om ${geef} eenheden weg te geven.`;
                    }
                } else {
                    resultaat.bericht = 'Je vliegt door. De noodoproep vervaagt in de statische ruis.';
                }
                break;
            }

            case 'lifter': {
                if (keuzeId === 'meenemen') {
                    const maxPax = this.schip.passagiersCapaciteit || 0;
                    if (this.passagiers < maxPax) {
                        this.passagiers += 1;
                        if (this.passagiersTicketprijs === 0) this.passagiersTicketprijs = Math.round(150 + Math.random() * 100);
                        resultaat.bericht = `Lifter aan boord! Betaalt bij aankomst: ${this.formatteerKrediet(this.passagiersTicketprijs)}.`;
                    } else {
                        resultaat.bericht = 'Je schip heeft geen vrije passagiersplaatsen.';
                    }
                } else {
                    resultaat.bericht = 'Je rijdt door. De lifter kijkt je beteuterd na.';
                }
                break;
            }

            case 'bederf': {
                const gevuldeGoederen = Object.keys(this.lading).filter(k => this.lading[k] > 0);
                if (gevuldeGoederen.length > 0) {
                    const goedId = gevuldeGoederen[Math.floor(Math.random() * gevuldeGoederen.length)];
                    const goed = GOEDEREN.find(g => g.id === goedId);
                    const verloren = Math.ceil(this.lading[goedId] / 2);
                    if (this.verzekering?.actief) {
                        resultaat.bericht = `Koelsysteemstoring! ${verloren}× ${goed.naam} dreigt te bederven — je verzekering dekt het verlies! 🛡️`;
                    } else {
                        this.lading[goedId] -= verloren;
                        this.aankoopAantallen[goedId] = Math.max(0, (this.aankoopAantallen[goedId] || 0) - verloren);
                        if (this.lading[goedId] === 0) { delete this.aankoopPrijzen[goedId]; delete this.aankoopAantallen[goedId]; }
                        resultaat.ladingDelta[goedId] = -verloren;
                        resultaat.bericht = `Koelsysteemstoring! ${verloren}× ${goed.naam} zijn bedorven en verloren gegaan.`;
                    }
                } else {
                    resultaat.bericht = 'Koelsysteemstoring, maar je had geen kwetsbare lading. Mazzel!';
                }
                break;
            }

            case 'haven_gesloten':
            case 'noodlanding': {
                const geplandNaar = this.reisData?.naar;
                const van = this.reisData?.van;
                const alternatieven = PLANETEN.filter(p => p.id !== van && p.id !== geplandNaar);
                if (alternatieven.length > 0) {
                    // Kies dichtstbijzijnde alternatief (tov geplande bestemming)
                    alternatieven.sort((a, b) =>
                        this.berekenAfstand(geplandNaar, a.id) - this.berekenAfstand(geplandNaar, b.id));
                    const nieuwDoel = alternatieven[0];
                    this.reisData.naar = nieuwDoel.id;
                    resultaat.omleiding = nieuwDoel.id;
                    const geplandNaam = PLANETEN.find(p => p.id === geplandNaar)?.naam ?? geplandNaar;
                    resultaat.bericht = eventId === 'haven_gesloten'
                        ? `De haven van ${geplandNaam} is gesloten vanwege quarantaine. Noodkoers naar ${nieuwDoel.naam}!`
                        : `Kritische motorstoringen! Noodlanding op ${nieuwDoel.naam} — ${geplandNaam} is niet meer haalbaar.`;
                } else {
                    resultaat.bericht = 'Problemen onderweg, maar er is geen alternatieve bestemming beschikbaar.';
                }
                break;
            }

            case 'douaneboete': {
                const boete = Math.round(200 + Math.random() * 500);
                if (this.verzekering?.actief) {
                    resultaat.bericht = `Douaneboete van ${this.formatteerKrediet(boete)} — je verzekering vergoedt het! 🛡️`;
                } else {
                    const werkelijk = Math.min(boete, this.speler.krediet);
                    this.speler.krediet -= werkelijk;
                    resultaat.kredietDelta = -werkelijk;
                    resultaat.bericht = `De galactische douane legt een boete op van ${this.formatteerKrediet(werkelijk)}. Bezwaar maken helpt niet.`;
                }
                break;
            }

            case 'cargo_lek': {
                const gevuld = Object.keys(this.lading).filter(k => this.lading[k] > 0);
                if (gevuld.length > 0) {
                    const goedId = gevuld[Math.floor(Math.random() * gevuld.length)];
                    const goed = GOEDEREN.find(g => g.id === goedId);
                    const verloren = Math.ceil(this.lading[goedId] * 0.4);
                    if (this.verzekering?.actief) {
                        resultaat.bericht = `Containerlek! ${verloren}× ${goed.naam} dreigt te verdwijnen — je verzekering dekt het verlies! 🛡️`;
                    } else {
                        this.lading[goedId] = Math.max(0, this.lading[goedId] - verloren);
                        this.aankoopAantallen[goedId] = Math.max(0, (this.aankoopAantallen[goedId] || 0) - verloren);
                        if (this.lading[goedId] === 0) { delete this.aankoopPrijzen[goedId]; delete this.aankoopAantallen[goedId]; }
                        resultaat.ladingDelta[goedId] = -verloren;
                        resultaat.bericht = `Containerlek! ${verloren}× ${goed.naam} is in de ruimte verdwenen.`;
                    }
                } else {
                    resultaat.bericht = 'Containerlek gedetecteerd, maar je ruim was leeg. Nauwelijks schade.';
                }
                break;
            }

            case 'motordiefstal': {
                const gestolen = Math.round(200 + Math.random() * 600);
                const werkelijk = Math.min(gestolen, this.speler.krediet);
                if (this.verzekering?.actief) {
                    resultaat.bericht = `Ruimtedief! ${this.formatteerKrediet(werkelijk)} gestolen — je verzekering vergoedt het! 🛡️`;
                } else {
                    this.speler.krediet -= werkelijk;
                    resultaat.kredietDelta = -werkelijk;
                    resultaat.bericht = `Een listige ruimtecrimineel heeft ongemerkt ${this.formatteerKrediet(werkelijk)} uit je kluis gestolen!`;
                }
                break;
            }

            default: {
                resultaat.bericht = 'De reis verloopt rustig. Sterren en stilte.';
                break;
            }
        }

        // Log resultaat
        if (resultaat.bericht) {
            const type = resultaat.kredietDelta < 0 || resultaat.schade ? 'waarschuwing' : (resultaat.kredietDelta > 0 ? 'succes' : 'info');
            this.voegBerichtToe(resultaat.bericht, type);
        }

        this.controleerSpelEinde();
        return resultaat;
    }

    // =========================================================================
    // HANDEL
    // =========================================================================

    koopGoed(goedId, aantal) {
        if (!Number.isInteger(aantal) || aantal < 1) return { succes: false, reden: 'Ongeldig aantal.' };
        const goed = GOEDEREN.find(g => g.id === goedId);
        const prijs = this.getPrijs(this.locatie, goedId);
        const totaal = prijs * aantal;
        const gewicht = goed.gewicht * aantal;
        const vrijeRuimte = this.schip.laadruimte - this.getLadingGewicht();

        if (gewicht > vrijeRuimte) return { succes: false, reden: 'Onvoldoende laadruimte!' };
        if (totaal > this.speler.krediet) return { succes: false, reden: 'Onvoldoende krediet!' };

        this.speler.krediet -= totaal;
        this.lading[goedId] = (this.lading[goedId] || 0) + aantal;
        this.statistieken.handelstransacties++;
        this.statistieken.cargoTonVervoerd = (this.statistieken.cargoTonVervoerd ?? 0) + gewicht;

        // Werk gewogen gemiddelde aankoopprijs bij
        const huidigAant = this.aankoopAantallen[goedId] || 0;
        const huidigAvg = this.aankoopPrijzen[goedId] || prijs;
        this.aankoopPrijzen[goedId] = Math.round((huidigAvg * huidigAant + prijs * aantal) / (huidigAant + aantal));
        this.aankoopAantallen[goedId] = huidigAant + aantal;

        this.voegBerichtToe(`Gekocht: ${aantal}× ${goed.naam} voor ${this.formatteerKrediet(totaal)}.`, 'info');
        this.controleerAchievements();
        return { succes: true };
    }

    verkoopGoed(goedId, aantal) {
        if (!Number.isInteger(aantal) || aantal < 1) return { succes: false, reden: 'Ongeldig aantal.' };
        const goed = GOEDEREN.find(g => g.id === goedId);
        const prijs = this.getPrijs(this.locatie, goedId);
        const totaal = prijs * aantal;

        if ((this.lading[goedId] || 0) < aantal) return { succes: false, reden: 'Onvoldoende lading!' };

        // Bereken winst/verlies
        const aankoopPrijs = this.aankoopPrijzen[goedId] || 0;
        const winst = aankoopPrijs > 0 ? (prijs - aankoopPrijs) * aantal : null;
        this._laatsteWinst = winst ?? 0;

        this.lading[goedId] -= aantal;
        this.speler.krediet += totaal;
        this.statistieken.handelstransacties++;
        this.statistieken.verkopen = (this.statistieken.verkopen ?? 0) + 1;

        // Werk aankoopregistratie bij
        this.aankoopAantallen[goedId] = Math.max(0, (this.aankoopAantallen[goedId] || 0) - aantal);
        if (this.lading[goedId] === 0) {
            delete this.aankoopPrijzen[goedId];
            delete this.aankoopAantallen[goedId];
        }

        // Opmaak van winst/verlies bericht
        let winstTekst = '';
        if (winst !== null) {
            if (winst > 0) winstTekst = ` (winst: +${this.formatteerKrediet(winst)})`;
            else if (winst < 0) winstTekst = ` (verlies: ${this.formatteerKrediet(winst)})`;
        }

        this.voegBerichtToe(`Verkocht: ${aantal}× ${goed.naam} voor ${this.formatteerKrediet(totaal)}${winstTekst}.`, 'succes');
        this.controleerAchievements();
        return { succes: true, winst, aankoopPrijs, totaal, goed };
    }

    getLadingGewicht() {
        return GOEDEREN.reduce((tot, g) => tot + (this.lading[g.id] || 0) * g.gewicht, 0);
    }

    getLadingWaarde() {
        return GOEDEREN.reduce((tot, g) => tot + (this.lading[g.id] || 0) * this.getPrijs(this.locatie, g.id), 0);
    }

    // =========================================================================
    // SCHIP & UPGRADES
    // =========================================================================

    koopUpgrade(upgradeId) {
        const upgrade = UPGRADES.find(u => u.id === upgradeId);
        if (!upgrade) return { succes: false, reden: 'Upgrade niet gevonden.' };
        if (this.gekochteUpgrades.includes(upgradeId)) return { succes: false, reden: 'Al geïnstalleerd.' };
        if (upgrade.vereist && !this.gekochteUpgrades.includes(upgrade.vereist)) return { succes: false, reden: 'Vereiste upgrade ontbreekt.' };
        if (this.speler.krediet < upgrade.prijs) return { succes: false, reden: 'Onvoldoende krediet!' };

        this.speler.krediet -= upgrade.prijs;
        this.gekochteUpgrades.push(upgradeId);

        // Apply effect
        if (upgrade.effect.snelheid) this.schip.snelheid += upgrade.effect.snelheid;
        if (upgrade.effect.laadruimte) this.schip.laadruimte += upgrade.effect.laadruimte;
        if (upgrade.effect.schild) this.schip.schild += upgrade.effect.schild;
        if (upgrade.effect.radar) this.schip.heeftRadar = true;
        if (upgrade.effect.brandstofTank) this.schip.brandstofTank += upgrade.effect.brandstofTank;

        this.voegBerichtToe(`${upgrade.naam} geïnstalleerd voor ${this.formatteerKrediet(upgrade.prijs)}.`, 'succes');
        this.controleerAchievements();
        return { succes: true };
    }

    _upgradeStapPrijs(cat) {
        const niveau = this.upgradeNiveaus?.[cat] ?? 0;
        const basis  = { motor: 2500, ruim: 1200, brandstofTank: 800, passagiers: 2500, schild: 1800 }[cat] ?? 1000;
        const factor = { motor: 2.0,  ruim: 1.8,  brandstofTank: 1.7, passagiers: 2.2, schild: 1.9  }[cat] ?? 2.0;
        return Math.round(basis * Math.pow(factor, niveau));
    }

    koopUpgradeStap(cat) {
        if (!this.upgradeNiveaus || !this.upgradeNiveaus.hasOwnProperty(cat))
            return { succes: false, reden: 'Onbekende categorie.' };
        const prijs = this._upgradeStapPrijs(cat);
        if (this.speler.krediet < prijs)
            return { succes: false, reden: 'Onvoldoende krediet!' };
        this.speler.krediet -= prijs;
        this.upgradeNiveaus[cat]++;
        const n = this.upgradeNiveaus[cat];
        if (cat === 'motor')        this.schip.snelheid             += 1;
        if (cat === 'ruim')         this.schip.laadruimte           += 10;
        if (cat === 'brandstofTank') this.schip.brandstofTank       += 10;
        if (cat === 'passagiers')   this.schip.passagiersCapaciteit += 2;
        if (cat === 'schild')       this.schip.schild               += 1;
        const namen = { motor: 'Motor', ruim: 'Vrachtruim', brandstofTank: 'Brandstoftank', passagiers: 'Passagiersruimte', schild: 'Schild' };
        this.voegBerichtToe(`${namen[cat]} opgewaardeerd naar niveau ${n} voor ${this.formatteerKrediet(prijs)}.`, 'succes');
        this.controleerAchievements();
        return { succes: true };
    }

    _berekenVerzekeringsPrijs() {
        const cap = this.schip?.laadruimte ?? 30;
        const pax = this.schip?.passagiersCapaciteit ?? 0;
        return Math.round(80 + cap * 2 + pax * 10);
    }

    koopVerzekering() {
        if (this.verzekering?.actief)
            return { succes: false, reden: 'Je hebt al een actieve verzekering voor deze reis.' };
        const kosten = this._berekenVerzekeringsPrijs();
        if (this.speler.krediet < kosten)
            return { succes: false, reden: 'Onvoldoende krediet!' };
        this.speler.krediet -= kosten;
        this.verzekering = { actief: true };
        this.voegBerichtToe(`🛡️ Reisverzekering afgesloten voor ${this.formatteerKrediet(kosten)}. Geldig voor de komende reis.`, 'info');
        return { succes: true };
    }

    berekenReparatieKosten() {
        const schade = (this.schip?.maxHP ?? 0) - (this.schipHP ?? 0);
        if (schade <= 0) return 0;
        const prijs = this.locatie === 'techton' ? 6 : 12;
        return schade * prijs;
    }

    repareerSchip() {
        const kosten = this.berekenReparatieKosten();
        if (kosten === 0) return { succes: false, reden: 'Je schip heeft geen schade.' };
        if (this.speler.krediet < kosten) return { succes: false, reden: 'Onvoldoende krediet voor reparatie.' };
        const gerepareerd = (this.schip?.maxHP ?? 0) - this.schipHP;
        this.speler.krediet -= kosten;
        this.schipHP = this.schip.maxHP;
        this.voegBerichtToe(`Schip volledig gerepareerd (+${gerepareerd} HP) voor ${this.formatteerKrediet(kosten)}.`, 'succes');
        return { succes: true };
    }

    koopSchip(schipId) {
        const nieuwSchip = SCHEPEN.find(s => s.id === schipId);
        if (!nieuwSchip) return { succes: false, reden: 'Schip niet gevonden.' };
        if (this.schip.id === schipId) return { succes: false, reden: 'Je hebt dit schip al.' };

        // Verkoopwaarde huidig schip: 60% van basisprijs
        const verkoopwaarde = Math.round(SCHEPEN.find(s => s.id === this.schip.id).prijs * 0.60);
        const nettoPrijs = nieuwSchip.prijs - verkoopwaarde;

        if (nettoPrijs > this.speler.krediet) {
            return { succes: false, reden: `Onvoldoende krediet. Je ontvangt ${this.formatteerKrediet(verkoopwaarde)} voor je huidige schip. Netto prijs: ${this.formatteerKrediet(nettoPrijs)}.` };
        }

        // Bewaar eenmalige upgrades (schild, radar)
        const upgradesNieuw = this.gekochteUpgrades.filter(uid => {
            const upg = UPGRADES.find(u => u.id === uid);
            return upg != null;
        });

        this.schip = {
            ...nieuwSchip,
            heeftRadar: this.schip.heeftRadar,
        };
        this.schipHP = nieuwSchip.maxHP;

        // Herbereken eenmalige upgrades
        this.gekochteUpgrades = upgradesNieuw;
        upgradesNieuw.forEach(uid => {
            const upg = UPGRADES.find(u => u.id === uid);
            if (upg.effect.schild) this.schip.schild += upg.effect.schild;
        });

        // Herbereken oneindige upgrade niveaus
        if (this.upgradeNiveaus) {
            this.schip.snelheid             += this.upgradeNiveaus.motor;
            this.schip.laadruimte           += this.upgradeNiveaus.ruim * 10;
            this.schip.brandstofTank        += this.upgradeNiveaus.brandstofTank * 10;
            this.schip.passagiersCapaciteit += this.upgradeNiveaus.passagiers * 2;
            this.schip.schild               += (this.upgradeNiveaus.schild ?? 0);
        }

        this.speler.krediet = this.speler.krediet - nettoPrijs;
        this.voegBerichtToe(`Je nieuwe ${nieuwSchip.naam} is klaar voor de ruimte! Nettobetaling: ${this.formatteerKrediet(nettoPrijs)}.`, 'goud');
        return { succes: true, verkoopwaarde, nettoPrijs };
    }

    // =========================================================================
    // AANDELEN
    // =========================================================================

    initAandelen() {
        AANDELEN.forEach(a => {
            this.aandeelKoersen[a.id] = a.basisPrijs;
            this.vorigeKoersen[a.id] = a.basisPrijs;
            this.aandelenPortefeuille[a.id] = 0;
            this.aandeelGeschiedenis[a.id] = [a.basisPrijs];
        });
    }

    updateAandeelKoersen() {
        AANDELEN.forEach(a => {
            this.vorigeKoersen[a.id] = this.aandeelKoersen[a.id];
            let factor = 0.93 + Math.random() * 0.14;

            // Marktschok: 5% kans op grote beweging
            if (Math.random() < 0.05) {
                factor *= (Math.random() < 0.5) ? 1.2 : 0.8;
            }

            // Graviteer naar basisprijs
            const basis = a.basisPrijs;
            const huidig = this.aandeelKoersen[a.id];
            factor += (basis - huidig) / basis * 0.05;

            let nieuw = Math.round(huidig * factor);
            nieuw = Math.max(Math.round(basis * 0.25), Math.min(Math.round(basis * 4), nieuw));
            this.aandeelKoersen[a.id] = nieuw;

            // Voeg toe aan geschiedenis
            if (!this.aandeelGeschiedenis[a.id]) this.aandeelGeschiedenis[a.id] = [];
            this.aandeelGeschiedenis[a.id].push(this.aandeelKoersen[a.id]);
            if (this.aandeelGeschiedenis[a.id].length > 50) this.aandeelGeschiedenis[a.id].shift();
        });
    }

    koopAandeel(aandeelId, aantal) {
        const koers = this.aandeelKoersen[aandeelId];
        const totaal = koers * aantal;
        if (totaal > this.speler.krediet) return { succes: false, reden: 'Onvoldoende krediet!' };
        this.speler.krediet -= totaal;
        this.aandelenPortefeuille[aandeelId] = (this.aandelenPortefeuille[aandeelId] || 0) + aantal;

        const huidigAant = this.aandeelAankoopAantallen[aandeelId] || 0;
        const huidigAvg = this.aandeelAankoopPrijzen[aandeelId] || koers;
        this.aandeelAankoopPrijzen[aandeelId] = Math.round((huidigAvg * huidigAant + koers * aantal) / (huidigAant + aantal));
        this.aandeelAankoopAantallen[aandeelId] = huidigAant + aantal;

        const naam = AANDELEN.find(a => a.id === aandeelId).naam;
        this.voegBerichtToe(`${aantal} aandelen ${naam} gekocht voor ${this.formatteerKrediet(totaal)}.`, 'info');
        this.controleerAchievements();
        return { succes: true };
    }

    verkoopAandeel(aandeelId, aantal) {
        if ((this.aandelenPortefeuille[aandeelId] || 0) < aantal) return { succes: false, reden: 'Onvoldoende aandelen!' };
        const koers = this.aandeelKoersen[aandeelId];
        const totaal = koers * aantal;
        const aankoopKoers = this.aandeelAankoopPrijzen[aandeelId];
        const winst = aankoopKoers ? (koers - aankoopKoers) * aantal : null;

        this.aandelenPortefeuille[aandeelId] -= aantal;
        this.speler.krediet += totaal;

        this.aandeelAankoopAantallen[aandeelId] = Math.max(0, (this.aandeelAankoopAantallen[aandeelId] || 0) - aantal);
        if (this.aandelenPortefeuille[aandeelId] === 0) {
            delete this.aandeelAankoopPrijzen[aandeelId];
            delete this.aandeelAankoopAantallen[aandeelId];
        }

        if (winst !== null && winst > 0) {
            this._beursWinstTotaal = (this._beursWinstTotaal ?? 0) + winst;
            if (winst > (this._beursBesteDeal ?? 0)) this._beursBesteDeal = winst;
        }

        const naam = AANDELEN.find(a => a.id === aandeelId).naam;
        let winstTekst = '';
        if (winst !== null) {
            winstTekst = winst >= 0 ? ` (winst: +${this.formatteerKrediet(winst)})` : ` (verlies: ${this.formatteerKrediet(winst)})`;
        }
        this.voegBerichtToe(`${aantal}× ${naam} verkocht voor ${this.formatteerKrediet(totaal)}${winstTekst}.`, 'succes');
        this.controleerAchievements();
        return { succes: true, winst };
    }

    getPortefeuilleWaarde() {
        return AANDELEN.reduce((tot, a) => tot + (this.aandelenPortefeuille[a.id] || 0) * this.aandeelKoersen[a.id], 0);
    }

    // =========================================================================
    // BANK / LENINGEN
    // =========================================================================

    leenGeld(bedrag) {
        const nieuweSchuld = this.speler.schuld + bedrag;
        if (nieuweSchuld > MAX_SCHULD) return { succes: false, reden: `Maximum schuld is ${this.formatteerKrediet(MAX_SCHULD)}.` };
        this.speler.schuld += bedrag;
        this.speler.krediet += bedrag;
        this._oitLeningGehad = true;
        this.voegBerichtToe(`Lening van ${this.formatteerKrediet(bedrag)} ontvangen. Totale schuld: ${this.formatteerKrediet(this.speler.schuld)}.`, 'waarschuwing');
        return { succes: true };
    }

    betaalLening(bedrag) {
        if (bedrag > this.speler.krediet) return { succes: false, reden: 'Onvoldoende krediet!' };
        if (bedrag > this.speler.schuld) bedrag = this.speler.schuld;
        this.speler.krediet -= bedrag;
        this.speler.schuld -= bedrag;
        this.voegBerichtToe(`${this.formatteerKrediet(bedrag)} van lening terugbetaald. Resterende schuld: ${this.formatteerKrediet(this.speler.schuld)}.`, 'info');
        this.controleerAchievements();
        return { succes: true };
    }

    controleerRente() {
        if (this.speler.schuld > 0 && this.beurt % RENTE_INTERVAL === 0) {
            const rente = Math.round(this.speler.schuld * RENTE_PERCENTAGE);
            this.speler.schuld += rente;
            this.voegBerichtToe(`Rente bijgeboekt: ${this.formatteerKrediet(rente)}. Totale schuld nu: ${this.formatteerKrediet(this.speler.schuld)}.`, 'waarschuwing');
        }
    }

    // =========================================================================
    // ACHIEVEMENTS
    // =========================================================================

    controleerAchievements() {
        if (typeof ACHIEVEMENTS === 'undefined') return;
        const nieuweAchs = [];
        ACHIEVEMENTS.forEach(ach => {
            if (!this.achievements.has(ach.id)) {
                try {
                    if (ach.check(this)) {
                        this.achievements.add(ach.id);
                        nieuweAchs.push(ach);
                        if (ach.beloning && ach.beloning > 0) {
                            this.speler.krediet += ach.beloning;
                            this.voegBerichtToe(`🏆 Achievement ontgrendeld: ${ach.naam}! +${this.formatteerKrediet(ach.beloning)} beloning`, 'goud');
                        } else {
                            this.voegBerichtToe(`🏆 Achievement ontgrendeld: ${ach.naam}!`, 'goud');
                        }
                    }
                } catch(e) {}
            }
        });
        if (nieuweAchs.length > 0 && typeof UI !== 'undefined' && UI.toonAchievementToast) {
            nieuweAchs.forEach(ach => UI.toonAchievementToast(ach));
        }
    }

    // =========================================================================
    // UTILITIES & EINDE
    // =========================================================================

    berekenNettowaarde() {
        return this.speler.krediet + this.getLadingWaarde() + this.getPortefeuilleWaarde() - this.speler.schuld;
    }

    controleerSpelEinde() {
        if (this.fase === 'einde') return;
        const netto = this.berekenNettowaarde();
        if (netto < -2000) {
            this.fase = 'einde';
            this.eindeReden = 'bankroet';
        } else if (this.beurt >= MAX_BEURTEN) {
            this.fase = 'einde';
            this.eindeReden = 'tijd';
        }
    }

    voegBerichtToe(tekst, type = 'info') {
        const beurt = this.beurt;
        this.logboek.unshift({ tekst, type, beurt });
        if (this.logboek.length > 100) this.logboek.pop();
    }

    formatteerKrediet(bedrag) {
        return new Intl.NumberFormat('nl-NL').format(Math.round(bedrag)) + ' credits';
    }

    // =========================================================================
    // OPSLAAN & LADEN (localStorage)
    // =========================================================================

    slaOp() {
        if (this.fase === 'intro' || this.fase === 'schipSelectie') return;
        try {
            const data = {
                versie: 1,
                fase: this.fase === 'reis' ? 'spel' : this.fase,
                speler: this.speler,
                schip: this.schip,
                lading: this.lading,
                schipHP: this.schipHP,
                locatie: this.locatie,
                beurt: this.beurt,
                planetPrijzen: this.planetPrijzen,
                vorigePrijzen: this.vorigePrijzen,
                aandeelKoersen: this.aandeelKoersen,
                vorigeKoersen: this.vorigeKoersen,
                aandelenPortefeuille: this.aandelenPortefeuille,
                logboek: this.logboek,
                activeTab: 'handel',
                gekochteUpgrades: this.gekochteUpgrades,
                tipsGezien: this.tipsGezien,
                statistieken: this.statistieken,
                aankoopPrijzen: this.aankoopPrijzen,
                aankoopAantallen: this.aankoopAantallen,
                aandeelGeschiedenis: this.aandeelGeschiedenis,
                bezochteplaneten: [...this.bezochteplaneten],
                planeetBezoeken: this.planeetBezoeken,
                achievements: [...this.achievements],
                _laatsteWinst: this._laatsteWinst,
                _oitLeningGehad: this._oitLeningGehad,
                _piratenOntkomingen: this._piratenOntkomingen,
                _aangekomendMetLageBrandstof: this._aangekomendMetLageBrandstof,
                _beursWinstTotaal: this._beursWinstTotaal,
                _beursBesteDeal: this._beursBesteDeal,
                aandeelAankoopPrijzen: this.aandeelAankoopPrijzen,
                aandeelAankoopAantallen: this.aandeelAankoopAantallen,
                passagiers: this.passagiers,
                passagiersTicketprijs: this.passagiersTicketprijs,
                wachtendePassagiers: this.wachtendePassagiers,
                brandstof: this.brandstof,
                brandstofPrijzen: this.brandstofPrijzen,
                eindeReden: this.eindeReden || null,
                marketingActief: this.marketingActief || null,
                upgradeNiveaus: this.upgradeNiveaus,
                verzekering: this.verzekering || null,
                concurrenten: this.concurrenten,
                nettoWaardeGeschiedenisSpeler: this.nettoWaardeGeschiedenisSpeler,
            };
            localStorage.setItem('gazillionaire_save', JSON.stringify(data));
        } catch(e) {}
    }

    laadOp() {
        try {
            const raw = localStorage.getItem('gazillionaire_save');
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (!data || data.versie !== 1) return false;
            Object.assign(this, data);
            this.bezochteplaneten = new Set(data.bezochteplaneten || ['nexoria']);
            this.achievements = new Set(data.achievements || []);
            this.reisData = null;
            this.geselecteerdePlaneet = null;
            if (!this.upgradeNiveaus) this.upgradeNiveaus = { motor: 0, ruim: 0, brandstofTank: 0, passagiers: 0, schild: 0 };
            if (this.upgradeNiveaus.schild === undefined) this.upgradeNiveaus.schild = 0;
            // Migratie: old saves had passagiers as array
            if (Array.isArray(this.passagiers)) this.passagiers = this.passagiers.length;
            if (!this.passagiersTicketprijs) this.passagiersTicketprijs = 0;
            if (!this.wachtendePassagiers) { this.wachtendePassagiers = {}; this.initPassagiers(); }
            // Migratie: old saves had schipBeschadigd boolean, new system uses schipHP
            delete this.schipBeschadigd;
            if (!this.schipHP || this.schipHP === 0) this.schipHP = this.schip?.maxHP ?? 40;
            if (!this.planeetBezoeken) this.planeetBezoeken = {};
            if (this.statistieken.cargoTonVervoerd === undefined) this.statistieken.cargoTonVervoerd = 0;
            return true;
        } catch(e) {
            return false;
        }
    }

    wisSave() {
        localStorage.removeItem('gazillionaire_save');
    }

    static leesSaveInfo() {
        try {
            const raw = localStorage.getItem('gazillionaire_save');
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || data.versie !== 1 || data.fase === 'einde') return null;
            return { naam: data.speler?.naam ?? 'Kapitein', beurt: data.beurt ?? 0 };
        } catch(e) { return null; }
    }
}

// Singleton
const state = new GameState();
