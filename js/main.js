// =============================================================================
// GAZILLIONAIRE: STER DER HANDEL - App Controller
// =============================================================================

const App = {

    init() {
        this.maakSterren();
        this.setupEventListeners();
        UI.initTopBalkTooltips();
        UI.toonScherm('intro-scherm');
        document.getElementById('speler-naam').addEventListener('keydown', e => {
            if (e.key === 'Enter') this.startIntro();
        });

        const saveInfo = GameState.leesSaveInfo();
        if (saveInfo) {
            document.getElementById('save-naam-display').textContent = saveInfo.naam;
            document.getElementById('save-beurt-display').textContent = saveInfo.beurt;
            document.getElementById('save-sectie').style.display = 'block';
        }

        window.addEventListener('beforeunload', () => state.slaOp());
    },

    maakSterren() {
        const container = document.getElementById('sterren');
        for (let i = 0; i < 200; i++) {
            const ster = document.createElement('div');
            ster.className = 'ster';
            const size = Math.random() * 2 + 0.5;
            const opacity = Math.random() * 0.7 + 0.1;
            const duration = Math.random() * 4 + 2;
            ster.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;` +
                `width:${size}px;height:${size}px;` +
                `--opacity:${opacity};--duration:${duration}s;` +
                `animation-delay:${Math.random()*4}s;`;
            container.appendChild(ster);
        }
    },

    setupEventListeners() {
        document.getElementById('start-knop').addEventListener('click', () => this.startIntro());
        document.getElementById('doorgaan-knop')?.addEventListener('click', () => this.doorgaan());
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                state.activeTab = tab.dataset.tab;
                UI.renderSpel();
            });
        });
        document.getElementById('opnieuw-knop').addEventListener('click', () => {
            state.wisSave();
            state.reset();
            UI.toonScherm('intro-scherm');
            document.getElementById('speler-naam').value = '';
            document.getElementById('save-sectie').style.display = 'none';
        });
    },

    startIntro() {
        // Wis oude save: speler start bewust een nieuw spel
        state.wisSave();
        state.speler.naam = document.getElementById('speler-naam').value.trim() || 'Kapitein';
        UI.renderSchipSelectie();
    },

    doorgaan() {
        if (!state.laadOp()) return;
        UI.toonScherm('spel-scherm');
        UI.renderSpel();
    },

    handmatigOpslaan() {
        state.slaOp();
        UI.verbergInstellingen();
        UI.voegBerichtToe('💾 Spel opgeslagen.', 'kleur-groen');
    },

    downloadSave() {
        state.slaOp();
        const data = localStorage.getItem('gazillionaire_save');
        if (!data) return;
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gazillionaire-save-${state.speler?.naam ?? 'kapitein'}.json`;
        a.click();
        URL.revokeObjectURL(url);
        UI.verbergInstellingen();
    },

    uploadSave(input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data || data.versie !== 1) throw new Error('Ongeldig savebestand');
                localStorage.setItem('gazillionaire_save', JSON.stringify(data));
                if (!state.laadOp()) throw new Error('Laden mislukt');
                UI.verbergInstellingen();
                UI.toonScherm('spel-scherm');
                UI.renderSpel();
            } catch(err) {
                alert('Ongeldig savebestand. Controleer het bestand en probeer opnieuw.');
            }
        };
        reader.readAsText(file);
        input.value = '';
    },

    nieuwSpelVanuitInstellingen() {
        if (!confirm('Weet je zeker dat je een nieuw spel wilt starten? Je huidige voortgang wordt gewist.')) return;
        state.wisSave();
        state.reset();
        UI.verbergInstellingen();
        UI.toonScherm('intro-scherm');
        document.getElementById('save-sectie').style.display = 'none';
    },

    selecteerSchip(schipId) {
        state.init(state.speler.naam, schipId);
        UI.toonScherm('spel-scherm');
        UI.renderSpel();
    },

    // =========================================================================
    // KAART INTERACTIE
    // =========================================================================

    klikPlaneet(planeetId) {
        if (planeetId === state.locatie) return;
        state.geselecteerdePlaneet = planeetId;
        UI.renderBestemmingPaneel();
        UI.renderKaart();
    },

    selecteerBestemming(planeetId) {
        state.geselecteerdePlaneet = planeetId || null;
        UI.renderBestemmingPaneel();
        UI.renderKaart();
    },

    // =========================================================================
    // REIZEN — met animatie in twee fasen
    // =========================================================================

    reisNaar(planeetId) {
        const res = state.reisNaar(planeetId);
        if (!res || res === false) return;
        if (res.succes === false) { this._fout(res.reden); return; }
        state.boardPassagiers();
        state.geselecteerdePlaneet = null;

        UI.toonScherm('reis-scherm');
        UI.updateReisScherm(); // reset raket positie + planeet afbeeldingen

        // Start animatie: raket beweegt van links naar het midden
        const animEl = document.getElementById('reis-animatie');
        if (animEl) {
            requestAnimationFrame(() => requestAnimationFrame(() => {
                animEl.style.transition = 'left 1.5s linear';
                animEl.style.left = '50%';
            }));
        }

        // Na animatie fase 1 (~1.6s): verwerk de reis
        setTimeout(() => this._reisVervolg(), 1650);
    },

    _reisVervolg() {
        const resultaat = state.volgendeReisStap();

        if (resultaat === 'aankomst') {
            // Geen event — ga direct naar fase 2 dan aankomst
            this._startFase2(() => {
                const aankomstResult = state.aankomst();
                if (aankomstResult?.passagiersInfo) {
                    const pi = aankomstResult.passagiersInfo;
                    UI.toonTransactieToast({ icoon: '🧳', titel: `${pi.aantal} passagier${pi.aantal > 1 ? 's' : ''} afgeleverd`, totaal: pi.totaal });
                }
                if (state.fase === 'einde') { state.wisSave(); } else { state.slaOp(); }
                const planNaam = PLANETEN.find(p => p.id === state.locatie)?.naam ?? '';
                this._setReisStatus(`✓ Aangekomen op ${planNaam}!`, 'kleur-groen');
                setTimeout(() => {
                    UI.toonScherm('spel-scherm');
                    state.activeTab = 'handel';
                    UI.renderSpel();
                    if (state.fase === 'einde') {
                        UI.toonEindeScherm();
                    } else if (state.huidigAankomstEvent) {
                        UI.toonAankomstPopup(state.huidigAankomstEvent);
                        state.huidigAankomstEvent = null;
                    }
                }, 1100);
            });

        } else if (resultaat && resultaat.event) {
            // Event tussendoor
            UI.toonEventPopup(resultaat.event);
        }
    },

    // Start fase 2 animatie (raket vliegt naar rechts buiten beeld)
    _startFase2(callback) {
        const animEl = document.getElementById('reis-animatie');
        if (animEl) {
            animEl.style.transition = 'left 1.5s linear';
            animEl.style.left = 'calc(100% + 48px)';
        }
        setTimeout(callback, 1600);
    },

    // Verwerk eventkeuze (keuze-events)
    verwerkEventKeuze(eventId, keuzeId) {
        const res = state.verwerkevent(eventId, keuzeId);
        if (res.bericht) UI.toonEventResultaat(res.bericht);

        const knoppen = document.getElementById('event-knoppen');
        knoppen.innerHTML = '';
        const btn = document.createElement('button');
        btn.className = 'knop primair';
        btn.textContent = state.fase === 'einde' ? 'Spel Afgelopen' : 'Doorgaan →';
        btn.onclick = () => {
            UI.verbergEventPopup();
            if (state.fase === 'einde') { UI.toonEindeScherm(); return; }

            // Altijd aankomst na event (1 stap per reis)
            const aankomstResult = state.aankomst();
            if (aankomstResult?.passagiersInfo) {
                const pi = aankomstResult.passagiersInfo;
                UI.toonTransactieToast({ icoon: '🧳', titel: `${pi.aantal} passagier${pi.aantal > 1 ? 's' : ''} afgeleverd`, totaal: pi.totaal });
            }
            if (state.fase === 'einde') { state.wisSave(); } else { state.slaOp(); }
            const planNaam = PLANETEN.find(p => p.id === state.locatie)?.naam ?? '';
            this._startFase2(() => {
                this._setReisStatus(`✓ Aangekomen op ${planNaam}!`, 'kleur-groen');
                setTimeout(() => {
                    UI.toonScherm('spel-scherm');
                    state.activeTab = 'handel';
                    UI.renderSpel();
                    if (state.fase === 'einde') {
                        UI.toonEindeScherm();
                    } else if (state.huidigAankomstEvent) {
                        UI.toonAankomstPopup(state.huidigAankomstEvent);
                        state.huidigAankomstEvent = null;
                    }
                }, 1100);
            });
        };
        knoppen.appendChild(btn);
    },

    _setReisStatus(tekst, klasse) {
        const el = document.getElementById('reis-status');
        if (!el) return;
        el.textContent = tekst;
        el.className = 'reis-status ' + (klasse || '');
    },

    // =========================================================================
    // HANDEL
    // =========================================================================

    koopGoed(goedId) {
        const n = parseInt(document.getElementById(`koop-${goedId}`)?.value) || 1;
        const res = state.koopGoed(goedId, n);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    koopMax(goedId) {
        const goed = GOEDEREN.find(g => g.id === goedId);
        const prijs = state.getPrijs(state.locatie, goedId);
        const maxN = Math.min(
            Math.floor((state.schip.laadruimte - state.getLadingGewicht()) / goed.gewicht),
            Math.floor(state.speler.krediet / prijs)
        );
        if (maxN <= 0) return;
        const res = state.koopGoed(goedId, maxN);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    verkoopGoed(goedId) {
        const n = parseInt(document.getElementById(`verkoop-${goedId}`)?.value) || 1;
        const res = state.verkoopGoed(goedId, n);
        if (!res.succes) this._fout(res.reden);
        else {
            UI.toonTransactieToast({ icoon: res.goed?.icoon ?? '📦', titel: `${n}× ${res.goed?.naam ?? goedId} verkocht`, totaal: res.totaal, winst: res.winst });
            UI.renderSpel();
        }
    },

    verkoopAlles(goedId) {
        const n = state.lading[goedId] || 0;
        if (n <= 0) return;
        const res = state.verkoopGoed(goedId, n);
        if (res.succes) {
            UI.toonTransactieToast({ icoon: res.goed?.icoon ?? '📦', titel: `${n}× ${res.goed?.naam ?? goedId} verkocht`, totaal: res.totaal, winst: res.winst });
        }
        UI.renderSpel();
    },

    // =========================================================================
    // UPGRADES & SCHIP
    // =========================================================================

    koopBrandstof() {
        const n = parseInt(document.getElementById('brandstof-aantal')?.value) || 10;
        const res = state.koopBrandstof(n);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    vulTankVol() {
        const res = state.vulTankVol();
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    koopMaxBrandstof() {
        const prijs = state.brandstofPrijzen[state.locatie];
        const vrij = state.schip.brandstofTank - state.brandstof;
        const maxAantal = Math.min(vrij, Math.floor(state.speler.krediet / prijs));
        if (maxAantal <= 0) return;
        const res = state.koopBrandstof(maxAantal);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    koopUpgrade(upgradeId) {
        const res = state.koopUpgrade(upgradeId);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    koopUpgradeStap(cat) {
        const res = state.koopUpgradeStap(cat);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    koopVerzekering() {
        const res = state.koopVerzekering();
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    koopSchip(schipId) {
        const nieuw = SCHEPEN.find(s => s.id === schipId);
        const verkoopwaarde = Math.round(SCHEPEN.find(s => s.id === state.schip.id).prijs * 0.60);
        const netto = nieuw.prijs - verkoopwaarde;
        const betalingTekst = netto >= 0
            ? `Netto betaling: ${state.formatteerKrediet(netto)}`
            : `Je ontvangt: ${state.formatteerKrediet(-netto)} (goedkoper schip)`;
        if (!confirm(`Wil je de ${state.schip.naam} inruilen voor een ${nieuw.naam}?\n${betalingTekst}`)) return;
        const res = state.koopSchip(schipId);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    repareerSchip() {
        const res = state.repareerSchip();
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    // =========================================================================
    // PASSAGIERS
    // =========================================================================

    koopMarketing(planeetId) {
        const res = state.koopMarketing(planeetId);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    // =========================================================================
    // AANDELEN
    // =========================================================================

    koopAandeel(id) {
        const n = parseInt(document.getElementById(`koop-aandeel-${id}`)?.value) || 1;
        const res = state.koopAandeel(id, n);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    koopAandeelN(id, n) {
        const res = state.koopAandeel(id, n);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    koopAandeelMax(id) {
        const koers = state.aandeelKoersen[id];
        const maxN = Math.floor(state.speler.krediet / koers);
        if (maxN <= 0) return;
        const res = state.koopAandeel(id, maxN);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    verkoopAandeel(id) {
        const n = parseInt(document.getElementById(`verkoop-aandeel-${id}`)?.value) || 1;
        const res = state.verkoopAandeel(id, n);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    verkoopAandeelN(id, n) {
        const res = state.verkoopAandeel(id, n);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    verkoopAandeelAlles(id) {
        const bezit = state.aandelenPortefeuille[id] || 0;
        if (bezit <= 0) return;
        const res = state.verkoopAandeel(id, bezit);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    // =========================================================================
    // BANK
    // =========================================================================

    leenGeld() {
        const n = parseInt(document.getElementById('leen-bedrag')?.value) || 1000;
        const res = state.leenGeld(n);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    betaalLening() {
        const input = document.getElementById('leen-bedrag');
        const n = Math.min(parseInt(input?.value) || 1000, state.speler.schuld);
        const res = state.betaalLening(n);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    // =========================================================================
    // HELPERS
    // =========================================================================

    _fout(tekst) {
        state.voegBerichtToe(`⚠ ${tekst}`, 'waarschuwing');
        UI.updateBerichten();
    },
};

document.addEventListener('DOMContentLoaded', () => App.init());
