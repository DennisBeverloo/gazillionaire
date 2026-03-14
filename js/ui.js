// =============================================================================
// GAZILLIONAIRE: STER DER HANDEL - UI Rendering
// =============================================================================

const FUEL_IMG = '<img src="assets/fuel.png" class="icoon-brandstof" alt="brandstof">';

const UI = {

    // Toast queue state
    _toastQueue: [],
    _toastActiefCount: 0,
    _deferToastsAankomst: false,
    _pendingAankomstToasts: [],

    // =========================================================================
    // SCHERM BEHEER
    // =========================================================================

    toonScherm(schermId) {
        document.querySelectorAll('.scherm').forEach(s => s.classList.remove('actief'));
        document.getElementById(schermId)?.classList.add('actief');
    },

    // =========================================================================
    // SCHIP SELECTIE
    // =========================================================================

    renderSchipSelectie() {
        this.toonScherm('schip-selectie-scherm');
        const container = document.getElementById('schip-opties');
        container.innerHTML = '';

        const startSchepen = SCHEPEN.filter(s => s.mark === 1);
        const typeInfo = {
            vracht: { pad: 'Tanker of Secure Hauler (Mark III)', kleur: '#8B6914' },
            pax:    { pad: 'Luxury Liner of Space Bus (Mark III)', kleur: '#1E90FF' },
            snel:   { pad: 'Spearhead of Shadow (Mark III)', kleur: '#FF6B35' },
        };

        startSchepen.forEach(schip => {
            const resterend = START_KREDIET - schip.prijs;
            const info = typeInfo[schip.type] || {};
            const div = document.createElement('div');
            div.className = 'schip-kaart';

            div.innerHTML = `
                <div class="schip-kaart-intro">
                    <span class="schip-icoon">${schip.icoon}</span>
                    <h3>${schip.naam}</h3>
                    <div class="prijs">${state.formatteerKrediet(schip.prijs)}</div>
                    <p>${schip.beschrijving}</p>
                    <div style="font-size:0.78em;color:var(--accent);margin-top:4px">Specialisatie bij Mark III: ${info.pad}</div>
                </div>
                <div class="schip-kaart-stats">
                    <div class="schip-stat"><span>Snelheid</span><span class="waarde">${schip.snelheid}</span></div>
                    <div class="schip-stat"><span>Laadruimte</span><span class="waarde">${schip.laadruimte} ton</span></div>
                    <div class="schip-stat"><span>Brandstoftank</span><span class="waarde">${schip.brandstofTank} l</span></div>
                    <div class="schip-stat"><span>Passagiers</span><span class="waarde">${schip.passagiersCapaciteit > 0 ? schip.passagiersCapaciteit : '—'}</span></div>
                    <div class="schip-stat"><span>Schild</span><span class="waarde">${schip.schild}</span></div>
                    <div class="schip-stat"><span>Bemanning</span><span class="waarde">${CREW_PER_SCHIP[schip.id] ?? '?'} pers.</span></div>
                    <div class="schip-stat"><span>Startkapitaal</span><span class="waarde ${resterend < 2000 ? 'kleur-rood' : 'kleur-groen'}">${state.formatteerKrediet(resterend)}</span></div>
                </div>
                <button class="knop primair schip-kies-knop" onclick="App.selecteerSchip('${schip.id}')">Dit schip kiezen</button>
            `;
            container.appendChild(div);
        });
    },

    // =========================================================================
    // HOOFD RENDER — roept alles aan
    // =========================================================================

    // =========================================================================
    // TUTORIAL DIALOG
    // =========================================================================

    toonTutorialDialog(stap, callback) {
        const overlay = document.getElementById('tutorial-overlay');
        if (!overlay || !stap?.dialoog) { if (callback) callback(); return; }
        document.getElementById('tutorial-titel').textContent = stap.dialoog.titel;
        document.getElementById('tutorial-tekst').textContent = stap.dialoog.tekst;
        overlay.classList.remove('verborgen');
        const sluitKnop = document.getElementById('tutorial-sluit');
        const handler = () => {
            overlay.classList.add('verborgen');
            sluitKnop.removeEventListener('click', handler);
            if (callback) callback();
        };
        sluitKnop.addEventListener('click', handler);
    },

    renderSpel() {
        this.updateTopBalk();
        this.renderPlaneetInfo();
        this.renderKaart();
        this.renderBestemmingPaneel();
        this.updateBerichten();

        // Tutorial: verberg/toon tabs op basis van unlock status
        const havenHasContent = state.isUnlocked('brandstof') || state.isUnlocked('passagiers')
            || state.isUnlocked('onderhoud') || state.isUnlocked('marketing');
        const havenTabKnop = document.querySelector('.tab[data-tab="haven"]');
        const financienTabKnop = document.querySelector('.tab[data-tab="financien"]');
        const missiesTabKnop = document.querySelector('.tab[data-tab="missies"]');
        if (havenTabKnop) havenTabKnop.style.display = havenHasContent ? '' : 'none';
        if (financienTabKnop) financienTabKnop.style.display = state.isUnlocked('leningen') ? '' : 'none';
        if (missiesTabKnop) missiesTabKnop.style.display = state.isUnlocked('missies') ? '' : 'none';
        // Vergrendelde actieve tab → terug naar handel
        if (state.activeTab === 'haven' && !havenHasContent) state.activeTab = 'handel';
        if (state.activeTab === 'financien' && !state.isUnlocked('leningen')) state.activeTab = 'handel';
        if (state.activeTab === 'missies' && !state.isUnlocked('missies')) state.activeTab = 'handel';

        // Render actieve tab-inhoud
        if (state.activeTab === 'beurs') state.activeTab = 'financien'; // migreer oude saves
        switch (state.activeTab) {
            case 'handel':       this.renderHandelTab();       break;
            case 'haven':        this.renderHavenTab();        break;
            case 'financien':    this.renderFinancienTab();    break;
            case 'logboek':      this.renderLogboekTab();      break;
            case 'ranglijst':    this.renderRanglijstTab();    break;
            case 'achievements': this.renderAchievementsTab(); break;
            case 'planeet':      this.renderPlaneetTab();      break;
            case 'missies':      this.renderMissieTab();       break;
        }

        // *** KRITIEKE FIX: toggle tab-panelen ÉN tab-knoppen ***
        document.querySelectorAll('.tab-paneel').forEach(p => p.classList.remove('actief'));
        document.getElementById(`${state.activeTab}-tab`)?.classList.add('actief');
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('actief', tab.dataset.tab === state.activeTab);
        });

        // "Ga naar planeet" knop: planeet-specifiek label + verbergen op planeten zonder speciale functie
        const planeetGaKnop = document.getElementById('planeet-ga-naar-knop');
        if (planeetGaKnop) {
            const planeetLabels = {
                nexoria: '🌌 Galactische Beurs',
                techton: '🛸 Geavanceerde Scheepswerf',
                luxoria: '🎰 Casino Stellaris',
                agria:   '🔨 Oogstveiling',
                mortex:  '💀 Zwarte Markt',
                ferrum:  '⛏ Ertsverwerkingsfaciliteit',
            };
            const planeetLabel = planeetLabels[state.locatie];
            // Tutorial: planeet-tab verbergen tot de juiste feature unlocked is
            const planeetTabUnlocked = state.locatie === 'nexoria'
                ? state.isUnlocked('beurs')
                : state.isUnlocked('planeet_diensten');
            if (planeetLabel && planeetTabUnlocked) {
                planeetGaKnop.textContent = planeetLabel;
                planeetGaKnop.style.display = '';
            } else {
                planeetGaKnop.style.display = 'none';
            }
            planeetGaKnop.classList.toggle('actief', state.activeTab === 'planeet');
        }

        // Handel-tab label: Zwarte Markt op Mortex
        const handelTabKnop = document.querySelector('.tab[data-tab="handel"]');
        if (handelTabKnop) handelTabKnop.innerHTML = state.locatie === 'mortex' ? '💀 Zwarte Markt' : '⚖ Handel';

        // Top-nav knoppen actief markeren (logboek/ranglijst/prestaties)
        ['logboek','ranglijst','achievements'].forEach(tab => {
            document.querySelector(`.top-nav-knop[onclick*="'${tab}'"]`)
                ?.classList.toggle('actief', state.activeTab === tab);
        });
    },

    _getPlaneetServiceTags(planeet) {
        const tags = [];
        // Tutorial: toon alleen tags van unlocked planeetdiensten
        if (planeet.id === 'nexoria' && state.isUnlocked('beurs')) tags.push('🌌 Galactische Beurs');
        if (planeet.id === 'techton' && state.isUnlocked('planeet_diensten')) tags.push('🛸 Scheepswerf');
        if (planeet.id === 'luxoria' && state.isUnlocked('planeet_diensten')) tags.push('🎰 Casino');
        if (planeet.id === 'agria'   && state.isUnlocked('planeet_diensten')) tags.push('🏺 Veiling');
        if (planeet.id === 'mortex'  && state.isUnlocked('planeet_diensten')) tags.push('💀 Zwarte Markt');
        if (planeet.id === 'pyroflux' && state.isUnlocked('brandstof')) tags.push(`${FUEL_IMG} Speciale brandstof`);
        return tags;
    },

    renderBestemmingPaneel() {
        const container = document.getElementById('bestemming-paneel-container');
        if (!container) return;

        const dest = state.geselecteerdePlaneet
            ? PLANETEN.find(p => p.id === state.geselecteerdePlaneet)
            : null;

        const brandstofNodig = dest ? state.berekenBrandstofVerbruik(state.locatie, dest.id) : 0;
        const heeftGenoeg   = dest ? state.brandstof >= brandstofNodig : false;
        const afstand        = dest ? Math.round(state.berekenAfstand(state.locatie, dest.id)) : 0;
        const services       = dest ? this._getPlaneetServiceTags(dest) : [];
        const servicesHtml   = services.length
            ? `<div class="bestemming-services">${services.map(s => `<span class="planeet-tag">${s}</span>`).join('')}</div>`
            : '<div class="bestemming-services"></div>';

        // Inhoud altijd renderen maar verbergen als er geen bestemming is (behoudt hoogte)
        const verbergStijl = dest ? '' : 'visibility:hidden';
        const preflightHtml = this._renderPreflightHtml(this._preflightItems(dest));

        container.innerHTML = `<div class="bestemming-paneel">
            <div class="bestemming-inhoud" style="${verbergStijl}">
                <div class="bestemming-paneel-naam">
                    <span class="planeet-bol" style="background:${dest?.kleur ?? 'transparent'};width:13px;height:13px"></span>
                    <strong>${dest?.naam ?? '—'}</strong>
                    ${dest?.isGevaarlijk ? '<span class="kleur-rood" style="font-size:0.78em">⚠ Gevaarlijk</span>' : ''}
                </div>
                <div class="kleur-dimmed" style="font-size:0.82em;margin:4px 0 6px">${dest?.beschrijving ?? '—'}</div>
                ${servicesHtml}
                <div class="bestemming-meta-rij" style="margin-top:8px">
                    <span>Afstand</span><span>${afstand} lj</span>
                </div>
                ${state.isUnlocked('brandstof') ? `<div class="brandstof-vereist ${heeftGenoeg ? '' : 'brandstof-tekort'}" style="margin-top:6px">
                    <span class="bestemming-sub-label">Brandstofkosten</span>
                    <div>${FUEL_IMG} ${brandstofNodig} l
                    ${heeftGenoeg
                        ? `<span class="kleur-groen">✓</span>`
                        : dest ? `<span class="kleur-rood">✗ tekort: ${brandstofNodig - state.brandstof} l</span>` : ''}
                    </div>
                </div>` : ''}
            </div>
            ${preflightHtml}
            <button class="knop ${dest && heeftGenoeg ? 'primair' : dest ? 'gevaar' : 'dimmed'}"
                    style="width:100%;padding:10px 0;margin-top:8px"
                    ${dest ? `onclick="App.reisNaar('${dest.id}')"` : 'disabled'}>
                ${dest ? `🚀 Reis naar ${dest.naam} →` : 'Selecteer bestemming'}
            </button>
        </div>`;
    },

    // =========================================================================
    // PRE-FLIGHT CHECKLIST
    // =========================================================================

    _preflightItems(dest) {
        const items = [];

        // Bestemming (altijd eerste item)
        items.push({
            label: dest ? 'Bestemming gekozen' : 'Geen bestemming gekozen',
            status: dest ? 'groen' : 'rood',
        });

        // Goederen (basis — altijd zichtbaar)
        const geladen = state.getLadingGewicht?.() ?? 0;
        const maxLading = state.schip?.laadruimte ?? 0;
        let cargoLabel, cargoStatus;
        if (geladen === 0)                                   { cargoLabel = 'Geen vracht geladen';         cargoStatus = 'open'; }
        else if (maxLading > 0 && geladen >= maxLading)     { cargoLabel = 'Vrachtruim vol';               cargoStatus = 'groen'; }
        else                                                  { cargoLabel = 'Vracht geladen (ruimte over)'; cargoStatus = 'oranje'; }
        items.push({ label: cargoLabel, status: cargoStatus });

        // Passagiers (passagiers unlocked)
        if (state.isUnlocked('passagiers')) {
            const pax = state.passagiers ?? 0;
            const maxPax = state.schip?.passagiersCapaciteit ?? 0;
            if (maxPax > 0) {
                let paxLabel, paxStatus;
                if (pax === 0)         { paxLabel = 'Geen passagiers';                    paxStatus = 'open'; }
                else if (pax >= maxPax){ paxLabel = 'Alle passagiers aan boord';          paxStatus = 'groen'; }
                else                   { paxLabel = 'Passagiers aan boord (ruimte over)'; paxStatus = 'oranje'; }
                items.push({ label: paxLabel, status: paxStatus });
            }
        }

        // Brandstof (brandstof unlocked)
        if (state.isUnlocked('brandstof')) {
            const brandstof = state.brandstof ?? 0;
            const maxBrandstof = state.schip?.brandstofTank ?? 0;
            const pct = maxBrandstof > 0 ? brandstof / maxBrandstof : 1;
            let fuelLabel, fuelStatus;
            if (dest) {
                const nodig = state.berekenBrandstofVerbruik(state.locatie, dest.id);
                if (brandstof < nodig)          { fuelLabel = 'Niet genoeg brandstof'; fuelStatus = 'rood'; }
                else if (pct < 0.75)            { fuelLabel = 'Voldoende brandstof';   fuelStatus = 'oranje'; }
                else                            { fuelLabel = 'Genoeg brandstof';      fuelStatus = 'groen'; }
            } else {
                if (pct < 0.3)      { fuelLabel = 'Niet genoeg brandstof'; fuelStatus = 'rood'; }
                else if (pct < 0.75){ fuelLabel = 'Voldoende brandstof';   fuelStatus = 'oranje'; }
                else                { fuelLabel = 'Genoeg brandstof';      fuelStatus = 'groen'; }
            }
            items.push({ label: fuelLabel, status: fuelStatus });
        }

        // Verzekering (verzekering unlocked)
        if (state.isUnlocked('verzekering')) {
            items.push({
                label: state.verzekering?.actief ? 'Verzekering afgesloten' : 'Geen verzekering',
                status: state.verzekering?.actief ? 'groen' : 'open',
            });
        }

        // Marketing (marketing unlocked)
        if (state.isUnlocked('marketing')) {
            items.push({
                label: state.marketingActief ? 'Actieve marketingcampagne' : 'Geen marketing',
                status: state.marketingActief ? 'groen' : 'open',
            });
        }

        return items;
    },

    _renderPreflightHtml(items) {
        if (items.length === 0) return '';
        const DOT   = { groen: '●', oranje: '●', rood: '●', open: '○' };
        const KLEUR = { groen: 'var(--groen)', oranje: 'var(--oranje)', rood: 'var(--rood)', open: 'var(--tekst-dim)' };
        const rows = items.map(it => `<div class="preflight-item">
            <span class="preflight-dot" style="color:${KLEUR[it.status]}">${DOT[it.status]}</span>
            <span class="${it.status === 'open' ? 'kleur-dimmed' : ''}">${it.label}</span>
        </div>`).join('');
        return `<div class="preflight-checklist"><div class="preflight-titel">Pre-flight Checklist</div>${rows}</div>`;
    },

    // =========================================================================
    // TOP BALK
    // =========================================================================

    updateTopBalk() {
        document.body.dataset.planeet = state.locatie;
        const planeetObj = PLANETEN.find(p => p.id === state.locatie);
        // Stel CSS-variabele in voor toast-positionering onder de top-balk
        const topBalk = document.getElementById('top-balk');
        if (topBalk) document.documentElement.style.setProperty('--top-balk-h', topBalk.getBoundingClientRect().bottom + 'px');
        document.body.style.setProperty('--planeet-knop-kleur', planeetObj?.kleur ?? 'var(--accent)');

        const el = id => document.getElementById(id);
        el('kapitein-display').textContent = `👤 ${state.speler?.naam ?? '---'}`;
        const hp = state.schipHP ?? 0;
        const maxHP = state.schip?.maxHP ?? 0;
        const hpPct = maxHP > 0 ? hp / maxHP : 1;
        const hpKleur = hpPct >= 0.8 ? 'var(--groen)' : hpPct >= 0.5 ? 'var(--oranje)' : 'var(--rood)';
        const schipEl = el('schip-naam-display');
        if (state.isUnlocked('onderhoud')) {
            schipEl.innerHTML = `🚀 ${state.schip?.naam ?? '---'} <span style="color:${hpKleur};font-size:0.9em">❤ ${hp}/${maxHP}</span>`;
        } else {
            schipEl.innerHTML = `🚀 ${state.schip?.naam ?? '---'}`;
        }

        const geladen = state.getLadingGewicht?.() ?? 0;
        const maxLading = state.schip?.laadruimte ?? 0;
        const cargoEl = el('cargo-display');
        cargoEl.textContent = `📦 ${geladen}/${maxLading} ton`;
        cargoEl.style.cursor = 'pointer';
        cargoEl.onclick = () => App.switchTab('handel');

        const pax = state.passagiers ?? 0;
        const maxPax = state.schip?.passagiersCapaciteit ?? 0;
        const paxDisplay = el('passagiers-display');
        const paxSep = el('passagiers-sep');
        if (maxPax > 0 && state.isUnlocked('passagiers')) {
            paxDisplay.textContent = `🧳 ${pax}/${maxPax}`;
            paxDisplay.style.display = '';
            paxDisplay.style.cursor = 'pointer';
            paxDisplay.onclick = () => App.switchTab('haven');
            if (paxSep) paxSep.style.display = '';
        } else {
            paxDisplay.style.display = 'none';
            paxDisplay.onclick = null;
            if (paxSep) paxSep.style.display = 'none';
        }

        const brandstof = state.brandstof ?? 0;
        const maxBrandstof = state.schip?.brandstofTank ?? 0;
        const brandstofEl = el('brandstof-display');
        const brandstofSep = el('brandstof-sep');
        if (state.isUnlocked('brandstof')) {
            brandstofEl.innerHTML = `${FUEL_IMG} ${brandstof}/${maxBrandstof} l`;
            brandstofEl.style.display = '';
            brandstofEl.style.cursor = 'pointer';
            brandstofEl.onclick = () => App.switchTab('haven');
            if (brandstofSep) brandstofSep.style.display = '';
        } else {
            brandstofEl.style.display = 'none';
            brandstofEl.onclick = null;
            if (brandstofSep) brandstofSep.style.display = 'none';
        }

        const kredietEl = el('krediet-display');
        kredietEl.textContent = `💰 ${state.formatteerKrediet(state.speler.krediet)}`;
        kredietEl.classList.toggle('krediet-negatief', state.speler.krediet < 0);
        kredietEl.style.cursor = 'pointer';
        kredietEl.onclick = () => App.switchTab('financien');

        const rest = MAX_BEURTEN - state.beurt;
        const beurtEl = el('beurt-display');
        beurtEl.textContent = `Beurt ${state.beurt}/${MAX_BEURTEN}`;
        beurtEl.style.color = rest <= 20 ? 'var(--rood)' : rest <= 40 ? 'var(--oranje)' : '';
    },

    // =========================================================================
    // TOP BALK TOOLTIPS
    // =========================================================================

    initTopBalkTooltips() {
        const tooltip = document.getElementById('top-tooltip');

        // Top balk hover items
        const ids = ['schip-naam-display', 'cargo-display', 'passagiers-display', 'brandstof-display', 'krediet-display',
                     'nav-logboek', 'nav-ranglijst', 'nav-achievements', 'nav-instellingen'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('mouseenter', () => {
                if (!state.schip) return;
                const html = this._tooltipInhoud(id);
                if (!html) return;
                tooltip.innerHTML = html;
                tooltip.classList.remove('verborgen');
                this._positioneerTooltip(tooltip, el);
            });
            el.addEventListener('mouseleave', () => tooltip.classList.add('verborgen'));
        });

        // Planeet-tag [data-tip] delegatie (sidebar wordt dynamisch her-rendered)
        document.addEventListener('mouseover', e => {
            const tag = e.target.closest('[data-tip]');
            if (!tag) return;
            tooltip.innerHTML = `<div class="tt-label">${tag.textContent.trim()}</div><div class="tt-beschr">${tag.dataset.tip}</div>`;
            tooltip.classList.remove('verborgen');
            this._positioneerTooltip(tooltip, tag);
        });
        document.addEventListener('mouseout', e => {
            if (e.target.closest('[data-tip]')) tooltip.classList.add('verborgen');
        });
    },

    _tooltipInhoud(id) {
        switch (id) {
            case 'schip-naam-display': {
                const template = typeof SCHEPEN !== 'undefined' ? SCHEPEN.find(s => s.id === state.schip?.id) : null;
                const snelSterren = '★'.repeat(Math.min(state.schip.snelheid, 8)) + (state.schip.snelheid > 8 ? `+${state.schip.snelheid - 8}` : '☆'.repeat(Math.max(0, 5 - state.schip.snelheid)));
                const schildSterren = '★'.repeat(Math.min(state.schip.schild, 8)) + (state.schip.schild > 8 ? `+${state.schip.schild - 8}` : '☆'.repeat(Math.max(0, 5 - state.schip.schild)));
                const hp = state.schipHP ?? 0;
                const maxHP = state.schip?.maxHP ?? 0;
                const hpPct = maxHP > 0 ? Math.round(hp / maxHP * 100) : 100;
                const hpKleur = hpPct >= 80 ? 'var(--groen)' : hpPct >= 50 ? 'var(--oranje)' : 'var(--rood)';
                return `<div class="tt-label">${state.schip.naam}</div>
                    ${template ? `<div class="tt-beschr">${template.beschrijving}</div>` : ''}
                    <div class="tt-rij"><span>Snelheid</span><span class="tt-ster">${snelSterren}</span></div>
                    <div class="tt-rij"><span>Schild</span><span class="tt-ster">${schildSterren}</span></div>
                    <div class="tt-rij"><span>HP</span><span style="color:${hpKleur}">${hp}/${maxHP} (${hpPct}%)</span></div>
                    ${hpPct < 50 ? '<div class="tt-schade">⚠ Lage HP — repareer zo snel mogelijk!</div>' : ''}`;
            }
            case 'cargo-display': {
                const geladen = GOEDEREN.filter(g => (state.lading[g.id] || 0) > 0);
                return `<div class="tt-label">Vracht</div>
                    ${geladen.length === 0
                        ? '<div class="tt-leeg">Laadruimte is leeg</div>'
                        : geladen.map(g => `<div class="tt-rij"><span>${g.icoon} ${g.naam}</span><span>${state.lading[g.id]}×</span></div>`).join('')}`;
            }
            case 'passagiers-display': {
                const pax = state.passagiers ?? 0;
                const prijs = state.passagiersTicketprijs ?? 0;
                const wachtend = state.wachtendePassagiers?.[state.locatie]?.aantal ?? 0;
                return `<div class="tt-label">Passagiers</div>
                    <div class="tt-rij"><span>Aan boord</span><span class="tt-prijs">${pax}</span></div>
                    ${pax > 0 ? `<div class="tt-rij"><span>Ticketprijs</span><span class="tt-prijs">${state.formatteerKrediet(prijs)}/pp</span></div>
                    <div class="tt-rij"><span>Verwachte inkomsten</span><span class="tt-prijs kleur-groen">+${state.formatteerKrediet(pax * prijs)}</span></div>` : ''}
                    <div class="tt-rij"><span>Wachtend hier</span><span class="tt-prijs">${wachtend}</span></div>`;
            }
            case 'brandstof-display': {
                const prijsBasis = state.brandstofPrijzen?.[state.locatie] ?? '?';
                const prijsEff = state._effectieveBrandstofPrijs?.() ?? prijsBasis;
                const isKorting = state.locatie === 'pyroflux';
                const pct = Math.round(state.brandstof / state.schip.brandstofTank * 100);
                const kleur = state.brandstof < 20 ? 'var(--rood)' : state.brandstof < 40 ? 'var(--oranje)' : 'var(--groen)';
                const prijsTekst = isKorting
                    ? `<s>${prijsBasis} cr/l</s> <span style="color:var(--goud)">${prijsEff} cr/l</span>`
                    : `${prijsEff} cr/l`;
                return `<div class="tt-label">Brandstof</div>
                    <div class="tt-rij"><span>Niveau</span><span style="color:${kleur}">${state.brandstof}/${state.schip.brandstofTank} l (${pct}%)</span></div>
                    <div class="tt-rij"><span>Prijs hier</span><span class="tt-prijs">${prijsTekst}</span></div>`;
            }
            case 'krediet-display': {
                const schuld = state.speler?.schuld ?? 0;
                return `<div class="tt-label">Saldo</div>
                    <div class="tt-rij"><span>Credits</span><span class="tt-prijs">${state.formatteerKrediet(state.speler.krediet)}</span></div>
                    ${schuld > 0 ? `
                    <div class="tt-rij"><span>Lening</span><span style="color:var(--rood)">${state.formatteerKrediet(schuld)}</span></div>
                    <div class="tt-rij"><span>Rente</span><span style="color:var(--oranje)">${(RENTE_PERCENTAGE * 100).toFixed(0)}% per ${RENTE_INTERVAL} beurten</span></div>
                    ` : ''}`;
            }
            case 'nav-logboek':
                return `<div class="tt-label">📋 Reislogboek</div><div class="tt-beschr">Alle gebeurtenissen en berichten van deze reis.</div>`;
            case 'nav-ranglijst':
                return `<div class="tt-label">🏅 Ranglijst</div><div class="tt-beschr">De rijkste handelaars in de sector — jij versus de NPC-concurrenten.</div>`;
            case 'nav-achievements':
                return `<div class="tt-label">🏆 Prestaties</div><div class="tt-beschr">Behaalde en vergrendelde achievements. Bonuscredits bij voltooiing.</div>`;
            case 'nav-instellingen':
                return `<div class="tt-label">⚙ Instellingen</div><div class="tt-beschr">Geluid, weergave-opties en speldata beheren.</div>`;
        }
        return null;
    },

    _positioneerTooltip(tooltip, anchor) {
        const rect = anchor.getBoundingClientRect();
        tooltip.style.top = (rect.bottom + 6) + 'px';
        tooltip.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 280)) + 'px';
    },

    // =========================================================================
    // GALAXY KAART (SVG)
    // =========================================================================

    renderPlaneetInfo() {
        const container = document.getElementById('planeet-info-container');
        if (!container) return;
        const planeet = PLANETEN.find(p => p.id === state.locatie);
        if (!planeet) { container.innerHTML = ''; return; }

        const imgSrc = `assets/planet-${planeet.id}.png`;
        const tags = this._getPlaneetServiceTags(planeet).map(s => `<span class="planeet-tag">${s}</span>`);

        container.innerHTML = `
            <div class="planeet-info-kaart" style="--planeet-kleur:${planeet.kleur}">
                <img src="${imgSrc}" class="planeet-info-img" alt="${planeet.naam}" onerror="this.style.opacity='0'">
                <div class="planeet-info-tekst">
                    <div class="planeet-info-naam" style="color:${planeet.kleur}">${planeet.naam}</div>
                    <div class="planeet-info-beschr">${planeet.beschrijving}</div>
                    ${tags.length ? `<div class="planeet-tags">${tags.join('')}</div>` : ''}
                </div>
            </div>`;
    },

    renderKaart() {
        const svg = document.getElementById('galaxy-kaart');
        const W = 290, H = 195;
        svg.innerHTML = '';
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

        // Kleine sterretjes achtergrond
        for (let i = 0; i < 50; i++) {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c.setAttribute('cx', Math.random() * W);
            c.setAttribute('cy', Math.random() * H);
            c.setAttribute('r', Math.random() * 0.7 + 0.2);
            c.setAttribute('fill', 'rgba(255,255,255,0.35)');
            svg.appendChild(c);
        }

        // Verbindingslijnen tussen nabijgelegen planeten
        for (let i = 0; i < PLANETEN.length; i++) {
            for (let j = i + 1; j < PLANETEN.length; j++) {
                if (state.berekenAfstand(PLANETEN[i].id, PLANETEN[j].id) < 52) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', PLANETEN[i].x / 100 * W);
                    line.setAttribute('y1', PLANETEN[i].y / 100 * H);
                    line.setAttribute('x2', PLANETEN[j].x / 100 * W);
                    line.setAttribute('y2', PLANETEN[j].y / 100 * H);
                    line.setAttribute('stroke', 'rgba(26,51,85,0.45)');
                    line.setAttribute('stroke-width', '0.5');
                    svg.appendChild(line);
                }
            }
        }

        // Geselecteerde bestemming — gele stippellijn
        if (state.geselecteerdePlaneet && !state.reisData) {
            const van  = PLANETEN.find(p => p.id === state.locatie);
            const naar = PLANETEN.find(p => p.id === state.geselecteerdePlaneet);
            if (van && naar) {
                const destLijn = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                destLijn.setAttribute('x1', van.x  / 100 * W); destLijn.setAttribute('y1', van.y  / 100 * H);
                destLijn.setAttribute('x2', naar.x / 100 * W); destLijn.setAttribute('y2', naar.y / 100 * H);
                destLijn.setAttribute('stroke', '#ffd700');
                destLijn.setAttribute('stroke-width', '1.5');
                destLijn.setAttribute('stroke-dasharray', '4,3');
                destLijn.setAttribute('opacity', '0.9');
                svg.appendChild(destLijn);
            }
        }

        // Reis-route stippellijn
        if (state.reisData) {
            const van  = PLANETEN.find(p => p.id === state.reisData.van);
            const naar = PLANETEN.find(p => p.id === state.reisData.naar);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', van.x  / 100 * W); line.setAttribute('y1', van.y  / 100 * H);
            line.setAttribute('x2', naar.x / 100 * W); line.setAttribute('y2', naar.y / 100 * H);
            line.setAttribute('class', 'reis-lijn');
            svg.appendChild(line);
        }

        // Planeten
        PLANETEN.forEach(planeet => {
            const px = planeet.x / 100 * W;
            const py = planeet.y / 100 * H;
            const isHuidig = planeet.id === state.locatie;
            const isSel    = planeet.id === state.geselecteerdePlaneet;

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.style.cursor = 'pointer';
            g.setAttribute('data-planeet', planeet.id);

            if (isHuidig || isSel) {
                const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                glow.setAttribute('cx', px); glow.setAttribute('cy', py);
                glow.setAttribute('r', isHuidig ? 14 : 11);
                glow.setAttribute('fill', 'none');
                glow.setAttribute('stroke', isHuidig ? '#ffffff' : '#00d4ff');
                glow.setAttribute('stroke-width', '1.5');
                glow.setAttribute('opacity', '0.55');
                g.appendChild(glow);
            }

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', px); circle.setAttribute('cy', py);
            circle.setAttribute('r', isHuidig ? 9 : 7);
            circle.setAttribute('fill', planeet.kleur);
            circle.setAttribute('opacity', isHuidig ? '1' : '0.82');
            g.appendChild(circle);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', px); text.setAttribute('y', py + 20);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('class', `planeet-naam-label${isHuidig ? ' huidig' : ''}`);
            text.textContent = planeet.naam.split(' ')[0]; // Eerste woord
            g.appendChild(text);

            g.addEventListener('click', () => App.klikPlaneet(planeet.id));
            svg.appendChild(g);
        });
    },

    // =========================================================================
    // SCHIP STATS (rechter paneel)
    // =========================================================================

    renderSchipStats() {
        const container = document.getElementById('schip-stats');
        if (!state.schip || !container) return;

        const s = state.schip;
        const gewicht  = state.getLadingGewicht();
        const ladingPct = Math.min(100, Math.round(gewicht / s.laadruimte * 100));
        const vol = ladingPct >= 90;

        container.innerHTML = `
            <div class="stat-rij">
                <span class="stat-naam">Schip</span>
                <span class="stat-waarde accent">${s.naam}</span>
            </div>
            <div class="stat-rij">
                <span class="stat-naam">Snelheid</span>
                <span class="stat-waarde">${s.snelheid}</span>
            </div>
            <div class="stat-rij">
                <span class="stat-naam">Lading</span>
                <span class="stat-waarde ${vol ? 'kleur-rood' : ''}">${gewicht}/${s.laadruimte} ton</span>
            </div>
            <div class="lading-balk-container">
                <div class="lading-balk ${vol ? 'vol' : ''}" style="width:${ladingPct}%"></div>
            </div>
            <div class="stat-rij" style="margin-top:5px">
                <span class="stat-naam">Schild</span>
                <span class="stat-waarde">${s.schild}</span>
            </div>
            ${(s.passagiersCapaciteit || 0) > 0 ? `<div class="stat-rij"><span class="stat-naam">Passagiers</span><span class="stat-waarde">${state.passagiers || 0}/${s.passagiersCapaciteit}</span></div>` : ''}
            <div class="stat-rij">
                <span class="stat-naam">${FUEL_IMG} Brandstof</span>
                <span class="stat-waarde ${state.brandstof < 20 ? 'kleur-rood' : state.brandstof < 40 ? 'kleur-oranje' : ''}">${state.brandstof}/${s.brandstofTank} l</span>
            </div>
            <div class="lading-balk-container">
                <div class="lading-balk" style="width:${Math.round(state.brandstof/s.brandstofTank*100)}%;background:${state.brandstof < 20 ? 'var(--rood)' : state.brandstof < 40 ? 'var(--oranje)' : 'var(--groen)'}"></div>
            </div>
            ${state.schipBeschadigd ? '<div class="stat-rij"><span class="kleur-rood" style="font-size:0.78em">⚠ Schip beschadigd!</span></div>' : ''}
            <div class="stat-rij">
                <span class="stat-naam">Schuld</span>
                <span class="stat-waarde ${state.speler.schuld > 0 ? 'kleur-oranje' : 'kleur-dimmed'}">${state.formatteerKrediet(state.speler.schuld)}</span>
            </div>
            <div class="stat-rij">
                <span class="stat-naam">Nettowaarde</span>
                <span class="stat-waarde kleur-goud">${state.formatteerKrediet(state.berekenNettowaarde())}</span>
            </div>
        `;

        // Lading inventaris
        const geladen = GOEDEREN.filter(g => (state.lading[g.id] || 0) > 0);
        if (geladen.length > 0) {
            const div = document.createElement('div');
            div.innerHTML = '<div class="sectie-header" style="margin-top:8px">Lading</div>';
            geladen.forEach(g => {
                div.innerHTML += `
                    <div class="lading-item">
                        <span>${g.icoon}</span>
                        <span class="naam">${g.naam}</span>
                        <span class="aantal">${state.lading[g.id]}×</span>
                    </div>`;
            });
            container.appendChild(div);
        }
    },

    // =========================================================================
    // HANDEL TAB
    // =========================================================================

    renderHandelTab() {
        const container = document.getElementById('handel-tab');
        const planeet = PLANETEN.find(p => p.id === state.locatie);

        let html = '';

        if (state.schipBeschadigd) {
            html += `<div class="info-balk kleur-rood">⚠ Je schip is beschadigd — ga naar Ruimtehaven om te repareren.</div>`;
        }

        // === LOKALE MARKT / ZWARTE MARKT ===
        const isZwart = state.locatie === 'mortex';
        const marktTitel = isZwart ? `💀 Zwarte Markt — ${planeet.naam}` : `Lokale Markt — ${planeet.naam}`;
        const marktKlasse = isZwart ? 'haven-blok-header zwarte-markt-header' : 'haven-blok-header';

        html += `<div class="haven-blok handel-blok-vol">`;
        html += `<div class="${marktKlasse}">${marktTitel}</div>`;
        if (isZwart) {
            html += `<div class="handel-banner-zwart">⚠️ Goederen gekocht op Mortex worden gemarkeerd als <strong>verdachte lading</strong>. Bij landing op andere planeten: 25% kans op douanecontrole en boete.</div>`;
        }
        html += `<div class="handel-tabel-wrap"><table class="handel-tabel"><thead><tr>
            <th>Goed</th>
            <th class="handel-col-sec">Voorraad</th>
            <th>Aan boord</th>
            <th class="handel-col-sec">Prijs betaald</th>
            <th>Marktprijs</th>
            <th class="handel-col-sec">Prijsrange</th>
            <th>Kopen</th>
            <th>Verkopen</th>
        </tr></thead><tbody>`;

        const gesorteerdeGoederen = [...GOEDEREN].sort((a, b) => a.basisPrijs - b.basisPrijs);

        gesorteerdeGoederen.forEach(goed => {
            const prijs     = state.getPrijs(state.locatie, goed.id);
            const inLading  = state.lading[goed.id] || 0;
            const vrij      = state.schip.laadruimte - state.getLadingGewicht();
            const planeetVoorraadMax = state.planetVoorraden?.[state.locatie]?.[goed.id] ?? 999;
            const maxKoop   = Math.min(vrij, Math.floor(state.speler.krediet / prijs), planeetVoorraadMax);
            const allePrijzen = PLANETEN.map(p => state.getPrijs(p.id, goed.id));
            const minPrijs  = Math.min(...allePrijzen);
            const maxPrijs  = Math.max(...allePrijzen);
            const prijsKlas = prijs === minPrijs ? 'kleur-groen' : prijs === maxPrijs ? 'kleur-rood' : '';
            const tipHtml   = `<span class="goed-tip">${goed.beschrijving}</span>`;

            let marktLabelHtml = '';
            if (planeet.specialiteit?.includes(goed.id)) {
                marktLabelHtml = '<span class="markt-label label-specialiteit">🏭</span>';
            } else if (planeet.vraag?.includes(goed.id)) {
                marktLabelHtml = '<span class="markt-label label-vraag">📈</span>';
            }

            // Planeetvoorraad
            const planeetVoorraad = state.planetVoorraden?.[state.locatie]?.[goed.id] ?? 0;
            const voorraadTd = planeetVoorraad > 0
                ? `<span style="font-family:var(--font-data)">${planeetVoorraad} ton</span>`
                : `<span class="kleur-dimmed">0 ton</span>`;

            // Aan boord
            const aankoopPrijs = state.aankoopPrijzen[goed.id];
            const verdacht = state.ladingVerdacht?.[goed.id] || 0;
            let aanBoordTd = '—';
            if (inLading > 0) {
                aanBoordTd = `<strong>${inLading} ton</strong>`;
                if (verdacht > 0) aanBoordTd += ` <span class="verdacht-icoon" title="${verdacht} ton verdachte lading">⚠️</span>`;
            }
            // Prijs betaald
            let prijsBetaaldTd = '—';
            if (inLading > 0 && aankoopPrijs) {
                prijsBetaaldTd = `<span style="font-family:var(--font-data)">${Math.round(aankoopPrijs)} cr</span>`;
            }

            // Marktdruk
            const mod = state.marktModifiers?.[state.locatie]?.[goed.id] ?? 1.0;
            let modHtml = '';
            if (mod > 1.03) modHtml = `<span class="markt-mod markt-mod-op" title="Prijs gestegen door vraag">▲</span>`;
            else if (mod < 0.97) modHtml = `<span class="markt-mod markt-mod-neer" title="Prijs gedaald door aanbod">▼</span>`;

            html += `<tr>
                <td><span class="goed-icoon">${goed.icoon}</span><span class="goed-tip-wrap">${goed.naam}${marktLabelHtml}${tipHtml}</span></td>
                <td class="handel-col-sec">${voorraadTd}</td>
                <td style="font-family:var(--font-data)">${aanBoordTd}</td>
                <td class="handel-col-sec" style="font-family:var(--font-data)">${prijsBetaaldTd}</td>
                <td class="${prijsKlas}" style="font-family:var(--font-data)">${state.formatteerKrediet(prijs)}${modHtml}</td>
                <td class="handel-col-sec" style="font-family:var(--font-data)">${minPrijs}–${maxPrijs}</td>
                <td>
                    <div class="actie-rij">
                        <button class="knop primair klein" onclick="App.koopN('${goed.id}', 1, event)" ${maxKoop<=0?'disabled':''}>+1</button>
                        <button class="knop primair klein" onclick="App.koopN('${goed.id}', 10, event)" ${maxKoop<10?'disabled':''}>+10</button>
                        <button class="knop primair klein" onclick="App.koopN('${goed.id}', 'max', event)" ${maxKoop<=0?'disabled':''}>max</button>
                    </div>
                </td>
                <td>
                    <div class="actie-rij">
                        <button class="knop primair klein" onclick="App.verkoopN('${goed.id}', 1, event)" ${inLading<=0?'disabled':''}>−1</button>
                        <button class="knop primair klein" onclick="App.verkoopN('${goed.id}', 10, event)" ${inLading<10?'disabled':''}>−10</button>
                        <button class="knop primair klein" onclick="App.verkoopN('${goed.id}', 'alles', event)" ${inLading<=0?'disabled':''}>alles</button>
                    </div>
                </td>
            </tr>`;
        });

        html += '</tbody></table></div></div>';

        // === GALACTISCHE MARKT ===
        html += this._renderGalactischeMarkt();

        container.innerHTML = html;
        this._initGalactTooltips(container);
    },

    _renderGalactischeMarkt() {
        const bestemming = state.geselecteerdePlaneet;
        let html = `<div class="haven-blok handel-blok-vol" style="margin-top:16px"><div class="haven-blok-header">🌌 Galactische Markt — Prijsvergelijking</div>`;
        html += '<div class="galact-wrap"><table class="galact-tabel"><thead><tr>';
        html += '<th class="galact-goed-col">Goed</th>';
        html += '<th class="galact-prijsrange">Prijsrange</th>';

        PLANETEN.forEach(p => {
            const isHier = p.id === state.locatie;
            const isBest = p.id === bestemming;
            const thKlas = isHier ? 'galact-huidig-th' : isBest ? 'galact-bestemming-th' : '';
            const tipAttr = isHier ? '' : `data-galact-tip="${p.naam}"`;
            const clickAttr = isHier ? '' : `onclick="App.selecteerBestemming('${p.id}')" style="cursor:pointer"`;
            html += `<th class="${thKlas}" style="color:${p.kleur}" ${tipAttr} ${clickAttr}>${p.naam.replace(' Station','')}</th>`;
        });
        html += '</tr></thead><tbody>';

        const gesorteerdeGoederen = [...GOEDEREN].sort((a, b) => a.basisPrijs - b.basisPrijs);

        gesorteerdeGoederen.forEach(goed => {
            const allePrijzen = PLANETEN.map(p => state.getPrijs(p.id, goed.id));
            const minPrijs = Math.min(...allePrijzen);
            const maxPrijs = Math.max(...allePrijzen);
            const tipMin = Math.max(5, Math.round(goed.basisPrijs * 0.25));
            const tipMax = Math.round(goed.basisPrijs * 2.2);
            const tipHtml2 = `<span class="goed-tip">${goed.beschrijving}</span>`;

            html += `<tr><td class="galact-goed-col"><span>${goed.icoon}</span><span class="goed-tip-wrap"> ${goed.naam}${tipHtml2}</span></td>`;
            html += `<td class="galact-prijsrange">${tipMin}–${tipMax}</td>`;

            PLANETEN.forEach(p => {
                const prijs = state.getPrijs(p.id, goed.id);
                const isHier = p.id === state.locatie;
                const isBest = p.id === bestemming;

                let klasse = isHier ? 'galact-cel galact-huidig' : isBest ? 'galact-cel galact-bestemming' : 'galact-cel';
                if (prijs === minPrijs) klasse += ' galact-goedkoop';
                else if (prijs === maxPrijs) klasse += ' galact-duur';

                html += `<td class="${klasse}">${prijs}</td>`;
            });

            html += '</tr>';
        });

        html += '</tbody></table></div></div>';
        return html;
    },

    _initGalactTooltips(container) {
        const tooltip = document.getElementById('top-tooltip');
        if (!tooltip) return;
        container.querySelectorAll('.galact-tabel thead th[data-galact-tip]').forEach(th => {
            th.addEventListener('mouseenter', () => {
                tooltip.innerHTML = `Kies bestemming`;
                tooltip.classList.remove('verborgen');
                this._positioneerTooltip(tooltip, th);
            });
            th.addEventListener('mouseleave', () => tooltip.classList.add('verborgen'));
        });
    },

    // =========================================================================
    // HAVEN TAB
    // =========================================================================

    renderHavenTab() {
        const container = document.getElementById('haven-tab');
        const planeet = PLANETEN.find(p => p.id === state.locatie);
        let html = '<div class="haven-raster">';

        // === REPARATIE (tutorial: alleen als onderhoud unlocked) ===
        if (state.isUnlocked('onderhoud')) {
            const hp = state.schipHP ?? 0;
            const maxHP = state.schip?.maxHP ?? 0;
            const hpPct = maxHP > 0 ? Math.round(hp / maxHP * 100) : 100;
            const hpKleur = hpPct >= 80 ? 'var(--groen)' : hpPct >= 50 ? 'var(--oranje)' : 'var(--rood)';
            const repKosten = state.berekenReparatieKosten();
            const isTechton = state.locatie === 'techton';
            const kanBetalen = state.speler.krediet >= repKosten;
            const hpAnimeer = this._animeerHP;
            const hpStartPct = hpAnimeer ? (this._hpPctVoor ?? 0) : hpPct;
            let repHtml = `<div style="display:flex;align-items:center;gap:14px;margin-bottom:8px">
                <span style="font-size:1.1em;color:${hpKleur};font-weight:bold">❤ ${hp}/${maxHP}</span>
                <div class="lading-balk-container" style="flex:1;margin:0"><div id="hp-balk" class="lading-balk${hpAnimeer ? ' animeer' : ''}" style="width:${hpStartPct}%;background:${hpKleur}" data-target="${hpPct}"></div></div>
                <span class="kleur-dimmed" style="font-size:0.82em">${hpPct}%</span>
            </div>`;
            if (repKosten === 0) {
                repHtml += `<div class="kleur-groen" style="font-size:0.88em">✓ Schip is in topconditie.</div>`;
            } else {
                repHtml += `<div class="kleur-${hpPct < 50 ? 'rood' : 'oranje'}" style="margin-bottom:8px;font-size:0.88em">⚠ ${maxHP - hp} HP schade</div>`;
                if (isTechton) repHtml += `<div class="kleur-groen" style="font-size:0.8em;margin-bottom:6px">★ Techton-korting: 50% goedkoper!</div>`;
                repHtml += `<button class="knop ${hpPct < 50 ? 'gevaar' : 'primair'} klein" onclick="App.repareerSchip()" ${!kanBetalen ? 'disabled' : ''}>Repareer volledig (${state.formatteerKrediet(repKosten)})</button>`;
                if (!kanBetalen) repHtml += `<div class="kleur-rood" style="font-size:0.8em;margin-top:5px">Onvoldoende credits</div>`;
            }
            html += `<div class="haven-blok haven-blok-reparatie"><div class="haven-blok-header">🔧 Scheepsconditie</div><div class="haven-blok-inhoud">${repHtml}</div></div>`;
        } // einde onderhoud-check

        // === PASSAGIERS (tutorial: alleen als passagiers unlocked) ===
        if (state.isUnlocked('passagiers')) {
        const maxPax = state.schip?.passagiersCapaciteit || 0;
        const aanBoord = state.passagiers ?? 0;
        const wachtendObj = state.wachtendePassagiers?.[state.locatie] || { aantal: 0, prijs: 0 };
        let paxHtml = '';
        if (maxPax === 0) {
            paxHtml = `<div class="kleur-dimmed" style="font-size:0.85em">Je huidige schip heeft geen passagiersruimte.</div>`;
        } else {
            const verwacht = aanBoord > 0 ? aanBoord * (state.passagiersTicketprijs || 0) : null;
            const kanInstappen = wachtendObj.aantal > 0 && aanBoord < maxPax;
            const instappers = Math.min(wachtendObj.aantal, maxPax - aanBoord);
            const isPaxSchip = state.schip?.type === 'pax';

            paxHtml = `
            <div class="pax-sectie-label">Passagiers</div>
            <div class="pax-info-raster" style="margin-bottom:10px">
                <div class="pax-info-rij"><span class="kleur-dimmed">Wachtend</span><strong>${wachtendObj.aantal}</strong></div>
                <div class="pax-info-rij"><span class="kleur-dimmed">Aan boord</span><strong>${aanBoord} / ${maxPax}</strong></div>
                ${verwacht !== null ? `<div class="pax-info-rij"><span class="kleur-dimmed">Bij aankomst</span><strong class="kleur-goud">+${state.formatteerKrediet(verwacht)}</strong></div>` : ''}
                ${isPaxSchip ? `<div class="pax-info-rij" style="grid-column:1/-1"><span class="kleur-accent" style="font-size:0.78em">🛳️ Passagiersschip — trekt van nature meer reizigers</span></div>` : ''}
            </div>
            ${kanInstappen ? `<button class="knop succes klein" style="margin-bottom:12px" onclick="App.boardPassagiers()">Neem ${instappers} passagier${instappers > 1 ? 's' : ''} aan boord</button>` : ''}
            <div class="pax-sectie-label">Ticketprijs</div>
            <div class="pax-info-raster" style="margin-bottom:8px">
                <div class="pax-info-rij"><span class="kleur-dimmed">Huidige prijs</span><strong class="kleur-groen">${state.formatteerKrediet(wachtendObj.prijs)}/pp</strong></div>
            </div>
            <div class="kleur-dimmed" style="font-size:0.78em;margin-bottom:6px">Wijzigen <span style="opacity:0.6">(geldt direct)</span></div>
            <div style="display:flex;gap:6px;align-items:center">
                <input type="number" id="ticket-prijs-invoer" class="aantal-invoer" min="50" max="2000" value="${wachtendObj.prijs}" style="width:80px">
                <button class="knop primair klein" onclick="App.setTicketPrijs()">Stel in</button>
            </div>`;
        }
        html += `<div class="haven-blok haven-blok-passagiers"><div class="haven-blok-header">🧳 Passagiers</div><div class="haven-blok-inhoud">${paxHtml}</div></div>`;
        } // einde passagiers-check

        // === MARKETING (tutorial: alleen als marketing unlocked én schip passagiersruimte heeft) ===
        if (state.isUnlocked('marketing') && (state.schip?.passagiersCapaciteit || 0) > 0) {
            const mKosten = state.berekenMarketingKosten();
            const kanBetalen = state.speler.krediet >= mKosten;
            let mktHtml = '';
            if (state.marketingActief) {
                const campNaam = state.marketingActief.planeet
                    ? PLANETEN.find(p => p.id === state.marketingActief.planeet)?.naam ?? state.marketingActief.planeet
                    : 'volgende bestemming';
                mktHtml = `<div class="kleur-groen" style="font-size:0.88em">✓ Campagne actief voor <strong>${campNaam}</strong> — extra passagiers en resources wachten bij aankomst.</div>`;
            } else {
                mktHtml = `<div style="font-size:0.85em;margin-bottom:8px">Een marketingcampagne verhoogt de beschikbare goederen en passagiers op je volgende bestemming.</div>
                    <button class="knop primair klein" onclick="App.koopMarketing()" ${!kanBetalen ? 'disabled' : ''}>Start campagne (${state.formatteerKrediet(mKosten)})</button>`;
            }
            html += `<div class="haven-blok"><div class="haven-blok-header">📢 Marketing</div><div class="haven-blok-inhoud">${mktHtml}</div></div>`;
        } // einde marketing-check

        // === BRANDSTOF (tutorial: alleen als brandstof unlocked) ===
        if (state.isUnlocked('brandstof')) {
        const bPrijsBasis = state.brandstofPrijzen[state.locatie] || 12;
        const bPrijs = state._effectieveBrandstofPrijs();
        const bIsKorting = state.locatie === 'pyroflux';
        const tank = state.schip?.brandstofTank || 80;
        const vrij = tank - state.brandstof;
        const koopMaxKosten = vrij * bPrijs;
        const brandstofPct = Math.round(state.brandstof / tank * 100);
        const bKleur = state.brandstof < 20 ? 'var(--rood)' : state.brandstof < 40 ? 'var(--oranje)' : 'var(--groen)';
        const bTekstKlasse = state.brandstof < 20 ? 'kleur-rood' : state.brandstof < 40 ? 'kleur-oranje' : 'kleur-groen';
        const prijsHtml = bIsKorting
            ? `<s>${bPrijsBasis} cr/l</s> <strong class="kleur-goud">${bPrijs} cr/l</strong> <span class="markt-label label-specialiteit">−40% Energiedepot</span>`
            : `<strong class="kleur-goud">${bPrijs} cr/l</strong>`;
        html += `<div class="haven-blok haven-blok-brandstof"><div class="haven-blok-header">${FUEL_IMG} Brandstof</div><div class="haven-blok-inhoud">
            <div style="margin-bottom:4px"><strong class="${bTekstKlasse}">${state.brandstof} / ${tank} liter</strong></div>
            <div class="lading-balk-container" style="margin:0 0 8px"><div id="brandstof-balk" class="lading-balk${this._animeerBrandstof ? ' animeer' : ''}" style="width:${this._animeerBrandstof ? (this._brandstofPctVoor ?? 0) : brandstofPct}%;background:${bKleur}" data-target="${brandstofPct}"></div></div>
            <div style="font-size:0.87em;margin-bottom:8px">Brandstofprijs: ${prijsHtml}</div>
            <div class="brandstof-acties">
                <input type="number" id="brandstof-aantal" class="aantal-invoer" min="1" max="${vrij}" value="${Math.min(10, vrij)}" ${vrij <= 0 ? 'disabled' : ''}>
                <button class="knop primair klein" onclick="App.koopBrandstof()" ${vrij <= 0 ? 'disabled' : ''}>Koop</button>
                <button class="knop primair klein" onclick="App.koopMaxBrandstof()" ${vrij <= 0 ? 'disabled' : ''}>Koop max (${state.formatteerKrediet(koopMaxKosten)})</button>
            </div>
        </div></div>`;
        } // einde brandstof-check

        html += '</div>'; // sluit haven-raster
        container.innerHTML = html;

        // Animeer brandstofbalk na render (alleen als vlag gezet)
        if (this._animeerBrandstof) {
            this._animeerBrandstof = false;
            requestAnimationFrame(() => {
                const balk = document.getElementById('brandstof-balk');
                if (balk) balk.style.width = balk.dataset.target + '%';
            });
        }

        // Animeer HP-balk na render (alleen als vlag gezet)
        if (this._animeerHP) {
            this._animeerHP = false;
            requestAnimationFrame(() => {
                const balk = document.getElementById('hp-balk');
                if (balk) balk.style.width = balk.dataset.target + '%';
            });
        }
    },

    // =========================================================================
    // PLANEET TAB — planeet-specifieke diensten
    // =========================================================================

    renderPlaneetTab() {
        const container = document.getElementById('planeet-tab');
        const planeet   = PLANETEN.find(p => p.id === state.locatie);
        let html = `<div class="planeet-dienst-header">🪐 ${planeet.naam} — Planeetdiensten</div><div class="planeet-raster">`;

        if (state.locatie === 'nexoria') {
            html += this._renderNexoria();
        } else if (state.locatie === 'ferrum') {
            html += this._renderFerrum();
        } else if (state.locatie === 'agria') {
            html += this._renderAgria();
        } else if (state.locatie === 'techton') {
            html += this._renderTechton();
        } else if (state.locatie === 'luxoria') {
            html += this._renderLuxoria();
        } else if (state.locatie === 'mortex') {
            html += this._renderMortex();
        } else {
            html += `<div class="planeet-geen-dienst">Geen speciale diensten beschikbaar op ${planeet.naam}.</div>`;
        }

        html += '</div>'; // sluit planeet-raster
        container.innerHTML = html;

        // Initialiseer preview direct na render
        if (state.locatie === 'ferrum') this._updateFerrumPreview();
    },

    // =========================================================================
    // NEXORIA — GALACTISCHE BEURS
    // =========================================================================

    _renderNexoria() {
        const portWaarde = state.getPortefeuilleWaarde();
        let html = `<div class="planeet-dienst-blok planeet-blok-vol-breed">
            <div class="sectie-header">📈 Galactische Beurs</div>
            <div class="beurs-handel-info">
                Portefeuillewaarde: <strong class="kleur-goud">${state.formatteerKrediet(portWaarde)}</strong>
                &nbsp;|&nbsp; Beschikbaar: <strong>${state.formatteerKrediet(state.speler.krediet)}</strong>
                &nbsp;|&nbsp; <span class="kleur-dimmed" style="font-size:0.82em">Koersen bijgewerkt per reis</span>
            </div>`;
        html += this._renderAandelenKaarten(true);
        html += '</div>';
        return html;
    },

    _renderFerrum() {
        const ferroiet    = state.lading['ferroiet'] || 0;
        const maxBatches  = Math.floor(ferroiet / 3);
        const kristPrijs  = state.getPrijs('ferrum', 'kristalliet');

        let html = `<div class="planeet-dienst-blok">
            <div class="sectie-header">⚙️ Ertsverwerkingsfaciliteit</div>
            <p class="kleur-dimmed" style="font-size:0.83em;margin:4px 0 12px">
                Verwerk ruwe Ferroiet tot waardevolle Kristalliet. 3 ton Ferroiet → 1 ton Kristalliet.
            </p>
            <div class="planeet-dienst-rij">
                <span class="label">🔩 Ferroiet in ruim</span>
                <span class="waarde">${ferroiet} ton</span>
            </div>
            <div class="planeet-dienst-rij">
                <span class="label">Beschikbare batches</span>
                <span class="waarde ${maxBatches === 0 ? 'kleur-rood' : 'kleur-groen'}">${maxBatches}</span>
            </div>
            <div class="planeet-dienst-rij">
                <span class="label">💠 Kristalliet marktprijs (hier)</span>
                <span class="waarde kleur-goud">${state.formatteerKrediet(kristPrijs)}/ton</span>
            </div>`;

        if (maxBatches > 0) {
            html += `<div class="planeet-dienst-batch">
                <label for="ferrum-batches">Aantal batches:</label>
                <input type="number" id="ferrum-batches" class="aantal-invoer" min="1" max="${maxBatches}" value="1"
                    oninput="UI._updateFerrumPreview()">
                <button class="knop dimmed klein" onclick="UI._updateFerrumBatches(-1)">−</button>
                <button class="knop dimmed klein" onclick="UI._updateFerrumBatches(1)">+</button>
            </div>
            <div id="ferrum-preview" class="planeet-dienst-blok" style="margin-bottom:10px;padding:10px 14px">
            </div>
            <button class="knop primair" id="ferrum-verwerk-knop" onclick="App.verwerkFerroiet()">⚙️ Verwerk</button>`;
        } else {
            html += `<p class="kleur-rood" style="margin-top:12px;font-size:0.85em">
                ⚠ Minimaal 3 ton Ferroiet nodig voor verwerking.
            </p>`;
        }

        html += '</div>';
        return html;
    },

    _updateFerrumBatches(delta) {
        const input = document.getElementById('ferrum-batches');
        if (!input) return;
        const max = parseInt(input.max, 10);
        const nieuw = Math.max(1, Math.min(max, (parseInt(input.value, 10) || 1) + delta));
        input.value = nieuw;
        this._updateFerrumPreview();
    },

    _updateFerrumPreview() {
        const input   = document.getElementById('ferrum-batches');
        const preview = document.getElementById('ferrum-preview');
        const knop    = document.getElementById('ferrum-verwerk-knop');
        if (!input || !preview) return;

        const batches     = Math.max(1, parseInt(input.value, 10) || 1);
        const ferroiet    = state.lading['ferroiet'] || 0;
        const maxBatches  = Math.floor(ferroiet / 3);
        const effectief   = Math.min(batches, maxBatches);
        const kosten      = effectief * 120;
        const output      = effectief;
        const kanVerwerken = effectief > 0 && state.speler.krediet >= kosten;

        preview.innerHTML = `
            <div class="planeet-dienst-rij">
                <span class="label">🔩 Ferroiet verbruikt</span>
                <span class="waarde kleur-rood">−${effectief * 3} ton</span>
            </div>
            <div class="planeet-dienst-rij">
                <span class="label">💠 Kristalliet output</span>
                <span class="waarde kleur-groen">+${output} ton</span>
            </div>
            <div class="planeet-dienst-rij">
                <span class="label">Verwerkingskosten</span>
                <span class="waarde ${kanVerwerken ? '' : 'kleur-rood'}">${state.formatteerKrediet(kosten)}</span>
            </div>`;

        if (knop) knop.disabled = !kanVerwerken;
    },

    // =========================================================================
    // AGRIA VEILING
    // =========================================================================

    _renderAgria() {
        const veiling = state.agriaVeiling;
        let html = `<div class="planeet-dienst-blok">
            <div class="sectie-header">🔨 Agria Oogstveiling</div>`;

        if (!veiling) {
            html += `<p class="kleur-dimmed" style="font-size:0.87em;padding:14px 0">
                Vandaag is er geen veiling op Agria. Kom de volgende keer terug.
            </p>`;
        } else if (veiling.fase === 'open') {
            const benodigdGewicht = veiling.hoeveelheid * veiling.goedGewicht;
            const vrijeRuimte     = state.schip.laadruimte - state.getLadingGewicht();
            const ruimteWaarschuwing = vrijeRuimte < benodigdGewicht;
            const marktprijsPerStuk  = state.getPrijs('agria', veiling.goedId);
            const totaleMarktwaarde  = marktprijsPerStuk * veiling.hoeveelheid;
            const minPerStuk         = Math.round(veiling.minimumprijs / veiling.hoeveelheid);

            html += `<p class="kleur-dimmed" style="font-size:0.83em;margin:4px 0 12px">
                Gesloten bod — iedereen biedt éénmalig tegelijk. Hoogste bieder wint het lot.
            </p>
            <div class="planeet-dienst-rij">
                <span class="label">📦 Lot</span>
                <span class="waarde">${veiling.hoeveelheid}× ${veiling.goedIcoon} ${veiling.goedNaam}
                    <span class="kleur-dimmed">(${benodigdGewicht} ton)</span></span>
            </div>
            <div class="planeet-dienst-rij">
                <span class="label">🏷 Minimumprijs</span>
                <span class="waarde kleur-goud">${state.formatteerKrediet(veiling.minimumprijs)}
                    <span class="kleur-dimmed" style="font-size:0.85em">(${state.formatteerKrediet(minPerStuk)}/stuk)</span></span>
            </div>
            <div class="planeet-dienst-rij">
                <span class="label">📊 Marktwaarde</span>
                <span class="waarde">${state.formatteerKrediet(totaleMarktwaarde)}
                    <span class="kleur-dimmed" style="font-size:0.85em">(${state.formatteerKrediet(marktprijsPerStuk)}/stuk)</span></span>
            </div>
            <div class="planeet-dienst-rij">
                <span class="label">💰 Jouw credits</span>
                <span class="waarde">${state.formatteerKrediet(state.speler.krediet)}</span>
            </div>
            <div class="planeet-dienst-rij">
                <span class="label">👥 Mededingers</span>
                <span class="waarde">${veiling.npcDeelnemers.map(n => `${n.icoon} ${n.naam}`).join(', ')}</span>
            </div>`;

            if (ruimteWaarschuwing) {
                html += `<div class="info-balk" style="background:rgba(255,140,66,0.1);border-color:rgba(255,140,66,0.3);color:var(--oranje);margin:10px 0;font-size:0.83em">
                    ⚠ Ruimtewaarschuwing: je hebt ${vrijeRuimte} ton vrij maar dit lot weegt ${benodigdGewicht} ton.
                    Bij winst worden de goederen <strong>niet</strong> geladen maar de credits wél afgeschreven.
                </div>`;
            }

            html += `<div class="planeet-dienst-batch" style="margin-top:14px">
                <label for="agria-bod">Jouw bod:</label>
                <input type="number" id="agria-bod" class="aantal-invoer" style="width:140px"
                    min="${veiling.minimumprijs}" value="${veiling.minimumprijs}" step="50">
                <button class="knop primair" onclick="App.plaatsVeilingBod()">🔨 Bod plaatsen</button>
            </div>`;
        } else {
            html += this._renderAgriaResultaat(veiling);
        }

        html += '</div>';
        return html;
    },

    _renderAgriaResultaat(veiling) {
        const r = veiling.resultaat;
        let html = '';

        if (r.gewonnen) {
            html += `<div class="veiling-resultaat-banner veiling-gewonnen">🏆 Jij wint de veiling!</div>`;
            if (r.ruimteTeVol) {
                html += `<p class="kleur-rood" style="font-size:0.85em;margin:8px 0 14px">
                    Je ruim was te vol — de goederen zijn achtergelaten.
                    ${state.formatteerKrediet(r.spelerBod)} afgeschreven.
                </p>`;
            } else {
                html += `<p class="kleur-groen" style="font-size:0.85em;margin:8px 0 14px">
                    ${veiling.hoeveelheid}× ${veiling.goedIcoon} ${veiling.goedNaam} geladen in je ruim.
                </p>`;
            }
        } else {
            html += `<div class="veiling-resultaat-banner veiling-verloren">❌ Veiling verloren</div>`;
            html += `<p class="kleur-dimmed" style="font-size:0.85em;margin:8px 0 14px">
                Jouw bod was niet hoog genoeg. Probeer het bij een volgende veiling.
            </p>`;
        }

        html += `<table class="veiling-boden-tabel"><thead>
            <tr><th>Bieder</th><th style="text-align:right">Bod</th></tr>
        </thead><tbody>`;

        r.alleBoden.forEach((b, i) => {
            const isWinnaar = i === 0;
            html += `<tr class="${isWinnaar ? 'veiling-winnaar-rij' : ''}">
                <td>${b.isSpeler ? '👤 Jij' : b.naam} ${isWinnaar ? '🏆' : ''}</td>
                <td style="font-family:var(--font-data);text-align:right">${state.formatteerKrediet(b.bod)}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        return html;
    },

    // =========================================================================
    // TECHTON SCHEEPSWERF
    // =========================================================================

    _renderTechton() {
        const huidig = state.schip;
        const volgendMark = huidig.mark + 1;

        let html = `<div class="planeet-dienst-blok planeet-blok-vol-breed">
            <div class="sectie-header">🛸 Geavanceerde Scheepswerf</div>
            <p class="kleur-dimmed" style="font-size:0.83em;margin:4px 0 12px">
                Huidig schip: <strong>${huidig.naam}</strong>
                ${huidig.mark >= 4 ? '<br><span style="color:var(--groen)">Je hebt het hoogste Mark bereikt voor dit scheepstype.</span>' : ''}
            </p>`;

        if (huidig.mark >= 4) {
            html += `</div>`;
            return html;
        }

        // Bepaal beschikbare opties
        const opties = SCHEPEN.filter(s =>
            s.type === huidig.type &&
            s.mark === volgendMark &&
            (huidig.specialisatie === null || s.specialisatie === huidig.specialisatie || volgendMark === 3)
        );

        if (opties.length === 0) {
            html += `<p class="kleur-dimmed">Geen upgrades beschikbaar.</p></div>`;
            return html;
        }

        if (volgendMark === 3) {
            html += `<p style="font-size:0.85em;margin-bottom:12px;color:var(--accent)">⚠ Kies je specialisatie — deze keuze is permanent.</p>`;
        }

        html += `<div class="upgrade-raster">`;

        opties.forEach(schip => {
            const kan = state.speler.krediet >= schip.prijs;
            const specials = [];
            if (schip.immuunPiraten) specials.push('🛡️ Immuun voor piraten');
            if (schip.immuunMortexConfiscatie) specials.push('🔒 Mortex-lading beschermd');
            if (schip.douaneKansOverride !== null && schip.douaneKansOverride !== undefined) specials.push(`🕵️ Douanekans ${Math.round(schip.douaneKansOverride * 100)}%`);
            if (schip.spearheadBonus) specials.push('⚡ −8% aankoopprijzen');
            if (schip.ticketMultiplier > 1) specials.push(`🥂 Tickets ×${schip.ticketMultiplier}`);
            if (schip.ticketMultiplier < 1) specials.push(`🚌 Tickets ×${schip.ticketMultiplier} (volume)`);

            html += `<div class="upgrade-kaart">
                <div style="font-size:1.6em;margin-bottom:5px">${schip.icoon}</div>
                <h4>${schip.naam}</h4>
                <p style="font-size:0.83em">${schip.beschrijving}</p>
                <div class="schip-stat"><span>Snelheid</span><span class="waarde">${schip.snelheid}</span></div>
                <div class="schip-stat"><span>Laadruimte</span><span class="waarde">${schip.laadruimte} ton</span></div>
                <div class="schip-stat"><span>Brandstoftank</span><span class="waarde">${schip.brandstofTank} l</span></div>
                <div class="schip-stat"><span>Passagiers</span><span class="waarde">${schip.passagiersCapaciteit > 0 ? schip.passagiersCapaciteit : '—'}</span></div>
                <div class="schip-stat"><span>Schild</span><span class="waarde">${schip.schild}</span></div>
                ${specials.length > 0 ? `<div style="margin:6px 0;font-size:0.78em;color:var(--accent)">${specials.join('<br>')}</div>` : ''}
                <div class="upgrade-prijs" style="margin-top:8px">
                    Prijs: <strong>${state.formatteerKrediet(schip.prijs)}</strong>
                </div>
                <button class="knop primair klein" ${!kan ? 'disabled' : ''} onclick="App.koopSchip('${schip.id}')">
                    ${kan ? (volgendMark === 3 ? 'Specialiseer →' : 'Upgrade →') : 'Onvoldoende credits'}
                </button>
            </div>`;
        });

        html += `</div></div>`;
        return html;
    },

    // =========================================================================
    // LUXORIA CASINO
    // =========================================================================

    _casinoAnimeer: false,

    _renderLuxoria() {
        const casino = state.luxoriaCasino;
        const resterend = 3 - casino.gokbeurtenDitBezoek;
        const laatste = casino.laatste;

        let html = `<div class="planeet-dienst-blok">
            <div class="sectie-header">🎰 Casino Stellaris</div>
            <p class="kleur-dimmed" style="font-size:0.83em;margin:4px 0 12px">
                Galactisch Kaartspel — hoogste kaart wint. Gelijkspel is verlies.<br>
                Winkans: 45% &nbsp;|&nbsp; Uitbetaling bij winst: 1.9×
            </p>
            <div class="casino-beurten">Gokbeurten resterend dit bezoek: <strong>${resterend}/3</strong></div>`;

        // Kaart arena
        const animeer = this._casinoAnimeer && laatste;
        this._casinoAnimeer = false;

        if (laatste) {
            const sWin = laatste.gewonnen;
            const sKls = sWin ? 'casino-kaart-winnaar' : 'casino-kaart-verliezer';
            const cKls = sWin ? 'casino-kaart-verliezer' : 'casino-kaart-winnaar';
            html += `<div class="casino-arena">
                <div class="casino-kaart-wrap">
                    <div class="casino-kaart ${sKls}${animeer ? ' animeer' : ''}">${laatste.spelerKaart}</div>
                    <div class="casino-label">Jij</div>
                </div>
                <div class="casino-vs">VS</div>
                <div class="casino-kaart-wrap">
                    <div class="casino-kaart ${cKls}${animeer ? ' animeer animeer-vertraagd' : ''}">${laatste.casinoKaart}</div>
                    <div class="casino-label">Casino</div>
                </div>
            </div>`;
            const netto = sWin ? Math.floor(laatste.inzet * 0.9) : -laatste.inzet;
            const resultKls = sWin ? 'casino-resultaat-gewonnen' : 'casino-resultaat-verloren';
            const resultTekst = sWin
                ? `🏆 Gewonnen! +${state.formatteerKrediet(netto)}`
                : `💀 Verloren. −${state.formatteerKrediet(laatste.inzet)}`;
            html += `<div class="casino-resultaat ${resultKls}">${resultTekst}</div>`;
        } else {
            html += `<div class="casino-arena">
                <div class="casino-kaart-wrap">
                    <div class="casino-kaart casino-kaart-wacht">?</div>
                    <div class="casino-label">Jij</div>
                </div>
                <div class="casino-vs">VS</div>
                <div class="casino-kaart-wrap">
                    <div class="casino-kaart casino-kaart-wacht">?</div>
                    <div class="casino-label">Casino</div>
                </div>
            </div>`;
        }

        // Inzetknopen
        const uitgespeeld = resterend <= 0;
        html += `<div class="casino-inzet-rij">`;
        [100, 1000, 2500, 5000].forEach(inzet => {
            const geenKrediet = state.speler.krediet < inzet;
            const dis = uitgespeeld || geenKrediet ? 'disabled' : '';
            html += `<button class="knop dimmed klein" onclick="App.speelCasino(${inzet})" ${dis}>${state.formatteerKrediet(inzet)}</button>`;
        });
        html += `</div>`;

        if (uitgespeeld) {
            html += `<p class="kleur-dimmed" style="font-size:0.82em;margin-top:8px">Geen gokbeurten meer. Kom terug bij een volgend bezoek.</p>`;
        }

        html += '</div>';

        // === CREW CASINO-UITJE ===
        {
            const crew = state.crew;
            if (crew && crew.grootte > 0) {
                const sindsLaatst = state.beurt - (crew.casinoBeurt ?? -99);
                const beschikbaar = sindsLaatst >= 15;
                const happinessKleur = crew.happiness >= 70 ? 'var(--groen)' : crew.happiness >= 40 ? 'var(--oranje)' : 'var(--rood)';
                html += `<div class="planeet-dienst-blok" style="margin-top:12px">
                    <div class="sectie-header">🎉 Crew Uitje</div>
                    <p class="kleur-dimmed" style="font-size:0.83em;margin:4px 0 10px">
                        Laat je bemanning een avondje los in Casino Stellaris. +25 happiness — gratis!
                    </p>
                    <div class="stat-rij" style="margin-bottom:8px">
                        <span class="kleur-dimmed">Crew happiness</span>
                        <span style="color:${happinessKleur};font-weight:bold">${crew.happiness}/100</span>
                    </div>
                    ${beschikbaar
                        ? `<button class="knop succes klein" onclick="App.casinoCrewUitje()">🎉 Stuur crew naar casino (+25 happiness)</button>`
                        : `<button class="knop dimmed klein" disabled>Crew heeft nog rust nodig — nog ${15 - sindsLaatst} beurten</button>`
                    }
                </div>`;
            }
        }

        return html;
    },

    // =========================================================================
    // MORTEX ILLEGALE SCHEEPSWERF
    // =========================================================================

    _renderMortex() {
        const afgeschermd = state.mortexUpgrades?.afgeschermd;
        const kosten = 8000;
        const kanKopen = !afgeschermd && state.speler.krediet >= kosten;

        let html = `<div class="planeet-dienst-blok">
            <div class="sectie-header">🔧 Illegale Scheepswerf</div>
            <p class="kleur-dimmed" style="font-size:0.83em;margin:4px 0 14px">
                Illiciete modificaties — geen vragen gesteld. Hoge prijzen, geen garanties.
            </p>
            <div class="upgrade-raster">
                <div class="upgrade-kaart">
                    <div style="font-size:1.4em;margin-bottom:5px">🛡️</div>
                    <h4>Afgeschermde Vrachtopslag</h4>
                    <p>Blokkeert douanescanners. Verlaagt kans op douanecontrole van <strong>25% naar 5%</strong>.</p>
                    <div class="upgrade-prijs" style="margin-top:8px">
                        <strong class="kleur-goud">${state.formatteerKrediet(kosten)}</strong>
                    </div>
                    ${afgeschermd
                        ? `<button class="knop dimmed klein" disabled>✓ Geïnstalleerd</button>`
                        : `<button class="knop primair klein" ${!kanKopen ? 'disabled' : ''} onclick="App.koopAfgeschermdVrachtruim()">
                            ${kanKopen ? 'Koop upgrade' : 'Onvoldoende credits'}
                           </button>`
                    }
                </div>
            </div>
        </div>`;
        return html;
    },

    // =========================================================================
    // FINANCIËN TAB — bank + portfolio als tegels
    // =========================================================================

    renderFinancienTab() {
        const container = document.getElementById('financien-tab');
        const planeet = PLANETEN.find(p => p.id === state.locatie);
        let html = '<div class="haven-raster">';

        // === CREW MANAGEMENT (tutorial: alleen als bemanning unlocked) ===
        if (state.isUnlocked('bemanning')) {
            const crew = state.crew;
            if (crew && crew.grootte > 0) {
                const weekTotaal = crew.grootte * crew.salaris * 7;
                const beurtenTot = crew.volgendeBetaalBeurt - state.beurt;
                const isAchterstallig = beurtenTot <= 0;
                const dagenAchter = isAchterstallig ? state.beurt - crew.volgendeBetaalBeurt : 0;
                const happinessKleur = crew.happiness >= 70 ? 'var(--groen)' : crew.happiness >= 40 ? 'var(--oranje)' : 'var(--rood)';
                const happinessLabel = crew.happiness >= 80 ? '😄 Uitstekend' : crew.happiness >= 60 ? '😊 Goed' : crew.happiness >= 40 ? '😐 Matig' : crew.happiness >= 20 ? '😠 Ontevreden' : '😡 Muiterij dreigt!';
                const kanBetalen = state.speler.krediet >= weekTotaal;

                html += `<div class="haven-blok"><div class="haven-blok-header">👨‍🚀 Bemanning</div><div class="haven-blok-inhoud">
                    <div class="stat-rij"><span class="stat-naam">Bemanningsleden</span><span class="stat-waarde">${crew.grootte} personen</span></div>
                    <div class="stat-rij"><span class="stat-naam">Happiness</span><span class="stat-waarde" style="color:${happinessKleur}">${happinessLabel}</span></div>
                    <div class="lading-balk-container" style="margin:2px 0 10px"><div class="lading-balk" style="width:${crew.happiness}%;background:${happinessKleur}"></div></div>
                    <div class="stat-rij"><span class="stat-naam">Dagloon</span><span class="stat-waarde">${crew.salaris} cr/pp/dag</span></div>
                    <div class="stat-rij"><span class="stat-naam">Weekbetaling</span><span class="stat-waarde">${state.formatteerKrediet(weekTotaal)}</span></div>
                    <div class="stat-rij"><span class="stat-naam">Volgende betaling</span><span class="stat-waarde ${isAchterstallig ? 'kleur-rood' : beurtenTot <= 3 ? 'kleur-oranje' : ''}">${isAchterstallig ? `⚠ ${dagenAchter} dag${dagenAchter === 1 ? '' : 'en'} achterstallig!` : `over ${beurtenTot} dag${beurtenTot === 1 ? '' : 'en'}`}</span></div>
                    <div class="actie-rij" style="margin-top:12px;gap:8px;flex-wrap:wrap">
                        <button class="knop ${isAchterstallig ? 'gevaar' : 'primair'} klein" onclick="App.betaalCrewSalaris()" ${!kanBetalen ? 'disabled' : ''}>Betaal salaris (${state.formatteerKrediet(weekTotaal)})</button>
                        <button class="knop succes klein" onclick="App.verhoogCrewSalaris()">▲ +10 cr/dag</button>
                        <button class="knop gevaar klein" onclick="App.verlaagCrewSalaris()" ${crew.salaris <= 30 ? 'disabled' : ''}>▼ −10 cr/dag</button>
                    </div>
                </div></div>`;
            }
        } // einde bemanning-check

        // === VERZEKERING (tutorial: alleen als verzekering unlocked) ===
        if (state.isUnlocked('verzekering')) {
            const verzPrijs = state._berekenVerzekeringsPrijs();
            const verzActief = state.verzekering?.actief;
            let verzHtml = '';
            if (verzActief) {
                verzHtml = `<div class="kleur-groen" style="font-size:0.88em">✓ Verzekering actief — je bent gedekt voor de komende reis.</div>`;
            } else {
                const kanVerz = state.speler.krediet >= verzPrijs;
                const cap = state.schip?.laadruimte ?? 0;
                const paxCap = state.schip?.passagiersCapaciteit ?? 0;
                verzHtml = `<div style="font-size:0.85em;margin-bottom:8px">Dekt verliezen door piraten, storms, lekken en douaneboetes. Vervalt bij aankomst.</div>
                    <div class="upgrade-prijs">${state.formatteerKrediet(verzPrijs)}</div>
                    <div class="kleur-dimmed" style="font-size:0.78em;margin-bottom:8px">Basisprijs + ${cap} ton laadruimte${paxCap > 0 ? ` + ${paxCap} passagiersplaatsen` : ''}</div>
                    <button class="knop primair klein" ${!kanVerz ? 'disabled' : ''} onclick="App.koopVerzekering()">${kanVerz ? 'Sluit af' : 'Onvoldoende credits'}</button>`;
            }
            html += `<div class="haven-blok haven-blok-verzekering"><div class="haven-blok-header">🛡️ Reisverzekering</div><div class="haven-blok-inhoud">${verzHtml}</div></div>`;
        } // einde verzekering-check

        // === BANK TEGEL (tutorial: alleen als leningen of meer unlocked) ===
        if (state.isUnlocked('leningen')) {
            const bankSaldo = state.bankSaldo ?? 0;
            const bankRente = state.bankRente ?? 2;
            const bankBevroren = state.bankBevroren ?? 0;
            const maxStorten = state.speler.krediet;
            const renteKleur = bankRente >= 3 ? 'var(--groen)' : bankRente >= 1 ? 'var(--accent)' : 'var(--rood)';

            let bankHtml = '';

            // Spaarrekening: tutorial: alleen als bank-feature unlocked is
            if (state.isUnlocked('bank')) {
                bankHtml += `<div class="pax-sectie-label">Spaarrekening</div>`;
                if (bankBevroren > 0) {
                    bankHtml += `<div class="kleur-rood" style="font-size:0.82em;margin-bottom:8px">🔒 Bank bevroren — transacties nog ${bankBevroren} beurt${bankBevroren > 1 ? 'en' : ''} geblokkeerd</div>`;
                }
                bankHtml += `
                    <div class="stat-rij"><span class="stat-naam">Saldo</span><span class="stat-waarde kleur-goud">${state.formatteerKrediet(bankSaldo)}</span></div>
                    <div class="stat-rij"><span class="stat-naam">Rente</span><span class="stat-waarde" style="color:${renteKleur}">${bankRente}% per beurt</span></div>
                    <div style="display:flex;gap:6px;align-items:center;margin:8px 0 4px">
                        <input class="aantal-invoer" type="number" min="1" max="${Math.max(1, Math.max(maxStorten, bankSaldo))}" step="100" value="${Math.max(1, Math.floor(state.speler.krediet / 2))}" id="bank-bedrag" style="width:80px">
                        <button class="knop succes klein" onclick="App.stortenOpBank()" ${bankBevroren > 0 || maxStorten <= 0 ? 'disabled' : ''}>Storten</button>
                        <button class="knop primair klein" onclick="App.opnemenVanBank()" ${bankBevroren > 0 || bankSaldo <= 0 ? 'disabled' : ''}>Opnemen</button>
                    </div>
                    <div style="display:flex;gap:6px;margin-bottom:14px">
                        <button class="knop dimmed klein" onclick="App.stortenAlles()" ${bankBevroren > 0 || maxStorten <= 0 ? 'disabled' : ''}>Alles storten</button>
                        <button class="knop dimmed klein" onclick="App.opnemenAlles()" ${bankBevroren > 0 || bankSaldo <= 0 ? 'disabled' : ''}>Alles opnemen</button>
                    </div>`;
            }

            bankHtml += `<div class="pax-sectie-label">Lening</div>
                <div class="stat-rij"><span class="stat-naam">Schuld</span><span class="stat-waarde ${state.speler.schuld > 0 ? 'kleur-oranje' : ''}">${state.formatteerKrediet(state.speler.schuld)}</span></div>
                <div class="stat-rij"><span class="stat-naam">Limiet</span><span class="stat-waarde">${state.formatteerKrediet(MAX_SCHULD)}</span></div>
                <div class="stat-rij"><span class="stat-naam">Rente</span><span class="stat-waarde">${RENTE_PERCENTAGE*100}% per ${RENTE_INTERVAL} beurten</span></div>
                <div class="actie-rij" style="margin-top:8px;gap:8px;flex-wrap:wrap">
                    <input class="aantal-invoer" type="number" min="100" max="${Math.max(100,MAX_SCHULD-state.speler.schuld)}" step="100" value="1000" id="leen-bedrag" style="width:80px">
                    <button class="knop primair klein" onclick="App.leenGeld()">Leen</button>
                    <button class="knop gevaar klein" onclick="App.betaalLening()" ${state.speler.schuld<=0?'disabled':''}>Betaal af</button>
                </div>`;

            html += `<div class="haven-blok"><div class="haven-blok-header">💳 Galactische Bank</div><div class="haven-blok-inhoud">${bankHtml}</div></div>`;
        } // einde leningen-check

        // === PORTFOLIO TEGEL (tutorial: alleen als beurs unlocked) ===
        if (state.isUnlocked('beurs')) {
        html += `<div class="haven-blok haven-blok-vol-breed"><div class="haven-blok-header">📊 Aandelenportfolio</div><div class="haven-blok-inhoud">
            <div style="margin-bottom:10px;font-size:0.82em;color:var(--tekst-dim)">
                Koersen bijgewerkt per reis &nbsp;·&nbsp;
                ${state.locatie !== 'nexoria' ? '🔒 Handel alleen op Nexoria (via 🪐 Planeet-tab)' : '<span class="kleur-accent">📈 Handel via 🪐 Planeet-tab</span>'}
            </div>
            <div class="portfolio-layout">
                ${this._renderPortfolioGrafiek()}
                ${this._renderPortfolioTabel()}
            </div>
        </div></div>`;
        } // einde beurs-check

        html += '</div>';
        container.innerHTML = html;
    },

    // =========================================================================
    // BEURS TAB  (legacy — redirect naar financiën)
    // =========================================================================

    renderBeursTab() {
        const container = document.getElementById('beurs-tab');
        const portWaarde = state.getPortefeuilleWaarde();

        let html = `<div class="info-balk">
            <span>📊 Portfolio</span>
            &nbsp;|&nbsp; Waarde: <strong class="kleur-goud">${state.formatteerKrediet(portWaarde)}</strong>
            &nbsp;|&nbsp; Beschikbaar: <strong>${state.formatteerKrediet(state.speler.krediet)}</strong>
            &nbsp;|&nbsp; <span class="kleur-dimmed" style="font-size:0.82em">Koersen bijgewerkt per reis</span>
        </div>`;

        if (state.locatie === 'nexoria') {
            html += `<div class="info-balk beurs-nexoria-hint">
                📈 Op Nexoria kun je aandelen kopen en verkopen via het 🪐 <strong>Planeet</strong>-tabblad.
            </div>`;
        } else {
            html += `<div class="info-balk beurs-readonly-hint">
                🔒 Aandelen verhandelen kan alleen op <strong>Nexoria</strong> (Galactische Beurs).
            </div>`;
        }

        html += this._renderAandelenKaarten(false);
        container.innerHTML = html;
    },

    // Gedeelde helper: rendert alle aandeelkaarten
    // metHandel=true → inclusief koop/verkoop-knoppen (alleen op Nexoria)
    _renderAandelenKaarten(metHandel) {
        let html = '<div class="aandeel-kaarten">';
        AANDELEN.forEach(a => {
            const koers       = state.aandeelKoersen[a.id];
            const vorig       = state.vorigeKoersen[a.id];
            const delta       = koers - vorig;
            const dPct        = vorig > 0 ? (delta/vorig*100).toFixed(1) : 0;
            const dKlas       = delta > 0 ? 'kleur-groen' : delta < 0 ? 'kleur-rood' : 'kleur-dimmed';
            const dTeken      = delta > 0 ? '+' : '';
            const bezit       = state.aandelenPortefeuille[a.id] || 0;
            const waarde      = bezit * koers;
            const aankoopKoers = state.aandeelAankoopPrijzen?.[a.id];
            const ongrReal    = aankoopKoers && bezit > 0 ? (koers - aankoopKoers) * bezit : null;
            const ongrKlas    = ongrReal > 0 ? 'kleur-groen' : ongrReal < 0 ? 'kleur-rood' : '';
            const maxK        = Math.floor(state.speler.krediet / koers);

            let portfolioHtml = '';
            if (bezit > 0) {
                portfolioHtml = `<div class="aandeel-portfolio-info">
                    <div class="aandeel-bezit-rij"><span class="kleur-dimmed">Bezit</span><span><strong>${bezit}</strong> aandelen</span></div>
                    ${aankoopKoers ? `<div class="aandeel-bezit-rij"><span class="kleur-dimmed">Gem. aankoop</span><span>${aankoopKoers} credits</span></div>` : ''}
                    <div class="aandeel-bezit-rij"><span class="kleur-dimmed">Waarde</span><span class="kleur-goud">${state.formatteerKrediet(waarde)}</span></div>
                    ${ongrReal !== null ? `<div class="aandeel-bezit-rij"><span class="kleur-dimmed">P&amp;L</span><span class="${ongrKlas}">${ongrReal >= 0 ? '+' : ''}${state.formatteerKrediet(ongrReal)}</span></div>` : ''}
                </div>`;
            } else {
                portfolioHtml = `<div class="aandeel-portfolio-info"><span class="kleur-dimmed" style="font-size:0.78em">Niet in portfolio</span></div>`;
            }

            let handelHtml = '';
            if (metHandel) {
                handelHtml = `
                <div class="aandeel-knoppen-koop">
                    ${[1,10,100].map(n => `<button class="knop succes klein" onclick="App.koopAandeelN('${a.id}',${n})" ${maxK<n?'disabled':''}>+${n}</button>`).join('')}
                    <button class="knop succes klein" onclick="App.koopAandeelMax('${a.id}')" ${maxK<=0?'disabled':''}>Max</button>
                </div>
                <div class="aandeel-knoppen-verkoop">
                    ${[1,10,100].map(n => `<button class="knop gevaar klein" onclick="App.verkoopAandeelN('${a.id}',${n})" ${bezit<n?'disabled':''}>-${n}</button>`).join('')}
                    <button class="knop gevaar klein" onclick="App.verkoopAandeelAlles('${a.id}')" ${bezit<=0?'disabled':''}>Alles</button>
                </div>`;
            }

            html += `<div class="aandeel-kaart">
                <div class="aandeel-kaart-top">
                    <span>${a.icoon}</span>
                    <div>
                        <span class="aandeel-kaart-naam">${a.naam}</span>
                        <div class="aandeel-bedrijf-beschrijving">${a.beschrijving}</div>
                    </div>
                </div>
                <div class="aandeel-koers-groot">${koers} credits</div>
                <div class="aandeel-delta ${dKlas}">${dTeken}${delta} credits (${dTeken}${dPct}%)</div>
                ${this._renderSparkline(a.id, 150, 50, bezit > 0 ? aankoopKoers : null)}
                ${portfolioHtml}
                ${handelHtml}
            </div>`;
        });
        html += '</div>';
        return html;
    },

    // Genereer SVG sparkline voor een aandeel
    _renderSparkline(aandeelId, breedte = 150, hoogte = 50, aankoopKoers = null) {
        const data = state.aandeelGeschiedenis?.[aandeelId] ?? [];
        if (data.length < 2) return `<div class="sparkline-leeg">Geen data</div>`;

        const allWaarden = aankoopKoers !== null ? [...data, aankoopKoers] : data;
        const min = Math.min(...allWaarden) * 0.95;
        const max = Math.max(...allWaarden) * 1.05;
        const range = max - min || 1;

        const punten = data.map((p, i) => {
            const x = (i / (data.length - 1)) * breedte;
            const y = hoogte - ((p - min) / range) * hoogte;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');

        const stijging = data[data.length - 1] >= data[0];
        const kleur = stijging ? '#39ff14' : '#ff3855';
        const lastX = breedte;
        const lastY = (hoogte - ((data[data.length-1] - min) / range) * hoogte).toFixed(1);

        let aankoopLijn = '';
        if (aankoopKoers !== null) {
            const ay = (hoogte - ((aankoopKoers - min) / range) * hoogte).toFixed(1);
            aankoopLijn = `<line x1="0" y1="${ay}" x2="${breedte}" y2="${ay}" stroke="var(--goud)" stroke-width="1" stroke-dasharray="3,2" opacity="0.75"/>
            <text x="2" y="${Math.max(8, parseFloat(ay) - 2)}" fill="var(--goud)" font-size="7" font-family="monospace" opacity="0.85">gem</text>`;
        }

        return `<svg width="${breedte}" height="${hoogte}" viewBox="0 0 ${breedte} ${hoogte}">
            ${aankoopLijn}
            <polyline points="${punten}" fill="none" stroke="${kleur}" stroke-width="1.5" stroke-linejoin="round" opacity="0.9"/>
            <circle cx="${lastX}" cy="${lastY}" r="3" fill="${kleur}"/>
        </svg>`;
    },

    // =========================================================================
    // PORTFOLIO GRAFIEK + TABEL
    // =========================================================================

    _renderPortfolioGrafiek() {
        const KLEUREN = {
            nexcorp: '#5ba4ff', aquatech: '#00d4ff', pyroenergie: '#ff8c42',
            luxtrading: '#ffd700', techstar: '#39ff14', biomed: '#ff6eb4',
        };
        const W = 360, H = 150;
        const padL = 32, padR = 10, padT = 10, padB = 18;
        const cW = W - padL - padR, cH = H - padT - padB;

        const allPrices = AANDELEN.flatMap(a => state.aandeelGeschiedenis[a.id] ?? []);
        if (allPrices.length < 2) return `<div class="portfolio-grafiek-wrap"><div class="sparkline-leeg" style="height:${H}px">Nog geen koersdata — reis eerst een paar keer.</div></div>`;

        const globalMin = Math.min(...allPrices) * 0.94;
        const globalMax = Math.max(...allPrices) * 1.06;
        const range = globalMax - globalMin || 1;
        const toX = (i, len) => padL + (i / Math.max(len - 1, 1)) * cW;
        const toY = v => padT + cH - ((v - globalMin) / range) * cH;

        let gridHtml = '';
        for (let i = 0; i <= 4; i++) {
            const v = globalMin + (range / 4) * i;
            const y = toY(v);
            gridHtml += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
            gridHtml += `<text x="${padL - 3}" y="${(y + 3.5).toFixed(1)}" fill="rgba(255,255,255,0.3)" font-size="8" text-anchor="end" font-family="monospace">${Math.round(v)}</text>`;
        }

        let lijnenHtml = '';
        AANDELEN.forEach(a => {
            const data = state.aandeelGeschiedenis[a.id] ?? [];
            if (data.length < 2) return;
            const kleur = KLEUREN[a.id] ?? '#888';
            const bezit = (state.aandelenPortefeuille[a.id] || 0) > 0;
            const punten = data.map((p, i) => `${toX(i, data.length).toFixed(1)},${toY(p).toFixed(1)}`).join(' ');
            lijnenHtml += `<polyline points="${punten}" fill="none" stroke="${kleur}" stroke-width="${bezit ? 2 : 1.2}" opacity="${bezit ? 1 : 0.45}" stroke-linejoin="round"/>`;
            const lastX = toX(data.length - 1, data.length);
            const lastY = toY(data[data.length - 1]);
            lijnenHtml += `<circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="${bezit ? 3.5 : 2}" fill="${kleur}" opacity="${bezit ? 1 : 0.55}"/>`;
        });

        const assenHtml = `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + cH}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
            <line x1="${padL}" y1="${padT + cH}" x2="${W - padR}" y2="${padT + cH}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`;

        const legendaHtml = AANDELEN.map(a => {
            const kleur = KLEUREN[a.id] ?? '#888';
            const bezit = (state.aandelenPortefeuille[a.id] || 0) > 0;
            return `<span class="grafiek-legenda-item" style="opacity:${bezit ? 1 : 0.45}"><span class="grafiek-kleur-balk" style="background:${kleur}"></span><span>${a.icoon} ${a.naam}</span></span>`;
        }).join('');

        return `<div class="portfolio-grafiek-wrap">
            <svg viewBox="0 0 ${W} ${H}" style="display:block;width:100%;max-width:${W}px;height:auto">
                ${gridHtml}${assenHtml}${lijnenHtml}
            </svg>
            <div class="grafiek-legenda" style="margin-top:6px;flex-wrap:wrap;gap:4px 10px;font-size:0.78em">${legendaHtml}</div>
        </div>`;
    },

    _renderPortfolioTabel() {
        const gehouden = AANDELEN.filter(a => (state.aandelenPortefeuille[a.id] || 0) > 0);

        if (gehouden.length === 0) {
            return `<div class="portfolio-tabel-wrap">
                <div class="kleur-dimmed" style="font-size:0.85em;padding:8px 0 12px">Geen aandelen in portfolio.</div>
                <div class="portfolio-totalen">
                    <div class="stat-rij"><span class="stat-naam">Portefeuillewaarde</span><span class="stat-waarde kleur-goud">${state.formatteerKrediet(0)}</span></div>
                    <div class="stat-rij"><span class="stat-naam">Beschikbaar</span><span class="stat-waarde">${state.formatteerKrediet(state.speler.krediet)}</span></div>
                </div>
            </div>`;
        }

        let totaleWaarde = 0, totaleKosten = 0;
        const rijen = gehouden.map(a => {
            const bezit = state.aandelenPortefeuille[a.id];
            const koers = state.aandeelKoersen[a.id];
            const gemAank = state.aandeelAankoopPrijzen?.[a.id] ?? koers;
            const waarde = bezit * koers;
            const kosten = bezit * gemAank;
            const rend = waarde - kosten;
            const rendPct = kosten > 0 ? (rend / kosten * 100).toFixed(1) : '0.0';
            const rendKlas = rend > 0 ? 'kleur-groen' : rend < 0 ? 'kleur-rood' : 'kleur-dimmed';
            totaleWaarde += waarde;
            totaleKosten += kosten;
            return `<tr>
                <td>${a.icoon} ${a.naam}</td>
                <td class="pt-r">${bezit} stuks</td>
                <td class="pt-r">${gemAank} credits</td>
                <td class="pt-r">${koers} credits</td>
                <td class="pt-r ${rendKlas}">${rend >= 0 ? '+' : ''}${state.formatteerKrediet(rend)}<br><span style="font-size:0.85em">${rend >= 0 ? '+' : ''}${rendPct}%</span></td>
            </tr>`;
        });

        const totRend = totaleWaarde - totaleKosten;
        const totPct = totaleKosten > 0 ? (totRend / totaleKosten * 100).toFixed(1) : '0.0';
        const totKlas = totRend > 0 ? 'kleur-groen' : totRend < 0 ? 'kleur-rood' : 'kleur-dimmed';

        return `<div class="portfolio-tabel-wrap">
            <table class="portfolio-tabel">
                <thead><tr><th>Asset</th><th class="pt-r">Aantal</th><th class="pt-r">Gemiddelde aankoopprijs</th><th class="pt-r">Koers</th><th class="pt-r">Rendement</th></tr></thead>
                <tbody>${rijen.join('')}</tbody>
            </table>
            <div class="portfolio-totalen">
                <div class="stat-rij"><span class="stat-naam">Totale waarde</span><span class="stat-waarde kleur-goud">${state.formatteerKrediet(totaleWaarde)}</span></div>
                <div class="stat-rij"><span class="stat-naam">Totaal rendement</span><span class="stat-waarde ${totKlas}">${totRend >= 0 ? '+' : ''}${state.formatteerKrediet(totRend)} (${totRend >= 0 ? '+' : ''}${totPct}%)</span></div>
                <div class="stat-rij"><span class="stat-naam">Beschikbaar</span><span class="stat-waarde">${state.formatteerKrediet(state.speler.krediet)}</span></div>
            </div>
        </div>`;
    },

    // =========================================================================
    // LOGBOEK TAB
    // =========================================================================

    renderLogboekTab() {
        const container = document.getElementById('logboek-tab');
        let html = '<div class="sectie-header">Reislogboek</div>';

        if (state.logboek.length === 0) {
            html += '<div class="info-balk">Nog geen logboekentries.</div>';
        } else {
            state.logboek.forEach(entry => {
                html += `<div class="bericht ${entry.type}">
                    <span class="kleur-dimmed" style="font-size:0.8em">[Beurt ${entry.beurt}]</span> ${entry.tekst}
                </div>`;
            });
        }
        container.innerHTML = html;
    },

    // =========================================================================
    // ACHIEVEMENTS TAB
    // =========================================================================

    renderAchievementsTab() {
        const container = document.getElementById('achievements-tab');
        if (!container) return;

        // Tutorial: filter achievement-categorieën op basis van unlock status
        const alleCat = [
            { id: 'deals', naam: '⚖ Handel & Deals' },
            { id: 'nettowaarde', naam: '💰 Nettowaarde' },
            { id: 'beurs', naam: '📈 Beurs' },
            { id: 'schip', naam: '🚀 Schip' },
            { id: 'events', naam: '⭐ Reizen & Events' },
            { id: 'financien', naam: '💳 Financiën' },
        ];
        const categorieen = alleCat.filter(cat => {
            if (typeof ACHIEVEMENT_CATEGORIE_FEATURE === 'undefined') return true;
            const benodigdeFeature = ACHIEVEMENT_CATEGORIE_FEATURE[cat.id] ?? 'basis';
            return state.isUnlocked(benodigdeFeature);
        });

        const unlocked = state.achievements.size;
        const totaal = ACHIEVEMENTS.length;

        let html = `<div class="sectie-header">🏆 Achievements <span class="kleur-dimmed">(${unlocked}/${totaal})</span></div>`;

        categorieen.forEach(cat => {
            const achs = ACHIEVEMENTS.filter(a => a.categorie === cat.id);
            if (achs.length === 0) return;
            const catUnlocked = achs.filter(a => state.achievements.has(a.id)).length;
            html += `<div class="ach-categorie-header">${cat.naam} <span class="kleur-dimmed">(${catUnlocked}/${achs.length})</span></div>`;
            html += '<div class="achievements-raster">';
            achs.forEach(ach => {
                const isUnlocked = state.achievements.has(ach.id);
                html += `<div class="achievement-kaart ${isUnlocked ? 'unlocked' : 'locked'}">
                    <div class="ach-icoon">${isUnlocked ? ach.icoon : '🔒'}</div>
                    <div class="ach-naam">${isUnlocked ? ach.naam : '???'}</div>
                    <div class="ach-beschr">${isUnlocked ? ach.beschrijving : 'Nog niet ontgrendeld'}</div>
                    ${ach.beloning ? `<div class="ach-beloning ${isUnlocked ? 'kleur-goud' : 'kleur-dimmed'}">💰 ${new Intl.NumberFormat('nl-NL').format(ach.beloning)} credits beloning</div>` : ''}
                </div>`;
            });
            html += '</div>';
        });

        container.innerHTML = html;
    },

    // =========================================================================
    // RANGLIJST TAB
    // =========================================================================

    renderRanglijstTab() {
        const container = document.getElementById('ranglijst-tab');
        if (!container) return;

        const spelerWaarde = state.berekenNettowaarde();
        const deelnemers = [
            { naam: state.speler.naam, icoon: state.schip?.icoon ?? '🚀', kleur: '#e8f4ff', waarde: spelerWaarde, type: 'Handelaar', isSpeler: true },
            ...(state.concurrenten || []).map(npc => {
                const s = (typeof CONCURRENTEN !== 'undefined') ? CONCURRENTEN.find(c => c.id === npc.id) : null;
                return { naam: s?.naam ?? npc.id, icoon: s?.icoon ?? '👤', kleur: s?.kleur ?? '#888', waarde: npc.krediet, type: s?.persoonlijkheid ?? '', isSpeler: false };
            }),
        ].sort((a, b) => b.waarde - a.waarde);

        const jouwPlek = deelnemers.findIndex(d => d.isSpeler) + 1;
        const medailTekst = jouwPlek === 1 ? '1e 🥇' : jouwPlek === 2 ? '2e 🥈' : jouwPlek === 3 ? '3e 🥉' : `${jouwPlek}e`;

        let html = `<div class="sectie-header">🏅 Ranglijst — Jij staat <strong>${medailTekst}</strong></div>`;
        html += '<div class="ranglijst-lijst">';
        deelnemers.forEach((d, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            html += `<div class="ranglijst-rij${d.isSpeler ? ' ranglijst-speler' : ''}">
                <span class="ranglijst-pos">${medal}</span>
                <span class="ranglijst-naam" style="color:${d.kleur}">${d.icoon} ${d.naam} <span class="ranglijst-type">${d.type}</span></span>
                <span class="ranglijst-waarde">${state.formatteerKrediet(d.waarde)}</span>
            </div>`;
        });
        html += '</div>';

        html += '<div class="sectie-header" style="margin-top:20px">📈 Vermogensontwikkeling</div>';
        html += this._renderWaardegrafiek();

        html += `<div class="sectie-header" style="margin-top:24px">🌌 Globale Ranglijst — Alle Spelers</div>`;
        html += `<div id="globale-ranglijst"><div class="kleur-dimmed" style="padding:14px 0;font-size:0.85em">Ranglijst laden...</div></div>`;

        container.innerHTML = html;

        if (typeof DB !== 'undefined') {
            DB.haalLeaderboardOp(25).then(scores => {
                const el = document.getElementById('globale-ranglijst');
                if (!el) return;
                if (!scores.length) {
                    el.innerHTML = '<div class="kleur-dimmed" style="padding:14px 0;font-size:0.85em">Nog geen voltooide spellen opgeslagen.</div>';
                    return;
                }
                let tbl = '<div class="ranglijst-lijst">';
                scores.forEach((s, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                    const datum = new Date(s.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
                    const eindeLabel = s.einde_reden === 'bankroet' ? ' 💸' : '';
                    const naam = (s.speler_naam ?? '').replace(/[<>"'&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[c]));
                    const schipNaam = (s.schip_naam ?? '').replace(/[<>"'&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[c]));
                    tbl += `<div class="ranglijst-rij">
                        <span class="ranglijst-pos">${medal}</span>
                        <span class="ranglijst-naam">${naam}${eindeLabel} <span class="ranglijst-type">${schipNaam}</span></span>
                        <span class="ranglijst-waarde">${state.formatteerKrediet(s.eindkapitaal)}</span>
                        <span class="kleur-dimmed" style="font-size:0.78em;white-space:nowrap">${datum}</span>
                    </div>`;
                });
                tbl += '</div>';
                el.innerHTML = tbl;
            });
        }
    },

    _renderWaardegrafiek() {
        const W = 480, H = 210;
        const pad = { t: 12, r: 14, b: 28, l: 58 };
        const iW = W - pad.l - pad.r;
        const iH = H - pad.t - pad.b;

        const reeksen = [
            { naam: state.speler.naam, kleur: '#ffffff', data: state.nettoWaardeGeschiedenisSpeler || [], isSpeler: true },
            ...(state.concurrenten || []).map(npc => {
                const s = (typeof CONCURRENTEN !== 'undefined') ? CONCURRENTEN.find(c => c.id === npc.id) : null;
                return { naam: s?.naam ?? npc.id, kleur: s?.kleur ?? '#888', data: npc.waardeGeschiedenis || [], isSpeler: false };
            }),
        ].filter(r => r.data.length > 0);

        if (reeksen.length === 0 || !reeksen.some(r => r.data.length > 1)) {
            return '<div class="kleur-dimmed" style="padding:14px 0;font-size:0.85em">Maak je eerste reis om de grafiek te zien.</div>';
        }

        const allVals = reeksen.flatMap(r => r.data);
        const maxY = Math.max(...allVals, 1000);
        const maxX = Math.max(...reeksen.map(r => r.data.length), 2);

        const toX = i => pad.l + (i / (maxX - 1)) * iW;
        const toY = v => pad.t + iH - Math.max(0, Math.min(1, v / maxY)) * iH;
        const fmtY = v => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? Math.round(v / 1000) + 'k' : v;

        let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;overflow:visible">`;

        // Grid + Y labels
        for (let i = 0; i <= 4; i++) {
            const y = pad.t + iH * (1 - i / 4);
            s += `<line x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
            s += `<text x="${pad.l - 5}" y="${y + 4}" text-anchor="end" fill="rgba(200,220,240,0.4)" font-size="9" font-family="monospace">${fmtY(Math.round(maxY * i / 4))}</text>`;
        }

        // Assen
        s += `<line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + iH}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`;
        s += `<line x1="${pad.l}" y1="${pad.t + iH}" x2="${W - pad.r}" y2="${pad.t + iH}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`;

        // X labels
        for (let i = 0; i <= 5; i++) {
            const idx = Math.round((maxX - 1) * i / 5);
            s += `<text x="${toX(idx)}" y="${H - 6}" text-anchor="middle" fill="rgba(200,220,240,0.4)" font-size="9" font-family="monospace">${idx}</text>`;
        }

        // Lijnen (NPCs eerst, speler als laatste voor tekenvolgorde)
        const volgorde = [...reeksen.filter(r => !r.isSpeler), ...reeksen.filter(r => r.isSpeler)];
        volgorde.forEach(reeks => {
            if (reeks.data.length < 2) return;
            const pts = reeks.data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
            s += `<polyline points="${pts}" fill="none" stroke="${reeks.kleur}" stroke-width="${reeks.isSpeler ? 2.5 : 1.5}" opacity="${reeks.isSpeler ? 1 : 0.72}" stroke-linejoin="round"/>`;
        });

        // Eindpunt-dots
        volgorde.forEach(reeks => {
            if (!reeks.data.length) return;
            const x = toX(reeks.data.length - 1);
            const y = toY(reeks.data[reeks.data.length - 1]);
            s += `<circle cx="${x}" cy="${y}" r="${reeks.isSpeler ? 4 : 2.5}" fill="${reeks.kleur}" opacity="0.9"/>`;
        });

        s += '</svg>';

        // Legenda gesorteerd op huidige waarde
        const gesorteerd = [...reeksen].sort((a, b) => (b.data.at(-1) ?? 0) - (a.data.at(-1) ?? 0));
        s += '<div class="grafiek-legenda">';
        gesorteerd.forEach(r => {
            s += `<span class="grafiek-legenda-item"><span class="grafiek-kleur-balk" style="background:${r.kleur}"></span><span${r.isSpeler ? ' style="font-weight:bold;color:#e8f4ff"' : ''}>${r.naam}</span></span>`;
        });
        s += '</div>';

        return s;
    },

    // =========================================================================
    // BERICHTEN LOG (onderste balk)
    // =========================================================================

    updateBerichten() {
        const log = document.getElementById('berichten-log');
        if (!log) return;
        log.innerHTML = state.logboek.slice(0, 8).map(b =>
            `<div class="bericht ${b.type}"><span class="kleur-dimmed">[${b.beurt}]</span> ${b.tekst}</div>`
        ).join('');
    },

    // =========================================================================
    // EVENT POPUP
    // =========================================================================

    toonEventPopup(event) {
        if (event.type === 'gevaar') Audio.eventGevaar(); else Audio.eventPositief();

        const popup = document.getElementById('event-popup');
        popup.classList.remove('verborgen');

        document.getElementById('event-icoon').textContent = event.icoon;
        document.getElementById('event-titel').textContent = event.naam;
        document.getElementById('event-beschrijving').textContent = event.beschrijving;
        document.getElementById('event-gevolg').textContent = '';

        const knoppen = document.getElementById('event-knoppen');
        knoppen.innerHTML = '';

        if (event.heeftKeuze) {
            // Bereken losgeld van tevoren voor piraten zodat het in de knop staat
            let keuzes = event.keuzes;
            if (event.id === 'piraten') {
                const bedrag = Math.min(Math.round(Math.max(0, state.speler.krediet) * 0.25 + 100), 800);
                const snelheid = state.schip?.snelheid ?? 1;
                const schild = state.schip?.schild ?? 1;
                const vluchtKans = Math.min(0.95, 0.25 + snelheid * 0.08 + schild * 0.05);
                const vluchtPct = Math.round(vluchtKans * 100);
                const heeftVerzekering = state.verzekering?.actief;
                document.getElementById('event-beschrijving').innerHTML =
                    `Een piratengroep onderschept je schip en blokkeert je route. Ze eisen tol voor veilige doorgang.<br><br>` +
                    `<span style="font-size:0.88em;color:var(--tekst-dim)">` +
                    `⚡ Snelheid: <strong>${snelheid}</strong> &nbsp;|&nbsp; 🛡️ Schild: <strong>${schild}</strong><br>` +
                    `Vlucht slagingskans: <strong style="color:${vluchtPct >= 60 ? 'var(--groen)' : vluchtPct >= 40 ? 'var(--oranje)' : 'var(--rood)'}">${vluchtPct}%</strong>` +
                    (heeftVerzekering ? ` &nbsp;|&nbsp; <strong style="color:var(--groen)">🛡️ Verzekering actief</strong> — losgeld en ladingverlies worden vergoed` : '') +
                    `</span>`;
                keuzes = event.keuzes.map(k => {
                    if (k.id === 'betaal') return { ...k, tekst: `Betaal losgeld (${state.formatteerKrediet(bedrag)})` };
                    if (k.id === 'vlucht') return { ...k, tekst: `Probeer te ontsnappen (${vluchtPct}% kans)` };
                    return k;
                });
            }

            if (event.id === 'crew_opstand' && state.crew) {
                const totaal = state.crew.grootte * state.crew.salaris;
                const dubbel = totaal * 2;
                const kanBetalen = state.speler.krediet >= dubbel;
                document.getElementById('event-beschrijving').innerHTML =
                    `Je bemanning heeft het gehad en dreigt de boel stil te leggen!<br><br>` +
                    `<span style="font-size:0.88em;color:var(--tekst-dim)">` +
                    `👨‍🚀 Crew: <strong>${state.crew.grootte}</strong> &nbsp;|&nbsp; ` +
                    `Happiness: <strong style="color:var(--rood)">${state.crew.happiness}/100</strong><br>` +
                    `Eis: dubbel salaris = <strong style="color:var(--rood)">${state.formatteerKrediet(dubbel)}</strong>` +
                    (kanBetalen ? '' : `<br><span style="color:var(--oranje)">⚠ Onvoldoende credits — onderhandelen is je enige optie.</span>`) +
                    `</span>`;
                keuzes = event.keuzes.map(k => {
                    if (k.id === 'betaal') return { ...k, tekst: `Betaal dubbel salaris (${state.formatteerKrediet(dubbel)})`, stijl: kanBetalen ? 'gevaar' : 'dimmed' };
                    return k;
                });
            }

            if (event.id === 'lifter' && state.reisData) {
                const bestNaam = PLANETEN.find(p => p.id === state.reisData.naar)?.naam ?? '???';
                const vergoeding = Math.round(100 + Math.random() * 200);
                state._lifterVergoeding = vergoeding;
                document.getElementById('event-beschrijving').textContent =
                    `Een reiziger vraagt of ze mee mogen liften naar ${bestNaam}. Ze bieden ${state.formatteerKrediet(vergoeding)} voor de rit.`;
                keuzes = event.keuzes.map(k => k.id === 'meenemen'
                    ? { ...k, tekst: `Neem mee (+${state.formatteerKrediet(vergoeding)})` }
                    : k);
            }

            keuzes.forEach(keuze => {
                const btn = document.createElement('button');
                btn.className = `knop ${keuze.stijl}`;
                btn.textContent = keuze.tekst;
                btn.onclick = () => {
                    // Disable all buttons na keuze
                    knoppen.querySelectorAll('button').forEach(b => b.disabled = true);
                    App.verwerkEventKeuze(event.id, keuze.id);
                };
                knoppen.appendChild(btn);
            });
        } else {
            // Automatische afhandeling — verwerk direct en toon resultaat
            const res = state.verwerkevent(event.id, null);
            if (res.bericht) document.getElementById('event-gevolg').textContent = res.bericht;

            // Update bestemmingsweergave bij omleiding
            if (res.omleiding) {
                const nieuwePlaneet = PLANETEN.find(p => p.id === res.omleiding);
                if (nieuwePlaneet) {
                    const img   = document.getElementById('reis-planeet-naar-img');
                    const kleur = document.getElementById('reis-planeet-naar-kleur');
                    const naam  = document.getElementById('reis-naar-naam');
                    const best  = document.getElementById('reis-bestemming');
                    if (img)   { img.src = `assets/planet-${nieuwePlaneet.id}.png`; img.alt = nieuwePlaneet.naam; }
                    if (kleur) kleur.style.background = `radial-gradient(circle at 35% 35%, ${nieuwePlaneet.kleur}cc, ${nieuwePlaneet.kleur}44 60%, transparent)`;
                    if (naam)  naam.textContent = nieuwePlaneet.naam;
                    if (best)  best.textContent = nieuwePlaneet.naam;
                }
            }

            const btn = document.createElement('button');
            btn.className = 'knop primair';
            btn.textContent = 'Doorgaan →';
            btn.onclick = () => {
                this.verbergEventPopup();
                if (state.fase === 'einde') { UI.toonEindeScherm(); return; }
                const aankomstResult = state.aankomst();
                if (aankomstResult?.passagiersInfo) {
                    const pi = aankomstResult.passagiersInfo;
                    UI.toonTransactieToast({ icoon: '🧳', titel: `${pi.aantal} passagier${pi.aantal > 1 ? 's' : ''} afgeleverd`, totaal: pi.totaal });
                }
                if (state.fase === 'einde') { state.wisSave(); } else { state.slaOp(); }
                const planNaam = PLANETEN.find(p => p.id === state.locatie)?.naam ?? '';
                App._startFase2(() => {
                    App._setReisStatus(`✓ Aangekomen op ${planNaam}!`, 'kleur-groen');
                    setTimeout(() => {
                        UI.toonScherm('spel-scherm');
                        state.activeTab = 'handel';
                        UI.renderSpel();
                        if (state.fase === 'einde') {
                            UI.toonEindeScherm();
                        } else {
                            App._toonAankomstEventQueue();
                        }
                    }, 1100);
                });
            };
            knoppen.appendChild(btn);
        }
    },

    verbergEventPopup() {
        document.getElementById('event-popup').classList.add('verborgen');
        document.getElementById('event-gevolg').textContent = '';
    },

    toonAankomstPopup(event, callback) {
        if (event.type === 'gevaar') Audio.negatief(); else Audio.eventPositief();
        const popup = document.getElementById('aankomst-popup');
        if (!popup) return;
        document.getElementById('aankomst-event-icoon').textContent = event.icoon;
        document.getElementById('aankomst-event-naam').textContent = event.naam;
        document.getElementById('aankomst-event-beschrijving').textContent = event.beschrijving;

        const gestolenDiv = document.getElementById('aankomst-event-gestolen');
        if (event._gestelenTekst) {
            gestolenDiv.textContent = `Gestolen: ${event._gestelenTekst}`;
            gestolenDiv.style.display = 'block';
        } else {
            gestolenDiv.style.display = 'none';
        }

        // Zorg dat de knop de standaard sluitactie heeft
        const btn = popup.querySelector('.knop.primair');
        if (btn) btn.onclick = () => { UI.verbergAankomstPopup(); callback?.(); };

        popup.classList.remove('verborgen');
    },

    toonMarketingSummary(summary) {
        Audio.eventPositief();
        const popup = document.getElementById('marketing-summary-popup');
        if (!popup) return;
        document.getElementById('marketing-summary-passagiers').textContent = summary.extraPassagiers;
        document.getElementById('marketing-summary-resources').textContent = summary.extraResources;
        popup.classList.remove('verborgen');
    },

    verbergMarketingSummary() {
        document.getElementById('marketing-summary-popup')?.classList.add('verborgen');
    },

    toonConcurrentAankomstPopup(evt, callback) {
        Audio.negatief();
        const popup = document.getElementById('aankomst-popup');
        if (!popup) { callback?.(); return; }

        const npc = evt.npc;
        const aankoopTekst = evt.aankopen.map(a => {
            const goed = GOEDEREN.find(g => g.id === a.goed.id) || a.goed;
            return `${a.hoeveelheid} ton ${goed.icoon} ${goed.naam}`;
        }).join(' en ');

        document.getElementById('aankomst-event-icoon').textContent = npc.icoon;
        document.getElementById('aankomst-event-naam').textContent = `${npc.naam} was eerder!`;
        document.getElementById('aankomst-event-beschrijving').textContent =
            `${npc.naam} arriveerde eerder op ${evt.planeetNaam} en kocht ${aankoopTekst} voor een scherpe prijs.`;

        const gestolenDiv = document.getElementById('aankomst-event-gestolen');
        gestolenDiv.textContent = '⚠️ Marktprijzen zijn gestegen.';
        gestolenDiv.className = 'event-gevolg kleur-oranje';
        gestolenDiv.style.display = 'block';

        const btn = popup.querySelector('.knop.primair');
        if (btn) {
            btn.onclick = () => {
                popup.classList.add('verborgen');
                gestolenDiv.className = 'event-gevolg';
                callback?.();
            };
        }

        popup.classList.remove('verborgen');
    },

    verbergAankomstPopup() {
        document.getElementById('aankomst-popup').classList.add('verborgen');
    },

    toonInstellingen() {
        document.getElementById('instellingen-overlay')?.classList.remove('verborgen');
    },

    verbergInstellingen() {
        document.getElementById('instellingen-overlay')?.classList.add('verborgen');
    },

    toonEventResultaat(bericht) {
        document.getElementById('event-gevolg').textContent = bericht;
    },

    // =========================================================================
    // TOAST SYSTEEM (gecentraliseerde queue, max 2 tegelijk, 3s zichtbaar)
    // =========================================================================

    toonAchievementToast(ach) {
        this.toonToast({
            icoon: ach.icoon,
            titel: `Achievement: ${ach.naam}`,
            beschrijving: ach.beschrijving,
            beloning: ach.beloning,
            kleur: 'goud',
            geluid: 'achievement',
        });
    },

    toonKoopToast(btn, bedrag) {
        const fmt = n => new Intl.NumberFormat('nl-NL').format(Math.round(n));
        const rect = btn.getBoundingClientRect();
        const el = document.createElement('div');
        el.className = 'floating-toast floating-toast-koop';
        el.textContent = `−${fmt(bedrag)} cr`;
        el.style.left = (rect.left + rect.width / 2) + 'px';
        el.style.top = rect.top + 'px';
        document.body.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('actief')));
        setTimeout(() => el.remove(), 1200);
    },

    toonVerkoopToast(btn, totaal, winst) {
        const fmt = n => new Intl.NumberFormat('nl-NL').format(Math.round(n));
        const rect = btn.getBoundingClientRect();
        const el = document.createElement('div');
        const positief = winst === null || winst >= 0;
        el.className = `floating-toast ${positief ? 'floating-toast-winst' : 'floating-toast-verlies'}`;
        const winstTekst = winst !== null
            ? ` (${winst >= 0 ? '+' : ''}${fmt(winst)} cr ${winst >= 0 ? 'winst' : 'verlies'})`
            : '';
        el.innerHTML = `+${fmt(totaal)} cr${winstTekst ? `<br><small>${winstTekst}</small>` : ''}`;
        el.style.left = (rect.left + rect.width / 2) + 'px';
        el.style.top = rect.top + 'px';
        document.body.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('actief')));
        setTimeout(() => el.remove(), 1200);
    },

    toonTransactieToast(config) {
        this.toonToast(config);
    },

    toonToast(config) {
        if (this._deferToastsAankomst) {
            this._pendingAankomstToasts.push(config);
            return;
        }
        this._toastQueue.push(config);
        this._verwerkToastQueue();
    },

    _verwerkToastQueue() {
        while (this._toastActiefCount < 2 && this._toastQueue.length > 0) {
            const config = this._toastQueue.shift();
            this._toastActiefCount++;
            this._toonToastElement(config);
        }
    },

    _toonToastElement(config) {
        const container = document.getElementById('toast-container');
        if (!container) { this._toastActiefCount--; return; }
        const fmt = n => new Intl.NumberFormat('nl-NL').format(Math.round(n));

        const el = document.createElement('div');
        el.className = 'toast' + (config.kleur ? ` toast-${config.kleur}` : '');

        let bodyHtml = '';
        if (config.beschrijving) bodyHtml += `<div class="toast-beschr">${config.beschrijving}</div>`;
        if (config.beloning)     bodyHtml += `<div class="toast-beschr kleur-goud">+${fmt(config.beloning)} credits beloning</div>`;
        if (config.totaal)       bodyHtml += `<div class="toast-beschr kleur-goud">+${fmt(config.totaal)} credits</div>`;
        if (config.winst !== undefined && config.winst !== null) {
            bodyHtml += `<div class="toast-beschr ${config.winst >= 0 ? 'kleur-groen' : 'kleur-rood'}">${config.winst >= 0 ? '+' : ''}${fmt(config.winst)} credits ${config.winst >= 0 ? 'winst' : 'verlies'}</div>`;
        }

        el.innerHTML = `<span class="toast-icoon">${config.icoon ?? ''}</span>
            <div><div class="toast-naam">${config.titel}</div>${bodyHtml}</div>`;
        container.appendChild(el);

        // Geluid afspelen wanneer toast verschijnt
        if (config.geluid === 'achievement') Audio.achievement();

        // Fade in
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('zichtbaar')));

        // Na 3 seconden: fade uit, verwijder, verwerk volgende in queue
        setTimeout(() => {
            el.classList.add('verdwijnt');
            setTimeout(() => {
                el.remove();
                this._toastActiefCount--;
                this._verwerkToastQueue();
            }, 450);
        }, 3000);
    },

    spoelAankomstToasts() {
        this._deferToastsAankomst = false;
        const pending = [...this._pendingAankomstToasts];
        this._pendingAankomstToasts = [];
        pending.forEach(c => this.toonToast(c));
    },

    // =========================================================================
    // REIS SCHERM
    // =========================================================================

    updateReisScherm() {
        if (!state.reisData) return;
        const { van, naar } = state.reisData;
        const vanPlaneet  = PLANETEN.find(p => p.id === van);
        const naarPlaneet = PLANETEN.find(p => p.id === naar);

        document.getElementById('reis-bestemming').textContent = naarPlaneet?.naam ?? '---';
        document.getElementById('reis-status').textContent = '';

        // Planeet afbeeldingen links en rechts
        [['van', vanPlaneet], ['naar', naarPlaneet]].forEach(([prefix, pl]) => {
            if (!pl) return;
            const img    = document.getElementById(`reis-planeet-${prefix}-img`);
            const kleur  = document.getElementById(`reis-planeet-${prefix}-kleur`);
            const naam   = document.getElementById(`reis-${prefix}-naam`);
            if (img)   { img.src = `assets/planet-${pl.id}.png`; img.alt = pl.naam; img.style.display = ''; }
            if (kleur) kleur.style.background = `radial-gradient(circle at 35% 35%, ${pl.kleur}cc, ${pl.kleur}44 60%, transparent)`;
            if (naam)  naam.textContent = pl.naam;
        });

        // Raket reset naar startpositie (geen transitie)
        const animEl = document.getElementById('reis-animatie');
        if (animEl) {
            animEl.style.transition = 'none';
            animEl.style.left = '-48px';
            animEl.textContent = state.schipBeschadigd ? '🛸' : '🚀';
        }
    },

    // =========================================================================
    // EINDE SCHERM
    // =========================================================================

    toonEindeScherm() {
        this.toonScherm('einde-scherm');
        if (state.eindeReden === 'bankroet') Audio.bankroet();
        const netto = state.berekenNettowaarde();
        const reden = state.eindeReden;

        let titel, beschr;
        if (reden === 'bankroet') {
            titel = '💸 BANKROET';
            beschr = 'Je schulden zijn de pan uitgerezen en je reserves zijn uitgeput. De melkweg is hard voor degenen die te snel te groot willen worden.';
        } else if (netto >= 1000000) {
            titel = '🏆 GAZILLIONNAIRE!';
            beschr = `Ongelooflijk, ${state.speler.naam}! Je hebt de magische grens van één miljoen credits bereikt. De melkweg knielt voor je handelsgeest!`;
        } else if (netto >= 500000) {
            titel = '⭐ BRILJANTE HANDELAAR';
            beschr = `Uitstekend gedaan, ${state.speler.naam}! Je bent een van de rijkste handelaars in de sector geworden.`;
        } else if (netto >= 100000) {
            titel = '📈 SUCCESVOLLE REIS';
            beschr = `Goed werk, ${state.speler.naam}! Je hebt een comfortabele positie opgebouwd in de galactische handelswereld.`;
        } else {
            titel = '🚀 REIS VOLTOOID';
            beschr = `Je reis is afgelopen, ${state.speler.naam}. Meer geluk volgende keer — de ruimtehandel is niet voor lafaards.`;
        }

        document.getElementById('einde-titel').textContent = titel;
        document.getElementById('einde-beschrijving').textContent = beschr;
        document.getElementById('einde-statistieken').innerHTML = `
            <div class="stat-einde"><span class="naam">Eindkrediet</span><span class="waarde">${state.formatteerKrediet(state.speler.krediet)}</span></div>
            <div class="stat-einde"><span class="naam">Ladingwaarde</span><span class="waarde">${state.formatteerKrediet(state.getLadingWaarde())}</span></div>
            <div class="stat-einde"><span class="naam">Aandelenportfolio</span><span class="waarde">${state.formatteerKrediet(state.getPortefeuilleWaarde())}</span></div>
            <div class="stat-einde"><span class="naam">Schuld</span><span class="waarde kleur-rood">− ${state.formatteerKrediet(state.speler.schuld)}</span></div>
            <div class="stat-einde" style="border-top:1px solid var(--accent);margin-top:4px;padding-top:10px">
                <span class="naam"><strong>Nettowaarde</strong></span>
                <span class="waarde kleur-goud"><strong>${state.formatteerKrediet(netto)}</strong></span>
            </div>
            <div class="stat-einde"><span class="naam">Beurten</span><span class="waarde">${state.beurt}/${MAX_BEURTEN}</span></div>
            <div class="stat-einde"><span class="naam">Transacties</span><span class="waarde">${state.statistieken.handelstransacties}</span></div>
            <div class="stat-einde"><span class="naam">Reizen</span><span class="waarde">${state.statistieken.gereisd}</span></div>
            <div class="stat-einde"><span class="naam">Achievements</span><span class="waarde kleur-goud">${state.achievements.size}/${ACHIEVEMENTS.length}</span></div>
        `;
    },

    // =========================================================================
    // MISSIES TAB
    // =========================================================================

    renderMissieTab() {
        const container = document.getElementById('missies-tab');
        if (!container) return;

        const beurt = state.beurt;
        const actief = state.missies ?? [];
        const beschikbaar = state.beschikbareMissies ?? [];
        const maxActief = 3;

        let html = '<div class="sectie-header">🎯 Missies</div>';
        html += `<p class="kleur-dimmed" style="font-size:0.82em;margin:0 0 12px">Accepteer missies voor bonusbeloningen. Max ${maxActief} actieve missies tegelijk. Cargo-missies: koop zelf de lading en lever af bij bestemming.</p>`;

        // Actieve missies
        if (actief.length > 0) {
            html += '<div class="missie-sectie-titel">Actieve missies</div>';
            actief.forEach(m => {
                const resterend = m.deadline - beurt;
                const urgentie = resterend <= 5 ? 'kleur-rood' : resterend <= 10 ? 'kleur-oranje' : 'kleur-dimmed';
                if (m.type === 'cargo') {
                    const inHold = state.lading[m.goedId] || 0;
                    const heeftGenoeg = inHold >= m.hoeveelheid;
                    const voortgang = heeftGenoeg
                        ? `<span class="kleur-groen">✓ Lading aan boord</span>`
                        : `<span class="kleur-rood">${inHold}/${m.hoeveelheid} ton aan boord</span>`;
                    html += `<div class="missie-kaart missie-actief">
                        <div class="missie-type-icoon">📦</div>
                        <div class="missie-info">
                            <div class="missie-titel">${m.goedIcoon} Lever ${m.hoeveelheid}t ${m.goedNaam} af op <strong>${m.bestemmingNaam}</strong></div>
                            <div class="missie-meta">${voortgang} &nbsp;·&nbsp; <span class="${urgentie}">Deadline: beurt ${m.deadline} (nog ${resterend})</span></div>
                        </div>
                        <div class="missie-beloning">+${state.formatteerKrediet(m.beloning)}<br><span class="kleur-dimmed" style="font-size:0.78em">bonus</span></div>
                    </div>`;
                } else {
                    html += `<div class="missie-kaart missie-actief">
                        <div class="missie-type-icoon">👤</div>
                        <div class="missie-info">
                            <div class="missie-titel">VIP-transport naar <strong>${m.bestemmingNaam}</strong></div>
                            <div class="missie-meta"><span class="kleur-accent">VIP aan boord</span> &nbsp;·&nbsp; <span class="${urgentie}">Deadline: beurt ${m.deadline} (nog ${resterend})</span></div>
                        </div>
                        <div class="missie-beloning">+${state.formatteerKrediet(m.beloning)}</div>
                    </div>`;
                }
            });
        }

        // Beschikbare missies
        if (beschikbaar.length > 0) {
            html += '<div class="missie-sectie-titel" style="margin-top:16px">Beschikbare missies</div>';
            const kanMeer = actief.length < maxActief;
            beschikbaar.forEach(m => {
                const resterend = m.deadline - beurt;
                if (m.type === 'cargo') {
                    html += `<div class="missie-kaart">
                        <div class="missie-type-icoon">📦</div>
                        <div class="missie-info">
                            <div class="missie-titel">${m.goedIcoon} Lever ${m.hoeveelheid}t ${m.goedNaam} af op <strong>${m.bestemmingNaam}</strong></div>
                            <div class="missie-meta kleur-dimmed">Deadline: beurt ${m.deadline} (nog ${resterend} beurten)</div>
                        </div>
                        <div class="missie-beloning">+${state.formatteerKrediet(m.beloning)}<br><span class="kleur-dimmed" style="font-size:0.78em">bonus</span></div>
                        <button class="knop primair klein missie-knop" onclick="App.accepteerMissie(${m.id})" ${kanMeer ? '' : 'disabled'}>Accepteer</button>
                    </div>`;
                } else {
                    const capOk = (state.schip?.passagiersCapaciteit || 0) > 0 && state.passagiers < (state.schip?.passagiersCapaciteit || 0);
                    html += `<div class="missie-kaart">
                        <div class="missie-type-icoon">👤</div>
                        <div class="missie-info">
                            <div class="missie-titel">VIP-transport naar <strong>${m.bestemmingNaam}</strong></div>
                            <div class="missie-meta kleur-dimmed">Behoeft vrije passagiersplaats &nbsp;·&nbsp; Deadline: beurt ${m.deadline} (nog ${resterend} beurten)</div>
                        </div>
                        <div class="missie-beloning">+${state.formatteerKrediet(m.beloning)}</div>
                        <button class="knop primair klein missie-knop" onclick="App.accepteerMissie(${m.id})" ${kanMeer && capOk ? '' : 'disabled'}>Accepteer</button>
                    </div>`;
                }
            });
        }

        if (actief.length === 0 && beschikbaar.length === 0) {
            html += '<div class="kleur-dimmed" style="text-align:center;padding:24px 0">Geen missies beschikbaar. Land op een planeet voor nieuwe missies.</div>';
        }

        container.innerHTML = html;
    },

};
