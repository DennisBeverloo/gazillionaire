// =============================================================================
// GAZILLIONAIRE: STER DER HANDEL - Game State & Logic
// =============================================================================

const MAX_BEURTEN = 150;
const START_KREDIET = 25000;
const MAX_SCHULD = 8000;
const RENTE_PERCENTAGE = 0.05;
const RENTE_INTERVAL = 20;
const CREW_BETAAL_INTERVAL = 7; // crew betaling elke week (7 beurten)

// Voorraadbereiken per planeet per goed
const VOORRAAD_BASIS = { min: 25, max: 80 };
const VOORRAAD_SPEC  = { min: 60, max: 150 }; // specialiteit: meer voorraad
const VOORRAAD_VRAAG = { min: 8,  max: 30  }; // hoge vraag: weinig voorraad

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
        this.statistieken = { handelstransacties: 0, gereisd: 0, eventsMeegemaakt: 0, passagiersAfgeleverd: 0, verkopen: 0, cargoTonVervoerd: 0, ferroietVerwerkt: 0, veilingenGewonnen: 0, schepenGekocht: 0, pyrofluxTankbeurten: 0, casinoWinstStreak: 0, casinoBigWin: 0, mortexGladGestreken: 0 };
        this._pyrofluxGetankt = false;

        // Casino Luxoria
        this.luxoriaCasino = { gokbeurtenDitBezoek: 0, laatste: null };

        // Zwarte Markt / Mortex
        this.ladingVerdacht = {};                   // { goedId: ton verdacht }
        this.mortexUpgrades = { afgeschermd: false }; // illegale scheepswerf upgrades
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

        // Marktmodifiers (koop/verkoop impact) — pas toegepast bij vertrek
        this.marktModifiers = {};           // { planeetId: { goedId: multiplier } }
        this._visitMarktSaldo = {};         // { goedId: delta } — wordt geflusht bij reisNaar()

        this.planetVoorraden = {}; // { planeetId: { goedId: aantal } }

        // Missies
        this.missies = [];                  // actieve/geaccepteerde missies
        this.beschikbareMissies = [];       // gegenereerde maar nog niet geaccepteerd
        this._missieIdTeller = 0;

        // Agria veiling
        this.agriaVeiling = null;

        // Verzekering
        this.verzekering = null;            // null of { actief: true }

        // Crew
        this.crew = {
            grootte: 0,         // aantal bemanningsleden
            salaris: 100,       // cr/pp per betaalperiode (CREW_BETAAL_INTERVAL beurten)
            happiness: 75,      // 0-100
            volgendeBetaalBeurt: CREW_BETAAL_INTERVAL, // beurt waarop volgende betaling verschuldigd is
            casinoBeurt: -99,   // beurt van laatste casino-uitje
        };

        // Concurrenten
        this.concurrenten = [];             // [{id, locatie, krediet, waardeGeschiedenis, lading, reisdoel, schipTier}]
        this.nettoWaardeGeschiedenisSpeler = [];
        this.aankomstConcurrentEvents = [];
        this._pendingConcurrentArrivalEvents = [];

        // Passagiers
        this.passagiers = 0;               // aantal aan boord (int)
        this.passagiersTicketprijs = 0;    // prijs per passagier voor huidige rit
        this.wachtendePassagiers = {};     // {planeetId: { aantal: int, prijs: int }}
        this.ticketNiveau = 'midden';      // 'laag' | 'midden' | 'hoog'

        // Bank spaarrekening
        this.bankSaldo = 0;
        this.bankRente = 2;     // percentage per beurt (start 2%, min 0, max 5)
        this.bankBevroren = 0;  // beurten resterend dat transacties geblokkeerd zijn

        // Kredietlimiet (kan verhoogd worden via event)
        this.maxSchuld = MAX_SCHULD;
        this._insiderBoost = null;         // { aandeelId, beurten }
        this._noodoproepBonus = false;      // pending arrival bonus from noodoproep_passagier

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
        this.schip = { ...schipTemplate };
        this.speler.krediet -= schipTemplate.prijs;
        this.schipHP = schipTemplate.maxHP;
        this.crew.grootte = CREW_PER_SCHIP[schipId] ?? 3;
        this.crew.volgendeBetaalBeurt = CREW_BETAAL_INTERVAL; // eerste betaling over 7 beurten
        this.fase = 'spel';
        this.initPrijzen();
        this.initAandelen();
        this.initPassagiers();
        this.initBrandstof();
        this._initConcurrenten();
        this._initPlanetVoorraden();
        this.nettoWaardeGeschiedenisSpeler = [this.berekenNettowaarde()];
        this.voegBerichtToe(`Welkom, ${this.speler.naam}! Je reis begint op Nexoria. Veel handelsgeluk!`, 'info');
        this.voegBerichtToe(`Je hebt een ${schipTemplate.naam} gekocht voor ${this.formatteerKrediet(schipTemplate.prijs)}`, 'goud');
    }

    _initPlanetVoorraden() {
        this.planetVoorraden = {};
        PLANETEN.forEach(p => {
            this.planetVoorraden[p.id] = {};
            GOEDEREN.forEach(g => {
                const range = p.specialiteit?.includes(g.id) ? VOORRAAD_SPEC
                            : p.vraag?.includes(g.id)        ? VOORRAAD_VRAAG
                            : VOORRAAD_BASIS;
                this.planetVoorraden[p.id][g.id] =
                    Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
            });
        });
    }

    _schommelVoorraden() {
        PLANETEN.forEach(p => {
            if (!this.planetVoorraden[p.id]) return;
            GOEDEREN.forEach(g => {
                const range = p.specialiteit?.includes(g.id) ? VOORRAAD_SPEC
                            : p.vraag?.includes(g.id)        ? VOORRAAD_VRAAG
                            : VOORRAAD_BASIS;
                const delta = Math.floor(Math.random() * 13) - 4; // -4 tot +8
                const huidig = this.planetVoorraden[p.id][g.id] ?? range.min;
                this.planetVoorraden[p.id][g.id] =
                    Math.max(range.min, Math.min(range.max, huidig + delta));
            });
        });
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
                lading: [],
                ladingGewicht: 0,
                reisdoel: null,
                schipTier: 1,
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
        if (planeet.id === 'mortex') return 0.65;   // zwarte markt: alles 35% goedkoper
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
        const basis = this.planetPrijzen[planeetId]?.[goedId] ?? 0;
        const mod = this.marktModifiers?.[planeetId]?.[goedId] ?? 1.0;
        const naBasisMod = mod === 1.0 ? basis : Math.max(5, Math.round(basis * mod));

        // Voorraad-modifier: lage voorraad → hogere prijs, hoge voorraad → lagere prijs
        // Staat los van scheepsbonussen, planetkortingen en event-effecten
        const voorraad = this.planetVoorraden?.[planeetId]?.[goedId];
        if (voorraad === undefined) return naBasisMod;
        const planeet = PLANETEN.find(p => p.id === planeetId);
        const range = planeet?.specialiteit?.includes(goedId) ? VOORRAAD_SPEC
                    : planeet?.vraag?.includes(goedId)        ? VOORRAAD_VRAAG
                    : VOORRAAD_BASIS;
        const stockRatio = Math.max(0, Math.min(1, (voorraad - range.min) / (range.max - range.min)));
        // stockRatio 0 = minimale voorraad (+20% prijs), 0.5 = normaal, 1 = vol (−20% prijs)
        const voorraadMod = 1.0 + 0.20 * (1 - 2 * stockRatio);
        return Math.max(5, Math.round(naBasisMod * voorraadMod));
    }

    _pasMarktAan(planeetId, goedId, delta) {
        if (!this.marktModifiers[planeetId]) this.marktModifiers[planeetId] = {};
        const huidig = this.marktModifiers[planeetId][goedId] ?? 1.0;
        const nieuw = Math.max(0.55, Math.min(1.45, huidig + delta));
        this.marktModifiers[planeetId][goedId] = nieuw;
    }

    _vervalMarktModifiers() {
        const vervalFactor = 0.88; // elke beurt 12% terug naar 1.0
        for (const planeetId of Object.keys(this.marktModifiers ?? {})) {
            for (const goedId of Object.keys(this.marktModifiers[planeetId])) {
                const m = this.marktModifiers[planeetId][goedId];
                const nieuw = 1.0 + (m - 1.0) * vervalFactor;
                if (Math.abs(nieuw - 1.0) < 0.005) {
                    delete this.marktModifiers[planeetId][goedId];
                } else {
                    this.marktModifiers[planeetId][goedId] = nieuw;
                }
            }
        }
    }

    getTrend(planeetId, goedId) {
        const huidig = this.planetPrijzen[planeetId]?.[goedId] ?? 0;
        const vorig = this.vorigePrijzen[planeetId]?.[goedId] ?? huidig;
        if (huidig > vorig * 1.02) return 'op';
        if (huidig < vorig * 0.98) return 'neer';
        return 'gelijk';
    }

    // =========================================================================
    // MISSIES
    // =========================================================================

    genereerMissies() {
        // Genereer nieuwe beschikbare missies bij aankomst op planeet
        const andereplaneten = PLANETEN.filter(p => p.id !== this.locatie);
        const goederen = [...GOEDEREN];
        const nieuweM = [];

        // 2 cargo-missies
        for (let i = 0; i < 2; i++) {
            const goed = goederen[Math.floor(Math.random() * goederen.length)];
            const bestemming = andereplaneten[Math.floor(Math.random() * andereplaneten.length)];
            const hoeveelheid = 5 + Math.floor(Math.random() * 16); // 5–20 ton
            const basisBeloning = Math.round(goed.basisPrijs * hoeveelheid * (0.4 + Math.random() * 0.4));
            nieuweM.push({
                id: ++this._missieIdTeller,
                type: 'cargo',
                goedId: goed.id,
                goedNaam: goed.naam,
                goedIcoon: goed.icoon,
                hoeveelheid,
                bestemmingId: bestemming.id,
                bestemmingNaam: bestemming.naam,
                beloning: basisBeloning,
                deadline: this.beurt + 20 + Math.floor(Math.random() * 11),
                actief: false,
            });
        }

        // 1 VIP-missie (alleen als schip passagiersruimte heeft of altijd aanbieden)
        const vipBestemming = andereplaneten[Math.floor(Math.random() * andereplaneten.length)];
        const vipBeloning = 800 + Math.floor(Math.random() * 1201); // 800–2000
        nieuweM.push({
            id: ++this._missieIdTeller,
            type: 'vip',
            bestemmingId: vipBestemming.id,
            bestemmingNaam: vipBestemming.naam,
            beloning: vipBeloning,
            deadline: this.beurt + 15 + Math.floor(Math.random() * 11),
            actief: false,
            vipAanBoord: false,
        });

        this.beschikbareMissies = nieuweM;
    }

    accepteerMissie(missieId) {
        if ((this.missies?.length ?? 0) >= 3) return { succes: false, reden: 'Je hebt al 3 actieve missies.' };
        const idx = this.beschikbareMissies.findIndex(m => m.id === missieId);
        if (idx < 0) return { succes: false, reden: 'Missie niet gevonden.' };
        const missie = this.beschikbareMissies[idx];

        if (missie.type === 'vip') {
            const cap = this.schip?.passagiersCapaciteit || 0;
            if (cap === 0) return { succes: false, reden: 'Je schip heeft geen passagiersruimte voor een VIP.' };
            if (this.passagiers >= cap) return { succes: false, reden: 'Geen vrije passagiersplaats.' };
            this.passagiers++;
            missie.vipAanBoord = true;
        }

        missie.actief = true;
        this.missies.push(missie);
        this.beschikbareMissies.splice(idx, 1);
        const naam = missie.type === 'vip'
            ? `VIP-transport naar ${missie.bestemmingNaam}`
            : `${missie.goedIcoon} ${missie.hoeveelheid}t ${missie.goedNaam} → ${missie.bestemmingNaam}`;
        this.voegBerichtToe(`🎯 Missie geaccepteerd: ${naam}. Beloning: ${this.formatteerKrediet(missie.beloning)}`, 'goud');
        return { succes: true };
    }

    _controleerMissieVoltooiing() {
        if (!this.missies?.length) return;
        const voltooide = [];

        this.missies = this.missies.filter(m => {
            // Verlopen missies verwijderen
            if (this.beurt > m.deadline) {
                if (m.type === 'vip' && m.vipAanBoord) this.passagiers = Math.max(0, this.passagiers - 1);
                this.voegBerichtToe(`⌛ Missie verlopen: ${m.type === 'vip' ? 'VIP-transport' : m.goedNaam} naar ${m.bestemmingNaam}`, 'gevaar');
                return false;
            }
            // Cargo: check of we op bestemming zijn met genoeg lading
            if (m.type === 'cargo' && m.bestemmingId === this.locatie) {
                const inHold = this.lading[m.goedId] || 0;
                if (inHold >= m.hoeveelheid) {
                    this.lading[m.goedId] -= m.hoeveelheid;
                    if (this.lading[m.goedId] === 0) delete this.aankoopPrijzen[m.goedId];
                    this.aankoopAantallen[m.goedId] = Math.max(0, (this.aankoopAantallen[m.goedId] || 0) - m.hoeveelheid);
                    const marktwaarde = this.getPrijs(this.locatie, m.goedId) * m.hoeveelheid;
                    const totaal = marktwaarde + m.beloning;
                    this.speler.krediet += totaal;
                    this.voegBerichtToe(`🎯 Missie voltooid! ${m.goedIcoon} ${m.hoeveelheid}t ${m.goedNaam} afgeleverd. +${this.formatteerKrediet(totaal)} (incl. ${this.formatteerKrediet(m.beloning)} bonus)`, 'goud');
                    voltooide.push(m);
                    return false;
                }
            }
            // VIP: check of we op bestemming zijn
            if (m.type === 'vip' && m.bestemmingId === this.locatie && m.vipAanBoord) {
                this.passagiers = Math.max(0, this.passagiers - 1);
                this.speler.krediet += m.beloning;
                this.voegBerichtToe(`🎯 VIP-missie voltooid! VIP afgeleverd op ${m.bestemmingNaam}. +${this.formatteerKrediet(m.beloning)}`, 'goud');
                voltooide.push(m);
                return false;
            }
            return true;
        });
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
        // Koppel marketingcampagne aan bestemming bij vertrek
        if (this.marketingActief && !this.marketingActief.planeet) {
            this.marketingActief.planeet = planeetId;
        }
        // Flush marktimpact van deze planeet bij vertrek
        for (const [goedId, delta] of Object.entries(this._visitMarktSaldo)) {
            if (Math.abs(delta) > 0.001) this._pasMarktAan(this.locatie, goedId, delta);
        }
        this._visitMarktSaldo = {};
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

        const pool = EVENTS.filter(e => e.id !== 'niets' && e.id !== 'crew_opstand');
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
        this.controleerCrew();
        this._vervalMarktModifiers();
        this._schommelVoorraden();

        this._simuleerConcurrenten();

        // Crew-opstand: prioriteit boven gepland event als happiness kritiek laag is
        if ((this.crew?.grootte ?? 0) > 0 && (this.crew?.happiness ?? 100) < 25 && Math.random() < 0.18) {
            const mutinyEvent = EVENTS.find(e => e.id === 'crew_opstand');
            if (mutinyEvent) {
                this.statistieken.eventsMeegemaakt++;
                return { event: mutinyEvent };
            }
        }

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

        const spelersbestemming = this.reisData?.naar;
        const spelerSnelheid = this.schip?.snelheid ?? 1;

        // Sample speler nettowaarde bij start van deze beurt
        this.nettoWaardeGeschiedenisSpeler.push(this.berekenNettowaarde());
        if (this.nettoWaardeGeschiedenisSpeler.length > 160) this.nettoWaardeGeschiedenisSpeler.shift();

        this.concurrenten.forEach(npc => {
            const sjab = CONCURRENTEN.find(c => c.id === npc.id);
            if (!sjab) return;

            const effectieveSnelheid = this._npcEffectieveSnelheid(npc, sjab);

            // 1. Verwerk aankomst op huidig reisdoel
            if (npc.reisdoel) {
                const aankomstPlaneet = npc.reisdoel;
                const eerderDanSpeler = spelersbestemming === aankomstPlaneet && effectieveSnelheid > spelerSnelheid;

                // Verkoop lading op aankomstplaneet
                this._npcVerkoopLading(npc, aankomstPlaneet);

                // Koop nieuwe goederen op aankomstplaneet
                const aankopen = this._npcKoopGoederen(npc, sjab, aankomstPlaneet);

                // Zet nieuwe locatie
                npc.locatie = aankomstPlaneet;

                // Registreer aankomstevent als NPC eerder aankwam dan speler
                if (eerderDanSpeler && aankopen.length > 0) {
                    if (!this._pendingConcurrentArrivalEvents) this._pendingConcurrentArrivalEvents = [];
                    this._pendingConcurrentArrivalEvents.push({
                        npc: sjab,
                        aankopen,
                        planeetId: aankomstPlaneet,
                        planeetNaam: PLANETEN.find(p => p.id === aankomstPlaneet)?.naam ?? aankomstPlaneet,
                        npcSnelheid: effectieveSnelheid,
                    });
                    // Prijseffect: schaarsheid door NPC-aankopen
                    aankopen.forEach(({ goed }) => {
                        const huidig = this.planetPrijzen[aankomstPlaneet]?.[goed.id];
                        if (!huidig) return;
                        const factor = 1.06 + Math.random() * 0.12;
                        const max = Math.round(goed.basisPrijs * 2.2);
                        this.planetPrijzen[aankomstPlaneet][goed.id] = Math.min(max, Math.round(huidig * factor));
                    });
                }
            }

            // 2. Kies nieuw reisdoel voor volgende beurt
            npc.reisdoel = this._npcKiesReisdoel(npc, sjab);

            // 3. Zeldzaam negatief event (piraten, ongeluk, etc.)
            if (Math.random() < 0.03) {
                const verliesPct = 0.10 + Math.random() * 0.20;
                npc.krediet = Math.max(500, Math.round(npc.krediet * (1 - verliesPct)));
            }

            // 4. Schip upgrade op basis van vermogen
            if (npc.schipTier === 1 && npc.krediet >= 15000) npc.schipTier = 2;
            else if (npc.schipTier === 2 && npc.krediet >= 35000) npc.schipTier = 3;

            // 5. Waarde-geschiedenis bijhouden
            npc.waardeGeschiedenis.push(npc.krediet);
            if (npc.waardeGeschiedenis.length > 160) npc.waardeGeschiedenis.shift();
        });
    }

    _npcEffectieveSnelheid(npc, sjab) {
        return sjab.snelheid + (npc.schipTier - 1);
    }

    _npcLadingCapaciteit(npc) {
        return npc.schipTier === 1 ? 30 : npc.schipTier === 2 ? 60 : 100;
    }

    _npcKiesReisdoel(npc, sjab) {
        const andere = PLANETEN.filter(p => p.id !== npc.locatie);
        if (!andere.length) return npc.locatie;

        // Mira (Strateeg): kies planeet waar lading het meest oplevert
        if (sjab.id === 'mira') {
            return this._npcBesteSellPlaneet(npc, andere) ?? andere[Math.floor(Math.random() * andere.length)].id;
        }
        // Rok (Avonturier): voorkeur voor verre planeten
        if (sjab.id === 'rok') {
            const gesorteerd = [...andere].sort((a, b) =>
                this.berekenAfstand(npc.locatie, b.id) - this.berekenAfstand(npc.locatie, a.id));
            const top = gesorteerd.slice(0, Math.min(3, gesorteerd.length));
            return top[Math.floor(Math.random() * top.length)].id;
        }
        // Voss (Veteraan): volg lading naar beste markt; zonder lading naar planeet met veel specialiteit
        if (sjab.id === 'voss') {
            if (npc.lading.length > 0) {
                return this._npcBesteSellPlaneet(npc, andere) ?? andere[Math.floor(Math.random() * andere.length)].id;
            }
            const rijkst = andere.reduce((best, p) =>
                (p.specialiteit?.length ?? 0) >= (best.specialiteit?.length ?? 0) ? p : best);
            return rijkst.id;
        }
        // Zax (Opportunist): 60% beste markt, 40% random
        if (sjab.id === 'zax') {
            if (npc.lading.length > 0 && Math.random() < 0.6) {
                return this._npcBesteSellPlaneet(npc, andere) ?? andere[Math.floor(Math.random() * andere.length)].id;
            }
            return andere[Math.floor(Math.random() * andere.length)].id;
        }
        // Nyx (Mysterie): volledig random
        return andere[Math.floor(Math.random() * andere.length)].id;
    }

    _npcBesteSellPlaneet(npc, planeten) {
        if (!npc.lading.length) return null;
        let bestPlaneet = null, bestScore = -Infinity;
        for (const planeet of planeten) {
            let score = 0;
            for (const item of npc.lading) {
                const verkoopPrijs = this.planetPrijzen[planeet.id]?.[item.goedId] ?? 0;
                score += (verkoopPrijs - item.koopPrijs) * item.hoeveelheid;
            }
            if (score > bestScore) { bestScore = score; bestPlaneet = planeet.id; }
        }
        return bestPlaneet;
    }

    _npcVerkoopLading(npc, planeetId) {
        let opbrengst = 0;
        npc.lading.forEach(item => {
            const prijs = this.planetPrijzen[planeetId]?.[item.goedId] ?? item.koopPrijs;
            opbrengst += prijs * item.hoeveelheid;
        });
        npc.krediet += opbrengst;
        npc.lading = [];
        npc.ladingGewicht = 0;
    }

    _npcKoopGoederen(npc, sjab, planeetId) {
        const capaciteit = this._npcLadingCapaciteit(npc);
        let resterend = capaciteit - npc.ladingGewicht;
        if (resterend <= 0) return [];

        let kandidaten = GOEDEREN.filter(g => {
            const prijs = this.planetPrijzen[planeetId]?.[g.id];
            const voorraad = this.planetVoorraden[planeetId]?.[g.id] ?? 0;
            return prijs && voorraad > 0;
        });

        // Persoonlijkheidsgebonden selectie
        if (sjab.id === 'mira') {
            // Strateeg: sorteer op goedkoopste relatief aan basisprijs
            kandidaten.sort((a, b) =>
                (this.planetPrijzen[planeetId][a.id] / a.basisPrijs) -
                (this.planetPrijzen[planeetId][b.id] / b.basisPrijs));
        } else if (sjab.id === 'voss') {
            // Veteraan: koopt alleen als flink onder basisprijs
            kandidaten = kandidaten.filter(g =>
                (this.planetPrijzen[planeetId]?.[g.id] ?? Infinity) < g.basisPrijs * 0.80);
        } else if (sjab.id === 'rok') {
            // Avonturier: random volgorde, pakt soms dure goederen
            kandidaten.sort(() => Math.random() - 0.5);
        } else {
            kandidaten.sort(() => Math.random() - 0.5);
        }

        const maxGoederen = sjab.id === 'mira' ? 2 : sjab.id === 'voss' ? 1 : 1 + Math.floor(Math.random() * 2);
        const aankopen = [];

        for (const goed of kandidaten.slice(0, maxGoederen)) {
            if (resterend <= 0) break;
            const prijs = this.planetPrijzen[planeetId]?.[goed.id];
            const voorraad = this.planetVoorraden[planeetId]?.[goed.id] ?? 0;
            if (!prijs || voorraad <= 0) continue;

            const maxAffordable = Math.floor(npc.krediet / prijs);
            const hoeveelheid = Math.min(voorraad, maxAffordable, resterend, 20);
            if (hoeveelheid <= 0) continue;

            npc.krediet -= hoeveelheid * prijs;
            npc.lading.push({ goedId: goed.id, hoeveelheid, koopPrijs: prijs });
            npc.ladingGewicht += hoeveelheid;
            resterend -= hoeveelheid;

            // Verminder marktvoorraad
            if (this.planetVoorraden[planeetId]) {
                this.planetVoorraden[planeetId][goed.id] = Math.max(0, voorraad - hoeveelheid);
            }

            aankopen.push({ goed, hoeveelheid, prijs });
        }

        return aankopen;
    }

    aankomst() {
        if (!this.reisData) return { passagiersInfo: null };
        this._visitMarktSaldo = {};
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

        // Noodoproep bonus
        if (this._noodoproepBonus) {
            this._noodoproepBonus = false;
            if (Math.random() < 0.50) {
                const bonus = 600;
                this.speler.krediet += bonus;
                this.voegBerichtToe(`🚨 De havenautoriteiten belonen je voor de noodevacuatie! +${this.formatteerKrediet(bonus)}`, 'succes');
            }
        }

        if (this.brandstof < 10) this._aangekomendMetLageBrandstof = true;
        this.voegBerichtToe(`Aangekomen op ${planeet.naam}! Brandstof: ${this.brandstof}/${this.schip.brandstofTank}`, 'succes');

        // Controleer marketingcampagne — vervalt altijd bij aankomst; bonus alleen op juiste planeet
        let bonusAantal = 0, bonusPrijs = 0;
        this._pendingMarketingSummary = null;
        if (this.marketingActief) {
            if (this.marketingActief.planeet === this.locatie) {
                bonusAantal = Math.floor(Math.random() * 8) + 8; // 8–15 extra passagiers
                bonusPrijs = 50;
                // Marketing boost: verhoog voorraad van alle goederen op deze planeet (random per goed)
                let totalResourceBonus = 0;
                if (this.planetVoorraden?.[this.locatie]) {
                    GOEDEREN.forEach(g => {
                        const bonus = Math.floor(Math.random() * 12) + 8; // 8–19 ton per goed
                        totalResourceBonus += bonus;
                        this.planetVoorraden[this.locatie][g.id] =
                            Math.min(200, (this.planetVoorraden[this.locatie][g.id] ?? 0) + bonus);
                    });
                }
                this._pendingMarketingSummary = { extraPassagiers: bonusAantal, extraResources: totalResourceBonus };
                this.voegBerichtToe(`📢 Reclamecampagne actief! Meer passagiers en hogere ticketprijs.`, 'info');
            } else {
                this.voegBerichtToe(`📢 Reclamecampagne verlopen — niet aangekomen op bestemmingsplaneet, geen bonus.`, 'waarschuwing');
            }
            this.marketingActief = null;
        }
        this.genereerPassagiersVoorPlaneet(this.locatie, bonusAantal, bonusPrijs);

        // Concurrent aankomst events (gesorteerd: snelste concurrent eerst)
        this.aankomstConcurrentEvents = (this._pendingConcurrentArrivalEvents || [])
            .sort((a, b) => b.npcSnelheid - a.npcSnelheid);
        this._pendingConcurrentArrivalEvents = [];

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
        if (this.locatie === 'pyroflux') this._pyrofluxGetankt = false;
        if (this.locatie === 'luxoria') { this.luxoriaCasino.gokbeurtenDitBezoek = 0; this.luxoriaCasino.laatste = null; }

        // Douane check — verdachte Mortex-lading bij eerste landing na Mortex
        const verdachteEntries = Object.entries(this.ladingVerdacht || {}).filter(([, v]) => v > 0);
        if (verdachteEntries.length > 0 && this.locatie !== 'mortex') {
            if (this.schip?.immuunMortexConfiscatie) {
                this.ladingVerdacht = {};
                this.voegBerichtToe('🔒 Secure Hauler: douane kan je gepantserde vrachtruim niet doorzoeken.', 'info');
            } else {
                const douaneKans = this.schip?.douaneKansOverride ?? (this.mortexUpgrades?.afgeschermd ? 0.05 : 0.25);
                if (Math.random() < douaneKans) {
                    let boete = 0;
                    verdachteEntries.forEach(([goedId, ton]) => {
                        const aankoopPrijs = this.aankoopPrijzen[goedId] || 50;
                        boete += Math.round(aankoopPrijs * ton * 0.25);
                    });
                    boete = Math.min(boete, this.speler.krediet);
                    this.speler.krediet -= boete;
                    this.voegBerichtToe(`🚨 Douanecontrole! Verdachte lading ontdekt. Boete: ${this.formatteerKrediet(boete)}.`, 'gevaar');
                    this.huidigAankomstEvent = {
                        icoon: '🚨',
                        naam: 'Douanecontrole',
                        beschrijving: `Inspecteurs doorzoeken je schip op ${planeet.naam}. Verdachte lading ontdekt — boete: ${this.formatteerKrediet(boete)}.`,
                        type: 'gevaar',
                    };
                } else {
                    this.statistieken.mortexGladGestreken = (this.statistieken.mortexGladGestreken || 0) + 1;
                }
                this.ladingVerdacht = {};
            }
        }

        // Missies: voltooiing check dan nieuwe missies genereren
        this._controleerMissieVoltooiing();
        this.genereerMissies();

        this.controleerAchievements();
        this.controleerSpelEinde();
        return { passagiersInfo };
    }

    _bepaalAankomstEvent() {
        if (typeof PLANEET_EVENTS === 'undefined') return null;
        for (const event of PLANEET_EVENTS) {
            if (event.conditie && !event.conditie(this)) continue;
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
        } else if (eff.type === 'opwaarderingAlles') {
            GOEDEREN.forEach(goed => {
                this.planetPrijzen[pid][goed.id] = Math.round(this.planetPrijzen[pid][goed.id] * eff.factor);
            });
        } else if (eff.type === 'kredietVerlies') {
            const verlies = Math.min(eff.bedrag, this.speler.krediet);
            this.speler.krediet -= verlies;
        } else if (eff.type === 'ladingVordering') {
            const aanwezig = this.lading[eff.goed] || 0;
            const gevorderd = Math.min(eff.ton, aanwezig);
            if (gevorderd > 0) {
                this.lading[eff.goed] -= gevorderd;
                if (this.lading[eff.goed] === 0) { delete this.aankoopPrijzen[eff.goed]; delete this.aankoopAantallen[eff.goed]; }
                const vergoeding = gevorderd * (eff.prijs ?? 100);
                this.speler.krediet += vergoeding;
                event.beschrijving += ` ${gevorderd} ton gevorderd, vergoed: ${this.formatteerKrediet(vergoeding)}.`;
            }
        } else if (eff.type === 'haventol') {
            if (this.schip?.immuunPiraten) {
                event.beschrijving = 'Piraten detecteren je schip maar laten je door dankzij je speciale transponder. 🛡️';
            } else {
                const tol = Math.min(eff.bedrag, this.speler.krediet);
                this.speler.krediet -= tol;
            }
        }
        this.voegBerichtToe(`${event.icoon} ${event.naam}: ${event.beschrijving}`, 'waarschuwing');
    }

    genereerPassagiersVoorPlaneet(planeetId, bonusAantal = 0, bonusPrijs = 0) {
        const niveauCfg = {
            laag:   { aantalMult: 1.6, prijsMult: 0.65 },
            midden: { aantalMult: 1.0, prijsMult: 1.0  },
            hoog:   { aantalMult: 0.6, prijsMult: 1.5  },
        };
        const { aantalMult, prijsMult } = niveauCfg[this.ticketNiveau || 'midden'];

        // Passagiersschepen trekken van nature meer reizigers aan
        const cap = this.schip?.passagiersCapaciteit || 0;
        const paxBonus = this.schip?.type === 'pax' ? Math.round(cap * 0.6) : 0;

        const basisAantal = Math.floor(Math.random() * 6) + 3;  // 3–8
        const aantal = Math.round(basisAantal * aantalMult) + paxBonus + bonusAantal;
        const basisPrijs = Math.round(150 + Math.random() * 100);
        const prijs = Math.round((basisPrijs + bonusPrijs) * prijsMult);
        this.wachtendePassagiers[planeetId] = { aantal, prijs };
    }

    setTicketNiveau(niveau) {
        if (!['laag', 'midden', 'hoog'].includes(niveau)) return;
        this.ticketNiveau = niveau;
        if (this.locatie) this.genereerPassagiersVoorPlaneet(this.locatie);
    }

    setTicketPrijs(prijs) {
        prijs = Math.max(50, Math.min(2000, Math.round(prijs)));
        if (this.locatie && this.wachtendePassagiers[this.locatie]) {
            this.wachtendePassagiers[this.locatie].prijs = prijs;
        }
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
            this.passagiersTicketprijs = Math.round(wachtend.prijs * (this.schip?.ticketMultiplier ?? 1));
            this.wachtendePassagiers[this.locatie].aantal -= instappers;
            const getoondePrijs = wachtend.prijs;
            this.voegBerichtToe(`${instappers} passagier(s) aan boord. Ticketprijs: ${this.formatteerKrediet(this.passagiersTicketprijs)}/pp`, 'info');
        }
    }

    // =========================================================================
    // MARKETING
    // =========================================================================

    berekenMarketingKosten() {
        const cargo = this.schip?.laadruimte ?? 0;
        const pax = this.schip?.passagiersCapaciteit ?? 0;
        return Math.round(150 + cargo * 1.5 + pax * 5);
    }

    koopMarketing() {
        if ((this.schip?.passagiersCapaciteit || 0) <= 0) return { succes: false, reden: 'Je schip heeft geen passagiersruimte.' };
        if (this.marketingActief) return { succes: false, reden: 'Er is al een campagne actief.' };
        const kosten = this.berekenMarketingKosten();
        if (this.speler.krediet < kosten) return { succes: false, reden: 'Onvoldoende krediet!' };
        this.speler.krediet -= kosten;
        this.marketingActief = { planeet: null, kosten };
        this.voegBerichtToe(`📢 Reclamecampagne gestart (${this.formatteerKrediet(kosten)}). Bij aankomst wachten meer passagiers op je.`, 'info');
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

    _effectieveBrandstofPrijs() {
        const basis = this.brandstofPrijzen[this.locatie] || 12;
        return this.locatie === 'pyroflux' ? Math.round(basis * 0.60) : basis;
    }

    koopBrandstof(aantal) {
        const prijs = this._effectieveBrandstofPrijs();
        const tankCapaciteit = this.schip.brandstofTank;
        const ruimte = tankCapaciteit - this.brandstof;
        const effectief = Math.min(aantal, ruimte);
        if (effectief <= 0) return { succes: false, reden: 'Tank is al vol!' };
        const totaal = prijs * effectief;
        if (totaal > this.speler.krediet) return { succes: false, reden: 'Onvoldoende krediet!' };
        this.speler.krediet -= totaal;
        this.brandstof += effectief;
        if (this.locatie === 'pyroflux' && !this._pyrofluxGetankt) {
            this._pyrofluxGetankt = true;
            this.statistieken.pyrofluxTankbeurten = (this.statistieken.pyrofluxTankbeurten ?? 0) + 1;
        }
        this.voegBerichtToe(`${effectief} liter brandstof getankt voor ${this.formatteerKrediet(totaal)}.`, 'info');
        return { succes: true, getankt: effectief };
    }

    // =========================================================================
    // PLANEET-SPECIFIEKE DIENSTEN
    // =========================================================================

    koopAfgeschermdVrachtruim() {
        if (this.locatie !== 'mortex') return { succes: false, reden: 'Alleen beschikbaar op Mortex.' };
        if (this.mortexUpgrades?.afgeschermd) return { succes: false, reden: 'Al geïnstalleerd.' };
        if (this.schip?.douaneKansOverride !== null && this.schip?.douaneKansOverride !== undefined) return { succes: false, reden: 'Je Shadow-schip heeft al ingebouwde douanebescherming.' };
        if (this.schip?.immuunMortexConfiscatie) return { succes: false, reden: 'Je Secure Hauler heeft al ingebouwde lading­bescherming.' };
        const kosten = 8000;
        if (this.speler.krediet < kosten) return { succes: false, reden: 'Onvoldoende credits.' };
        this.speler.krediet -= kosten;
        this.mortexUpgrades.afgeschermd = true;
        this.voegBerichtToe(`🛡 Afgeschermde vrachtopslag geïnstalleerd. Douanekans verlaagd naar 5%.`, 'succes');
        return { succes: true };
    }

    speelCasino(inzet) {
        const INZETTEN = [100, 1000, 2500, 5000];
        if (!INZETTEN.includes(inzet)) return { succes: false, reden: 'Ongeldige inzet.' };
        if (this.locatie !== 'luxoria') return { succes: false, reden: 'Alleen beschikbaar op Luxoria.' };
        const casino = this.luxoriaCasino;
        if (casino.gokbeurtenDitBezoek >= 3) return { succes: false, reden: 'Geen gokbeurten meer dit bezoek.' };
        if (this.speler.krediet < inzet) return { succes: false, reden: 'Onvoldoende credits.' };

        const spelerKaart = Math.ceil(Math.random() * 10);
        const casinoKaart = Math.ceil(Math.random() * 10);
        const gewonnen = spelerKaart > casinoKaart;

        this.speler.krediet -= inzet;
        if (gewonnen) this.speler.krediet += Math.floor(inzet * 1.9);

        casino.gokbeurtenDitBezoek += 1;

        if (gewonnen) {
            this.statistieken.casinoWinstStreak = (this.statistieken.casinoWinstStreak || 0) + 1;
            const netto = Math.floor(inzet * 0.9);
            if (netto >= 3000) this.statistieken.casinoBigWin = (this.statistieken.casinoBigWin || 0) + 1;
        } else {
            this.statistieken.casinoWinstStreak = 0;
        }

        casino.laatste = { spelerKaart, casinoKaart, gewonnen, inzet };
        const msg = gewonnen
            ? `🎰 Casino gewonnen! +${this.formatteerKrediet(Math.floor(inzet * 0.9))}`
            : `🎰 Casino verloren. −${this.formatteerKrediet(inzet)}`;
        this.voegBerichtToe(msg, gewonnen ? 'goud' : 'gevaar');
        this.controleerAchievements();
        return { succes: true };
    }

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

        // Hoeveelheid rond de vrachtcapaciteit van de speler (60-110%)
        const laadruimte = this.schip?.laadruimte ?? 50;
        const hoeveelheid = Math.max(10, Math.round(laadruimte * (0.6 + Math.random() * 0.5)));

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
            goedGewicht: 1,
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
                if (this.schip?.immuunPiraten) {
                    resultaat.bericht = 'Piraten detecteren je schip maar laten je met rust. 🛡️';
                    break;
                }
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
                            const goedObj = GOEDEREN.find(g=>g.id===goedId);
                            const goedNaam = `${goedObj.icoon} ${goedObj.naam}`;
                            if (this.verzekering?.actief) {
                                resultaat.bericht = `Gepakt! Piraten grijpen naar ${verloren}× ${goedNaam} — je verzekering dekt het verlies! 🛡️`;
                            } else {
                                this.lading[goedId] = Math.max(0, this.lading[goedId] - verloren);
                                resultaat.ladingDelta[goedId] = -verloren;
                                resultaat.bericht = `Gepakt! Je verliest ${verloren}× ${goedNaam}.`;
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
                    resultaat.bericht = `De storm dwingt een grote omweg af (⛽ −${extraBrandstof} l) — je verzekering vergoedt het! 🛡️`;
                } else {
                    const werkelijk = Math.min(extraBrandstof, this.brandstof);
                    this.brandstof = Math.max(0, this.brandstof - extraBrandstof);
                    resultaat.bericht = `De storm dwingt je een grote omweg te nemen. ⛽ Extra brandstofverbruik: −${werkelijk} l. Resterend: ${this.brandstof} l.`;
                }
                break;
            }

            case 'ruimtewrak': {
                // Vind willekeurig goed, als er ruimte is
                const ruimteVrij = this.schip.laadruimte - this.getLadingGewicht();
                if (ruimteVrij > 0) {
                    const goedOpties = GOEDEREN;
                    if (goedOpties.length > 0) {
                        const gevonden = goedOpties[Math.floor(Math.random() * goedOpties.length)];
                        const aantal = Math.min(ruimteVrij, 5 + Math.floor(Math.random() * 8));
                        this.lading[gevonden.id] = (this.lading[gevonden.id] || 0) + aantal;
                        resultaat.ladingDelta[gevonden.id] = aantal;
                        resultaat.bericht = `Je vindt ${aantal}× ${gevonden.icoon} ${gevonden.naam} in het wrak. Gratis lading!`;
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
                        const dure = GOEDEREN.filter(g => g.basisPrijs > 100);
                        if (dure.length > 0 && this.speler.krediet > 100) {
                            const goed = dure[Math.floor(Math.random() * dure.length)];
                            const kortingsPrijs = Math.round(goed.basisPrijs * 0.35);
                            const maxAantal = Math.min(
                                ruimteVrij,
                                Math.floor(this.speler.krediet / kortingsPrijs),
                                10
                            );
                            if (maxAantal > 0) {
                                const totaal = kortingsPrijs * maxAantal;
                                this.speler.krediet -= totaal;
                                this.lading[goed.id] = (this.lading[goed.id] || 0) + maxAantal;
                                resultaat.kredietDelta = -totaal;
                                resultaat.ladingDelta[goed.id] = maxAantal;
                                resultaat.bericht = `Deal! Je koopt ${maxAantal}× ${goed.icoon} ${goed.naam} voor slechts ${this.formatteerKrediet(kortingsPrijs)}/stuk.`;
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
                    resultaat.bericht = `De ionennevel dwingt je van koers. ⛽ Extra brandstofverbruik: −${extraNevel} l. Resterend: ${this.brandstof} l.`;
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
                        resultaat.bericht = `Je geeft ⛽ ${geef} l brandstof. De piloot is dankbaar en geeft je ${this.formatteerKrediet(beloning)} als dank.`;
                    } else {
                        resultaat.bericht = `Je hebt zelf niet genoeg brandstof om ⛽ ${geef} l weg te geven.`;
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
                        resultaat.bericht = `Koelsysteemstoring! ${verloren}× ${goed.icoon} ${goed.naam} dreigt te bederven — je verzekering dekt het verlies! 🛡️`;
                    } else {
                        this.lading[goedId] -= verloren;
                        this.aankoopAantallen[goedId] = Math.max(0, (this.aankoopAantallen[goedId] || 0) - verloren);
                        if (this.lading[goedId] === 0) { delete this.aankoopPrijzen[goedId]; delete this.aankoopAantallen[goedId]; }
                        resultaat.ladingDelta[goedId] = -verloren;
                        resultaat.bericht = `Koelsysteemstoring! ${verloren}× ${goed.icoon} ${goed.naam} zijn bedorven en verloren gegaan.`;
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

            case 'crew_opstand': {
                const totaal = (this.crew?.grootte ?? 0) * (this.crew?.salaris ?? 100) * CREW_BETAAL_INTERVAL;
                const dubbel = totaal * 2;
                if (keuzeId === 'betaal') {
                    const betaling = Math.min(dubbel, this.speler.krediet);
                    this.speler.krediet -= betaling;
                    resultaat.kredietDelta = -betaling;
                    if (this.crew) {
                        this.crew.volgendeBetaalBeurt = this.beurt + CREW_BETAAL_INTERVAL;
                        this.crew.happiness = Math.min(100, this.crew.happiness + 30);
                    }
                    resultaat.bericht = `Crew tevreden gesteld. Betaald: ${this.formatteerKrediet(betaling)}. Happiness +30.`;
                } else { // praten
                    if (Math.random() < 0.50) {
                        if (this.crew) {
                            this.crew.happiness = Math.min(100, this.crew.happiness + 10);
                            this.crew.volgendeBetaalBeurt = Math.max(this.crew.volgendeBetaalBeurt, this.beurt + 10);
                        }
                        resultaat.bericht = 'Onderhandeling geslaagd! Crew accepteert uitstel. Happiness +10.';
                    } else {
                        const gestolen = Math.min(totaal, this.speler.krediet);
                        this.speler.krediet -= gestolen;
                        resultaat.kredietDelta = -gestolen;
                        if (this.crew) {
                            this.crew.volgendeBetaalBeurt = this.beurt + CREW_BETAAL_INTERVAL;
                        }
                        resultaat.bericht = `Onderhandeling mislukt! Crew haalt ${this.formatteerKrediet(gestolen)} op uit de kluis als achterstallig loon.`;
                    }
                }
                break;
            }

            case 'bank_rente_omhoog': {
                this.bankRente = Math.min(5, parseFloat(((this.bankRente ?? 2) + 0.5).toFixed(1)));
                resultaat.bericht = `🏦 De Galactische Monetaire Unie verhoogt de basisrente. Jouw spaarrente is nu ${this.bankRente}% per beurt.`;
                break;
            }

            case 'bank_hoogconjunctuur': {
                this.bankRente = Math.min(5, parseFloat(((this.bankRente ?? 2) + 1).toFixed(1)));
                resultaat.bericht = `📈 Economische bloei! Bankrentes stijgen. Jouw spaarrente is nu ${this.bankRente}% per beurt.`;
                break;
            }

            case 'bank_kredietexpansie': {
                this.bankRente = Math.min(5, parseFloat(((this.bankRente ?? 2) + 0.5).toFixed(1)));
                resultaat.bericht = `💹 Galactische Handelsbank opent nieuwe kredietlijn. Jouw spaarrente stijgt naar ${this.bankRente}% per beurt.`;
                break;
            }

            case 'bank_recessie': {
                this.bankRente = Math.max(0, parseFloat(((this.bankRente ?? 2) - 0.5).toFixed(1)));
                resultaat.bericht = `📉 Economische onzekerheid drukt de rentes. Jouw spaarrente daalt naar ${this.bankRente}% per beurt.`;
                break;
            }

            case 'bank_nulrente': {
                this.bankRente = 0;
                resultaat.bericht = `🏛️ De Centrale Bank voert nulrentebeleid in. Jouw spaarrente is tijdelijk 0%.`;
                break;
            }

            case 'bank_crisis': {
                this.bankRente = Math.max(0, parseFloat(((this.bankRente ?? 2) - 1).toFixed(1)));
                resultaat.bericht = `⚠️ Bankcrisis op Nexoria! Spaarrentes worden verlaagd. Jouw rente is nu ${this.bankRente}% per beurt.`;
                break;
            }

            case 'bank_belasting': {
                const saldo = this.bankSaldo ?? 0;
                if (saldo > 0) {
                    const belasting = Math.round(saldo * 0.03);
                    this.bankSaldo -= belasting;
                    resultaat.kredietDelta = -belasting;
                    resultaat.bericht = `💸 De Belastingdienst Galacticus vordert ${this.formatteerKrediet(belasting)} (3%) van je banksaldo als vermogensbelasting. Resterend saldo: ${this.formatteerKrediet(this.bankSaldo)}`;
                } else {
                    resultaat.bericht = `💸 De Belastingdienst Galacticus vordert vermogensbelasting — maar je hebt geen banksaldo. Je komt er goed van af!`;
                }
                break;
            }

            case 'bank_bonus': {
                const bonus = 500;
                this.speler.krediet += bonus;
                resultaat.kredietDelta = bonus;
                resultaat.bericht = `🎁 Spaarbonus-actie! Als trouwe rekeninghouder ontvang je ${this.formatteerKrediet(bonus)} extra credits.`;
                break;
            }

            case 'bank_bevriezing': {
                this.bankBevroren = (this.bankBevroren ?? 0) + 1;
                resultaat.bericht = `🔒 Politieke onrust heeft banktransacties tijdelijk geblokkeerd. Storten en opnemen is de komende beurt niet mogelijk.`;
                break;
            }

            case 'erfenis': {
                const bedrag = Math.round(700 + Math.random() * 400 + this.speler.krediet * 0.02);
                this.speler.krediet += bedrag;
                resultaat.kredietDelta = bedrag;
                resultaat.bericht = `Een verre neef die je nooit hebt gekend, heeft je ${this.formatteerKrediet(bedrag)} nagelaten. Winst!`;
                break;
            }

            case 'loterij': {
                const prijs = Math.round(1000 + Math.random() * 800 + this.speler.krediet * 0.03);
                this.speler.krediet += prijs;
                resultaat.kredietDelta = prijs;
                resultaat.bericht = `Je loterijticket is een winnaar! ${this.formatteerKrediet(prijs)} wordt overgemaakt. Geluksvogel!`;
                break;
            }

            case 'keizerlijke_donatie': {
                if (keuzeId === 'doneer') {
                    const bedrag = Math.min(700, this.speler.krediet);
                    this.speler.krediet -= bedrag;
                    resultaat.kredietDelta = -bedrag;
                    resultaat.bericht = `Je doneer ${this.formatteerKrediet(bedrag)} aan het Galactisch Welvaartsfonds. De Kanselier is tevreden.`;
                } else {
                    resultaat.bericht = 'Je weigert vriendelijk. Twee beurten later arresteert een douanebot je schip.';
                    if (Math.random() < 0.40) {
                        const boete = Math.round(200 + Math.random() * 400);
                        const werkelijk = Math.min(boete, this.speler.krediet);
                        this.speler.krediet -= werkelijk;
                        resultaat.kredietDelta = -werkelijk;
                        resultaat.bericht += ` Boete: ${this.formatteerKrediet(werkelijk)}.`;
                    } else {
                        resultaat.bericht = 'Je weigert vriendelijk. Gelukkig vergeet de Kanselier je snel weer.';
                    }
                }
                break;
            }

            case 'speculant_bod': {
                if (keuzeId === 'verkoop') {
                    const gevuld = Object.keys(this.lading).filter(k => this.lading[k] > 0);
                    if (gevuld.length > 0) {
                        let totaal = 0;
                        gevuld.forEach(goedId => {
                            const prijs = this.getPrijs(this.locatie ?? this.reisData?.van ?? PLANETEN[0].id, goedId);
                            totaal += Math.round(prijs * this.lading[goedId] * 1.15);
                            delete this.aankoopPrijzen[goedId];
                            delete this.aankoopAantallen[goedId];
                            this.lading[goedId] = 0;
                        });
                        this.speler.krediet += totaal;
                        resultaat.kredietDelta = totaal;
                        resultaat.bericht = `Deal! Speculant koopt al je lading voor ${this.formatteerKrediet(totaal)} (115% marktwaarde). Ruim nu leeg.`;
                    } else {
                        resultaat.bericht = 'Je ruim is leeg — de speculant rijdt teleurgesteld weg.';
                    }
                } else {
                    resultaat.bericht = 'Je bedankt voor het aanbod en vliegt door.';
                }
                break;
            }

            case 'belastingboete': {
                const boete = Math.max(200, Math.floor(this.speler.krediet * 0.03));
                const werkelijk = Math.min(boete, this.speler.krediet);
                this.speler.krediet -= werkelijk;
                resultaat.kredietDelta = -werkelijk;
                resultaat.bericht = `De Galactische Belastingdienst vordert een naheffing van ${this.formatteerKrediet(werkelijk)}. Bezwaar is nutteloos.`;
                break;
            }

            case 'geheime_lading': {
                if (keuzeId === 'open') {
                    const ruimte = this.schip.laadruimte - this.getLadingGewicht();
                    if (ruimte > 0) {
                        const goedkope = GOEDEREN.filter(g => g.basisPrijs <= 60);
                        const goed = goedkope[Math.floor(Math.random() * goedkope.length)];
                        const aantal = Math.min(ruimte, 5 + Math.floor(Math.random() * 8));
                        this.lading[goed.id] = (this.lading[goed.id] || 0) + aantal;
                        this.ladingVerdacht[goed.id] = (this.ladingVerdacht[goed.id] || 0) + aantal;
                        resultaat.ladingDelta[goed.id] = aantal;
                        resultaat.bericht = `Je opent het krat: ${aantal}× ${goed.icoon} ${goed.naam}. Mogelijke herkomst onbekend — gemarkeerd als verdachte lading.`;
                    } else {
                        resultaat.bericht = 'Je opent het krat maar je ruim zit vol. Je dumpt het alsnog.';
                    }
                } else {
                    resultaat.bericht = 'Je dumpt het mysterieuze pakket de ruimte in. Beter veilig.';
                }
                break;
            }

            case 'slechte_kwaliteit': {
                const organisch = ['nebulakorrels', 'aquapure'];
                const aanwezig = organisch.filter(id => (this.lading[id] || 0) > 0);
                if (aanwezig.length > 0) {
                    let berichten = [];
                    aanwezig.forEach(goedId => {
                        const goed = GOEDEREN.find(g => g.id === goedId);
                        const verloren = Math.ceil(this.lading[goedId] * 0.30);
                        if (this.verzekering?.actief) {
                            berichten.push(`${verloren}× ${goed.icoon} ${goed.naam} bedorven — je verzekering dekt het verlies! 🛡️`);
                        } else {
                            this.lading[goedId] -= verloren;
                            this.aankoopAantallen[goedId] = Math.max(0, (this.aankoopAantallen[goedId] || 0) - verloren);
                            if (this.lading[goedId] === 0) { delete this.aankoopPrijzen[goedId]; delete this.aankoopAantallen[goedId]; }
                            resultaat.ladingDelta[goedId] = -verloren;
                            berichten.push(`${verloren}× ${goed.icoon} ${goed.naam} bedorven`);
                        }
                    });
                    resultaat.bericht = `Organische lading aangetast bij de bron: ${berichten.join(', ')}.`;
                } else {
                    resultaat.bericht = 'Geen organische lading aan boord — geen bederf door slechte kwaliteit.';
                }
                break;
            }

            case 'cargo_volledig_verloren': {
                const gevuld = Object.keys(this.lading).filter(k => this.lading[k] > 0);
                if (gevuld.length > 0) {
                    let ladingWaarde = 0;
                    gevuld.forEach(goedId => {
                        const prijs = this.aankoopPrijzen[goedId] || GOEDEREN.find(g=>g.id===goedId)?.basisPrijs || 50;
                        ladingWaarde += prijs * this.lading[goedId];
                        this.lading[goedId] = 0;
                        delete this.aankoopPrijzen[goedId];
                        delete this.aankoopAantallen[goedId];
                    });
                    if (this.verzekering?.actief) {
                        this.speler.krediet += ladingWaarde;
                        resultaat.kredietDelta = ladingWaarde;
                        resultaat.bericht = `Kortsluiting in vrachtruim! Alles vernietigd — je verzekering vergoedt ${this.formatteerKrediet(ladingWaarde)}! 🛡️`;
                    } else {
                        resultaat.bericht = `Kortsluiting in vrachtruim! Alles vernietigd. Totaal verlies: ~${this.formatteerKrediet(ladingWaarde)}.`;
                    }
                } else {
                    resultaat.bericht = 'Drukregeling faalt, maar je had geen lading. Geluk!';
                }
                break;
            }

            case 'smokkelaar_ruil': {
                if (keuzeId === 'ruil') {
                    const gevuld = Object.keys(this.lading).filter(k => this.lading[k] > 0);
                    if (gevuld.length > 0) {
                        gevuld.forEach(goedId => {
                            this.lading[goedId] = 0;
                            delete this.aankoopPrijzen[goedId];
                            delete this.aankoopAantallen[goedId];
                        });
                        const ruimte = this.schip.laadruimte - this.getLadingGewicht();
                        const aantal = Math.min(ruimte, 8);
                        if (aantal > 0) {
                            this.lading['luxuriet'] = (this.lading['luxuriet'] || 0) + aantal;
                            this.ladingVerdacht['luxuriet'] = (this.ladingVerdacht['luxuriet'] || 0) + aantal;
                            resultaat.ladingDelta['luxuriet'] = aantal;
                        }
                        this.speler.krediet += 500;
                        resultaat.kredietDelta = 500;
                        resultaat.bericht = `Ruil gesloten: lading ingeleverd, ${aantal}× 👑 Luxuriet ontvangen + 500 credits. Gemarkeerd als verdachte lading.`;
                    } else {
                        resultaat.bericht = 'Je ruim is leeg — de smokkelaar rijdt teleurgesteld weg.';
                    }
                } else {
                    resultaat.bericht = 'Je bedankt en weigert. Een eerlijke ruimtehandelaar.';
                }
                break;
            }

            case 'brandstoflek': {
                if (this.brandstof > 20) {
                    const verlies = Math.floor(this.brandstof / 2);
                    if (this.verzekering?.actief) {
                        resultaat.bericht = `Brandstoflek ontdekt! ⛽ −${verlies} l verloren — je verzekering vergoedt het! 🛡️`;
                    } else {
                        this.brandstof = Math.ceil(this.brandstof / 2);
                        resultaat.bericht = `Brandstoflek! De helft van je brandstof is verdampt in de ruimte. ⛽ Resterend: ${this.brandstof} l.`;
                    }
                } else {
                    resultaat.bericht = 'Brandstoffilter geeft alarm, maar de tank was al bijna leeg. Minimale schade.';
                }
                break;
            }

            case 'kosmische_wolk': {
                const schade = 12;
                if (this.verzekering?.actief) {
                    resultaat.bericht = `Corrosieve gaswolk! −${schade} HP rompschade — je verzekering vergoedt de reparatie! 🛡️`;
                } else {
                    this.schipHP = Math.max(1, this.schipHP - schade);
                    resultaat.schade = true;
                    resultaat.bericht = `Corrosieve gaswolk! Buitenbeplating aangetast. −${schade} HP. Schip: ${this.schipHP} HP.`;
                }
                break;
            }

            case 'ruimtewal': {
                if (keuzeId === 'repareer') {
                    const kosten = 500;
                    const herstel = Math.min(20, (this.schip?.maxHP ?? 40) - this.schipHP);
                    if (this.verzekering?.actief) {
                        this.schipHP = Math.min(this.schip?.maxHP ?? 40, this.schipHP + herstel);
                        resultaat.bericht = `Ruimtepuin raakt de romp! Noodreparatie (${this.formatteerKrediet(kosten)}) gedekt door verzekering. +${herstel} HP 🛡️`;
                    } else {
                        const werkelijk = Math.min(kosten, this.speler.krediet);
                        this.speler.krediet -= werkelijk;
                        resultaat.kredietDelta = -werkelijk;
                        this.schipHP = Math.min(this.schip?.maxHP ?? 40, this.schipHP + herstel);
                        resultaat.bericht = `Ruimtepuin! Noodreparatie voor ${this.formatteerKrediet(werkelijk)}. +${herstel} HP hersteld.`;
                    }
                } else {
                    const schade = 18;
                    this.schipHP = Math.max(1, this.schipHP - schade);
                    resultaat.schade = true;
                    resultaat.bericht = `Ruimtepuin treft de romp! −${schade} HP. Schip: ${this.schipHP} HP. Zorg voor reparaties!`;
                }
                break;
            }

            case 'onderdeel_gevonden': {
                if (keuzeId === 'meenemen') {
                    const herstel = Math.min(15, (this.schip?.maxHP ?? 40) - this.schipHP);
                    this.schipHP = Math.min(this.schip?.maxHP ?? 40, this.schipHP + herstel);
                    resultaat.bericht = `Bruikbaar onderdeel gevonden en geïnstalleerd. +${herstel} HP hersteld. Schip: ${this.schipHP} HP.`;
                } else {
                    resultaat.bericht = 'Je vliegt door. Het onderdeel verdwijnt in de sterrennevels.';
                }
                break;
            }

            case 'vip_passagier': {
                if (keuzeId === 'meenemen') {
                    const cap = this.schip?.passagiersCapaciteit || 0;
                    if (this.passagiers < cap) {
                        this.passagiers += 1;
                        const vipPrijs = Math.round((this.passagiersTicketprijs || 200) * 3);
                        this.passagiersTicketprijs = Math.round(
                            ((this.passagiersTicketprijs || 0) * (this.passagiers - 1) + vipPrijs) / this.passagiers
                        );
                        resultaat.bericht = `VIP aan boord! Betaalt ${this.formatteerKrediet(vipPrijs)} bij aankomst (drievoudig tarief).`;
                    } else {
                        resultaat.bericht = 'Je schip heeft geen vrije passagiersplaatsen voor de VIP.';
                    }
                } else {
                    resultaat.bericht = 'Je rijdt door. De zakenman vindt wel een andere lift.';
                }
                break;
            }

            case 'noodoproep_passagier': {
                if (keuzeId === 'meenemen') {
                    const cap = this.schip?.passagiersCapaciteit || 0;
                    const vrij = cap - this.passagiers;
                    const aantal = Math.min(4, Math.max(1, vrij));
                    if (aantal > 0) {
                        this.passagiers += aantal;
                        if (this.crew) this.crew.happiness = Math.min(100, this.crew.happiness + 15);
                        this._noodoproepBonus = true;
                        resultaat.bericht = `${aantal} evacuees aan boord. Crew is blij (+15 happiness). Mogelijk beloont de haven je bij aankomst.`;
                    } else {
                        resultaat.bericht = 'Je schip heeft geen ruimte voor de evacuees. Ze roepen je vergeefs na.';
                    }
                } else {
                    resultaat.bericht = 'Je vliegt door. De noodoproep vervaagt.';
                }
                break;
            }

            case 'passagier_wangedrag': {
                if (this.passagiers > 0) {
                    const schade = Math.min(300, this.speler.krediet);
                    this.speler.krediet -= schade;
                    resultaat.kredietDelta = -schade;
                    if (this.crew) this.crew.happiness = Math.max(0, this.crew.happiness - 8);
                    resultaat.bericht = `Dronken passagier vernielt de lounge. Reparatiekosten: ${this.formatteerKrediet(schade)}. Crew chagrijnig (−8 happiness).`;
                } else {
                    resultaat.bericht = 'Geen passagiers aan boord — niemand om wangedrag te vertonen.';
                }
                break;
            }

            case 'vakbond_kwijtschelding': {
                if (this.crew && this.crew.grootte > 0) {
                    const achterstallig = this.beurt > (this.crew.volgendeBetaalBeurt ?? 0);
                    if (achterstallig) {
                        this.crew.volgendeBetaalBeurt = this.beurt + CREW_BETAAL_INTERVAL;
                        resultaat.bericht = 'Vakbondsakkoord! Achterstallig crewsalaris kwijtgescholden. Betaalschema gereset.';
                    } else {
                        this.crew.happiness = Math.min(100, this.crew.happiness + 10);
                        resultaat.bericht = 'Vakbond stuurt goodwillbericht. Crew is blij (+10 happiness).';
                    }
                } else {
                    resultaat.bericht = 'Vakbond bereikt je, maar je hebt geen bemanning. Irrelevant.';
                }
                break;
            }

            case 'crew_bonus_event': {
                if (keuzeId === 'geef_bonus') {
                    const grootte = this.crew?.grootte ?? 0;
                    const kosten = grootte * 150;
                    if (this.speler.krediet >= kosten && grootte > 0) {
                        this.speler.krediet -= kosten;
                        resultaat.kredietDelta = -kosten;
                        if (this.crew) this.crew.happiness = Math.min(100, this.crew.happiness + 20);
                        resultaat.bericht = `Crewbonus uitbetaald: ${this.formatteerKrediet(kosten)}. Crew euforisch (+20 happiness).`;
                    } else {
                        resultaat.bericht = grootte === 0 ? 'Geen bemanning om te belonen.' : 'Onvoldoende krediet voor de bonus.';
                    }
                } else {
                    if (this.crew) this.crew.happiness = Math.max(0, this.crew.happiness - 5);
                    resultaat.bericht = 'Geen bonus. Crew verbergt zijn teleurstelling. Nauwelijks. (−5 happiness)';
                }
                break;
            }

            case 'vakbond_eis': {
                if (keuzeId === 'betaal') {
                    const bedrag = Math.min(500, this.speler.krediet);
                    this.speler.krediet -= bedrag;
                    resultaat.kredietDelta = -bedrag;
                    if (this.crew) this.crew.happiness = Math.min(100, this.crew.happiness + 12);
                    resultaat.bericht = `Eenmalige uitkering betaald: ${this.formatteerKrediet(bedrag)}. Crew tevreden (+12 happiness).`;
                } else {
                    if (this.crew) this.crew.happiness = Math.max(0, this.crew.happiness - 18);
                    resultaat.bericht = 'Je weigert. Crew furieus (−18 happiness).';
                }
                break;
            }

            case 'kredietlimiet_verhoging': {
                const oud = this.maxSchuld ?? MAX_SCHULD;
                this.maxSchuld = Math.min(16000, oud + 2000);
                resultaat.bericht = `De Galactische Bank verhoogt je leenlimiet van ${this.formatteerKrediet(oud)} naar ${this.formatteerKrediet(this.maxSchuld)}.`;
                break;
            }

            case 'schuldeiser': {
                if (this.speler.schuld >= 1000) {
                    if (keuzeId === 'betaal') {
                        const af = Math.min(Math.round(this.speler.schuld * 0.25), this.speler.krediet);
                        this.speler.schuld -= af;
                        this.speler.krediet -= af;
                        resultaat.kredietDelta = -af;
                        resultaat.bericht = `Incassobot gedaan: ${this.formatteerKrediet(af)} afgelost. Restschuld: ${this.formatteerKrediet(this.speler.schuld)}.`;
                    } else {
                        const opslag = Math.floor(this.speler.schuld * 0.08);
                        this.speler.schuld += opslag;
                        resultaat.bericht = `Je weigert. De incassobot legt een boeteclausule op (+8%): schuld nu ${this.formatteerKrediet(this.speler.schuld)}.`;
                    }
                } else {
                    resultaat.bericht = 'De incassobot controleert je dossier. Schuld te laag — hij rijdt door.';
                }
                break;
            }

            case 'beurs_insider': {
                const aandelen = typeof AANDELEN !== 'undefined' ? AANDELEN : [];
                if (aandelen.length > 0) {
                    const gekozen = aandelen[Math.floor(Math.random() * aandelen.length)];
                    this._insiderBoost = { aandeelId: gekozen.id, beurten: 10 };
                    resultaat.bericht = `Insider-tip: ${gekozen.icoon} ${gekozen.naam} zou de komende 10 beurten sterk stijgen. De informant verdwijnt in de schaduw.`;
                } else {
                    resultaat.bericht = 'De informant fluistert iets over aandelen, maar het signaal is te zwak.';
                }
                break;
            }

            case 'aandelencrash_event': {
                if (typeof AANDELEN !== 'undefined') {
                    AANDELEN.forEach(a => {
                        this.aandeelKoersen[a.id] = Math.max(
                            Math.round(a.basisPrijs * 0.25),
                            Math.round((this.aandeelKoersen[a.id] ?? a.basisPrijs) * 0.80)
                        );
                    });
                    const portWaarde = this.getPortefeuilleWaarde();
                    resultaat.bericht = `Beurscrash! Alle aandelen −20%. Jouw portefeuille: ${this.formatteerKrediet(portWaarde)}.`;
                    resultaat.kredietDelta = 0;
                } else {
                    resultaat.bericht = 'Beurscrash — maar de koersen zijn onbereikbaar. Geen effect.';
                }
                break;
            }

            case 'concurrent_investering': {
                const voss = this.concurrenten?.find(c => c.id === 'voss');
                if (voss) {
                    const verlies = Math.round(voss.krediet * 0.15);
                    voss.krediet = Math.max(100, voss.krediet - verlies);
                    resultaat.bericht = `Makelaar Voss heeft een reeks slechte deals gemaakt. Zijn vermogen krimpt met ${this.formatteerKrediet(verlies)}. Kans!`;
                } else {
                    resultaat.bericht = 'Geruchten over Makelaar Voss bereiken je. Hij heeft het moeilijk.';
                }
                break;
            }

            case 'concurrent_sabotage': {
                const extra = Math.floor(this.brandstof * 0.20);
                if (this.verzekering?.actief) {
                    resultaat.bericht = `Brandstoffilters gesaboteerd! Extra verbruik (⛽ −${extra} l) gedekt door verzekering! 🛡️`;
                } else {
                    this.brandstof = Math.max(0, this.brandstof - extra);
                    resultaat.bericht = `Brandstoffilters gesaboteerd door een concurrent! ⛽ −${extra} l extra verlies. Resterend: ${this.brandstof} l.`;
                }
                break;
            }

            case 'spionagedienst': {
                if (keuzeId === 'inhuren') {
                    const kosten = Math.min(800, this.speler.krediet);
                    this.speler.krediet -= kosten;
                    resultaat.kredietDelta = -kosten;
                    if (Math.random() < 0.60) {
                        const doelwit = this.concurrenten?.[Math.floor(Math.random() * (this.concurrenten?.length ?? 0))];
                        if (doelwit) {
                            const schade = Math.round(doelwit.krediet * 0.10);
                            doelwit.krediet = Math.max(100, doelwit.krediet - schade);
                            resultaat.bericht = `Operatie geslaagd! ${doelwit.naam} verliest ${this.formatteerKrediet(schade)}. Kosten: ${this.formatteerKrediet(kosten)}.`;
                        } else {
                            resultaat.bericht = `Spion actief maar geen duidelijk doelwit. Kosten: ${this.formatteerKrediet(kosten)}.`;
                        }
                    } else {
                        const boete = Math.min(600, this.speler.krediet);
                        this.speler.krediet -= boete;
                        resultaat.kredietDelta = -(kosten + boete);
                        resultaat.bericht = `Spion gepakt! Extra boete: ${this.formatteerKrediet(boete)}. Totaal verlies: ${this.formatteerKrediet(kosten + boete)}.`;
                    }
                } else {
                    resultaat.bericht = 'Je weigert het dubieuze aanbod. Een ruimtehandelaar houdt zijn handen schoon.';
                }
                break;
            }

            case 'mond_tot_mond': {
                const bonusAantal = 15;
                const naar = this.reisData?.naar;
                if (naar && this.wachtendePassagiers?.[naar]) {
                    this.wachtendePassagiers[naar].aantal += bonusAantal;
                } else if (naar) {
                    this.wachtendePassagiers[naar] = { aantal: bonusAantal, prijs: 200 };
                }
                resultaat.bericht = `Mond-tot-mondreclame werkt! +${bonusAantal} extra passagiers wachten op je bestemming.`;
                break;
            }

            case 'marketing_sabotage': {
                if (this.marketingActief) {
                    this.marketingActief = null;
                    resultaat.bericht = 'Marketingsabotage! Je campagne is onderschept en tenietgedaan. Geen restitutie.';
                } else {
                    resultaat.bericht = 'Een concurrent probeert je marketingcampagne te saboteren — maar je had er geen. Geen effect.';
                }
                break;
            }

            case 'verzekering_aanbieding': {
                if (!this.verzekering?.actief) {
                    this.verzekering = { actief: true };
                    resultaat.bericht = 'Gratis noodverzekering geactiveerd! Je bent gedekt tot de volgende landing. 🛡️';
                } else {
                    resultaat.bericht = 'De verzekeringsagent biedt een gratis polis aan — maar je bent al verzekerd. Beleefd afgewezen.';
                }
                break;
            }

            case 'verzekering_fraude': {
                if (this.verzekering?.actief) {
                    this.verzekering = null;
                    resultaat.bericht = 'Valse verzekeraar! Je verzekering is geannuleerd en je premie verdwenen. Je bent nu ongedekt. 🎭';
                } else {
                    resultaat.bericht = 'Een verdachte verzekeringsagent benadert je — maar je was al niet verzekerd. Geen schade.';
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
        const effectiefPrijs = this.schip?.spearheadBonus ? Math.round(prijs * 0.92) : prijs;
        const totaal = effectiefPrijs * aantal;
        const vrijeRuimte = this.schip.laadruimte - this.getLadingGewicht();

        if (aantal > vrijeRuimte) return { succes: false, reden: 'Onvoldoende laadruimte!' };
        if (totaal > this.speler.krediet) return { succes: false, reden: 'Onvoldoende krediet!' };
        const beschikbaar = this.planetVoorraden?.[this.locatie]?.[goedId] ?? 999;
        if (aantal > beschikbaar) return { succes: false, reden: 'Onvoldoende voorraad op deze planeet.' };

        this.speler.krediet -= totaal;
        this.lading[goedId] = (this.lading[goedId] || 0) + aantal;
        if (this.planetVoorraden?.[this.locatie]) {
            this.planetVoorraden[this.locatie][goedId] = Math.max(0, (this.planetVoorraden[this.locatie][goedId] ?? 0) - aantal);
        }
        this.statistieken.handelstransacties++;
        this.statistieken.cargoTonVervoerd = (this.statistieken.cargoTonVervoerd ?? 0) + aantal;

        // Werk gewogen gemiddelde aankoopprijs bij
        const huidigAant = this.aankoopAantallen[goedId] || 0;
        const huidigAvg = this.aankoopPrijzen[goedId] || effectiefPrijs;
        this.aankoopPrijzen[goedId] = Math.round((huidigAvg * huidigAant + effectiefPrijs * aantal) / (huidigAant + aantal));
        this.aankoopAantallen[goedId] = huidigAant + aantal;

        if (this.locatie === 'mortex') {
            this.ladingVerdacht[goedId] = (this.ladingVerdacht[goedId] || 0) + aantal;
        }

        // Marktimpact: wordt pas bij vertrek geflusht (voorkomt direct terugverkopen met winst)
        this._visitMarktSaldo[goedId] = (this._visitMarktSaldo[goedId] ?? 0) + aantal * 0.002;

        this.voegBerichtToe(`Gekocht: ${aantal}× ${goed.naam} voor ${this.formatteerKrediet(totaal)}${this.schip?.spearheadBonus ? ' (−8% Spearhead)' : ''}.`, 'info');
        this.controleerAchievements();
        return { succes: true, totaal, goed };
    }

    verkoopGoed(goedId, aantal) {
        if (!Number.isInteger(aantal) || aantal < 1) return { succes: false, reden: 'Ongeldig aantal.' };
        const goed = GOEDEREN.find(g => g.id === goedId);
        const prijs = this.getPrijs(this.locatie, goedId);
        const totaal = prijs * aantal;

        if ((this.lading[goedId] || 0) < aantal) return { succes: false, reden: 'Onvoldoende lading!' };

        // Verminder verdachte lading proportioneel
        const huidigTotaal = this.lading[goedId] || 0;
        const verdachtVoor = this.ladingVerdacht[goedId] || 0;
        if (verdachtVoor > 0) {
            const nieuwVerdacht = huidigTotaal <= aantal ? 0 : Math.ceil(verdachtVoor * (huidigTotaal - aantal) / huidigTotaal);
            if (nieuwVerdacht <= 0) delete this.ladingVerdacht[goedId];
            else this.ladingVerdacht[goedId] = nieuwVerdacht;
        }

        // Bereken winst/verlies
        const aankoopPrijs = this.aankoopPrijzen[goedId] || 0;
        const winst = aankoopPrijs > 0 ? (prijs - aankoopPrijs) * aantal : null;
        this._laatsteWinst = winst ?? 0;

        this.lading[goedId] -= aantal;
        this.speler.krediet += totaal;
        this.statistieken.handelstransacties++;
        this.statistieken.verkopen = (this.statistieken.verkopen ?? 0) + 1;

        // Marktimpact: wordt pas bij vertrek geflusht
        this._visitMarktSaldo[goedId] = (this._visitMarktSaldo[goedId] ?? 0) - aantal * 0.0025;

        // Verhoog planeetvoorraad bij verkoop
        if (this.planetVoorraden?.[this.locatie]) {
            const planeet = PLANETEN.find(p => p.id === this.locatie);
            const range = planeet?.specialiteit?.includes(goedId) ? VOORRAAD_SPEC
                        : planeet?.vraag?.includes(goedId)        ? VOORRAAD_VRAAG
                        : VOORRAAD_BASIS;
            const huidig = this.planetVoorraden[this.locatie][goedId] ?? 0;
            this.planetVoorraden[this.locatie][goedId] = Math.min(range.max + 40, huidig + aantal);
        }

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
        return GOEDEREN.reduce((tot, g) => tot + (this.lading[g.id] || 0), 0);
    }

    getLadingWaarde() {
        return GOEDEREN.reduce((tot, g) => tot + (this.lading[g.id] || 0) * this.getPrijs(this.locatie, g.id), 0);
    }

    // =========================================================================
    // SCHIP & UPGRADES
    // =========================================================================

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
        if (this.locatie !== 'techton') return { succes: false, reden: 'Scheepsaankoop is alleen mogelijk op Techton.' };

        // Zelfde type vereist
        if (nieuwSchip.type !== this.schip.type)
            return { succes: false, reden: 'Je kunt niet van scheepstype wisselen.' };

        // Exact één Mark hoger
        if (nieuwSchip.mark !== this.schip.mark + 1)
            return { succes: false, reden: `Je kunt alleen upgraden naar Mark ${this.schip.mark + 1}.` };

        // Bij Mark IV: specialisatie moet overeenkomen met Mark III
        if (nieuwSchip.mark === 4 && this.schip.specialisatie && nieuwSchip.specialisatie !== this.schip.specialisatie)
            return { succes: false, reden: 'Je kunt je specialisatie niet wijzigen.' };

        if (nieuwSchip.prijs > this.speler.krediet)
            return { succes: false, reden: `Onvoldoende krediet. Je hebt ${this.formatteerKrediet(this.speler.krediet)}, dit schip kost ${this.formatteerKrediet(nieuwSchip.prijs)}.` };

        this.schip = { ...nieuwSchip };
        this.schipHP = nieuwSchip.maxHP;
        this.speler.krediet -= nieuwSchip.prijs;
        this.statistieken.schepenGekocht = (this.statistieken.schepenGekocht || 0) + 1;
        const oudeCrewGrootte = this.crew?.grootte ?? 0;
        const nieuweCrewGrootte = CREW_PER_SCHIP[schipId] ?? oudeCrewGrootte;
        if (this.crew) this.crew.grootte = nieuweCrewGrootte;
        this.voegBerichtToe(`${nieuwSchip.naam} aangeschaft voor ${this.formatteerKrediet(nieuwSchip.prijs)}.`, 'goud');
        if (nieuweCrewGrootte > oudeCrewGrootte) {
            this.voegBerichtToe(`👨‍🚀 Je nieuwe schip vereist ${nieuweCrewGrootte} bemanningsleden (was ${oudeCrewGrootte}). Salariskosten stijgen.`, 'info');
        }
        this.controleerAchievements();
        return { succes: true };
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

            // Insider boost: als dit aandeel een actieve insider-tip heeft
            if (this._insiderBoost?.aandeelId === a.id && (this._insiderBoost?.beurten ?? 0) > 0) {
                factor *= 1.06; // Extra opwaartse druk per beurt
                this._insiderBoost.beurten--;
                if (this._insiderBoost.beurten <= 0) this._insiderBoost = null;
            }

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
        if (nieuweSchuld > (this.maxSchuld ?? MAX_SCHULD)) return { succes: false, reden: `Maximum schuld is ${this.formatteerKrediet(this.maxSchuld ?? MAX_SCHULD)}.` };
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

    stortenOpBank(bedrag) {
        if ((this.bankBevroren ?? 0) > 0) return { succes: false, reden: 'Bank is tijdelijk bevroren door politieke onrust.' };
        bedrag = Math.round(bedrag);
        if (bedrag <= 0) return { succes: false, reden: 'Ongeldig bedrag.' };
        if (bedrag > this.speler.krediet) return { succes: false, reden: 'Onvoldoende cash.' };
        this.speler.krediet -= bedrag;
        this.bankSaldo = (this.bankSaldo ?? 0) + bedrag;
        this.voegBerichtToe(`🏦 ${this.formatteerKrediet(bedrag)} gestort op spaarrekening. Saldo: ${this.formatteerKrediet(this.bankSaldo)}`, 'info');
        this.controleerAchievements();
        return { succes: true };
    }

    opnemenVanBank(bedrag) {
        if ((this.bankBevroren ?? 0) > 0) return { succes: false, reden: 'Bank is tijdelijk bevroren door politieke onrust.' };
        bedrag = Math.round(bedrag);
        if (bedrag <= 0) return { succes: false, reden: 'Ongeldig bedrag.' };
        if (bedrag > (this.bankSaldo ?? 0)) bedrag = this.bankSaldo;
        this.bankSaldo -= bedrag;
        this.speler.krediet += bedrag;
        this.voegBerichtToe(`🏦 ${this.formatteerKrediet(bedrag)} opgenomen van spaarrekening.`, 'info');
        return { succes: true };
    }

    controleerRente() {
        // Schuldrente (elke RENTE_INTERVAL beurten)
        if (this.speler.schuld > 0 && this.beurt % RENTE_INTERVAL === 0) {
            const rente = Math.round(this.speler.schuld * RENTE_PERCENTAGE);
            this.speler.schuld += rente;
            this.voegBerichtToe(`Rente bijgeboekt: ${this.formatteerKrediet(rente)}. Totale schuld nu: ${this.formatteerKrediet(this.speler.schuld)}.`, 'waarschuwing');
        }
        // Spaarrente (elke beurt)
        if ((this.bankSaldo ?? 0) > 0 && (this.bankRente ?? 0) > 0) {
            const spaarRente = Math.round(this.bankSaldo * (this.bankRente / 100));
            if (spaarRente > 0) {
                this.bankSaldo += spaarRente;
                this.voegBerichtToe(`🏦 Spaarrente bijgeschreven: +${this.formatteerKrediet(spaarRente)} (${this.bankRente}% per beurt). Saldo: ${this.formatteerKrediet(this.bankSaldo)}`, 'goud');
                this.controleerAchievements();
            }
        }
        // Bankbevriezing ontdooien
        if ((this.bankBevroren ?? 0) > 0) this.bankBevroren--;
    }

    // =========================================================================
    // CREW BEHEER
    // =========================================================================

    controleerCrew() {
        if (!this.crew || this.crew.grootte <= 0) return;

        // Dagelijks verval: happiness daalt elke dag 1 punt (sleet van het reizen)
        this.crew.happiness = Math.max(0, this.crew.happiness - 1);

        // Betaalcheck: volgendeBetaalBeurt staat vast totdat betaald wordt
        const dagenAchter = this.beurt - this.crew.volgendeBetaalBeurt;

        if (dagenAchter === 0) {
            // Eerste dag van gemiste betaling: directe grote straf
            const weekTotaal = this.crew.grootte * this.crew.salaris * CREW_BETAAL_INTERVAL;
            this.crew.happiness = Math.max(0, this.crew.happiness - 15);
            this.voegBerichtToe(`⚠ Crew salaris gemist! −15 happiness. Openstaand: ${this.formatteerKrediet(weekTotaal)}`, 'gevaar');
        } else if (dagenAchter > 0) {
            // Elke dag verder achterstallig: −2 extra bovenop het dagelijkse verval
            this.crew.happiness = Math.max(0, this.crew.happiness - 2);
            if (dagenAchter % 3 === 0) {
                this.voegBerichtToe(`😡 Crew is ${dagenAchter} dag(en) zonder salaris — muiterij-risico stijgt!`, 'gevaar');
            }
        }
    }

    betaalCrewSalaris() {
        if (!this.crew || this.crew.grootte <= 0)
            return { succes: false, reden: 'Geen bemanning om te betalen.' };
        const weekTotaal = this.crew.grootte * this.crew.salaris * CREW_BETAAL_INTERVAL;
        if (this.speler.krediet < weekTotaal)
            return { succes: false, reden: `Onvoldoende credits. Weekbedrag: ${this.formatteerKrediet(weekTotaal)}` };
        this.speler.krediet -= weekTotaal;
        this.crew.volgendeBetaalBeurt = Math.max(this.crew.volgendeBetaalBeurt, this.beurt) + CREW_BETAAL_INTERVAL;
        this.crew.happiness = Math.min(100, this.crew.happiness + 5);
        this.voegBerichtToe(`💼 Crew betaald: ${this.formatteerKrediet(weekTotaal)} voor ${this.crew.grootte} man (${this.crew.salaris} cr/pp/dag × ${CREW_BETAAL_INTERVAL} dagen). Volgende betaling over ${CREW_BETAAL_INTERVAL} beurten.`, 'succes');
        return { succes: true };
    }

    verhoogCrewSalaris(bedrag = 10) {
        if (!this.crew) return { succes: false, reden: 'Geen crew.' };
        this.crew.salaris += bedrag;
        this.crew.happiness = Math.min(100, this.crew.happiness + 10);
        const totaalPeriode = this.crew.grootte * this.crew.salaris * CREW_BETAAL_INTERVAL;
        this.voegBerichtToe(`📈 Salaris verhoogd naar ${this.crew.salaris} cr/pp/dag (+10 happiness). Weekbetaling: ${this.formatteerKrediet(totaalPeriode)}`, 'succes');
        return { succes: true };
    }

    verlaagCrewSalaris(bedrag = 10) {
        if (!this.crew) return { succes: false, reden: 'Geen crew.' };
        const min = 30;
        if (this.crew.salaris <= min)
            return { succes: false, reden: `Minimum salaris is ${min} cr/pp. Verlagen niet mogelijk.` };
        this.crew.salaris = Math.max(min, this.crew.salaris - bedrag);
        this.crew.happiness = Math.max(0, this.crew.happiness - 15);
        const totaalPeriode = this.crew.grootte * this.crew.salaris * CREW_BETAAL_INTERVAL;
        this.voegBerichtToe(`📉 Salaris verlaagd naar ${this.crew.salaris} cr/pp/dag (−15 happiness). Weekbetaling: ${this.formatteerKrediet(totaalPeriode)}`, 'waarschuwing');
        return { succes: true };
    }

    casinoCrewUitje() {
        if (!this.crew || this.crew.grootte <= 0)
            return { succes: false, reden: 'Geen bemanning voor een uitje.' };
        if (this.locatie !== 'luxoria')
            return { succes: false, reden: 'Casino-uitje alleen mogelijk op Luxoria.' };
        const cooldown = 15;
        const sindsLaatst = this.beurt - (this.crew.casinoBeurt ?? -99);
        if (sindsLaatst < cooldown)
            return { succes: false, reden: `Crew heeft nog ${cooldown - sindsLaatst} beurten rust nodig voor het volgende uitje.` };
        this.crew.happiness = Math.min(100, this.crew.happiness + 25);
        this.crew.casinoBeurt = this.beurt;
        this.voegBerichtToe(`🎉 Crew geniet van een avondje in Casino Stellaris op Luxoria! +25 happiness.`, 'succes');
        return { succes: true };
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
                ticketNiveau: this.ticketNiveau || 'midden',
                brandstof: this.brandstof,
                brandstofPrijzen: this.brandstofPrijzen,
                eindeReden: this.eindeReden || null,
                marketingActief: this.marketingActief || null,
                verzekering: this.verzekering || null,
                concurrenten: this.concurrenten,
                nettoWaardeGeschiedenisSpeler: this.nettoWaardeGeschiedenisSpeler,
                ladingVerdacht: this.ladingVerdacht,
                mortexUpgrades: this.mortexUpgrades,
                planetVoorraden: this.planetVoorraden,
                bankSaldo: this.bankSaldo ?? 0,
                bankRente: this.bankRente ?? 2,
                bankBevroren: this.bankBevroren ?? 0,
                crew: this.crew,
                maxSchuld: this.maxSchuld ?? MAX_SCHULD,
                _insiderBoost: this._insiderBoost ?? null,
                _noodoproepBonus: this._noodoproepBonus ?? false,
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
            // Migratie: oude saves met het pre-v5 schipsysteem zijn niet compatibel
            const oudeSchipIds = ['rondsloffer', 'handelaar', 'vleugelschipper'];
            if (oudeSchipIds.includes(this.schip?.id)) return false;
            // Migratie: old saves had passagiers as array
            if (Array.isArray(this.passagiers)) this.passagiers = this.passagiers.length;
            if (!this.passagiersTicketprijs) this.passagiersTicketprijs = 0;
            if (!this.wachtendePassagiers) { this.wachtendePassagiers = {}; this.initPassagiers(); }
            if (!this.ticketNiveau) this.ticketNiveau = 'midden';
            // Migratie: old saves had schipBeschadigd boolean, new system uses schipHP
            delete this.schipBeschadigd;
            if (!this.schipHP || this.schipHP === 0) this.schipHP = this.schip?.maxHP ?? 40;
            if (!this.planeetBezoeken) this.planeetBezoeken = {};
            if (this.statistieken.cargoTonVervoerd === undefined) this.statistieken.cargoTonVervoerd = 0;
            if (this.statistieken.pyrofluxTankbeurten === undefined) this.statistieken.pyrofluxTankbeurten = 0;
            if (this._pyrofluxGetankt === undefined) this._pyrofluxGetankt = false;
            if (!this.luxoriaCasino) this.luxoriaCasino = { gokbeurtenDitBezoek: 0, laatste: null };
            if (this.statistieken.casinoWinstStreak === undefined) this.statistieken.casinoWinstStreak = 0;
            if (this.statistieken.casinoBigWin === undefined) this.statistieken.casinoBigWin = 0;
            if (!this.ladingVerdacht) this.ladingVerdacht = {};
            if (!this.mortexUpgrades) this.mortexUpgrades = { afgeschermd: false };
            if (this.statistieken.mortexGladGestreken === undefined) this.statistieken.mortexGladGestreken = 0;
            if (data.planetVoorraden) {
                this.planetVoorraden = data.planetVoorraden;
            } else {
                this._initPlanetVoorraden(); // oude saves: initialiseer opnieuw
            }
            if (this.bankSaldo === undefined) this.bankSaldo = 0;
            if (this.bankRente === undefined) this.bankRente = 2;
            if (this.bankBevroren === undefined) this.bankBevroren = 0;
            this.maxSchuld = data.maxSchuld ?? MAX_SCHULD;
            this._insiderBoost = data._insiderBoost ?? null;
            this._noodoproepBonus = data._noodoproepBonus ?? false;
            // Migratie: crew ontbrak in oude saves — herstel en bereken happiness retroactief
            if (!this.crew || !this.crew.grootte) {
                const schipId = this.schip?.id;
                this.crew = {
                    grootte: CREW_PER_SCHIP[schipId] ?? 3,
                    salaris: 100,
                    happiness: 75,
                    volgendeBetaalBeurt: this.beurt + CREW_BETAAL_INTERVAL,
                };
            }
            // Retroactief happiness corrigeren als achterstallig maar happiness onrealistisch hoog
            if (this.crew && this.crew.grootte > 0) {
                const dagenAchter = this.beurt - (this.crew.volgendeBetaalBeurt ?? CREW_BETAAL_INTERVAL);
                if (dagenAchter > 0) {
                    const verwacht = Math.max(0, (this.crew.happiness ?? 75) - dagenAchter * 3 - 15);
                    if ((this.crew.happiness ?? 75) > verwacht + 10) {
                        this.crew.happiness = verwacht;
                    }
                }
            }
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
