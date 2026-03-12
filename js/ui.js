// =============================================================================
// GAZILLIONAIRE: STER DER HANDEL - UI Rendering
// =============================================================================

const UI = {

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

        SCHEPEN.forEach(schip => {
            const resterend = START_KREDIET - schip.prijs;
            const div = document.createElement('div');
            div.className = 'schip-kaart';

            div.innerHTML = `
                <div class="schip-kaart-intro">
                    <span class="schip-icoon">${schip.icoon}</span>
                    <h3>${schip.naam}</h3>
                    <div class="prijs">${state.formatteerKrediet(schip.prijs)}</div>
                    <p>${schip.beschrijving}</p>
                </div>
                <div class="schip-kaart-stats">
                    <div class="schip-stat"><span>Snelheid</span><span class="waarde ster-rating">${'★'.repeat(schip.snelheid)}${'☆'.repeat(5-schip.snelheid)}</span></div>
                    <div class="schip-stat"><span>Laadruimte</span><span class="waarde">${schip.laadruimte} ton</span></div>
                    <div class="schip-stat"><span>Brandstoftank</span><span class="waarde">${schip.brandstofTank} l</span></div>
                    <div class="schip-stat"><span>Passagiers</span><span class="waarde">${schip.passagiersCapaciteit > 0 ? schip.passagiersCapaciteit : '—'}</span></div>
                    <div class="schip-stat"><span>Schild</span><span class="waarde ster-rating">${'★'.repeat(schip.schild)}${'☆'.repeat(5-schip.schild)}</span></div>
                    <div class="schip-stat"><span>Startkapitaal</span><span class="waarde ${resterend < 500 ? 'kleur-rood' : 'kleur-groen'}">${state.formatteerKrediet(resterend)}</span></div>
                </div>
                <button class="knop primair schip-kies-knop" onclick="App.selecteerSchip('${schip.id}')">Dit schip kiezen</button>
            `;
            container.appendChild(div);
        });
    },

    // =========================================================================
    // HOOFD RENDER — roept alles aan
    // =========================================================================

    renderSpel() {
        this.updateTopBalk();
        this.renderPlaneetInfo();
        this.renderKaart();
        this.renderBestemmingPaneel();
        this.updateBerichten();

        // Render actieve tab-inhoud
        switch (state.activeTab) {
            case 'handel':       this.renderHandelTab();       break;
            case 'haven':        this.renderHavenTab();        break;
            case 'beurs':        this.renderBeursTab();        break;
            case 'logboek':      this.renderLogboekTab();      break;
            case 'ranglijst':    this.renderRanglijstTab();    break;
            case 'achievements': this.renderAchievementsTab(); break;
        }

        // *** KRITIEKE FIX: toggle tab-panelen ÉN tab-knoppen ***
        document.querySelectorAll('.tab-paneel').forEach(p => p.classList.remove('actief'));
        document.getElementById(`${state.activeTab}-tab`)?.classList.add('actief');
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('actief', tab.dataset.tab === state.activeTab);
        });
    },

    renderBestemmingPaneel() {
        const container = document.getElementById('bestemming-paneel-container');
        if (!container) return;

        // Geen bestemming geselecteerd: toon dropdown
        if (!state.geselecteerdePlaneet) {
            const opties = PLANETEN
                .filter(p => p.id !== state.locatie)
                .map(p => `<option value="${p.id}">${p.naam}${p.isGevaarlijk ? ' ⚠' : ''}</option>`)
                .join('');
            container.innerHTML = `<div class="bestemming-paneel">
                <div class="bestemming-label">Bestemming</div>
                <select class="bestemming-dropdown" onchange="App.selecteerBestemming(this.value)">
                    <option value="">— Kies je bestemming —</option>
                    ${opties}
                </select>
            </div>`;
            return;
        }

        const dest = PLANETEN.find(p => p.id === state.geselecteerdePlaneet);
        if (!dest) { container.innerHTML = ''; return; }

        const brandstofNodig = state.berekenBrandstofVerbruik(state.locatie, dest.id);
        const heeftGenoeg = state.brandstof >= brandstofNodig;
        const afstand = Math.round(state.berekenAfstand(state.locatie, dest.id));
        container.innerHTML = `<div class="bestemming-paneel">
            <div class="bestemming-label">Bestemming
                <button class="bestemming-wijzig" onclick="App.selecteerBestemming('')">✕ Wijzig</button>
            </div>
            <div class="bestemming-paneel-naam">
                <span class="planeet-bol" style="background:${dest.kleur};width:13px;height:13px"></span>
                <strong>${dest.naam}</strong>
                ${dest.isGevaarlijk ? '<span class="kleur-rood" style="font-size:0.78em">⚠ Gevaarlijk</span>' : ''}
            </div>
            <div class="kleur-dimmed" style="font-size:0.82em;margin:6px 0 8px">${dest.beschrijving}</div>
            <div class="bestemming-meta-rij">
                <span class="kleur-dimmed">Afstand</span><span>${afstand} lj</span>
            </div>
            <div class="brandstof-vereist ${heeftGenoeg ? '' : 'brandstof-tekort'}" style="margin-top:6px">
                <span class="bestemming-sub-label">Brandstofkosten</span>
                <div>⛽ ${brandstofNodig} l
                ${heeftGenoeg
                    ? `<span class="kleur-groen">✓</span>`
                    : `<span class="kleur-rood">✗ tekort: ${brandstofNodig - state.brandstof} l</span>`}
                </div>
            </div>
            <button class="knop ${heeftGenoeg ? 'primair' : 'gevaar'}" style="width:100%;padding:10px 0;margin-top:8px" onclick="App.reisNaar('${dest.id}')">🚀 Reis naar ${dest.naam} →</button>
        </div>`;
    },

    // =========================================================================
    // TOP BALK
    // =========================================================================

    updateTopBalk() {
        document.body.dataset.planeet = state.locatie;

        const el = id => document.getElementById(id);
        el('kapitein-display').textContent = `👤 ${state.speler?.naam ?? '---'}`;
        const hp = state.schipHP ?? 0;
        const maxHP = state.schip?.maxHP ?? 0;
        const hpPct = maxHP > 0 ? hp / maxHP : 1;
        const hpKleur = hpPct >= 0.8 ? 'var(--groen)' : hpPct >= 0.5 ? 'var(--oranje)' : 'var(--rood)';
        const schipEl = el('schip-naam-display');
        schipEl.innerHTML = `🚀 ${state.schip?.naam ?? '---'} <span style="color:${hpKleur};font-size:0.9em">❤ ${hp}/${maxHP}</span>`;

        const geladen = state.getLadingGewicht?.() ?? 0;
        const maxLading = state.schip?.laadruimte ?? 0;
        el('cargo-display').textContent = `📦 ${geladen}/${maxLading} ton`;

        const pax = state.passagiers ?? 0;
        const maxPax = state.schip?.passagiersCapaciteit ?? 0;
        el('passagiers-display').textContent = `🧳 ${pax}/${maxPax}`;

        const brandstof = state.brandstof ?? 0;
        const maxBrandstof = state.schip?.brandstofTank ?? 0;
        el('brandstof-display').textContent = `⛽ ${brandstof}/${maxBrandstof} l`;

        const kredietEl = el('krediet-display');
        kredietEl.textContent = `💰 ${state.formatteerKrediet(state.speler.krediet)}`;
        kredietEl.classList.toggle('krediet-negatief', state.speler.krediet < 0);

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
        const ids = ['schip-naam-display', 'cargo-display', 'passagiers-display', 'brandstof-display', 'krediet-display'];
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
                const prijs = state.brandstofPrijzen?.[state.locatie] ?? '?';
                const pct = Math.round(state.brandstof / state.schip.brandstofTank * 100);
                const kleur = state.brandstof < 20 ? 'var(--rood)' : state.brandstof < 40 ? 'var(--oranje)' : 'var(--groen)';
                return `<div class="tt-label">Brandstof</div>
                    <div class="tt-rij"><span>Niveau</span><span style="color:${kleur}">${state.brandstof}/${state.schip.brandstofTank} l (${pct}%)</span></div>
                    <div class="tt-rij"><span>Prijs hier</span><span class="tt-prijs">${prijs} cr/l</span></div>`;
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
        const tags = [];
        if (planeet.heeftBank)  tags.push('<span class="planeet-tag" data-tip="Hier kun je geld lenen of een bestaande lening (gedeeltelijk) aflossen.">💳 Bank</span>');
        if (planeet.heeftWerf)  tags.push('<span class="planeet-tag" data-tip="Hier kun je je schip repareren en upgrades installeren.">🛸 Scheepswerf</span>');
        if (planeet.specialiteit?.length) tags.push('<span class="planeet-tag kleur-groen" data-tip="Deze planeet produceert bepaalde goederen — die zijn hier goedkoper te koop.">↓ Goedkoop</span>');
        if (planeet.vraag?.length)        tags.push('<span class="planeet-tag kleur-oranje" data-tip="Bepaalde goederen zijn hier erg gewild en worden voor een hogere prijs opgekocht.">↑ Gevraagd</span>');

        container.innerHTML = `
            <div class="planeet-info-kaart" style="background-image:url('${imgSrc}');--planeet-kleur:${planeet.kleur}">
                <div class="planeet-info-overlay">
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
                glow.setAttribute('r', isHuidig ? 11 : 9);
                glow.setAttribute('fill', 'none');
                glow.setAttribute('stroke', isHuidig ? '#ffffff' : '#00d4ff');
                glow.setAttribute('stroke-width', '1.5');
                glow.setAttribute('opacity', '0.55');
                g.appendChild(glow);
            }

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', px); circle.setAttribute('cy', py);
            circle.setAttribute('r', isHuidig ? 7 : 5.5);
            circle.setAttribute('fill', planeet.kleur);
            circle.setAttribute('opacity', isHuidig ? '1' : '0.82');
            g.appendChild(circle);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', px); text.setAttribute('y', py + 16);
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
                <span class="stat-waarde ster-rating">${'★'.repeat(s.snelheid)}${'☆'.repeat(Math.max(0,5-s.snelheid))}</span>
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
                <span class="stat-waarde">${'★'.repeat(s.schild)}${'☆'.repeat(Math.max(0,5-s.schild))}</span>
            </div>
            ${(s.passagiersCapaciteit || 0) > 0 ? `<div class="stat-rij"><span class="stat-naam">Passagiers</span><span class="stat-waarde">${state.passagiers?.length || 0}/${s.passagiersCapaciteit}</span></div>` : ''}
            <div class="stat-rij">
                <span class="stat-naam">⛽ Brandstof</span>
                <span class="stat-waarde ${state.brandstof < 20 ? 'kleur-rood' : state.brandstof < 40 ? 'kleur-oranje' : ''}">${state.brandstof}/${s.brandstofTank} l</span>
            </div>
            <div class="lading-balk-container">
                <div class="lading-balk" style="width:${Math.round(state.brandstof/s.brandstofTank*100)}%;background:${state.brandstof < 20 ? 'var(--rood)' : state.brandstof < 40 ? 'var(--oranje)' : 'var(--groen)'}"></div>
            </div>
            ${state.schipBeschadigd ? '<div class="stat-rij"><span class="kleur-rood" style="font-size:0.78em">⚠ Schip beschadigd!</span></div>' : ''}
            ${s.heeftRadar ? '<div class="stat-rij"><span class="stat-naam">Radar</span><span class="stat-waarde kleur-groen">📡 Actief</span></div>' : ''}
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

        // === LOKALE MARKT ===
        html += `<div class="sectie-header">Lokale Markt — ${planeet.naam}</div>
                 <p class="kleur-dimmed" style="font-size:0.82em;margin:0 0 10px">${planeet.beschrijving}</p>`;

        html += `<table class="handel-tabel"><thead><tr>
            <th>Goed</th>
            <th>Prijs hier</th>
            ${state.schip?.heeftRadar ? '<th title="Prijstrend">Trend</th>' : ''}
            <th>In lading</th>
            <th colspan="2">Kopen</th>
            <th colspan="2">Verkopen</th>
        </tr></thead><tbody>`;

        const gesorteerdeGoederen = [...GOEDEREN].sort((a, b) =>
            state.getPrijs(state.locatie, a.id) - state.getPrijs(state.locatie, b.id)
        );

        gesorteerdeGoederen.forEach(goed => {
            const prijs     = state.getPrijs(state.locatie, goed.id);
            const inLading  = state.lading[goed.id] || 0;
            const vrij      = state.schip.laadruimte - state.getLadingGewicht();
            const maxKoop   = Math.min(Math.floor(vrij / goed.gewicht), Math.floor(state.speler.krediet / prijs));
            const allePrijzen = PLANETEN.map(p => state.getPrijs(p.id, goed.id));
            const minPrijs  = Math.min(...allePrijzen);
            const maxPrijs  = Math.max(...allePrijzen);
            const prijsKlas = prijs === minPrijs ? 'kleur-groen' : prijs === maxPrijs ? 'kleur-rood' : '';
            const tipMin    = Math.max(5, Math.round(goed.basisPrijs * 0.25));
            const tipMax    = Math.round(goed.basisPrijs * 2.2);
            const tipHtml   = `<span class="goed-tip">${goed.beschrijving}<br><span class="goed-tip-prijs">Bereik: ${tipMin}–${tipMax} credits &nbsp;·&nbsp; basis ${goed.basisPrijs} credits</span></span>`;

            let trendTd = '';
            if (state.schip?.heeftRadar) {
                const vorig = state.vorigePrijzen[state.locatie]?.[goed.id] ?? prijs;
                if      (prijs > vorig * 1.02) trendTd = '<td class="kleur-groen">↑</td>';
                else if (prijs < vorig * 0.98) trendTd = '<td class="kleur-rood">↓</td>';
                else                            trendTd = '<td class="kleur-dimmed">—</td>';
            }

            // Lading info (in cargo column)
            const aankoopPrijs = state.aankoopPrijzen[goed.id];
            let ladingTd = '—';
            if (inLading > 0) {
                ladingTd = `<strong>${inLading}</strong>`;
                if (aankoopPrijs) {
                    ladingTd += `<div class="aankoopprijs-info">gem. ${aankoopPrijs} credits</div>`;
                }
            }

            // Verkoop preview: opbrengst + P&L voor alle stuks in lading
            let verkInfoHtml = '';
            if (inLading > 0) {
                const totaalOpbrengst = prijs * inLading;
                verkInfoHtml = `<div class="verkoop-preview"><span class="kleur-dimmed">Alles: ${state.formatteerKrediet(totaalOpbrengst)}</span>`;
                if (aankoopPrijs) {
                    const totaalWinst = (prijs - aankoopPrijs) * inLading;
                    const wKlas = totaalWinst >= 0 ? 'winst-positief' : 'winst-negatief';
                    const wTeken = totaalWinst >= 0 ? '+' : '';
                    verkInfoHtml += ` <span class="${wKlas}">(${wTeken}${state.formatteerKrediet(totaalWinst)})</span>`;
                }
                verkInfoHtml += '</div>';
            }

            html += `<tr>
                <td><span class="goed-icoon">${goed.icoon}</span><span class="goed-tip-wrap">${goed.naam}${tipHtml}</span></td>
                <td class="${prijsKlas}" style="font-family:var(--font-data)">${state.formatteerKrediet(prijs)}</td>
                ${state.schip?.heeftRadar ? trendTd : ''}
                <td style="font-family:var(--font-data)">${ladingTd}</td>
                <td>
                    <div class="actie-rij">
                        <input class="aantal-invoer" type="number" min="1" max="${Math.max(1,maxKoop)}" value="1" id="koop-${goed.id}">
                        <button class="knop succes klein" onclick="App.koopGoed('${goed.id}')" ${maxKoop<=0?'disabled':''}>Koop</button>
                        <button class="knop dimmed klein" onclick="App.koopMax('${goed.id}')" ${maxKoop<=0?'disabled':''}>Max(${maxKoop})</button>
                    </div>
                </td>
                <td>
                    <div class="actie-rij">
                        <input class="aantal-invoer" type="number" min="1" max="${Math.max(1,inLading)}" value="1" id="verkoop-${goed.id}">
                        <button class="knop gevaar klein" onclick="App.verkoopGoed('${goed.id}')" ${inLading<=0?'disabled':''}>Verkoop</button>
                        <button class="knop dimmed klein" onclick="App.verkoopAlles('${goed.id}')" ${inLading<=0?'disabled':''}>Alles</button>
                    </div>
                    ${verkInfoHtml}
                </td>
            </tr>`;
        });

        html += '</tbody></table>';

        // === GALACTISCHE MARKT ===
        html += '<div class="sectie-header" style="margin-top:22px">🌌 Galactische Markt — Prijsvergelijking</div>';
        html += '<p class="kleur-dimmed" style="font-size:0.78em;margin:0 0 8px">Prijzen worden bijgewerkt na elke reis. <span class="badge-groen">■ Goedkoop</span> = koop hier &nbsp; <span class="badge-rood">■ Duur</span> = verkoop hier. Jouw huidige locatie is <u>onderstreept</u>.</p>';
        html += this._renderGalactischeMarkt();

        container.innerHTML = html;
    },

    _renderGalactischeMarkt() {
        let html = '<div class="galact-wrap"><table class="galact-tabel"><thead><tr>';
        html += '<th class="galact-goed-col">Goed</th>';

        PLANETEN.forEach(p => {
            const isHier = p.id === state.locatie;
            html += `<th class="${isHier ? 'galact-huidig-th' : ''}" style="color:${p.kleur}">${p.naam.replace(' Station','')}</th>`;
        });
        html += '</tr></thead><tbody>';

        const gesorteerdeGoederen = [...GOEDEREN].sort((a, b) =>
            state.getPrijs(state.locatie, a.id) - state.getPrijs(state.locatie, b.id)
        );

        gesorteerdeGoederen.forEach(goed => {
            // Kleur: laagste prijs = groen, hoogste = rood (per rij over alle planeten)
            const allePrijzen = PLANETEN.map(p => state.getPrijs(p.id, goed.id));
            const minPrijs = Math.min(...allePrijzen);
            const maxPrijs = Math.max(...allePrijzen);
            const tipMin2 = Math.max(5, Math.round(goed.basisPrijs * 0.25));
            const tipMax2 = Math.round(goed.basisPrijs * 2.2);
            const tipHtml2 = `<span class="goed-tip">${goed.beschrijving}<br><span class="goed-tip-prijs">Bereik: ${tipMin2}–${tipMax2} credits &nbsp;·&nbsp; basis ${goed.basisPrijs} credits</span></span>`;

            html += `<tr><td class="galact-goed-col"><span>${goed.icoon}</span><span class="goed-tip-wrap"> ${goed.naam}${tipHtml2}</span></td>`;

            PLANETEN.forEach(p => {
                const prijs = state.getPrijs(p.id, goed.id);
                const isHier = p.id === state.locatie;

                let klasse = isHier ? 'galact-cel galact-huidig' : 'galact-cel';
                if (prijs === minPrijs) klasse += ' galact-goedkoop';
                else if (prijs === maxPrijs) klasse += ' galact-duur';

                const inLading = state.lading[goed.id] || 0;
                const ladingMark = (isHier && inLading > 0) ? `<sup title="${inLading} aan boord">●</sup>` : '';

                html += `<td class="${klasse}">${prijs}${ladingMark}</td>`;
            });

            html += '</tr>';
        });

        html += '</tbody></table></div>';
        return html;
    },

    // =========================================================================
    // HAVEN TAB
    // =========================================================================

    renderHavenTab() {
        const container = document.getElementById('haven-tab');
        const planeet = PLANETEN.find(p => p.id === state.locatie);
        let html = '<div class="haven-raster">';

        // === REPARATIE (volle breedte, altijd zichtbaar) ===
        {
            const hp = state.schipHP ?? 0;
            const maxHP = state.schip?.maxHP ?? 0;
            const hpPct = maxHP > 0 ? Math.round(hp / maxHP * 100) : 100;
            const hpKleur = hpPct >= 80 ? 'var(--groen)' : hpPct >= 50 ? 'var(--oranje)' : 'var(--rood)';
            const repKosten = state.berekenReparatieKosten();
            const isTechton = state.locatie === 'techton';
            const kanBetalen = state.speler.krediet >= repKosten;
            let repHtml = `<div style="display:flex;align-items:center;gap:14px;margin-bottom:8px">
                <span style="font-size:1.1em;color:${hpKleur};font-weight:bold">❤ ${hp}/${maxHP}</span>
                <div class="lading-balk-container" style="flex:1;margin:0"><div class="lading-balk" style="width:${hpPct}%;background:${hpKleur}"></div></div>
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
            html += `<div class="haven-blok"><div class="haven-blok-header">🔧 Scheepsconditie</div><div class="haven-blok-inhoud">${repHtml}</div></div>`;
        }

        // === PASSAGIERS ===
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
            paxHtml = `<div class="pax-info-raster">
                <div class="pax-info-rij"><span class="kleur-dimmed">Aan boord</span><strong>${aanBoord}/${maxPax}</strong></div>
                <div class="pax-info-rij"><span class="kleur-dimmed">Wachtend</span><strong>${wachtendObj.aantal}</strong></div>
                <div class="pax-info-rij"><span class="kleur-dimmed">Ticketprijs</span><strong class="kleur-groen">${state.formatteerKrediet(wachtendObj.prijs)}/pp</strong></div>
                ${verwacht !== null ? `<div class="pax-info-rij"><span class="kleur-dimmed">Bij aankomst</span><strong class="kleur-goud">+${state.formatteerKrediet(verwacht)}</strong></div>` : ''}
            </div>
            ${kanInstappen ? `<button class="knop succes klein" style="margin-top:10px" onclick="App.boardPassagiers()">Neem ${instappers} passagier${instappers > 1 ? 's' : ''} aan boord</button>` : ''}
            <div class="kleur-dimmed" style="font-size:0.8em;margin-top:8px">Passagiers betalen bij aankomst op de volgende planeet.</div>`;
        }
        html += `<div class="haven-blok"><div class="haven-blok-header">🧳 Passagiers</div><div class="haven-blok-inhoud">${paxHtml}</div></div>`;

        // === MARKETING (alleen als passagiersschip + bestemming geselecteerd) ===
        const selP = state.geselecteerdePlaneet;
        if (maxPax > 0 && selP && selP !== state.locatie) {
            const mKosten = state.berekenMarketingKosten(selP);
            const selPNaam = PLANETEN.find(p => p.id === selP)?.naam ?? selP;
            const isActief = state.marketingActief?.planeet === selP;
            const heeftAndereCampagne = state.marketingActief && state.marketingActief.planeet !== selP;
            let mktHtml = '';
            if (isActief) {
                mktHtml = `<div class="kleur-groen" style="font-size:0.88em">✓ Campagne actief voor <strong>${selPNaam}</strong> — extra passagiers wachten bij aankomst.</div>`;
            } else {
                const kanBetalen = state.speler.krediet >= mKosten;
                mktHtml = `<div style="font-size:0.85em;margin-bottom:8px">Reclamecampagne voor <strong>${selPNaam}</strong>. Bij aankomst wachten meer passagiers op je, tegen een iets hogere ticketprijs.</div>
                    <button class="knop primair klein" onclick="App.koopMarketing('${selP}')" ${(!kanBetalen || heeftAndereCampagne) ? 'disabled' : ''}>Start campagne (${state.formatteerKrediet(mKosten)})</button>
                    ${heeftAndereCampagne ? `<div class="kleur-dimmed" style="font-size:0.8em;margin-top:6px">⚠ Al een actieve campagne.</div>` : ''}`;
            }
            html += `<div class="haven-blok"><div class="haven-blok-header">📢 Marketing</div><div class="haven-blok-inhoud">${mktHtml}</div></div>`;
        }

        // === BRANDSTOF ===
        const bPrijs = state.brandstofPrijzen[state.locatie] || 12;
        const tank = state.schip?.brandstofTank || 80;
        const vrij = tank - state.brandstof;
        const vulVolKosten = vrij * bPrijs;
        const brandstofPct = Math.round(state.brandstof / tank * 100);
        const bKleur = state.brandstof < 20 ? 'var(--rood)' : state.brandstof < 40 ? 'var(--oranje)' : 'var(--groen)';
        const bTekstKlasse = state.brandstof < 20 ? 'kleur-rood' : state.brandstof < 40 ? 'kleur-oranje' : 'kleur-groen';
        html += `<div class="haven-blok"><div class="haven-blok-header">⛽ Brandstof</div><div class="haven-blok-inhoud">
            <div class="brandstof-info-rij"><span>Voorraad: <strong class="${bTekstKlasse}">${state.brandstof}/${tank} l</strong></span><span>Prijs: <strong class="kleur-goud">${bPrijs} cr/l</strong></span></div>
            <div class="lading-balk-container" style="margin:6px 0"><div id="brandstof-balk" class="lading-balk${this._animeerBrandstof ? ' animeer' : ''}" style="width:${this._animeerBrandstof ? (this._brandstofPctVoor ?? 0) : brandstofPct}%;background:${bKleur}" data-target="${brandstofPct}"></div></div>
            <div class="brandstof-acties">
                <input type="number" id="brandstof-aantal" class="hoeveelheid-input" min="1" max="${vrij}" value="${Math.min(10, vrij)}" style="width:65px" ${vrij <= 0 ? 'disabled' : ''}>
                <button class="knop primair klein" onclick="App.koopBrandstof()" ${vrij <= 0 ? 'disabled' : ''}>Koop</button>
                <button class="knop dimmed klein" onclick="App.koopMaxBrandstof()" ${vrij <= 0 ? 'disabled' : ''}>Koop max</button>
                <button class="knop succes klein" onclick="App.vulTankVol()" ${vrij <= 0 ? 'disabled' : ''}>Vul vol (${state.formatteerKrediet(vulVolKosten)})</button>
            </div>
        </div></div>`;

        // === VERZEKERING ===
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
        html += `<div class="haven-blok"><div class="haven-blok-header">🛡️ Reisverzekering</div><div class="haven-blok-inhoud">${verzHtml}</div></div>`;

        // === BANK (alleen op planeten met bank) ===
        if (planeet.heeftBank) {
            html += `<div class="haven-blok"><div class="haven-blok-header">💳 Galactische Bank</div><div class="haven-blok-inhoud">
                <div class="stat-rij"><span class="stat-naam">Schuld</span><span class="stat-waarde kleur-oranje">${state.formatteerKrediet(state.speler.schuld)}</span></div>
                <div class="stat-rij"><span class="stat-naam">Limiet</span><span class="stat-waarde">${state.formatteerKrediet(MAX_SCHULD)}</span></div>
                <div class="stat-rij"><span class="stat-naam">Rente</span><span class="stat-waarde">${RENTE_PERCENTAGE*100}% per ${RENTE_INTERVAL} beurten</span></div>
                <div class="actie-rij" style="margin-top:12px;gap:8px;flex-wrap:wrap">
                    <input class="aantal-invoer" type="number" min="100" max="${Math.max(100,MAX_SCHULD-state.speler.schuld)}" step="100" value="1000" id="leen-bedrag" style="width:90px">
                    <button class="knop primair klein" onclick="App.leenGeld()">Leen credits</button>
                    <button class="knop gevaar klein" onclick="App.betaalLening()" ${state.speler.schuld<=0?'disabled':''}>Betaal af</button>
                </div>
            </div></div>`;
        }

        // === UPGRADES (volle breedte) ===
        const stapUpgrades = [
            { cat: 'motor',         icoon: '⚙️', naam: 'Motor',           beschrijving: '+1 snelheid per niveau' },
            { cat: 'ruim',          icoon: '📦', naam: 'Vrachtruim',       beschrijving: '+10 ton laadruimte per niveau' },
            { cat: 'brandstofTank', icoon: '⛽', naam: 'Brandstoftank',    beschrijving: '+10 l tankinhoud per niveau' },
            { cat: 'passagiers',    icoon: '🧳', naam: 'Passagiersruimte', beschrijving: '+2 passagiersplaatsen per niveau' },
            { cat: 'schild',        icoon: '🛡️', naam: 'Schild',           beschrijving: '+1 schildsterkte per niveau (betere ontsnappingskans en bescherming)' },
        ];
        let upgHtml = '<div class="upgrade-raster">';
        stapUpgrades.forEach(u => {
            const niv   = state.upgradeNiveaus?.[u.cat] ?? 0;
            const prijs = state._upgradeStapPrijs(u.cat);
            const kan   = state.speler.krediet >= prijs;
            upgHtml += `<div class="upgrade-kaart">
                <div style="font-size:1.4em;margin-bottom:5px">${u.icoon}</div>
                <h4>${u.naam} <span class="kleur-dimmed" style="font-weight:normal;font-size:0.8em">niv. ${niv}</span></h4>
                <p>${u.beschrijving}</p>
                <div class="upgrade-prijs">${state.formatteerKrediet(prijs)}</div>
                <button class="knop primair klein" ${!kan ? 'disabled' : ''} onclick="App.koopUpgradeStap('${u.cat}')">${kan ? 'Upgrade →' : 'Onvoldoende credits'}</button>
            </div>`;
        });
        upgHtml += '</div>';
        const eenmaligeCats = [
            { id: 'extra', naam: '📡 Extra' },
        ];
        eenmaligeCats.forEach(cat => {
            const catUpgrades = UPGRADES.filter(u => u.categorie === cat.id);
            if (catUpgrades.length === 0) return;
            upgHtml += `<div class="upgrade-categorie-header">${cat.naam}</div><div class="upgrade-raster">`;
            catUpgrades.forEach(upg => {
                const inst         = state.gekochteUpgrades.includes(upg.id);
                const vereistNaam  = upg.vereist ? UPGRADES.find(u=>u.id===upg.vereist)?.naam : null;
                const vereistMist  = upg.vereist && !state.gekochteUpgrades.includes(upg.vereist);
                const kanAfrekenen = state.speler.krediet >= upg.prijs;
                const btnDisabled  = inst || vereistMist || !kanAfrekenen;
                const btnLabel     = !kanAfrekenen && !vereistMist && !inst ? 'Onvoldoende credits' : 'Installeer';
                upgHtml += `<div class="upgrade-kaart ${inst ? 'al-geinstalleerd' : ''}">
                    <div style="font-size:1.4em;margin-bottom:5px">${upg.icoon}</div>
                    <h4>${upg.naam}</h4>
                    <p>${upg.beschrijving}</p>
                    <div class="upgrade-prijs">${state.formatteerKrediet(upg.prijs)}</div>
                    ${vereistNaam ? `<div class="upgrade-vereist">Vereist: ${vereistNaam}</div>` : ''}
                    ${inst
                        ? `<span class="kleur-groen" style="font-size:0.8em">✓ Actief</span>`
                        : `<button class="knop primair klein" ${btnDisabled?'disabled':''} onclick="App.koopUpgrade('${upg.id}')">${btnLabel}</button>`}
                </div>`;
            });
            upgHtml += '</div>';
        });
        html += `<div class="haven-blok haven-blok-vol-breed"><div class="haven-blok-header">⚙ Scheepsupgrades</div><div class="haven-blok-inhoud">${upgHtml}</div></div>`;

        // === SCHEEPSWERF (volle breedte, alleen op planeten met werf) ===
        if (planeet.heeftWerf) {
            const verkoopwaarde = Math.round(SCHEPEN.find(s => s.id === state.schip.id).prijs * 0.60);
            let werfHtml = `<div style="font-size:0.88em;margin-bottom:10px">Inruilwaarde <strong>${state.schip.naam}</strong>: <strong class="kleur-goud">${state.formatteerKrediet(verkoopwaarde)}</strong></div>`;
            werfHtml += '<div class="upgrade-raster">';
            SCHEPEN.filter(s => s.id !== state.schip.id).forEach(schip => {
                const netto = schip.prijs - verkoopwaarde;
                const kan   = state.speler.krediet >= netto;
                werfHtml += `<div class="upgrade-kaart">
                    <div style="font-size:1.4em;margin-bottom:5px">${schip.icoon}</div>
                    <h4>${schip.naam}</h4>
                    <p>${schip.beschrijving}</p>
                    <div class="schip-stat"><span>Snelheid</span><span class="waarde ster-rating">${'★'.repeat(schip.snelheid)}${'☆'.repeat(5-schip.snelheid)}</span></div>
                    <div class="schip-stat"><span>Laadruimte</span><span class="waarde">${schip.laadruimte} ton</span></div>
                    <div class="upgrade-prijs" style="margin-top:8px">Netto: ${state.formatteerKrediet(Math.max(0,netto))}</div>
                    <button class="knop primair klein" ${!kan?'disabled':''} onclick="App.koopSchip('${schip.id}')">${kan?'Koop schip':'Onvoldoende credits'}</button>
                </div>`;
            });
            werfHtml += '</div>';
            html += `<div class="haven-blok haven-blok-vol-breed"><div class="haven-blok-header">🛸 Scheepswerf</div><div class="haven-blok-inhoud">${werfHtml}</div></div>`;
        }

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
    },

    // =========================================================================
    // BEURS TAB
    // =========================================================================

    renderBeursTab() {
        const container = document.getElementById('beurs-tab');
        const portWaarde = state.getPortefeuilleWaarde();

        let html = `<div class="info-balk">
            Portefeuillewaarde: <strong class="kleur-goud">${state.formatteerKrediet(portWaarde)}</strong>
            &nbsp;|&nbsp; Beschikbaar: <strong>${state.formatteerKrediet(state.speler.krediet)}</strong>
            &nbsp;|&nbsp; <span class="kleur-dimmed" style="font-size:0.82em">Koersen bijgewerkt per reis</span>
        </div>`;

        html += '<div class="aandeel-kaarten">';
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
                <div class="aandeel-knoppen-koop">
                    ${[1,10,100].map(n => `<button class="knop succes klein" onclick="App.koopAandeelN('${a.id}',${n})" ${maxK<n?'disabled':''}>+${n}</button>`).join('')}
                    <button class="knop succes klein" onclick="App.koopAandeelMax('${a.id}')" ${maxK<=0?'disabled':''}>Max</button>
                </div>
                <div class="aandeel-knoppen-verkoop">
                    ${[1,10,100].map(n => `<button class="knop gevaar klein" onclick="App.verkoopAandeelN('${a.id}',${n})" ${bezit<n?'disabled':''}>-${n}</button>`).join('')}
                    <button class="knop gevaar klein" onclick="App.verkoopAandeelAlles('${a.id}')" ${bezit<=0?'disabled':''}>Alles</button>
                </div>
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
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

        const categorieen = [
            { id: 'deals', naam: '⚖ Handel & Deals' },
            { id: 'nettowaarde', naam: '💰 Nettowaarde' },
            { id: 'beurs', naam: '📈 Beurs' },
            { id: 'schip', naam: '🚀 Schip' },
            { id: 'events', naam: '⭐ Reizen & Events' },
        ];

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
                keuzes = event.keuzes.map(k => {
                    if (k.id === 'betaal') {
                        return { ...k, tekst: `Betaal het losgeld (${state.formatteerKrediet(bedrag)})` };
                    }
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
                state.aankomst();
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
                        } else if (state.huidigAankomstEvent) {
                            UI.toonAankomstPopup(state.huidigAankomstEvent);
                            state.huidigAankomstEvent = null;
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

    toonAankomstPopup(event) {
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
    // ACHIEVEMENT TOAST
    // =========================================================================

    toonAchievementToast(ach) {
        const toast = document.getElementById('achievement-toast');
        if (!toast) return;
        toast.innerHTML = `<span class="toast-icoon">${ach.icoon}</span>
            <div><div class="toast-naam">Achievement: ${ach.naam}</div>
            <div class="toast-beschr">${ach.beschrijving}</div>
            ${ach.beloning ? `<div class="toast-beschr kleur-goud">+${new Intl.NumberFormat('nl-NL').format(ach.beloning)} credits beloning</div>` : ''}</div>`;
        toast.classList.add('zichtbaar');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => toast.classList.remove('zichtbaar'), 4000);
    },

    toonTransactieToast(config) {
        const toast = document.getElementById('transactie-toast');
        if (!toast) return;
        const fmt = n => new Intl.NumberFormat('nl-NL').format(Math.round(n));
        const winstHtml = (config.winst !== undefined && config.winst !== null)
            ? `<div class="toast-beschr ${config.winst >= 0 ? 'kleur-groen' : 'kleur-rood'}">${config.winst >= 0 ? '+' : ''}${fmt(config.winst)} credits ${config.winst >= 0 ? 'winst' : 'verlies'}</div>`
            : '';
        toast.innerHTML = `<span style="font-size:1.6em">${config.icoon}</span>
            <div>
                <div class="toast-naam" style="color:var(--tekst);font-size:0.82em">${config.titel}</div>
                ${config.totaal ? `<div class="toast-beschr kleur-goud">+${fmt(config.totaal)} credits</div>` : ''}
                ${winstHtml}
            </div>`;
        toast.classList.remove('verlies');
        if (config.winst !== undefined && config.winst !== null && config.winst < 0) {
            toast.classList.add('verlies');
        }
        toast.classList.add('zichtbaar');
        clearTimeout(this._transactieToastTimer);
        this._transactieToastTimer = setTimeout(() => toast.classList.remove('zichtbaar'), 3500);
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
};
