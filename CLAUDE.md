# Lern-Apps – Projektdokumentation

Interaktive Lern-Apps für Kinder mit spezifischen Lernbedürfnissen (ADHS, Legasthenie).

**GitHub:** https://github.com/chbruwi/lern-apps
**Live:** https://chbruwi.github.io/lern-apps/
**Quellcode:** `/Users/christian/Projects/LernApps/lern-apps-source/`

---

## ⚠️ Wichtig für Claude: Arbeitsweise

### Token-Limit vermeiden
- **IMMER in kleinen Schritten arbeiten** – maximal 1-2 Dateien pro Antwort schreiben
- Grosse Dateien (App.tsx, data.ts) **separat** schreiben, nie zusammen mit anderen
- Nach jeder Datei kurz zusammenfassen was erstellt wurde und was noch aussteht
- Bei grossen Daten (SVG Base64) → zuerst die Struktur, dann den Inhalt in separatem Schritt

### Vor Beginn immer prüfen
- Vor jeder Implementierung nachschauen ob die Arbeit **bereits erledigt** wurde
- `ls` oder `Glob` nutzen um bestehende Dateien zu prüfen
- Dann erst mit der Arbeit beginnen

---

## Projektstruktur

```
lern-apps-source/
├── index.html                    # Landing Page (plain HTML, kein Build)
├── CLAUDE.md                     # Diese Datei
├── README.md
│
├── franzoesisch/                 # Französisch Hobbys (Birkenbihl – Les Loisirs)
│   ├── index.html                # Build-Output (deployed)
│   ├── package.json / vite.config.ts / tsconfig.json
│   └── src/
│       ├── index.html            # Vite entry point
│       ├── main.tsx
│       ├── pb.ts                 # PocketBase API Helper
│       ├── data.ts               # 36 Vokabeln (SVG) + 5 Lektionen × 5 Sätze
│       ├── App.tsx               # Login + 4 Spielmodi + Münzsystem
│       └── App.css               # Light Theme (Baloo 2 + Nunito, Blau/Orange)
│
├── eltern-panel/                 # Eltern-Verwaltungs-Panel
│   ├── index.html                # Build-Output (deployed)
│   ├── package.json / vite.config.ts / tsconfig.json
│   └── src/
│       ├── index.html            # Vite entry point
│       ├── main.tsx
│       ├── App.tsx               # Login, Dashboard, Mathe/Vokabel-CRUD, Lernprotokoll
│       ├── App.css               # Light Theme (Indigo, Outfit Font)
│       └── pb.ts                 # Parent-spezifische API-Funktionen
│
├── mathe-held/                   # Für Andrin – Mathe bis 100
│   ├── index.html                # Build-Output (deployed) – Standard Vite outDir:'.'
│   ├── package.json / vite.config.ts / tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx               # UnitPicker, 4 Spielmodi, XP/Level/Coins
│       ├── App.css               # Dark Theme (Fredoka Font)
│       └── pb.ts                 # Auth + fetchMathUnits + logActivity
│
├── vocabhero/                    # Für Fiona – Englisch Vokabeln
│   ├── index.html                # Build-Output (deployed)
│   ├── package.json / vite.config.ts / tsconfig.json
│   └── src/
│       ├── index.html            # Vite entry point
│       ├── main.tsx
│       ├── App.tsx               # UnitPicker, 4 Spielmodi, lazy Vocab-Load
│       ├── App.css               # Light Theme (Outfit Font)
│       └── pb.ts                 # Auth + fetchVocabUnits + fetchVocabItems + logActivity
│
├── wort-abenteuer/               # Für Andrin – 200 deutsche Wörter
│   ├── index.html                # Build-Output (deployed)
│   ├── package.json / vite.config.ts / tsconfig.json
│   └── src/
│       ├── index.html            # Vite entry point
│       ├── main.tsx
│       ├── App.tsx
│       ├── App.css               # Dark Theme (Fredoka Font)
│       └── pb.ts                 # Auth + syncToServer
│
└── spielecke/                    # Für alle – Spass-Spiele mit Münzen
    ├── index.html                # Build-Output (deployed)
    ├── package.json / vite.config.ts / tsconfig.json
    └── src/
        ├── index.html            # Vite entry point
        ├── main.tsx
        ├── App.tsx
        ├── App.css               # Dark Theme (Fredoka Font)
        └── pb.ts                 # Auth + syncToServer (coins only)
```

---

## Tech Stack

| Was | Wie |
|-----|-----|
| Framework | React 18 + TypeScript |
| Build | Vite + `vite-plugin-singlefile` (alles in eine HTML-Datei gebundelt) |
| Styling | Pure CSS mit CSS-Variablen (kein Tailwind, kein shadcn) |
| Fonts | Fredoka (Kinder-Apps) / Outfit (VocabHero + Eltern-Panel) – Google Fonts |
| Backend | PocketBase auf Synology NAS |
| Deployment | GitHub Pages (statische HTML-Files) |

### Vite-Config Besonderheiten

| App | `root` | `outDir` | Entry |
|-----|--------|----------|-------|
| `eltern-panel` | `src` | `..` | `src/index.html` |
| `vocabhero` | `src` | `..` | `src/index.html` |
| `wort-abenteuer` | `src` | `..` | `src/index.html` |
| `spielecke` | `src` | `..` | `src/index.html` |
| `mathe-held` | _(Standard)_ | `.` | `index.html` im App-Ordner |

---

## Build & Deploy (pro App)

```bash
cd eltern-panel   # oder: mathe-held / vocabhero / wort-abenteuer / spielecke
npm install       # nur beim ersten Mal nötig
npm run dev       # Entwicklung auf http://localhost:5173
npm run build     # Erstellt index.html Bundle im App-Ordner

# Deployen:
git add index.html
git commit -m "build: update eltern-panel"
git push
```

**Hinweis `mathe-held`:** `npm run build` überschreibt die `index.html` im App-Ordner direkt (kein Unterordner).

---

## Apps im Detail

### 🔑 Eltern-Panel (`eltern-panel/`)
**Zielgruppe:** Eltern
**URL:** https://chbruwi.github.io/lern-apps/eltern-panel/
**Design:** Light Theme, Indigo-Akzente, Outfit Font – klar von Kinder-Apps unterscheidbar

**Features:**
- Login mit Email + Passwort (separates `parents`-Auth-Collection in PocketBase)
- Dashboard: Übersicht aller Kinder (Level, XP, Münzen, Fortschrittsbalken)
- Lernprotokoll: Letzte 50 Einträge aller/einzelner Kinder (App, Einheit, Modus, Score, Münzen, Zeit)
- **Mathe-Einheiten** verwalten: Erstellen, Bearbeiten, Löschen, Reihenfolge (↑↓)
  - Operationen: Toggle-Buttons (Plus, Minus, Mal, Geteilt)
  - Einmaleins-Reihen: Pill-Grid `1×` bis `10×` (nur bei Mal/Geteilt aktiv)
  - Max-Zahl, Aktiv-Toggle
- **Vokabel-Einheiten** verwalten: Erstellen, Bearbeiten, Löschen
  - Wörter-Tabelle inline editierbar (EN | DE | Typ | Löschen) — auto-save on blur
  - Wort einzeln hinzufügen
  - **Bulk-Import:** Paste-Textarea → Preview → Import
  - **Sprache** wählbar pro Unit: 🇬🇧 Englisch / 🇫🇷 Französisch / 🇪🇸 Spanisch / 🇮🇹 Italienisch

**Bulk-Import Format:**
```
accident = Unfall
lying on the ground = auf dem Boden liegend [phrase]
first aid = erste Hilfe
```
Parser: Split bei `=`, `[phrase]`-Suffix erkannt → Preview → sequenziell importiert.

- **📸 Foto-Wizard:** Foto der Vokabelliste → OCR → Bilder generieren → in PocketBase speichern
  - 3-Schritt-Wizard: Foto | Prüfen | Generieren
  - OCR: `gemini-2.0-flash` Vision API → JSON-Array `[{en, de, type}]`
  - Bildgenerierung: `gemini-2.5-flash-image` mit `responseModalities: ['IMAGE']` ✅ funktioniert
  - Prompt: `"Children's educational flashcard illustration: "${en}" (German: ${de}). Square 1:1 format. Simple, colorful, clear depiction, cartoon style, no text, white background."`
  - Bilder werden als `Blob` im State gehalten, Upload via `FormData` (multipart)
  - Fehlschlagende Bilder werden ohne Bild gespeichert (Fallback)
  - Gemini API Key: localStorage `lernheld-gemini-key` + PocketBase `parents.gemini_key` (geräteübergreifend sync)
  - Key-Sync: beim Speichern → PB; beim Login + App-Start → PB→localStorage
  - Version: unten rechts sichtbar (aktuell v1.5), bei jedem Deploy erhöhen

**Mobile-Optimierungen:**
- Upload-Zone mit direkter Kamera-Capture (`capture="environment"`) + separater Galerie-Button
- Wörter-Tabelle auf Mobile: gestapelte Cards statt Tabelle (`.word-table-wrap` CSS-Klasse)
- Log-Tabelle: App + Modus-Spalten auf Mobile ausgeblendet (`.td-hide-mobile`)
- Navbar kompakt auf Mobile (Logo als Emoji, verkürzte Button-Labels)

**Gemini API (Browser-seitig, kein CORS-Problem):**
```typescript
// OCR ✅
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=KEY
// Bildgenerierung ✅
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=KEY
// body: { contents: [{parts: [{text: "prompt"}]}], generationConfig: { responseModalities: ['IMAGE'] } }
// response: candidates[0].content.parts[].inlineData.{data: base64, mimeType}
```

**⚠️ Nicht möglich vom Browser:** Anthropic/Claude API → CORS blockiert immer.

---

### 🦸 Mathe-Held (`mathe-held/`)
**Zielgruppe:** Andrin
**URL:** https://chbruwi.github.io/lern-apps/mathe-held/

**Features:**
- **UnitPicker:** Nach Login Auswahl der Mathe-Einheit (dynamisch aus PocketBase)
- 4 Spielmodi: ⚡ Blitz-Rechnen, 🔍 Lücken-Detektiv, ✅ Richtig/Falsch, 🎯 Zahlen-Sprint
- XP/Level-System (60 XP/Level), Konfetti, Level-Up Overlay
- Shared Coins: localStorage Key `lernheld-v1-coins`
- Stale-While-Revalidate: gecachte Units sofort, PB-Update im Hintergrund

**Dynamische Einheiten (State-Logik):**
- `MATH_UNITS_FALLBACK`: Hardcodiertes Fallback (1 Einheit „Plus & Minus")
- State: `mathUnits` (dynamisch geladen), `selectedUnit` (initial `null`)
- Nach Login/Reload: `fetchMathUnits()` → `setMathUnits()`
- Auto-Select: nur wenn genau 1 Einheit vorhanden → `setSelectedUnit(units[0])`
- Sonst: UnitPicker wird angezeigt
- „Thema wechseln"-Button im Spielmenü → `setSelectedUnit(null)`

---

### 📚 VocabHero (`vocabhero/`)
**Zielgruppe:** Fiona
**URL:** https://chbruwi.github.io/lern-apps/vocabhero/
**Design:** Light Theme, Outfit Font, Lila/Weiss

**Features:**
- **UnitPicker:** Auswahl der Vokabel-Einheit (gefiltert nach `target_user`)
  - Auto-Select wenn genau 1 Unit vorhanden, sonst Auswahl-Screen
  - Funktioniert sowohl nach manuellem Login als auch bei savedAuth (Auto-Login)
- **Mehrsprachigkeit:** Jede Unit trägt ein `language`-Feld (`"en"`, `"fr"`, `"es"`, `"it"`)
  - Spielmodi-Labels dynamisch: `getLangLabel(lang).code` statt hardcodiert `"EN"`
  - Footer: `"Französisch ↔ Deutsch"` statt hardcodiert `"Englisch ↔ Deutsch"`
  - `LANG_LABELS`-Map und `getLangLabel()` Helper in App.tsx
  - Französische Vokabeln gehen in das `en`-Feld von `vocab_items` (semantisch: Quellsprache)
- **4 Spielmodi:**
  - 🃏 **Karteikarten** — Flip-Karte mit Bild auf **beiden Seiten** (EN + DE), dann Gewusst/Nochmal
  - 🔗 **Match-It** — 6 Paare zuordnen; linke Seite zeigt Bild + Text wenn EN, rechts nur Text
  - ⚡ **Speed-Quiz** — Multiple Choice, Bild immer sichtbar (egal ob EN- oder DE-Frage)
  - 🔤 **Buchstaben-Salat** — Buchstaben sortieren; Bild als Hinweis wenn EN-Seite
- Lazy Vocab-Load: Wörter werden erst beim Unit-Start geladen (`fetchVocabItems()`)
- Beide Richtungen: EN→DE und DE→EN zufällig gemischt
- Stale-While-Revalidate: Units gecacht in localStorage (`lernheld-vocab-units-v1`)
- **Bild-Integration:** `VocabItem.imageUrl` kommt aus PocketBase File-URL; Karten ohne Bild funktionieren text-only

**Auto-Select Logik mit Bild-Laden (wichtig!):**
```typescript
// Bei 1 Unit: fetchVocabItems MUSS aufgerufen werden, sonst vocab=[] und Bilder fehlen!
if (loaded.length === 1) {
  fetchVocabItems(token, loaded[0].id).then(items => {
    setSelectedUnit({ ...loaded[0], vocab: items })
  }).catch(() => setSelectedUnit(loaded[0]))
}
// handleLogout: setSelectedUnit(null) — NICHT UNITS_FALLBACK[0]!
// Sonst wird beim Re-Login UnitPicker übersprungen und vocab bleibt leer.
```

**CSS-Besonderheit Karteikarten:**
```css
.flip-card {
  min-height: 360px;  /* NICHT aspect-ratio – damit Bild + Text in die Kachel passen */
}
```

---

### 🇫🇷 Français (`franzoesisch/`)
**Zielgruppe:** Andrin + Fiona
**URL:** https://chbruwi.github.io/lern-apps/franzoesisch/
**Design:** Light Theme, cremefarbener Hintergrund (`#fef9f0`), Blau `#3b82f6`, Orange `#e85d3a`, Baloo 2 + Nunito Fonts

**Thema:** Birkenbihl-Methode – Les Loisirs (Hobbys & Freizeit auf Französisch)

**Features:**
- 4 Spielmodi:
  - 🔤 **De-Kodieren** — 5 Lektionen × 5 Sätze mit Wort-für-Wort-Tabelle + Web Speech API (`fr-FR`, rate 0.7), +1🪙 pro Satz
  - 🖼️ **Bild-Vokabeln** — 36 SVG-Karten antippen → vorlesen + +1🪙
  - 🃏 **Memory** — 6 zufällige Paare (Bild ↔ Wort), +2🪙/Paar + +5🪙 Abschluss
  - ❓ **Bild-Quiz** — 15 Fragen: Bild zeigen, 4 Antworten (Multiple Choice), +2🪙 richtig + +5🪙 Abschluss
- Shared Coins: localStorage Key `lernheld-v1-coins`
- PocketBase Login + Sync (coins + xp + level, 50 XP/Level)
- Activity Log nach jedem Spiel (`logActivity`)

**Datenbasis (`data.ts`):**
- 36 Vokabeln: `fr`, `de`, `emoji`, `svgData` (Base64 SVG, ~90 KB Rohdaten)
- 5 Lektionen: `title`, `sentences[]` mit `fr`, `de`, `lit`, `words` (WordPair-Array)
- Extrahiert aus: `/Users/christian/Projects/LernApps/französisch/birkenbihl-bilder.html`

**Sync-Details:**
- `syncToServer(pbUser, coins, totalScore, level)` — totalScore als XP, 50 XP/Level

---

### 🌟 Wort-Abenteuer (`wort-abenteuer/`)
**Zielgruppe:** Andrin
**200 häufigste deutsche Wörter**

**4 Modi:** Memory, Verb-Werkstatt, Tierlaute-Quiz, Wörter-Kategorien
Inhalte noch hardcodiert (keine PocketBase-Collection).

---

### 🎮 Spielecke (`spielecke/`)
**Zielgruppe:** Alle Kinder
**5 Mini-Spiele:** 🎰 Glücksrad, 🎈 Ballon-Tipp, 🃏 Memo-Chaos, 🎯 Tipp-Meister, 🐍 Schlange
Gespielt mit Münzen aus den Lern-Apps (`lernheld-v1-coins` localStorage Key).

---

## Design-Prinzipien

- **Grosse Schrift:** min 1.1rem, erhöhtes `letter-spacing` und `word-spacing` (Legasthenie-freundlich)
- **Sofortiges Feedback:** grün/rot + Animation bei Antwort
- **Gamification:** XP, Level, Konfetti, Münzen, Level-Up Overlay
- **Mobile-first:** max-width 600px
- **Buttons erben kein `font-family`** → immer explizit `font-family: var(--font-main)` setzen!

---

## Backend-Infrastruktur

### Netzwerk
| Was | Wert |
|-----|------|
| NAS | Synology DS918+ (LAN: 192.168.0.9) |
| DDNS | `lernheld.synology.me` |
| Reverse Proxy | DSM: `lernheld.synology.me` HTTPS:443 → localhost:8090 |
| PocketBase | Docker Container `pocketbase`, Port 8090→80 |
| SSH | `ssh gm-admin@192.168.0.9` |
| Docker Compose | `/volume1/docker/lernheld/compose.yaml` |

### PocketBase Admin
- **URL:** https://lernheld.synology.me/_/
- **Admin:** `admin@lernheld.local` / `Lernheld2026!`
- **Version:** PocketBase v0.23.12

```yaml
# /volume1/docker/lernheld/compose.yaml
services:
  pocketbase:
    image: spectado/pocketbase:latest
    container_name: pocketbase
    restart: unless-stopped
    ports:
      - "8090:80"
    volumes:
      - ./pb_data:/pb_data
```

---

## PocketBase Collections

### `users` (Auth Collection) — Kinder-Accounts
| Feld | Typ | Notiz |
|------|-----|-------|
| username | text (unique) | Login-Identität (kein Email-Login) |
| coins | number | Münzen (shared über alle Apps) |
| xp | number | Erfahrungspunkte |
| level | number | Level |

**API-Regeln:**
- List/View: `@request.auth.collectionName = "parents" || @request.auth.id = id`
- Create: PB-Admin UI
- Update: `@request.auth.id = id`
- Delete: _(niemand)_

**Accounts:**
| Username | Code | Notiz |
|----------|------|-------|
| `andrin` | `741963` | Wort-Abenteuer + Mathe-Held + Spielecke |
| `fiona` | `137900` | VocabHero + Spielecke |

---

### `parents` (Auth Collection) — Eltern-Accounts
| Feld | Typ | Notiz |
|------|-----|-------|
| email | email (built-in) | Login-Identität |
| name | text | z.B. „Christian" |
| password | password (built-in) | |
| gemini_key | text | Gemini API Key (geräteübergreifend gespeichert) |

**API-Regeln:**
- List/View: `@request.auth.id = id`
- Create/Delete: _(nur PB-Admin)_
- Update: `@request.auth.id = id`

**Accounts:**
| Email | Passwort | Name |
|-------|----------|------|
| `christian@lernheld.local` | `Eltern2026!` | Christian |

---

### `math_units` (Base Collection)
| Feld | Typ | Notiz |
|------|-----|-------|
| title | text (required) | „Plus & Minus" |
| subtitle | text | „Zehnerübergreifend bis 100" |
| emoji | text | „➕" |
| operations | json | `["add","sub"]` oder `["mul","div"]` |
| max_number | number | Max-Ergebnis (+/-) oder max. Reihe (×÷) |
| table_of | json | `[1,2,3,...]` für Einmaleins, sonst `null` |
| active | bool | default: true |
| sort_order | number | default: 0, aufsteigend sortiert |

**API-Regeln:**
- List/View: `@request.auth.id != ""`
- Create/Update/Delete: `@request.auth.collectionName = "parents"`

**Seed-Daten (aktuell vorhanden):**
| Titel | Emoji | operations | max_number | table_of |
|-------|-------|-----------|------------|---------|
| Plus & Minus | ➕ | `["add","sub"]` | 100 | null |
| Einmaleins | ✖️ | `["mul","div"]` | 10 | `[1..10]` |

---

### `vocab_units` (Base Collection)
| Feld | Typ | Notiz |
|------|-----|-------|
| title | text (required) | „Unit 3" |
| subtitle | text | „Accidents & First Aid" |
| emoji | text | „🏥" |
| target_user | text | `""` = alle, `"fiona"` = nur Fiona |
| language | text | `"en"` / `"fr"` / `"es"` / `"it"` — default: `"en"` |
| active | bool | default: true |
| sort_order | number | default: 0 |

**API-Regeln:** identisch wie `math_units`

**Seed-Daten (aktuell vorhanden):**
„Unit 3 – Accidents & First Aid" (target_user: `"fiona"`, 20 Wörter)

---

### `vocab_items` (Base Collection)
| Feld | Typ | Notiz |
|------|-----|-------|
| unit | relation → vocab_units (required) | Cascade-Delete |
| en | text (required) | Englisches Wort / Phrase |
| de | text (required) | Deutsche Übersetzung |
| type | select: `word` / `phrase` | default: `word` |
| sort_order | number | default: 0 |
| image | file (max 1, `image/*`) | Optional – vom Foto-Wizard via Gemini generiert |

**API-Regeln:** identisch wie `math_units`

**File-URL Schema:** `${PB_URL}/api/files/vocab_items/${record.id}/${record.image}`

---

### `activity_log` (Base Collection) — Lernprotokoll
| Feld | Typ | Notiz |
|------|-----|-------|
| user | relation → users (required) | Welches Kind |
| app | select: `mathe-held`, `vocabhero`, `wort-abenteuer` | |
| unit_id | text | PB Record-ID der gespielten Einheit |
| unit_title | text | Snapshot des Titels (bleibt erhalten wenn Unit gelöscht) |
| game_mode | text | `"blitz"`, `"luecke"`, `"wahrfalsch"`, `"sprint"`, etc. |
| score | number | Richtige Antworten |
| total | number | Gesamt-Aufgaben |
| coins_earned | number | |
| played_at | autodate | `onCreate: true` – automatisch gesetzt |

**API-Regeln:**
- List/View: `@request.auth.id = user || @request.auth.collectionName = "parents"`
- Create: `@request.auth.id != ""`
- Update/Delete: _(niemand – Logs sind unveränderlich)_

---

## pb.ts Muster

### Kinder-Apps (`mathe-held`, `vocabhero`, `wort-abenteuer`, `spielecke`)

**Gemeinsame Basis-Funktionen:**
```typescript
const PB_URL = 'https://lernheld.synology.me'
const AUTH_KEY = 'lernheld-pb-auth'

getSavedAuth(): PbUser | null          // liest gespeicherten Login aus localStorage
loginWithCode(username, code)          // POST /api/collections/users/auth-with-password
syncToServer(user, coins, xp, level)   // PATCH mit Bearer Token (3s Debounce in App)
logout()                               // removeItem(AUTH_KEY)
```

**`mathe-held/src/pb.ts` – zusätzlich:**
```typescript
fetchMathUnits(token, fallback)   // GET math_units (active=true, sort=sort_order)
                                  // → localStorage Cache (Key: lernheld-math-units-v1)
                                  // → bei Fehler: Cache → Fallback
logActivity(user, entry)          // POST activity_log (silent failure)
```

**`vocabhero/src/pb.ts` – zusätzlich:**
```typescript
fetchVocabUnits(token, fallback)  // GET vocab_units (active=true, sort=sort_order)
                                  // → localStorage Cache (Key: lernheld-vocab-units-v1)
fetchVocabItems(token, unitId)    // GET vocab_items (filter=unit='ID', sort=sort_order,en)
                                  // → mappt: imageUrl = r.image
                                  //     ? `${PB_URL}/api/files/vocab_items/${r.id}/${r.image}`
                                  //     : undefined
logActivity(user, entry)          // POST activity_log (silent failure)
```

**`VocabItem` Interface:**
```typescript
export interface VocabItem {
  id?: string        // PocketBase Record-ID (für File-URL nötig)
  en: string
  de: string
  type: 'word' | 'phrase'
  imageUrl?: string  // vollständige URL zum PocketBase-Bild (optional)
}
```

**Wichtig – `parseJsonArray()` in `mathe-held/src/pb.ts`:**
```typescript
// Robust gegen String-Encoding von PocketBase JSON-Feldern
function parseJsonArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); if (Array.isArray(p)) return p } catch {}
  }
  return []
}
```

### Eltern-Panel (`eltern-panel/src/pb.ts`)

```typescript
// Auth
parentLogin(email, password)   // POST /api/collections/parents/auth-with-password
getParentAuth(): Parent | null // localStorage PARENT_KEY = 'lernheld-parent-auth'
parentLogout()

// Kinder
fetchChildren(token)           // GET users (alle Kinder, sort=username)
fetchActivityLog(token, userId?) // GET activity_log (sort=-played_at, expand=user)

// Math Units CRUD
fetchMathUnits(token)
createMathUnit(token, data)
updateMathUnit(token, id, data)
deleteMathUnit(token, id)

// Vocab Units CRUD
fetchVocabUnits(token)         // inkl. itemCount per Unit
createVocabUnit(token, data)
updateVocabUnit(token, id, data)
deleteVocabUnit(token, id)

// Vocab Items CRUD + Bulk Import + Image Upload
fetchVocabItems(token, unitId)
createVocabItem(token, data)
updateVocabItem(token, id, { en, de, type })  // PATCH – inline editing
createVocabItemWithImage(token, unitId, en, de, type, imageBlob | null)
  // → FormData (multipart), kein Content-Type Header setzen!
  // → imageBlob = null → speichert ohne Bild
deleteVocabItem(token, id)
bulkImportVocab(token, unitId, rawText)  // parst "word = Wort [phrase]"-Format
parseBulkText(rawText)                    // Parser ohne Import (für Preview)

// Gemini Key Sync
saveGeminiKeyToPb(token, id, key)     // PATCH parents.gemini_key
fetchParentGeminiKey(token, id)       // GET parents.gemini_key → string
```

**`Parent` Interface** enthält `geminiKey: string` — wird beim Login aus PB geladen und in localStorage `lernheld-gemini-key` gespiegelt.

---

## Stale-While-Revalidate Pattern (Kinder-Apps)

1. **App-Start:** gecachte Units aus localStorage sofort anzeigen (kein Ladeflackern)
2. **Nach Login:** frische Daten von PocketBase im Hintergrund holen (Bearer Token)
3. **Bei Erfolg:** State + Cache aktualisieren → Kind sieht neue Units ohne Reload
4. **Bei Fehler** (offline / NAS nicht erreichbar): gecachter Stand bleibt → kein Fehler anzeigen

```typescript
// Beispiel mathe-held/src/App.tsx
const handleLogin = useCallback((user: PbUser) => {
  setPbUser(user)
  setXp(user.xp); setCoins(user.coins)
  setSelectedUnit(null)  // ← immer UnitPicker zeigen nach Login
  fetchMathUnits(user.token, MATH_UNITS_FALLBACK).then(units => {
    setMathUnits(units)
    if (units.length === 1) setSelectedUnit(units[0])  // ← Auto-Select nur bei 1 Einheit
  })
}, [])
```

---

## Activity Log Integration (beide Lern-Apps)

Nach jedem Spiel in `handleFinish`, **fire-and-forget** (kein await, kein Error-Handling für User):

```typescript
// Beispiel aus mathe-held
logActivity(pbUser, {
  app: 'mathe-held',
  unit_id: selectedUnit.id,
  unit_title: selectedUnit.title,
  game_mode: 'blitz',    // oder: luecke / wahrfalsch / sprint
  score: correct,
  total: questions.length,
  coins_earned: coinsGained,
})
```

---

## Sync-Details pro App

| App | Syncs | XP-Grenze |
|-----|-------|-----------|
| `mathe-held` | `coins` + `xp` + `level` | 60 XP/Level |
| `wort-abenteuer` | `xp` (=totalScore) + `level` | 100 Punkte/Level |
| `vocabhero` | `xp` (=totalScore) + `level` | 120 Punkte/Level |
| `franzoesisch` | `coins` + `xp` + `level` | 50 XP/Level |
| `spielecke` | `coins` only | — |

**Shared Coins:** localStorage Key `lernheld-v1-coins` (alle Apps lesen/schreiben denselben Key)

---

## Bekannte Gotchas

### 1. Buttons erben kein `font-family`
In CSS erben `<button>`-Elemente das `font-family` **nicht** vom Parent. Immer explizit setzen:
```css
.unit-card {
  font-family: var(--font-main); /* explizit – wird nicht vererbt! */
}
```

### 2. PocketBase v0.23 – JSON-Felder
`operations` und `table_of` werden manchmal als String, manchmal als Array zurückgegeben.
Immer `parseJsonArray()` verwenden (implementiert in `mathe-held/src/pb.ts`).

### 3. PocketBase v0.23 – Admin Auth
```bash
# Superuser-Auth (nicht /api/admins/ wie in älteren Versionen):
POST /api/collections/_superusers/auth-with-password

# Shell-Escaping: ! in Passwörtern → JSON in Datei auslagern
cat > /tmp/auth.json << 'EOF'
{"identity":"admin@lernheld.local","password":"Lernheld2026!"}
EOF
curl -s -X POST URL -H 'Content-Type: application/json' -d @/tmp/auth.json
```

### 4. PocketBase v0.23 – Relation/Select Felder (flat format)
```json
// RICHTIG (v0.23 – flat):
{ "type": "relation", "name": "unit", "collectionId": "ID", "cascadeDelete": true }

// FALSCH (ältere Versionen – nested options):
{ "type": "relation", "name": "unit", "options": { "collectionId": "ID" } }
```

### 5. VocabHero Auto-Select: immer fetchVocabItems aufrufen
Bei Auto-Select (1 Unit) MUSS `fetchVocabItems` aufgerufen werden. Sonst hat die Unit `vocab=[]` → Bilder fehlen, Spiele sind leer.
```typescript
// RICHTIG:
if (loaded.length === 1) {
  fetchVocabItems(token, loaded[0].id).then(items =>
    setSelectedUnit({ ...loaded[0], vocab: items })
  )
}
// FALSCH: setSelectedUnit(loaded[0])  ← vocab bleibt []
```
Gilt für `handleLogin` UND den mount-`useEffect`.
`handleLogout` setzt `setSelectedUnit(null)` — NICHT `UNITS_FALLBACK[0]`.

### 6. Speed-Quiz: Hover-Stuck auf Mobile
Mobile Browser (iOS/Android) behalten `:hover`-Zustand nach Tap. Fixes:
- `@media (hover: hover)` um alle `:hover`-Stile wrappen → wirkt nur bei echter Maus
- `(document.activeElement as HTMLElement)?.blur()` in `handleAnswer` aufrufen
- `.quiz-opt:focus { outline: none }` im CSS

### 7. UnitPicker Auto-Select Logik
Wenn nur 1 Einheit vorhanden → direkt in den Spielmodus.
Wenn mehrere Einheiten → UnitPicker zeigen. **Wichtig:** `selectedUnit` initial auf `null` setzen, nicht auf `FALLBACK[0]`.

---

## Zukunftsvision / Roadmap

### Smart Repetition (Phase 2)
```
item_performance Collection:
  user_id, collection, item_id, correct_count, wrong_count, last_seen
Gewichteter Picker: weight = (wrong_count + 1) / (correct_count + 2)
→ schwache Items häufiger abfragen
```

### Weitere Sprachen
- `vocab_units.language` Feld (`"en-de"`, `"fr-de"`, etc.)
- Spielmodi-Labels dynamisch statt hardcoded „EN → DE"

### Quiz / Allgemeinwissen
Neue Collections `quiz_units` + `quiz_items` (Frage, 4 Antworten, korrekte Antwort).

### Claude API Integration (optional)
- Hint-Generierung bei Fehlern
- Neue ähnliche Aufgaben generieren
