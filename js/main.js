// =============================================================================
// GAZILLIONAIRE: STER DER HANDEL - App Controller
// =============================================================================

const App = {

    init() {
        this.maakSterren();
        this.setupEventListeners();
        UI.toonScherm('intro-scherm');
        document.getElementById('speler-naam').addEventListener('keydown', e => {
            if (e.key === 'Enter') this.startIntro();
        });
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
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                state.activeTab = tab.dataset.tab;
                UI.renderSpel();
            });
        });
        document.getElementById('opnieuw-knop').addEventListener('click', () => {
            state.reset();
            UI.toonScherm('intro-scherm');
            document.getElementById('speler-naam').value = '';
        });
    },

    startIntro() {
        state.speler.naam = document.getElementById('speler-naam').value.trim() || 'Kapitein';
        UI.renderSchipSelectie();
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
        state.activeTab = 'haven';
        UI.renderSpel();
        setTimeout(() => {
            const rij = document.querySelector(`[data-planeet="${planeetId}"]`);
            if (rij) rij.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
    },

    // =========================================================================
    // REIZEN — met animatie in twee fasen
    // =========================================================================

    reisNaar(planeetId) {
        const res = state.reisNaar(planeetId);
        if (!res || res === false) return;
        if (res.succes === false) { this._fout(res.reden); return; }
        state.geselecteerdePlaneet = null;

        UI.toonScherm('reis-scherm');
        UI.updateReisScherm();

        // Reset animatie: zet schip links buiten beeld
        const animEl = document.getElementById('reis-animatie');
        if (animEl) {
            animEl.classList.remove('fase-1', 'fase-2');
            // Kleine delay zodat browser de reset oppakt voordat we fase-1 toevoegen
            requestAnimationFrame(() => requestAnimationFrame(() => {
                animEl.classList.add('fase-1');
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
                state.aankomst();
                const planNaam = PLANETEN.find(p => p.id === state.locatie)?.naam ?? '';
                this._setReisStatus(`✓ Aangekomen op ${planNaam}!`, 'kleur-groen');
                document.getElementById('reis-voortgang-balk').style.width = '100%';
                setTimeout(() => {
                    UI.toonScherm('spel-scherm');
                    state.activeTab = 'handel';
                    UI.renderSpel();
                    if (state.fase === 'einde') UI.toonEindeScherm();
                }, 1100);
            });

        } else if (resultaat && resultaat.event) {
            // Event tussendoor
            document.getElementById('reis-voortgang-balk').style.width = '50%';
            UI.toonEventPopup(resultaat.event);
        }
    },

    // Start fase 2 animatie (schip naar rechts), roep callback aan na afloop
    _startFase2(callback) {
        const animEl = document.getElementById('reis-animatie');
        if (animEl) {
            animEl.classList.remove('fase-1');
            void animEl?.offsetWidth; // force reflow
            animEl.classList.add('fase-2');
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
            state.aankomst();
            const planNaam = PLANETEN.find(p => p.id === state.locatie)?.naam ?? '';
            this._startFase2(() => {
                this._setReisStatus(`✓ Aangekomen op ${planNaam}!`, 'kleur-groen');
                document.getElementById('reis-voortgang-balk').style.width = '100%';
                setTimeout(() => {
                    UI.toonScherm('spel-scherm');
                    state.activeTab = 'handel';
                    UI.renderSpel();
                    if (state.fase === 'einde') UI.toonEindeScherm();
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
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    verkoopAlles(goedId) {
        const n = state.lading[goedId] || 0;
        if (n <= 0) return;
        state.verkoopGoed(goedId, n);
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

    koopUpgrade(upgradeId) {
        const res = state.koopUpgrade(upgradeId);
        if (!res.succes) this._fout(res.reden); else UI.renderSpel();
    },

    koopSchip(schipId) {
        const nieuw = SCHEPEN.find(s => s.id === schipId);
        const verkoopwaarde = Math.round(SCHEPEN.find(s => s.id === state.schip.id).prijs * 0.60);
        const netto = nieuw.prijs - verkoopwaarde;
        if (!confirm(`Wil je de ${state.schip.naam} inruilen voor een ${nieuw.naam}?\nNetto betaling: ${state.formatteerKrediet(Math.max(0, netto))}`)) return;
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

    neemPassagierAanBoord(index) {
        const res = state.neemPassagierAanBoord(index);
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

    verkoopAandeel(id) {
        const n = parseInt(document.getElementById(`verkoop-aandeel-${id}`)?.value) || 1;
        const res = state.verkoopAandeel(id, n);
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
