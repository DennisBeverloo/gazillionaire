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
                <span class="schip-icoon">${schip.icoon}</span>
                <h3>${schip.naam}</h3>
                <div class="prijs">${state.formatteerKrediet(schip.prijs)}</div>
                <p>${schip.beschrijving}</p>
                <div class="schip-stat"><span>Snelheid</span><span class="waarde ster-rating">${'★'.repeat(schip.snelheid)}${'☆'.repeat(5-schip.snelheid)}</span></div>
                <div class="schip-stat"><span>Laadruimte</span><span class="waarde">${schip.laadruimte} ton</span></div>
                <div class="schip-stat"><span>Brandstoftank</span><span class="waarde">${schip.brandstofTank} e</span></div>
                <div class="schip-stat"><span>Passagiers</span><span class="waarde">${schip.passagiersCapaciteit > 0 ? schip.passagiersCapaciteit : '—'}</span></div>
                <div class="schip-stat"><span>Schild</span><span class="waarde ster-rating">${'★'.repeat(schip.schild)}${'☆'.repeat(5-schip.schild)}</span></div>
                <div class="schip-stat"><span>Startkapitaal</span><span class="waarde ${resterend < 500 ? 'kleur-rood' : 'kleur-groen'}">${state.formatteerKrediet(resterend)}</span></div>
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
        this.renderKaart();
        this.renderSchipStats();
        this.renderBestemmingPaneel();
        this.updateBerichten();

        // Render actieve tab-inhoud
        switch (state.activeTab) {
            case 'handel':       this.renderHandelTab();       break;
            case 'haven':        this.renderHavenTab();        break;
            case 'beurs':        this.renderBeursTab();        break;
            case 'logboek':      this.renderLogboekTab();      break;
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
        if (!state.geselecteerdePlaneet) { container.innerHTML = ''; return; }
        const dest = PLANETEN.find(p => p.id === state.geselecteerdePlaneet);
        if (!dest) { container.innerHTML = ''; return; }

        const brandstofNodig = state.berekenBrandstofVerbruik(state.locatie, dest.id);
        const heeftGenoeg = state.brandstof >= brandstofNodig;
        const goedGem = {};
        GOEDEREN.forEach(g => {
            goedGem[g.id] = PLANETEN.reduce((sum, pl) => sum + state.getPrijs(pl.id, g.id), 0) / PLANETEN.length;
        });
        const goedkoop = GOEDEREN
            .filter(g => state.getPrijs(dest.id, g.id) < goedGem[g.id] * 0.88)
            .sort((a, b) => (state.getPrijs(dest.id, a.id) / goedGem[a.id]) - (state.getPrijs(dest.id, b.id) / goedGem[b.id]))
            .slice(0, 3).map(g => g.naam);
        const duur = GOEDEREN
            .filter(g => state.getPrijs(dest.id, g.id) > goedGem[g.id] * 1.12)
            .sort((a, b) => (state.getPrijs(dest.id, b.id) / goedGem[b.id]) - (state.getPrijs(dest.id, a.id) / goedGem[a.id]))
            .slice(0, 3).map(g => g.naam);

        container.innerHTML = `<div class="bestemming-paneel">
            <div class="bestemming-paneel-naam">
                <span class="planeet-bol" style="background:${dest.kleur};width:13px;height:13px"></span>
                <strong>${dest.naam}</strong>
                ${dest.isGevaarlijk ? '<span class="kleur-rood" style="font-size:0.78em">⚠ Gevaarlijk</span>' : ''}
            </div>
            <p class="kleur-dimmed" style="font-size:0.8em;margin:5px 0 6px;line-height:1.35">${dest.beschrijving}</p>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">
                ${goedkoop.length ? `<span class="badge-groen">↓ ${goedkoop.join(', ')}</span>` : ''}
                ${duur.length ? `<span class="badge-rood">↑ ${duur.join(', ')}</span>` : ''}
                ${dest.heeftBank ? '<span class="kleur-dimmed" style="font-size:0.8em">🏦 Bank</span>' : ''}
                ${dest.heeftWerf ? '<span class="kleur-dimmed" style="font-size:0.8em">🛠 Werf</span>' : ''}
            </div>
            <div class="brandstof-vereist ${heeftGenoeg ? '' : 'brandstof-tekort'}">
                ⛽ ${brandstofNodig} e
                ${heeftGenoeg
                    ? `<span class="kleur-groen">✓</span>`
                    : `<span class="kleur-rood">✗ tekort: ${brandstofNodig - state.brandstof}</span>`}
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
        el('schip-naam-display').textContent = `🚀 ${state.schip?.naam ?? '---'}`;
        el('locatie-display').textContent = `📍 ${PLANETEN.find(p => p.id === state.locatie)?.naam ?? '---'}`;

        const cr.edietEl = el('krediet-display');
        cr.edietEl.textContent = `💰 ${state.formatteerKrediet(state.speler.krediet)}`;
        if (state.speler.krediet < 0) {
            cr.edietEl.classList.add('krediet-negatief');
        } else {
            cr.edietEl.classList.remove('krediet-negatief');
        }

        const rest = MAX_BEURTEN - state.beurt;
        const beurtEl = el('beurt-display');
        beurtEl.textContent = `Beurt ${state.beurt}/${MAX_BEURTEN}`;
        beurtEl.style.color = rest <= 20 ? 'var(--rood)' : rest <= 40 ? 'var(--oranje)' : '';
    },

    // =========================================================================
    // GALAXY KAART (SVG)
    // =========================================================================

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
                <span class="stat-waarde ster-rating">${'★'.repeat(s.snelheid)}${'☆'.repeat(Math.max(0,7-s.snelheid))}</span>
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
                <span class="stat-waarde ${state.brandstof < 20 ? 'kleur-rood' : state.brandstof < 40 ? 'kleur-oranje' : ''}">${state.brandstof}/${s.brandstofTank}</span>
            </div>
            <div class="lading-balk-container">
                <div class="lading-balk" style="width:${Math.round(state.brandstof/s.brandstofTank*100)}%;background:${state.brandstof < 20 ? 'var(--rood)' : state.brandstof < 40 ? 'var(--oranje)' : '#f59e0b'}"></div>
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

        GOEDEREN.forEach(goed => {
            const prijs     = state.getPrijs(state.locatie, goed.id);
            const inLading  = state.lading[goed.id] || 0;
            const vrij      = state.schip.laadruimte - state.getLadingGewicht();
            const maxKoop   = Math.min(Math.floor(vrij / goed.gewicht), Math.floor(state.speler.krediet / prijs));
            const ratio     = prijs / goed.basisPrijs;
            const prijsKlas = ratio < 0.65 ? 'kleur-groen' : ratio > 1.40 ? 'kleur-rood' : '';

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
                    ladingTd += `<div class="aankoopprijs-info">gem. ${aankoopPrijs} cr.</div>`;
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
                <td><span class="goed-icoon">${goed.icoon}</span> ${goed.naam}</td>
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

        GOEDEREN.forEach(goed => {
            // Kleur: onderste 5% van de prijsrange = groen, bovenste 5% = rood (max 1-2 per rij)
            const allePrijzen = PLANETEN.map(p => state.getPrijs(p.id, goed.id));
            const minPrijs = Math.min(...allePrijzen);
            const maxPrijs = Math.max(...allePrijzen);

            html += `<tr><td class="galact-goed-col"><span>${goed.icoon}</span> ${goed.naam}</td>`;

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
        let html = '';

        // === REIZEN ===
        html += '<div class="sectie-header">🚀 Reisplanner</div>';
        html += '<div class="planeet-reislijst">';

        const gesorteerd = PLANETEN.filter(p => p.id !== state.locatie);

        // Precompute per-good average price for relative cheap/expensive badges
        const goedGem = {};
        GOEDEREN.forEach(g => {
            goedGem[g.id] = PLANETEN.reduce((sum, pl) => sum + state.getPrijs(pl.id, g.id), 0) / PLANETEN.length;
        });

        gesorteerd.forEach(p => {
            const isSel = state.geselecteerdePlaneet === p.id;
            const goedkoop = GOEDEREN
                .filter(g => state.getPrijs(p.id, g.id) < goedGem[g.id] * 0.88)
                .sort((a, b) => (state.getPrijs(p.id, a.id) / goedGem[a.id]) - (state.getPrijs(p.id, b.id) / goedGem[b.id]))
                .slice(0, 3).map(g => g.naam);
            const duur = GOEDEREN
                .filter(g => state.getPrijs(p.id, g.id) > goedGem[g.id] * 1.12)
                .sort((a, b) => (state.getPrijs(p.id, b.id) / goedGem[b.id]) - (state.getPrijs(p.id, a.id) / goedGem[a.id]))
                .slice(0, 3).map(g => g.naam);

            html += `<div class="planeet-rij ${isSel ? 'geselecteerd' : ''}" data-planeet="${p.id}" onclick="App.klikPlaneet('${p.id}')">
                <div class="planeet-rij-hoofdlijn">
                    <span class="planeet-bol" style="background:${p.kleur}"></span>
                    <strong class="planeet-rij-naam">${p.naam}</strong>
                    ${p.isGevaarlijk ? '<span class="kleur-rood" style="font-size:0.75em">⚠ Gevaarlijk</span>' : ''}
                    <button class="knop dimmed klein" onclick="event.stopPropagation();App.klikPlaneet('${p.id}')">Kies →</button>
                </div>
                <div class="planeet-rij-details">
                    ${goedkoop.length ? `<span class="badge-groen">↓ ${goedkoop.join(', ')}</span>` : ''}
                    ${duur.length ? `<span class="badge-rood">↑ ${duur.join(', ')}</span>` : ''}
                </div>
            </div>`;
        });
        html += '</div>';

        // === REPARATIE (indien beschadigd) ===
        if (state.schipBeschadigd) {
            html += `<div class="sectie-header" style="margin-top:18px">🔧 Scheepsreparatie</div>
            <div class="lening-sectie">
                <div class="kleur-rood" style="margin-bottom:10px">⚠ Je schip heeft schade. Dit vertraagt je reizen tot je repareert.</div>
                <button class="knop gevaar" onclick="App.repareerSchip()">Repareer nu (350 cr.)</button>
            </div>`;
        }

        // === PASSAGIERS ===
        const maxPax = state.schip?.passagiersCapaciteit || 0;
        const wachtend = state.passagiersWachtend?.[state.locatie] || [];
        const aanBoord = state.passagiers || [];

        html += `<div class="sectie-header" style="margin-top:18px">🧳 Passagiers</div>`;
        if (maxPax === 0) {
            html += `<div class="info-balk kleur-dimmed">Je huidige schip heeft geen passagiersruimte. Koop de Vrije Handelaar of Vleugelschipper voor passagiersvervoer.</div>`;
        } else {
            html += `<div class="info-balk">Passagiersplaatsen: <strong>${aanBoord.length}/${maxPax}</strong></div>`;

            if (aanBoord.length > 0) {
                html += '<div class="passagiers-lijst">';
                aanBoord.forEach(p => {
                    const bestNaam = PLANETEN.find(pl => pl.id === p.bestemming)?.naam ?? p.bestemming;
                    html += `<div class="passagier-rij aan-boord">
                        <span>👤 ${p.naam}</span>
                        <span class="kleur-dimmed">→ ${bestNaam}</span>
                        <span class="kleur-goud">+${state.formatteerKrediet(p.vergoeding)}</span>
                    </div>`;
                });
                html += '</div>';
            }

            if (wachtend.length > 0) {
                html += '<div class="sectie-header" style="font-size:0.65em;margin-top:10px">Wachten op vervoer</div>';
                html += '<div class="passagiers-lijst">';
                wachtend.forEach((p, i) => {
                    const bestNaam = PLANETEN.find(pl => pl.id === p.bestemming)?.naam ?? p.bestemming;
                    const kanNemen = aanBoord.length < maxPax;
                    html += `<div class="passagier-rij">
                        <span>👤 ${p.naam}</span>
                        <span class="kleur-dimmed">→ ${bestNaam}</span>
                        <span class="kleur-goud">${state.formatteerKrediet(p.vergoeding)}</span>
                        <button class="knop succes klein" ${!kanNemen ? 'disabled' : ''} onclick="App.neemPassagierAanBoord(${i})">Neem mee</button>
                    </div>`;
                });
                html += '</div>';
            } else if (aanBoord.length === 0) {
                html += '<div class="kleur-dimmed" style="font-size:0.83em;margin:8px 0">Geen passagiers wachten hier op vervoer.</div>';
            }
        }

        // === BRANDSTOF ===
        const bPrijs = state.brandstofPrijzen[state.locatie] || 12;
        const tank = state.schip?.brandstofTank || 80;
        const vrij = tank - state.brandstof;
        const vulVolKosten = vrij * bPrijs;
        const brandstofPct = Math.round(state.brandstof / tank * 100);
        const bKleur = state.brandstof < 20 ? 'var(--rood)' : state.brandstof < 40 ? 'var(--oranje)' : 'var(--groen)';
        const bTekstKlasse = state.brandstof < 20 ? 'kleur-rood' : state.brandstof < 40 ? 'kleur-oranje' : 'kleur-groen';
        html += `<div class="sectie-header" style="margin-top:18px">⛽ Brandstof</div>
        <div class="brandstof-sectie">
            <div class="brandstof-info-rij">
                <span>Voorraad: <strong class="${bTekstKlasse}">${state.brandstof}/${tank}</strong></span>
                <span>Prijs: <strong class="kleur-goud">${bPrijs} cr./e</strong></span>
            </div>
            <div class="lading-balk-container" style="margin:6px 0">
                <div class="lading-balk" style="width:${brandstofPct}%;background:${bKleur}"></div>
            </div>
            <div class="brandstof-acties">
                <input type="number" id="brandstof-aantal" class="hoeveelheid-input" min="1" max="${vrij}" value="${Math.min(10, vrij)}" style="width:65px" ${vrij <= 0 ? 'disabled' : ''}>
                <button class="knop primair klein" onclick="App.koopBrandstof()" ${vrij <= 0 ? 'disabled' : ''}>Koop</button>
                <button class="knop succes klein" onclick="App.vulTankVol()" ${vrij <= 0 ? 'disabled' : ''}>Vul vol (${state.formatteerKrediet(vulVolKosten)})</button>
            </div>
        </div>`;

        // === UPGRADES ===
        html += '<div class="sectie-header" style="margin-top:18px">⚙ Scheepsupgrades</div>';
        html += '<div class="upgrade-raster">';
        UPGRADES.forEach(upg => {
            const inst          = state.gekochteUpgrades.includes(upg.id);
            const vereistMist   = upg.vereist && !state.gekochteUpgrades.includes(upg.vereist);
            const kanAfrekenen  = state.speler.krediet >= upg.prijs;
            let btnLabel = 'Installeer';
            if (inst)          btnLabel = '✓ Geïnstalleerd';
            else if (vereistMist) btnLabel = `Vereist: ${UPGRADES.find(u=>u.id===upg.vereist)?.naam}`;
            else if (!kanAfrekenen) btnLabel = 'Onvoldoende cr.ediet';

            html += `<div class="upgrade-kaart ${inst ? 'al-geinstalleerd' : ''}">
                <div style="font-size:1.4em;margin-bottom:5px">${upg.icoon}</div>
                <h4>${upg.naam}</h4>
                <p>${upg.beschrijving}</p>
                <div class="upgrade-prijs">${state.formatteerKrediet(upg.prijs)}</div>
                ${inst ? `<span class="kleur-groen" style="font-size:0.8em">✓ Actief</span>`
                       : `<button class="knop primair klein" ${vereistMist||!kanAfrekenen?'disabled':''} onclick="App.koopUpgrade('${upg.id}')">${btnLabel}</button>`}
            </div>`;
        });
        html += '</div>';

        // === SCHEEPSWERF (only on planets with werf) ===
        if (planeet.heeftWerf) {
            const verkoopwaarde = Math.round(SCHEPEN.find(s => s.id === state.schip.id).prijs * 0.60);
            html += `<div class="sectie-header" style="margin-top:18px">🛸 Scheepswerf</div>
            <div class="info-balk">Inruilwaarde huidige ${state.schip.naam}: <strong class="kleur-goud">${state.formatteerKrediet(verkoopwaarde)}</strong></div>
            <div class="upgrade-raster">`;
            SCHEPEN.filter(s => s.id !== state.schip.id).forEach(schip => {
                const netto = schip.prijs - verkoopwaarde;
                const kan   = state.speler.krediet >= netto;
                html += `<div class="upgrade-kaart">
                    <div style="font-size:1.4em;margin-bottom:5px">${schip.icoon}</div>
                    <h4>${schip.naam}</h4>
                    <p>${schip.beschrijving}</p>
                    <div class="schip-stat"><span>Snelheid</span><span class="waarde ster-rating">${'★'.repeat(schip.snelheid)}${'☆'.repeat(5-schip.snelheid)}</span></div>
                    <div class="schip-stat"><span>Laadruimte</span><span class="waarde">${schip.laadruimte} ton</span></div>
                    <div class="upgrade-prijs" style="margin-top:8px">Netto: ${state.formatteerKrediet(Math.max(0,netto))}</div>
                    <button class="knop primair klein" ${!kan?'disabled':''} onclick="App.koopSchip('${schip.id}')">${kan?'Koop schip':'Onvoldoende cr.ediet'}</button>
                </div>`;
            });
            html += '</div>';
        }

        // === BANK (only on planets with bank) ===
        if (planeet.heeftBank) {
            html += `<div class="sectie-header" style="margin-top:18px">💳 Galactische Bank</div>
            <div class="lening-sectie">
                <div class="stat-rij"><span class="stat-naam">Openstaande schuld</span><span class="stat-waarde kleur-oranje">${state.formatteerKrediet(state.speler.schuld)}</span></div>
                <div class="stat-rij"><span class="stat-naam">Kredietlimiet</span><span class="stat-waarde">${state.formatteerKrediet(MAX_SCHULD)}</span></div>
                <div class="stat-rij"><span class="stat-naam">Rente</span><span class="stat-waarde">${RENTE_PERCENTAGE*100}% per ${RENTE_INTERVAL} beurten</span></div>
                <div class="actie-rij" style="margin-top:12px;gap:8px;flex-wrap:wrap">
                    <input class="aantal-invoer" type="number" min="100" max="${Math.max(100,MAX_SCHULD-state.speler.schuld)}" step="100" value="1000" id="leen-bedrag" style="width:90px">
                    <button class="knop primair klein" onclick="App.leenGeld()">Leen cr.ediet</button>
                    <button class="knop gevaar klein" onclick="App.betaalLening()" ${state.speler.schuld<=0?'disabled':''}>Betaal af</button>
                </div>
            </div>`;
        }

        container.innerHTML = html;
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
                    ${aankoopKoers ? `<div class="aandeel-bezit-rij"><span class="kleur-dimmed">Gem. aankoop</span><span>${aankoopKoers} cr.</span></div>` : ''}
                    <div class="aandeel-bezit-rij"><span class="kleur-dimmed">Waarde</span><span class="kleur-goud">${state.formatteerKrediet(waarde)}</span></div>
                    ${ongrReal !== null ? `<div class="aandeel-bezit-rij"><span class="kleur-dimmed">P&amp;L</span><span class="${ongrKlas}">${ongrReal >= 0 ? '+' : ''}${state.formatteerKrediet(ongrReal)}</span></div>` : ''}
                </div>`;
            } else {
                portfolioHtml = `<div class="aandeel-portfolio-info"><span class="kleur-dimmed" style="font-size:0.78em">Niet in portfolio</span></div>`;
            }

            html += `<div class="aandeel-kaart">
                <div class="aandeel-kaart-top">
                    <span>${a.icoon}</span>
                    <span class="aandeel-kaart-naam">${a.naam}</span>
                </div>
                <div class="aandeel-koers-groot">${koers} cr.</div>
                <div class="aandeel-delta ${dKlas}">${dTeken}${delta} cr. (${dTeken}${dPct}%)</div>
                ${this._renderSparkline(a.id)}
                ${portfolioHtml}
                <div class="aandeel-actie-rij">
                    <div class="actie-rij">
                        <input class="aantal-invoer" type="number" min="1" max="${Math.max(1,maxK)}" value="1" id="koop-aandeel-${a.id}" style="width:50px">
                        <button class="knop succes klein" onclick="App.koopAandeel('${a.id}')" ${maxK<=0?'disabled':''}>Koop</button>
                    </div>
                    <div class="actie-rij">
                        <input class="aantal-invoer" type="number" min="1" max="${Math.max(1,bezit)}" value="1" id="verkoop-aandeel-${a.id}" style="width:50px">
                        <button class="knop gevaar klein" onclick="App.verkoopAandeel('${a.id}')" ${bezit<=0?'disabled':''}>Verkoop</button>
                    </div>
                </div>
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    },

    // Genereer SVG sparkline voor een aandeel
    _renderSparkline(aandeelId, breedte = 150, hoogte = 50) {
        const data = state.aandeelGeschiedenis?.[aandeelId] ?? [];
        if (data.length < 2) return `<div class="sparkline-leeg">Geen data</div>`;

        const min = Math.min(...data) * 0.95;
        const max = Math.max(...data) * 1.05;
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

        return `<svg width="${breedte}" height="${hoogte}" viewBox="0 0 ${breedte} ${hoogte}">
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
                </div>`;
            });
            html += '</div>';
        });

        container.innerHTML = html;
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

            const btn = document.createElement('button');
            btn.className = 'knop primair';
            btn.textContent = 'Doorgaan →';
            btn.onclick = () => {
                this.verbergEventPopup();
                if (state.fase === 'einde') { UI.toonEindeScherm(); return; }
                state.aankomst();
                const planNaam = PLANETEN.find(p => p.id === state.locatie)?.naam ?? '';
                App._startFase2(() => {
                    App._setReisStatus(`✓ Aangekomen op ${planNaam}!`, 'kleur-groen');
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
        }
    },

    verbergEventPopup() {
        document.getElementById('event-popup').classList.add('verborgen');
        document.getElementById('event-gevolg').textContent = '';
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
            <div class="toast-beschr">${ach.beschrijving}</div></div>`;
        toast.classList.add('zichtbaar');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => toast.classList.remove('zichtbaar'), 4000);
    },

    // =========================================================================
    // REIS SCHERM
    // =========================================================================

    updateReisScherm() {
        if (!state.reisData) return;
        const { naar } = state.reisData;
        const planeet = PLANETEN.find(p => p.id === naar);
        document.getElementById('reis-bestemming').textContent = planeet?.naam ?? '---';
        document.getElementById('reis-voortgang-balk').style.width = '0%';
        document.getElementById('reis-status').textContent = '';
        const animEl = document.getElementById('reis-animatie');
        if (animEl) animEl.textContent = state.schipBeschadigd ? '🛸' : '🚀';
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
            beschr = `Ongelooflijk, ${state.speler.naam}! Je hebt de magische grens van één miljoen cr.ediet bereikt. De melkweg knielt voor je handelsgeest!`;
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
