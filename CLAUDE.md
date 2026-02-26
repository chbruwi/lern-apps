# Lern-Apps Projekt

Lern-Apps für Kinder mit spezifischen Lernbedürfnissen (ADHS, Legasthenie).

## Struktur

```
/
├── index.html                    # Landing Page (GitHub Pages)
├── vocabhero/
│   ├── index.html                # Built bundle (für GitHub Pages)
│   └── src/
│       ├── App.tsx               # React Source Code
│       └── App.css               # Styles
└── wort-abenteuer/
    ├── index.html                # Built bundle (für GitHub Pages)
    └── src/
        ├── App.tsx               # React Source Code
        └── App.css               # Styles
```

## Apps

### VocabHero (Fiona)
- Englisch-Deutsch Vokabeltrainer (Unit 3: Accidents & First Aid)
- 4 Modi: Karteikarten, Match-It, Speed-Quiz, Buchstaben-Salat
- Heller, moderner Look (Outfit Font, Pink/Lila Akzente)
- Beide Richtungen: EN→DE und DE→EN gemischt

### Wort-Abenteuer (Andrin)
- 200 häufigste deutsche Wörter
- 4 Modi: Wörter-Memory, Verb-Werkstatt, Tierlaute-Quiz, Wörter-Kategorien
- Dunkles, buntes Design (Fredoka Font)
- Accessibility: Grosse Schrift, erhöhte Abstände (Legasthenie-freundlich)

## Tech Stack
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Bundled mit Parcel zu Single HTML Files
- Deployed auf GitHub Pages: https://chbruwi.github.io/lern-apps/

## Build
Jede App ist ein eigenständiges React-Projekt. Source ist in /src, 
der Build-Output (bundle.html) wird als index.html deployed.

## Design-Prinzipien
- Grosse, gut lesbare Schrift
- Sofortiges visuelles Feedback (grün/rot)
- Belohnungssystem mit Punkten und Level-Aufstieg
- Konfetti-Animation bei Abschluss
- Mobile-first, responsive
