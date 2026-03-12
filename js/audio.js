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

        // Subtiele klik — knoppen algemeen
        klik() {
            speel(ctx => {
                const t = ctx.currentTime;
                osc(ctx, t, 'sine', 880, 550, 0.07, 0.1);
            });
        },

        // Aankoop goederen — opwaartse sweep
        koop() {
            speel(ctx => {
                const t = ctx.currentTime;
                osc(ctx, t, 'sine', 380, 820, 0.18, 0.18);
            });
        },

        // Verkoop goederen — twee tonen, bevredigend
        verkoop() {
            speel(ctx => {
                const t = ctx.currentTime;
                osc(ctx, t, 'sine', 520, 520, 0.12, 0.16, 0.00);
                osc(ctx, t, 'sine', 780, 780, 0.15, 0.18, 0.13);
            });
        },

        // Reis starten — laag gebrom + hoge ping
        reis() {
            speel(ctx => {
                const t = ctx.currentTime;
                // Rumble
                const rumble = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const gainR = ctx.createGain();
                rumble.connect(filter); filter.connect(gainR); gainR.connect(ctx.destination);
                rumble.type = 'sawtooth';
                rumble.frequency.setValueAtTime(90, t);
                rumble.frequency.exponentialRampToValueAtTime(38, t + 0.6);
                filter.type = 'lowpass'; filter.frequency.value = 320;
                gainR.gain.setValueAtTime(0.22, t);
                gainR.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
                rumble.start(t); rumble.stop(t + 0.68);
                // Ping
                osc(ctx, t, 'sine', 1200, 760, 0.22, 0.12, 0.05);
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

        // Achievement unlock — kleine major-akkoord fanfare
        achievement() {
            speel(ctx => {
                const t = ctx.currentTime;
                // C5 – E5 – G5 arpeggio
                [[523, 0.00], [659, 0.13], [784, 0.26], [1047, 0.42]].forEach(([freq, delay]) => {
                    osc(ctx, t, 'sine', freq, freq, 0.38, 0.20, delay);
                });
            });
        },

        // Gevaarlijk event — dubbel alarm-bleep
        eventGevaar() {
            speel(ctx => {
                const t = ctx.currentTime;
                osc(ctx, t, 'square', 200, 200, 0.13, 0.10, 0.00);
                osc(ctx, t, 'square', 200, 200, 0.13, 0.10, 0.20);
            });
        },

        // Positief event — helder oplopend ping
        eventPositief() {
            speel(ctx => {
                const t = ctx.currentTime;
                osc(ctx, t, 'sine', 880, 1320, 0.22, 0.15);
            });
        },

        // Negatieve actie / foutmelding — afdaling
        negatief() {
            speel(ctx => {
                const t = ctx.currentTime;
                osc(ctx, t, 'sine', 420, 200, 0.25, 0.15);
            });
        },

        // Bankroet — dalende droevige akkoordreeks
        bankroet() {
            speel(ctx => {
                const t = ctx.currentTime;
                // A4 → F#4 → D4 → A3
                [[440, 0.00], [370, 0.22], [294, 0.44], [220, 0.68]].forEach(([freq, delay]) => {
                    osc(ctx, t, 'sine', freq, freq, 0.30, 0.18, delay);
                });
            });
        },

        // Upgrade gekocht — mechanisch ratel + toon
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
