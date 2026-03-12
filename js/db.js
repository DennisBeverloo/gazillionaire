// =============================================================================
// GAZILLIONAIRE - Supabase database module
// =============================================================================

const SUPABASE_URL = 'https://iznjmlapxpalrousycxy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0VCRyg7bJPhX3c-rgge6Ew_xT8zgfDM';

const DB = (() => {
    let _client = null;

    function client() {
        if (!_client && window.supabase?.createClient) {
            _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }
        return _client;
    }

    return {
        async slaScoreOp() {
            const db = client();
            if (!db) { console.warn('Supabase niet beschikbaar'); return; }

            const { error } = await db.from('game_sessions').insert({
                speler_naam:      state.speler.naam,
                eindkapitaal:     state.berekenNettowaarde(),
                beurten_gespeeld: state.beurt,
                schip_naam:       state.schip?.naam ?? null,
                schip_type:       state.schip?.id ?? null,
                planeten_bezocht: state.bezochteplaneten?.size ?? 0,
                transacties:      state.statistieken.handelstransacties,
                reizen:           state.statistieken.gereisd,
                achievements:     state.achievements?.size ?? 0,
                einde_reden:      state.eindeReden ?? 'beurten',
                versie:           '3.0',
            });

            if (error) console.warn('Score opslaan mislukt:', error.message);
        },

        async haalLeaderboardOp(limit = 25) {
            const db = client();
            if (!db) return [];

            const { data, error } = await db
                .from('game_sessions')
                .select('speler_naam, eindkapitaal, schip_naam, beurten_gespeeld, einde_reden, created_at')
                .order('eindkapitaal', { ascending: false })
                .limit(limit);

            if (error) { console.warn('Leaderboard ophalen mislukt:', error.message); return []; }
            return data ?? [];
        },
    };
})();
