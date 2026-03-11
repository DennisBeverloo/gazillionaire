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

    reset() {
        this.fase = 'intro'; // intro | schipSelectie | spel | reis | einde
        this.speler = { naam: 'Kapitein', krediet: START_KREDIET, schuld: 0 };
        this.schip = null;
        this.lading = {};
        this.schipBeschadigd = false;
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
        this.statistieken = { handelstransacties: 0, gereisd: 0, eventsMeegemaakt: 0, passagiersAfgeleverd: 0 };

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

        // Aandeel aankoopprijs tracking
        this.aandeelAankoopPrijzen = {};    // weighted avg purchase price per stock
        this.aandeelAankoopAantallen = {};  // quantities for weighted avg

        // Marketing
        this.marketingActief = null;        // { planeet: planeetId, kosten } of null

        // Passagiers
        this.passagiers = [];               // [{bestemming, vergoeding, naam}] — on board
        this.passagiersWachtend = {};       // {planeetId: [{bestemming, vergoeding, naam}]}

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
        this.fase = 'spel';
        this.initPrijzen();
        this.initAandelen();
        this.initPassagiers();
        this.initBrandstof();
        this.voegBerichtToe(`Welkom, ${this.speler.naam}! Je reis begint op Nexoria. Veel handelsgeluk!`, 'info');
        this.voegBerichtToe(`Je hebt een ${schipTemplate.naam} gekocht voor ${this.formatteerKrediet(schipTemplate.prijs)}`, 'goud');
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

    berekenBasePrijs(planeet, goed) {
        // Volledig random startprijs per planeet per goed — geen vaste voordelen
        return Math.max(5, Math.round(goed.basisPrijs * (0.55 + Math.random() * 0.9))); // 55–145% van basis
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

                // Graviteer terug naar basispijs (neutraal voor alle planeten)
                const afstand = (goed.basisPrijs - huidig) / goed.basisPrijs;
                factor += afstand * 0.07;

                let nieuw = Math.round(huidig * factor);

                // Grenzen: 25–220% van basisprijs
                const min = Math.max(5, Math.round(goed.basisPrijs * 0.25));
                const max = Math.round(goed.basisPrijs * 2.2);
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
        const eventKans = naarPlaneet?.isGevaarlijk ? 0.55 : 0.38;
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

        const eventId = this.reisData.events[this.reisData.stap - 1];

        if (eventId && eventId !== 'niets') {
            const event = EVENTS.find(e => e.id === eventId);
            this.statistieken.eventsMeegemaakt++;
            return { event };
        }

        return 'aankomst';
    }

    aankomst() {
        this.locatie = this.reisData.naar;
        const planeet = PLANETEN.find(p => p.id === this.locatie);
        this.fase = 'spel';
        this.reisData = null;
        this.bezochteplaneten.add(this.locatie);

        // Lever passagiers af die hun bestemming bereikt hebben
        let passagiersInfo = null;
        const aangekomenen = this.passagiers.filter(p => p.bestemming === this.locatie);
        if (aangekomenen.length > 0) {
            const totaal = aangekomenen.reduce((s, p) => s + p.vergoeding, 0);
            this.speler.krediet += totaal;
            this.statistieken.passagiersAfgeleverd += aangekomenen.length;
            this.passagiers = this.passagiers.filter(p => p.bestemming !== this.locatie);
            this.voegBerichtToe(`${aangekomenen.length} passagier(s) afgeleverd. +${this.formatteerKrediet(totaal)}`, 'goud');
            passagiersInfo = { aantal: aangekomenen.length, totaal, namen: aangekomenen.map(p => p.naam) };
        }

        if (this.brandstof < 10) this._aangekomendMetLageBrandstof = true;
        this.voegBerichtToe(`Aangekomen op ${planeet.naam}! Brandstof: ${this.brandstof}/${this.schip.brandstofTank}`, 'succes');

        // Controleer marketingcampagne — geldt alleen als we op de geplande planeet aankomen
        let marketingBonus = 0;
        if (this.marketingActief && this.marketingActief.planeet === this.locatie) {
            marketingBonus = 2;
            this.voegBerichtToe(`📢 Reclamecampagne actief! Er wachten extra passagiers op je.`, 'info');
            this.marketingActief = null;
        }
        this.genereerPassagiersVoorPlaneet(this.locatie, marketingBonus);

        // Planeet aankomst event
        const aankomstEvent = this._bepaalAankomstEvent();
        if (aankomstEvent) {
            this._pasAankomstEventToe(aankomstEvent);
        }
        this.huidigAankomstEvent = aankomstEvent;

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

    genereerPassagiersVoorPlaneet(planeetId, bonusAantal = 0) {
        const andere = PLANETEN.filter(p => p.id !== planeetId);
        const namen = ['Lyra Voss', 'Dr. Kael', 'Handelaar Rin', 'Senator Dara', 'Engr. Mika', 'Wren Zo', 'Kapitein Sura', 'Agent Nox'];
        const aantal = Math.floor(Math.random() * 3) + 1 + bonusAantal;
        const passagiers = [];
        for (let i = 0; i < aantal; i++) {
            const best = andere[Math.floor(Math.random() * andere.length)];
            const afstand = this.berekenAfstand(planeetId, best.id);
            const vergoeding = Math.round(80 + afstand * 3.5 + Math.random() * 120);
            passagiers.push({
                bestemming: best.id,
                vergoeding,
                naam: namen[Math.floor(Math.random() * namen.length)],
            });
        }
        this.passagiersWachtend[planeetId] = passagiers;
    }

    initPassagiers() {
        PLANETEN.forEach(p => { this.passagiersWachtend[p.id] = []; });
        this.genereerPassagiersVoorPlaneet(this.locatie);
    }

    neemPassagierAanBoord(index) {
        const wachtend = this.passagiersWachtend[this.locatie] || [];
        if (!wachtend[index]) return { succes: false, reden: 'Passagier niet gevonden.' };
        const maxPax = this.schip.passagiersCapaciteit || 0;
        if (this.passagiers.length >= maxPax) return { succes: false, reden: 'Geen passagiersplaatsen beschikbaar!' };
        const pax = wachtend.splice(index, 1)[0];
        this.passagiers.push(pax);
        const best = PLANETEN.find(p => p.id === pax.bestemming)?.naam ?? pax.bestemming;
        this.voegBerichtToe(`${pax.naam} aan boord. Bestemming: ${best}. Vergoeding: ${this.formatteerKrediet(pax.vergoeding)}`, 'info');
        this.controleerAchievements();
        return { succes: true };
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
        this.voegBerichtToe(`📢 Reclamecampagne gestart voor ${planeetNaam} (${this.formatteerKrediet(kosten)}). +2 extra passagiers bij aankomst!`, 'info');
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
    // EVENT VERWERKING
    // =========================================================================

    verwerkevent(eventId, keuzeId) {
        const resultaat = { bericht: '', kredietDelta: 0, ladingDelta: {}, schade: false, extraBeurten: 0, tip: null };

        switch (eventId) {
            case 'piraten': {
                if (keuzeId === 'betaal') {
                    const bedrag = Math.min(Math.round(this.speler.krediet * 0.25 + 100), 800);
                    this.speler.krediet -= bedrag;
                    resultaat.kredietDelta = -bedrag;
                    resultaat.losgeldbedrag = bedrag;
                    resultaat.bericht = `Je betaalt ${this.formatteerKrediet(bedrag)} losgeld. De piraten laten je door.`;
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
                            this.lading[goedId] = Math.max(0, this.lading[goedId] - verloren);
                            resultaat.ladingDelta[goedId] = -verloren;
                            resultaat.bericht = `Gepakt! Je verliest ${verloren} eenheden ${GOEDEREN.find(g=>g.id===goedId).naam}.`;
                        } else {
                            const bedrag = Math.min(200, this.speler.krediet);
                            this.speler.krediet -= bedrag;
                            resultaat.kredietDelta = -bedrag;
                            resultaat.bericht = `Ze vinden je lege ruim en pakken ${this.formatteerKrediet(bedrag)} uit je kluis.`;
                        }
                    }
                }
                break;
            }

            case 'stralingstorm': {
                const extraBrandstof = Math.round(12 + Math.random() * 18);
                const werkelijk = Math.min(extraBrandstof, this.brandstof);
                this.brandstof = Math.max(0, this.brandstof - extraBrandstof);
                resultaat.bericht = `De storm dwingt je een grote omweg te nemen. Extra brandstofverbruik: ${werkelijk} eenheden. Brandstof resterend: ${this.brandstof}.`;
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
                    this.speler.krediet -= kosten;
                    resultaat.kredietDelta = -kosten;
                    this.schipBeschadigd = false;
                    resultaat.bericht = `Reparatie voltooid voor ${this.formatteerKrediet(kosten)}. Je schip is weer volledig operationeel.`;
                } else {
                    this.schipBeschadigd = true;
                    resultaat.schade = true;
                    resultaat.bericht = 'Je reist door met het defect. Je schip is beschadigd en vliegt langzamer! Repareer zo snel mogelijk.';
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
                this.brandstof = Math.max(0, this.brandstof - extraNevel);
                resultaat.bericht = `De ionennevel dwingt je van koers. Extra brandstofverbruik: ${extraNevel} eenheden. Brandstof resterend: ${this.brandstof}.`;
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
                const schade = Math.max(50, Math.round(this.speler.krediet * 0.05 + Math.random() * 200));
                this.speler.krediet -= schade;
                this.schipBeschadigd = true;
                resultaat.kredietDelta = -schade;
                resultaat.schade = true;
                resultaat.bericht = `Keiharde klappen! Schade aan de romp. Je verliest ${this.formatteerKrediet(schade)} aan noodreparaties en het schip is beschadigd.`;
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
                    if (this.passagiers.length < maxPax) {
                        const vergoeding = this._lifterVergoeding || Math.round(100 + Math.random() * 200);
                        this.passagiers.push({ bestemming: this.reisData?.naar ?? '', vergoeding, naam: 'Lifter' });
                        resultaat.bericht = `Lifter aan boord! Vergoeding bij aankomst: ${this.formatteerKrediet(vergoeding)}.`;
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
                    this.lading[goedId] -= verloren;
                    this.aankoopAantallen[goedId] = Math.max(0, (this.aankoopAantallen[goedId] || 0) - verloren);
                    if (this.lading[goedId] === 0) { delete this.aankoopPrijzen[goedId]; delete this.aankoopAantallen[goedId]; }
                    resultaat.ladingDelta[goedId] = -verloren;
                    resultaat.bericht = `Koelsysteemstoring! ${verloren}× ${goed.naam} zijn bedorven en verloren gegaan.`;
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

    repareerSchip() {
        const kosten = 350;
        if (this.speler.krediet < kosten) return { succes: false, reden: 'Onvoldoende krediet voor reparatie.' };
        this.speler.krediet -= kosten;
        this.schipBeschadigd = false;
        this.voegBerichtToe(`Schip gerepareerd voor ${this.formatteerKrediet(kosten)}.`, 'succes');
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

        // Bewaar upgrades die passen
        const upgradesNieuw = this.gekochteUpgrades.filter(uid => {
            const upg = UPGRADES.find(u => u.id === uid);
            return upg && upg.categorie !== 'motor'; // motoren passen niet
        });

        // Drop lading die niet past
        let overschot = 0;
        const nieuwLaadruimte = nieuwSchip.laadruimte + (upgradesNieuw.includes('ruim_mk2') ? 20 : 0) + (upgradesNieuw.includes('ruim_mk3') ? 35 : 0);
        // Simplification: just reset non-motor upgrades
        this.schip = {
            ...nieuwSchip,
            heeftRadar: this.schip.heeftRadar,
        };
        this.schipBeschadigd = false;

        // Herbereken upgrades
        this.gekochteUpgrades = upgradesNieuw;
        upgradesNieuw.forEach(uid => {
            const upg = UPGRADES.find(u => u.id === uid);
            if (upg.effect.snelheid) this.schip.snelheid += upg.effect.snelheid;
            if (upg.effect.laadruimte) this.schip.laadruimte += upg.effect.laadruimte;
            if (upg.effect.schild) this.schip.schild += upg.effect.schild;
        });

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
        return new Intl.NumberFormat('nl-NL').format(Math.round(bedrag)) + ' cr';
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
                schipBeschadigd: this.schipBeschadigd,
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
                achievements: [...this.achievements],
                _laatsteWinst: this._laatsteWinst,
                _oitLeningGehad: this._oitLeningGehad,
                _piratenOntkomingen: this._piratenOntkomingen,
                _aangekomendMetLageBrandstof: this._aangekomendMetLageBrandstof,
                aandeelAankoopPrijzen: this.aandeelAankoopPrijzen,
                aandeelAankoopAantallen: this.aandeelAankoopAantallen,
                passagiers: this.passagiers,
                passagiersWachtend: this.passagiersWachtend,
                brandstof: this.brandstof,
                brandstofPrijzen: this.brandstofPrijzen,
                eindeReden: this.eindeReden || null,
                marketingActief: this.marketingActief || null,
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
