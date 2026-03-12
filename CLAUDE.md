# Gazillionaire – instructies voor Claude

## Na elke wijziging
Altijd committen én pushen naar GitHub zodra je wijzigingen hebt aangebracht:
```
git add <gewijzigde bestanden>
git commit -m "beschrijving"
git push
```
Doe dit **automatisch** na elke sessie met codewijzigingen, zonder dat de gebruiker daarom hoeft te vragen.

## GitHub Issues — bugworkflow

`gh` CLI staat op `C:\Program Files\GitHub CLI\gh.exe`. Altijd PATH instellen voor gebruik:
```
export PATH="$PATH:/c/Program Files/GitHub CLI"
```

**Begin van elke sessie:** controleer direct open issues en pak ze op — dit is altijd de eerste actie:
```
export PATH="$PATH:/c/Program Files/GitHub CLI"
gh issue list --repo DennisBeverloo/gazillionaire
```
- Pak open issues op, fix ze, commit & push
- Sluit het issue met een comment: `gh issue close <nr> --comment "beschrijving fix"`
- Stel vragen via: `gh issue comment <nr> --body "vraag"`
- Issues met label `wontfix` of `question` niet zomaar sluiten
- Na het verwerken van issues: stel een cron in die elke 5 minuten opnieuw checkt (zie hieronder)

**Cron (elke 5 minuten, zolang sessie actief is):**
Stel na de startup-check automatisch een cron in met interval `*/5 * * * *` en de prompt:
`Controleer GitHub Issues op DennisBeverloo/gazillionaire. Als er open issues zijn zonder label 'wontfix' of 'question': pak ze op, fix ze, commit, push en sluit het issue met een comment.`

## Design: geanimeerde voortgangsbalken

Alle voortgangsbalken (brandstof, HP, lading, etc.) animeren bij een waardeverandering via dit patroon:

1. **Snap de huidige `%` vóór de actie** (bijv. `hpPctVoor`)
2. **Zet een vlag op het UI-object** (bijv. `UI._animeerHP = true; UI._hpPctVoor = pctVoor`)
3. **Render de balk** met `id`, klasse `animeer`, `style="width:${startPct}%"` en `data-target="${doelPct}"`
4. **Na render**: `requestAnimationFrame(() => { balk.style.width = balk.dataset.target + '%' })`

De CSS-klasse `animeer` op `.lading-balk` geeft een `transition: width 0.6s cubic-bezier(...)`.
Nieuw toe te voegen balken volgen altijd dit patroon.

## Cache buster — verplicht bij elke CSS of JS wijziging
Bij elke commit waarbij CSS of JavaScript is gewijzigd, moet de cache buster worden opgehoogd. Doe dit op **twee plaatsen**:

1. **`index.html`** — verhoog het versienummer in alle `?v=x.x.x` query strings (style.css, data.js, state.js, ui.js, db.js, main.js)
2. **`index.html`** — verhoog ook het versienummer in de versie-label linksonder op het intro-scherm: `<span class="versie-label">vX.X.X</span>`

Verhoog het patch-nummer (derde getal) tenzij er sprake is van een grotere release. Voeg `index.html` altijd toe aan de commit als er JS of CSS is gewijzigd.
