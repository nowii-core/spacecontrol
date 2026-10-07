# nexus·7 — Deep Space Control Center

License: MIT HTML5 CSS3 JavaScript

Un centro di controllo spaziale retro-futuristico costruito con HTML, CSS e JavaScript puri. Nessuna dipendenza esterna, nessun backend.

## ✨ Funzionalità

- Boot sequence in stile BIOS con logo ASCII e log progressivo
- Starfield animato con centinaia di stelle in parallasse
- Pianeta wireframe 3D rotante con satellite in orbita
- Radar con sweep-line e blip dinamici
- Waveform comms in tempo reale con indicatore di forza segnale
- Telemetria multi-linea streaming (altitudine, velocità, temperatura)
- Star map interattiva con pianeti, rotte e posizione navicella
- Overview dashboard con tutti i sistemi live
- Navigation con waypoint list e distanze in ly
- Systems grid con 12 sottosistemi e health bar dinamiche
- Crew roster con ruoli, ore di volo, missioni e clearance
- Mission log con timestamp e livelli di severità (INFO / WARN / CRIT / OK)
- Alert stream in tempo reale con priorità colorate
- HUD con mission time, uptime e clock live
- Effetto scanlines CRT e angoli pannelli sci-fi
- Generatore eventi casuali (solar flare, radiation spike, orbital burn)
- Tema chiaro/scuro e layout completamente responsive
- Salvataggio automatico su localStorage
- Scorciatoie tastiera complete

## 🛠 Tecnologie

- HTML5
- CSS3 (Grid, Flexbox, animazioni, backdrop-filter, custom properties, conic-gradient)
- JavaScript (ES6+, Canvas 2D API, requestAnimationFrame, localStorage)

## 📖 Scorciatoie

| Tasto | Azione |
|---|---|
| Click rail | Cambia vista (Overview / Navigation / Systems / Crew / Logs) |
| ♪ | Muta / attiva audio |
| Click waypoint | Imposta rotta verso il pianeta |
| ESC | Chiudi eventuali overlay |

## 🚀 Deploy

Basta aprire `index.html` nel browser. Per GitHub Pages:

1. Settings → Pages
2. Branch: `main`, cartella `/` (root)
3. Salva

**Demo live:** https://nowii-core.github.io/nexus-7/

## 📫 Contatti

GitHub: [@nowii-core](https://github.com/nowii-core)
