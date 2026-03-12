# Gazillionaire – instructies voor Claude

## Na elke wijziging
Altijd committen én pushen naar GitHub zodra je wijzigingen hebt aangebracht:
```
git add <gewijzigde bestanden>
git commit -m "beschrijving"
git push
```
Doe dit **automatisch** na elke sessie met codewijzigingen, zonder dat de gebruiker daarom hoeft te vragen.

## Cache buster — verplicht bij elke CSS of JS wijziging
Bij elke commit waarbij CSS of JavaScript is gewijzigd, moet de cache buster worden opgehoogd. Doe dit op **twee plaatsen**:

1. **`index.html`** — verhoog het versienummer in alle `?v=x.x.x` query strings (style.css, data.js, state.js, ui.js, db.js, main.js)
2. **`index.html`** — verhoog ook het versienummer in de versie-label linksonder op het intro-scherm: `<span class="versie-label">vX.X.X</span>`

Verhoog het patch-nummer (derde getal) tenzij er sprake is van een grotere release. Voeg `index.html` altijd toe aan de commit als er JS of CSS is gewijzigd.
