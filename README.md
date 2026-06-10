# RIFT CRAWLER

Ein Roguelike Dungeon Crawler als HTML5 Game.

## Spielen

Einfach `index.html` im Browser öffnen – kein Server, kein Build-Tool, keine Abhängigkeiten.

Oder via lokalem Server:
```bash
python3 -m http.server 8000
# Dann http://localhost:8000 öffnen
```

## Steuerung

| Taste | Aktion |
|-------|--------|
| WASD / Pfeiltasten | Bewegen |
| Leertaste | Schwertangriff |
| E | Schießen |
| Q | Bombe |
| Shift | Dash (Ausweichen) |
| P | Pause |
| F | Vollbild |

## Features

- Prozedural generierte Dungeons (7x7 Grid, jede Etage anders)
- 6 Gegnertypen mit unterschiedlichen KIs (Slime, Skelett, Ritter, Schwarm, Magier, Boss)
- 3-Phasen Boss-Kampf
- Melee-Combat + Fernkampf + Bomben + Dash
- Powerup-System (HP, Speed, Bomben, Gold, etc.)
- 5 Etagen mit steigendem Schwierigkeitsgrad
- Neon/Dark-Theme Visuals
- Prozedurale Sound-Effects (Web Audio API)
- Minimap
- Combo-System
- Responsive (Keyboard, Maus, Touch)

## Architektur

Vanilla JavaScript mit ES6 Modules, Canvas 2D Rendering – inspiriert vom Neonstrike-Projekt.

```
js/
├── main.js       – Game Loop & Screens
├── config.js     – Konstanten & Colors
├── state.js      – Globaler Game State
├── player.js     – Spieler & Kugeln
├── enemies.js    – Gegner-KI & Rendering
├── combat.js     – Kollision & Schaden
├── dungeon.js    – Prozedurale Generierung
├── room.js       – Raum-Logik & Wände
├── camera.js     – Kamera & Shake
├── effects.js    – Partikel & Schadenszahlen
├── powerups.js   – Powerup-Drops
├── hud.js        – HUD & Minimap
├── audio.js      – Prozeduraler Sound
├── input.js      – Keyboard/Maus/Touch
└── utils.js      – Helper-Funktionen
```

## Lizenz

Siehe LICENSE-Datei.
