// =============================================================================
// GAZILLIONAIRE - Supabase database module
// =============================================================================

const SUPABASE_URL = 'https://iznjmlapxpalrousycxy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0VCRyg7bJPhX3c-rgge6Ew_xT8zgfDM';

const DB = (() => {
    let _client = null;
    let _sessieId = null;

    function client() {
        if (!_client && window.supabase?.createClient) {
            _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }
        return _client;
    }

    function _payload(fase) {
        return {
            speler_naam:         state.speler.naam,
            eindkapitaal:        state.berekenNettowaarde(),
            beurten_gespeeld:    state.beurt,
            schip_naam:          state.schip?.naam ?? null,
            schip_type:          state.schip?.id ?? null,
            planeten_bezocht:    state.planeetBezoeken ?? {},
            cargo_transacties:   state.statistieken.handelstransacties,
            cargo_ton:           state.statistieken.cargoTonVervoerd ?? 0,
            passagiers_vervoerd: state.statistieken.passagiersAfgeleverd ?? 0,
            achievements:        [...(state.achievements ?? [])],
            einde_reden:         state.eindeReden ?? null,
            fase:                fase,
            versie:              '3.0',
        };
    }

    return {
        // Aanroepen bij start van een nieuw spel (na schipkeuze of doorgaan)
        async initSessie() {
            _sessieId = null;
            const db = client();
            if (!db) { console.warn('[DB] Supabase client niet beschikbaar'); return; }

            const { data, error } = await db
                .from('game_sessions')
                .insert(_payload('spel'))
                .select('id')
                .single();

            if (error) { console.warn('[DB] initSessie mislukt:', error.message, error.code); return; }
            _sessieId = data.id;
            console.log('[DB] Sessie gestart:', _sessieId);
        },

        // Aanroepen na elke landing
        async updateSessie() {
            if (!_sessieId) { console.warn('[DB] updateSessie: geen sessieId, initSessie niet aangeroepen?'); return; }
            const db = client();
            if (!db) return;

            const fase = state.fase === 'einde' ? 'einde' : 'spel';
            const { data, error } = await db
                .from('game_sessions')
                .update(_payload(fase))
                .eq('id', _sessieId)
                .select('id');

            if (error) console.warn('[DB] updateSessie mislukt:', error.message, error.code);
            else if (!data || data.length === 0) console.warn('[DB] updateSessie: geen rij bijgewerkt — UPDATE RLS policy ontbreekt?');
            else console.log('[DB] Sessie bijgewerkt — beurt', state.beurt, '/', fase);
        },

        // Ophalen voor ranglijst-tab (alleen voltooide spellen)
        async haalLeaderboardOp(limit = 25) {
            const db = client();
            if (!db) return [];

            const { data, error } = await db
                .from('game_sessions')
                .select('speler_naam, eindkapitaal, schip_naam, beurten_gespeeld, einde_reden, created_at')
                .eq('fase', 'einde')
                .order('eindkapitaal', { ascending: false })
                .limit(limit);

            if (error) { console.warn('Leaderboard ophalen mislukt:', error.message); return []; }
            return data ?? [];
        },
    };
})();
