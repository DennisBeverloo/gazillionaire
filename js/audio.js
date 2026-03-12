// =============================================================================
// GAZILLIONAIRE - Audio module (Web Audio API, geen externe bestanden)
// =============================================================================

const Audio = (() => {
    let ctx = null;
    let gedempt = localStorage.getItem('gazillionaire_mute') === '1';

    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function speel(fn) {
        if (gedempt) return;
        try { fn(getCtx()); } catch (e) { /* stille fout */ }
    }

    // Enkelvoudige oscillator met exponentiële decay
    function osc(ctx, t, type, freqStart, freqEnd, duur, volume, delay = 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = type;
        o.frequency.setValueAtTime(freqStart, t + delay);
        if (freqEnd !== freqStart) o.frequency.exponentialRampToValueAtTime(freqEnd, t + delay + duur);
        g.gain.setValueAtTime(volume, t + delay);
        g.gain.exponentialRampToValueAtTime(0.001, t + delay + duur);
        o.start(t + delay);
        o.stop(t + delay + duur + 0.01);
    }

    return {
        isGedempt: () => gedempt,

        setGedempt(val) {
            gedempt = val;
            localStorage.setItem('gazillionaire_mute', val ? '1' : '0');
        },

        // Futuristisch hoog scherp beepje — algemene knoppen
        klik() {
            speel(ctx => {
                const t = ctx.currentTime;
                osc(ctx, t, 'square', 2800, 1800, 0.035, 0.06);
            });
        },

        // Vallende metalen muntjes — aankoop
        koop() {
            speel(ctx => {
                const t = ctx.currentTime;
                // Vijf plinks op iets andere toonhoogtes, snel na elkaar
                const plinks = [
                    [0.000, 1600, 0.09],
                    [0.055, 1350, 0.07],
                    [0.110, 1800, 0.06],
                    [0.165, 1100, 0.05],
                    [0.215, 1450, 0.04],
                ];
                plinks.forEach(([delay, freq, vol]) => {
                    osc(ctx, t, 'triangle', freq, freq * 0.7, 0.12, vol, delay);
                });
            });
        },

        // Kassalade die dichtslaat — verkoop / geld ontvangen
        verkoop() {
            speel(ctx => {
                const t = ctx.currentTime;
                // Mechanische klik (de la die dichtvalt)
                osc(ctx, t, 'square', 180, 60, 0.035, 0.25, 0.00);
                // Metalen ring ("ching") die naklinkt
                osc(ctx, t, 'sine', 2600, 2600, 0.40, 0.10, 0.03);
                osc(ctx, t, 'sine', 3200, 3200, 0.35, 0.05, 0.03);
            });
        },

        // Buskaartje stempelen/knippen — passagiers aan boord
        passagiers() {
            speel(ctx => {
                const t = ctx.currentTime;
                // Mechanische stamp: kort vierkant burst
                osc(ctx, t, 'square', 350, 180, 0.04, 0.22, 0.00);
                // Papier/metaal klink
                osc(ctx, t, 'triangle', 1400, 900, 0.07, 0.10, 0.04);
                // Kleine echo
                osc(ctx, t, 'triangle', 1400, 900, 0.07, 0.05, 0.09);
            });
        },

        // Dikke druppel olie — brandstof kopen
        brandstof() {
            speel(ctx => {
                const t = ctx.currentTime;
                // Ploep: snel dalende toon, lage frequentie
                osc(ctx, t, 'sine', 520, 55, 0.18, 0.28);
            });
        },

        // Futuristisch ruimteschip — reis starten (langere brom met tremolo)
        reis() {
            speel(ctx => {
                const t = ctx.currentTime;
                const dur = 2.2;

                // Laag sawtooth engine, door lowpass filter
                const engine = ctx.createOscillator();
                const filter  = ctx.createBiquadFilter();
                const gainE   = ctx.createGain();
                engine.connect(filter); filter.connect(gainE); gainE.connect(ctx.destination);
                engine.type = 'sawtooth';
                engine.frequency.setValueAtTime(68, t);
                engine.frequency.linearRampToValueAtTime(95, t + 1.4);
                engine.frequency.linearRampToValueAtTime(80, t + dur);
                filter.type = 'lowpass'; filter.frequency.value = 280;
                gainE.gain.setValueAtTime(0.001, t);
                gainE.gain.linearRampToValueAtTime(0.22, t + 0.35);
                gainE.gain.setValueAtTime(0.22, t + 1.5);
                gainE.gain.exponentialRampToValueAtTime(0.001, t + dur);
                engine.start(t); engine.stop(t + dur + 0.05);

                // Tremolo LFO op een tweede sine-laag (futuristisch zoemen)
                const lfo     = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                const hum     = ctx.createOscillator();
                const gainH   = ctx.createGain();
                lfo.frequency.value = 5.5;
                lfoGain.gain.value  = 0.06;
                lfo.connect(lfoGain); lfoGain.connect(gainH.gain);
                hum.type = 'sine';
                hum.frequency.setValueAtTime(155, t);
                hum.frequency.linearRampToValueAtTime(185, t + 1.2);
                hum.frequency.linearRampToValueAtTime(160, t + dur);
                gainH.gain.setValueAtTime(0.10, t);
                gainH.gain.exponentialRampToValueAtTime(0.001, t + dur);
                hum.connect(gainH); gainH.connect(ctx.destination);
                lfo.start(t); lfo.stop(t + dur + 0.05);
                hum.start(t); hum.stop(t + dur + 0.05);

                // Hoge "engage" sweep bij de start
                osc(ctx, t, 'sine', 1800, 620, 0.40, 0.10, 0.05);
            });
        },

        // Aankomst op planeet — thud + ping
        landing() {
            speel(ctx => {
                const t = ctx.currentTime;
                osc(ctx, t, 'sine', 160, 55, 0.18, 0.28, 0.00);
                osc(ctx, t, 'sine', 680, 680, 0.28, 0.13, 0.12);
            });
        },

        // Pi-ping — achievement unlock (twee hoge tonen)
        achievement() {
            speel(ctx => {
                const t = ctx.currentTime;
                osc(ctx, t, 'sine', 1318, 1318, 0.14, 0.18, 0.00); // E6
                osc(ctx, t, 'sine', 1976, 1976, 0.22, 0.22, 0.16); // B6
            });
        },

        // Dubbel alarm-bleep — gevaarlijk event
        eventGevaar() {
            speel(ctx => {
                const t = ctx.currentTime;
                osc(ctx, t, 'square', 220, 220, 0.13, 0.10, 0.00);
                osc(ctx, t, 'square', 220, 220, 0.13, 0.10, 0.20);
            });
        },

        // Helder oplopend ping — positief event
        eventPositief() {
            speel(ctx => {
                const t = ctx.currentTime;
                osc(ctx, t, 'sine', 880, 1320, 0.22, 0.15);
            });
        },

        // Dalende toon — negatieve actie / fout / negatief event
        negatief() {
            speel(ctx => {
                const t = ctx.currentTime;
                osc(ctx, t, 'sine', 420, 200, 0.28, 0.16);
            });
        },

        // Droevige akkoordreeks — bankroet
        bankroet() {
            speel(ctx => {
                const t = ctx.currentTime;
                [[440, 0.00], [370, 0.22], [294, 0.44], [220, 0.68]].forEach(([freq, delay]) => {
                    osc(ctx, t, 'sine', freq, freq, 0.30, 0.18, delay);
                });
            });
        },

        // Mechanisch ratel + toon — upgrade gekocht
        upgrade() {
            speel(ctx => {
                const t = ctx.currentTime;
                osc(ctx, t, 'square', 180, 180, 0.06, 0.08, 0.00);
                osc(ctx, t, 'square', 180, 180, 0.06, 0.08, 0.08);
                osc(ctx, t, 'sine',   660, 990, 0.20, 0.14, 0.16);
            });
        },
    };
})();
