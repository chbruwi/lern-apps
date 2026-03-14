import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { getSavedAuth, loginWithCode, syncToServer, logout, PbUser } from './pb'

// Shared coin storage (same key as Mathe-Held & Spielecke)
const SK_COINS = 'lernheld-v1-coins'
const loadCoins = (): number => { try { return Math.max(0, parseInt(localStorage.getItem(SK_COINS) || '0') || 0) } catch { return 0 } }
const saveCoins = (v: number) => { try { localStorage.setItem(SK_COINS, String(Math.max(0, v))) } catch {} }

// ============================================================
// DATA
// ============================================================

const WOERTER_200: { wort: string; art: 'nomen' | 'verb' | 'adjektiv' | 'andere'; emoji: string }[] = [
  // Nomen
  { wort: 'Eltern', art: 'nomen', emoji: '👨‍👩‍👧' },
  { wort: 'Katze', art: 'nomen', emoji: '🐱' },
  { wort: 'Wasser', art: 'nomen', emoji: '💧' },
  { wort: 'Weg', art: 'nomen', emoji: '🛤️' },
  { wort: 'Kind', art: 'nomen', emoji: '👦' },
  { wort: 'Schwester', art: 'nomen', emoji: '👧' },
  { wort: 'Fenster', art: 'nomen', emoji: '🪟' },
  { wort: 'Kopf', art: 'nomen', emoji: '🗣️' },
  { wort: 'Seite', art: 'nomen', emoji: '📄' },
  { wort: 'Schuh', art: 'nomen', emoji: '👟' },
  { wort: 'Schule', art: 'nomen', emoji: '🏫' },
  { wort: 'Woche', art: 'nomen', emoji: '📅' },
  { wort: 'Zeit', art: 'nomen', emoji: '⏰' },
  { wort: 'Klasse', art: 'nomen', emoji: '🎓' },
  { wort: 'Frau', art: 'nomen', emoji: '👩' },
  { wort: 'Freund', art: 'nomen', emoji: '🤝' },
  { wort: 'Garten', art: 'nomen', emoji: '🌻' },
  { wort: 'Mädchen', art: 'nomen', emoji: '👧' },
  { wort: 'Stadt', art: 'nomen', emoji: '🏙️' },
  { wort: 'Maus', art: 'nomen', emoji: '🐭' },
  { wort: 'Stein', art: 'nomen', emoji: '🪨' },
  { wort: 'Strasse', art: 'nomen', emoji: '🛣️' },
  { wort: 'Hand', art: 'nomen', emoji: '✋' },
  { wort: 'Stunde', art: 'nomen', emoji: '🕐' },
  { wort: 'Haus', art: 'nomen', emoji: '🏠' },
  { wort: 'Mutter', art: 'nomen', emoji: '👩' },
  { wort: 'Tisch', art: 'nomen', emoji: '🪑' },
  { wort: 'Tag', art: 'nomen', emoji: '☀️' },
  { wort: 'Tier', art: 'nomen', emoji: '🦁' },
  { wort: 'Tür', art: 'nomen', emoji: '🚪' },
  { wort: 'Hund', art: 'nomen', emoji: '🐕' },
  { wort: 'Vater', art: 'nomen', emoji: '👨' },
  { wort: 'Vogel', art: 'nomen', emoji: '🐦' },
  { wort: 'Fuss', art: 'nomen', emoji: '🦶' },
  { wort: 'Angst', art: 'nomen', emoji: '😨' },
  { wort: 'Arm', art: 'nomen', emoji: '💪' },
  { wort: 'Sonne', art: 'nomen', emoji: '☀️' },
  { wort: 'Augen', art: 'nomen', emoji: '👀' },
  { wort: 'Auto', art: 'nomen', emoji: '🚗' },
  { wort: 'Ball', art: 'nomen', emoji: '⚽' },
  { wort: 'Baum', art: 'nomen', emoji: '🌳' },
  { wort: 'Bein', art: 'nomen', emoji: '🦵' },
  { wort: 'Bett', art: 'nomen', emoji: '🛏️' },
  { wort: 'Blume', art: 'nomen', emoji: '🌸' },
  { wort: 'Boden', art: 'nomen', emoji: '🟫' },
  { wort: 'Brot', art: 'nomen', emoji: '🍞' },
  { wort: 'Bruder', art: 'nomen', emoji: '👦' },
  { wort: 'Ei', art: 'nomen', emoji: '🥚' },
  { wort: 'Eis', art: 'nomen', emoji: '🍦' },
  { wort: 'Mann', art: 'nomen', emoji: '👨' },
  { wort: 'Onkel', art: 'nomen', emoji: '👨' },
  { wort: 'Opa', art: 'nomen', emoji: '👴' },
  { wort: 'Pferd', art: 'nomen', emoji: '🐴' },
  { wort: 'Wagen', art: 'nomen', emoji: '🚙' },
  { wort: 'Wald', art: 'nomen', emoji: '🌲' },
  { wort: 'Geld', art: 'nomen', emoji: '💰' },
  { wort: 'Stück', art: 'nomen', emoji: '🧩' },
  { wort: 'Herr', art: 'nomen', emoji: '🎩' },
  { wort: 'Uhr', art: 'nomen', emoji: '⌚' },
  { wort: 'Jahre', art: 'nomen', emoji: '📆' },
  { wort: 'Schiff', art: 'nomen', emoji: '🚢' },
  { wort: 'Leute', art: 'nomen', emoji: '👥' },
  // Verben
  { wort: 'schlafen', art: 'verb', emoji: '😴' },
  { wort: 'kaufen', art: 'verb', emoji: '🛒' },
  { wort: 'schreiben', art: 'verb', emoji: '✏️' },
  { wort: 'kommen', art: 'verb', emoji: '🚶' },
  { wort: 'sehen', art: 'verb', emoji: '👁️' },
  { wort: 'lachen', art: 'verb', emoji: '😂' },
  { wort: 'fangen', art: 'verb', emoji: '🤲' },
  { wort: 'finden', art: 'verb', emoji: '🔍' },
  { wort: 'fliegen', art: 'verb', emoji: '✈️' },
  { wort: 'fragen', art: 'verb', emoji: '❓' },
  { wort: 'erzählen', art: 'verb', emoji: '💬' },
  { wort: 'essen', art: 'verb', emoji: '🍽️' },
  { wort: 'fahren', art: 'verb', emoji: '🚗' },
  { wort: 'fallen', art: 'verb', emoji: '⬇️' },
  { wort: 'laufen', art: 'verb', emoji: '🏃' },
  { wort: 'singen', art: 'verb', emoji: '🎤' },
  { wort: 'legen', art: 'verb', emoji: '📥' },
  { wort: 'lesen', art: 'verb', emoji: '📖' },
  { wort: 'liegen', art: 'verb', emoji: '🛋️' },
  { wort: 'spielen', art: 'verb', emoji: '🎮' },
  { wort: 'machen', art: 'verb', emoji: '🔨' },
  { wort: 'gehen', art: 'verb', emoji: '🚶' },
  { wort: 'springen', art: 'verb', emoji: '🦘' },
  { wort: 'stehen', art: 'verb', emoji: '🧍' },
  { wort: 'nehmen', art: 'verb', emoji: '🤲' },
  { wort: 'bauen', art: 'verb', emoji: '🏗️' },
  { wort: 'bekommen', art: 'verb', emoji: '📦' },
  { wort: 'bleiben', art: 'verb', emoji: '🏠' },
  { wort: 'brauchen', art: 'verb', emoji: '🙏' },
  { wort: 'bringen', art: 'verb', emoji: '📬' },
  { wort: 'denken', art: 'verb', emoji: '💭' },
  { wort: 'dürfen', art: 'verb', emoji: '✅' },
  { wort: 'können', art: 'verb', emoji: '💪' },
  { wort: 'schwimmen', art: 'verb', emoji: '🏊' },
  { wort: 'wollen', art: 'verb', emoji: '🎯' },
  { wort: 'lassen', art: 'verb', emoji: '👋' },
  { wort: 'haben', art: 'verb', emoji: '🤝' },
  { wort: 'müssen', art: 'verb', emoji: '⚠️' },
  { wort: 'suchen', art: 'verb', emoji: '🔎' },
  { wort: 'helfen', art: 'verb', emoji: '🆘' },
  { wort: 'tragen', art: 'verb', emoji: '🎒' },
  { wort: 'trinken', art: 'verb', emoji: '🥤' },
  { wort: 'tun', art: 'verb', emoji: '👍' },
  { wort: 'holen', art: 'verb', emoji: '🏃' },
  { wort: 'hören', art: 'verb', emoji: '👂' },
  { wort: 'rennen', art: 'verb', emoji: '🏃‍♂️' },
  { wort: 'rufen', art: 'verb', emoji: '📢' },
  { wort: 'sagen', art: 'verb', emoji: '🗣️' },
  { wort: 'setzen', art: 'verb', emoji: '🪑' },
  { wort: 'warten', art: 'verb', emoji: '⏳' },
  { wort: 'sprechen', art: 'verb', emoji: '💬' },
  { wort: 'stellen', art: 'verb', emoji: '📍' },
  { wort: 'halten', art: 'verb', emoji: '✋' },
  { wort: 'geben', art: 'verb', emoji: '🎁' },
  { wort: 'sitzen', art: 'verb', emoji: '💺' },
  // Adjektive
  { wort: 'schnell', art: 'adjektiv', emoji: '⚡' },
  { wort: 'schön', art: 'adjektiv', emoji: '✨' },
  { wort: 'klein', art: 'adjektiv', emoji: '🐜' },
  { wort: 'kurz', art: 'adjektiv', emoji: '📏' },
  { wort: 'lang', art: 'adjektiv', emoji: '📐' },
  { wort: 'langsam', art: 'adjektiv', emoji: '🐢' },
  { wort: 'weit', art: 'adjektiv', emoji: '🌍' },
  { wort: 'schwarz', art: 'adjektiv', emoji: '⬛' },
  { wort: 'fertig', art: 'adjektiv', emoji: '✅' },
  { wort: 'weiss', art: 'adjektiv', emoji: '⬜' },
  { wort: 'alt', art: 'adjektiv', emoji: '👴' },
  { wort: 'laut', art: 'adjektiv', emoji: '📢' },
  { wort: 'gross', art: 'adjektiv', emoji: '🦒' },
  { wort: 'gut', art: 'adjektiv', emoji: '👍' },
  { wort: 'hoch', art: 'adjektiv', emoji: '🏔️' },
  { wort: 'neu', art: 'adjektiv', emoji: '🆕' },
  { wort: 'dick', art: 'adjektiv', emoji: '🐘' },
  { wort: 'voll', art: 'adjektiv', emoji: '🫙' },
  { wort: 'richtig', art: 'adjektiv', emoji: '✔️' },
  { wort: 'lieb', art: 'adjektiv', emoji: '❤️' },
  { wort: 'blau', art: 'adjektiv', emoji: '🔵' },
  { wort: 'rot', art: 'adjektiv', emoji: '🔴' },
  { wort: 'jung', art: 'adjektiv', emoji: '👶' },
  { wort: 'böse', art: 'adjektiv', emoji: '😠' },
  // Andere (Pronomen, Adverbien, Präpositionen etc.)
  { wort: 'er', art: 'andere', emoji: '👉' },
  { wort: 'es', art: 'andere', emoji: '👆' },
  { wort: 'wir', art: 'andere', emoji: '👫' },
  { wort: 'wo', art: 'andere', emoji: '📍' },
  { wort: 'sehr', art: 'andere', emoji: '💯' },
  { wort: 'wie', art: 'andere', emoji: '🤔' },
  { wort: 'wieder', art: 'andere', emoji: '🔄' },
  { wort: 'zu', art: 'andere', emoji: '➡️' },
  { wort: 'schon', art: 'andere', emoji: '👌' },
  { wort: 'kann', art: 'andere', emoji: '💪' },
  { wort: 'will', art: 'andere', emoji: '🎯' },
  { wort: 'alle', art: 'andere', emoji: '👥' },
  { wort: 'allein', art: 'andere', emoji: '🧍' },
  { wort: 'andere', art: 'andere', emoji: '👈' },
  { wort: 'an', art: 'andere', emoji: '📌' },
  { wort: 'ganz', art: 'andere', emoji: '💯' },
  { wort: 'auf', art: 'andere', emoji: '⬆️' },
  { wort: 'aus', art: 'andere', emoji: '🚪' },
  { wort: 'bei', art: 'andere', emoji: '🏠' },
  { wort: 'beide', art: 'andere', emoji: '✌️' },
  { wort: 'bin', art: 'andere', emoji: '👋' },
  { wort: 'da', art: 'andere', emoji: '📍' },
  { wort: 'dann', art: 'andere', emoji: '➡️' },
  { wort: 'dir', art: 'andere', emoji: '👉' },
  { wort: 'mir', art: 'andere', emoji: '👈' },
  { wort: 'mit', art: 'andere', emoji: '🤝' },
  { wort: 'mehr', art: 'andere', emoji: '➕' },
  { wort: 'mein', art: 'andere', emoji: '👆' },
  { wort: 'nicht', art: 'andere', emoji: '❌' },
  { wort: 'noch', art: 'andere', emoji: '➕' },
  { wort: 'nun', art: 'andere', emoji: '🕐' },
  { wort: 'nur', art: 'andere', emoji: '☝️' },
  { wort: 'oben', art: 'andere', emoji: '⬆️' },
  { wort: 'hier', art: 'andere', emoji: '📍' },
  { wort: 'heute', art: 'andere', emoji: '📅' },
  { wort: 'nein', art: 'andere', emoji: '🚫' },
  { wort: 'im', art: 'andere', emoji: '📦' },
  { wort: 'in', art: 'andere', emoji: '📥' },
  { wort: 'vor', art: 'andere', emoji: '⏩' },
  { wort: 'ja', art: 'andere', emoji: '✅' },
  { wort: 'jetzt', art: 'andere', emoji: '⏰' },
  { wort: 'ich', art: 'andere', emoji: '🙋' },
  { wort: 'viel', art: 'andere', emoji: '📦' },
  { wort: 'immer', art: 'andere', emoji: '♾️' },
  { wort: 'gern', art: 'andere', emoji: '😊' },
  { wort: 'gleich', art: 'andere', emoji: '⚖️' },
  { wort: 'so', art: 'andere', emoji: '👆' },
  { wort: 'soll', art: 'andere', emoji: '📋' },
  { wort: 'sich', art: 'andere', emoji: '🔄' },
  { wort: 'sind', art: 'andere', emoji: '👥' },
  { wort: 'für', art: 'andere', emoji: '🎁' },
  { wort: 'hat', art: 'andere', emoji: '✋' },
  { wort: 'ist', art: 'andere', emoji: '=' },
  { wort: 'war', art: 'andere', emoji: '⏪' },
  { wort: 'was', art: 'andere', emoji: '❓' },
  { wort: 'unten', art: 'andere', emoji: '⬇️' },
  { wort: 'heisst', art: 'andere', emoji: '📛' },
]

const VERB_KONJUGATIONEN: { verb: string; stamm: string; endungen: Record<string, string> }[] = [
  { verb: 'rufen', stamm: 'ruf', endungen: { ich: 'e', du: 'st', 'er/sie/es': 't', wir: 'en', ihr: 't', sie: 'en' } },
  { verb: 'laufen', stamm: 'lauf', endungen: { ich: 'e', du: 'st', 'er/sie/es': 't', wir: 'en', ihr: 't', sie: 'en' } },
  { verb: 'spielen', stamm: 'spiel', endungen: { ich: 'e', du: 'st', 'er/sie/es': 't', wir: 'en', ihr: 't', sie: 'en' } },
  { verb: 'machen', stamm: 'mach', endungen: { ich: 'e', du: 'st', 'er/sie/es': 't', wir: 'en', ihr: 't', sie: 'en' } },
  { verb: 'kaufen', stamm: 'kauf', endungen: { ich: 'e', du: 'st', 'er/sie/es': 't', wir: 'en', ihr: 't', sie: 'en' } },
  { verb: 'hören', stamm: 'hör', endungen: { ich: 'e', du: 'st', 'er/sie/es': 't', wir: 'en', ihr: 't', sie: 'en' } },
  { verb: 'fragen', stamm: 'frag', endungen: { ich: 'e', du: 'st', 'er/sie/es': 't', wir: 'en', ihr: 't', sie: 'en' } },
  { verb: 'sagen', stamm: 'sag', endungen: { ich: 'e', du: 'st', 'er/sie/es': 't', wir: 'en', ihr: 't', sie: 'en' } },
  { verb: 'suchen', stamm: 'such', endungen: { ich: 'e', du: 'st', 'er/sie/es': 't', wir: 'en', ihr: 't', sie: 'en' } },
  { verb: 'lachen', stamm: 'lach', endungen: { ich: 'e', du: 'st', 'er/sie/es': 't', wir: 'en', ihr: 't', sie: 'en' } },
  { verb: 'bauen', stamm: 'bau', endungen: { ich: 'e', du: 'st', 'er/sie/es': 't', wir: 'en', ihr: 't', sie: 'en' } },
  { verb: 'trinken', stamm: 'trink', endungen: { ich: 'e', du: 'st', 'er/sie/es': 't', wir: 'en', ihr: 't', sie: 'en' } },
]

const TIERLAUTE: { tier: string; laut: string; emoji: string }[] = [
  { tier: 'Kuh', laut: 'muhen', emoji: '🐄' },
  { tier: 'Katze', laut: 'schnurren', emoji: '🐱' },
  { tier: 'Schwein', laut: 'grunzen', emoji: '🐷' },
  { tier: 'Pferd', laut: 'wiehern', emoji: '🐴' },
  { tier: 'Frosch', laut: 'quaken', emoji: '🐸' },
  { tier: 'Wolf', laut: 'heulen', emoji: '🐺' },
  { tier: 'Huhn', laut: 'gackern', emoji: '🐔' },
  { tier: 'Hund', laut: 'bellen', emoji: '🐕' },
  { tier: 'Schaf', laut: 'blöken', emoji: '🐑' },
  { tier: 'Rabe', laut: 'krächzen', emoji: '🐦‍⬛' },
  { tier: 'Kuckuck', laut: 'rufen', emoji: '🐦' },
  { tier: 'Schlange', laut: 'zischen', emoji: '🐍' },
  { tier: 'Vogel', laut: 'pfeifen', emoji: '🐤' },
  { tier: 'Eule', laut: 'rufen', emoji: '🦉' },
  { tier: 'Esel', laut: 'schreien', emoji: '🫏' },
  { tier: 'Affe', laut: 'kreischen', emoji: '🐒' },
  { tier: 'Elefant', laut: 'trompeten', emoji: '🐘' },
  { tier: 'Biene', laut: 'summen', emoji: '🐝' },
  { tier: 'Hahn', laut: 'krähen', emoji: '🐓' },
  { tier: 'Löwe', laut: 'brüllen', emoji: '🦁' },
]

// ============================================================
// HELPERS
// ============================================================

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

// ============================================================
// CONFETTI
// ============================================================

function Confetti({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div className="confetti-container">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.5}s`,
            backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A06CD5', '#FF8A5C', '#2ECC71'][i % 6],
          }}
        />
      ))}
    </div>
  )
}

// ============================================================
// STAR BURST
// ============================================================

function StarBurst({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="star-burst">
      {['⭐', '🌟', '✨', '💫', '⭐'].map((s, i) => (
        <span key={i} className="star-particle" style={{
          '--angle': `${(i * 72)}deg`,
          '--delay': `${i * 0.05}s`,
        } as React.CSSProperties}>
          {s}
        </span>
      ))}
    </div>
  )
}

// ============================================================
// MODULE 1: WÖRTER-MEMORY
// ============================================================

interface MemoryCard {
  id: number
  content: string
  type: 'wort' | 'emoji'
  matchId: number
}

function WoerterMemory({ onScore, onBack }: { onScore: (pts: number) => void; onBack: () => void }) {
  const [cards, setCards] = useState<MemoryCard[]>([])
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [showStar, setShowStar] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const lockRef = useRef(false)

  const initGame = useCallback(() => {
    const chosen = pickRandom(WOERTER_200, 6)
    const memCards: MemoryCard[] = []
    chosen.forEach((w, i) => {
      memCards.push({ id: i * 2, content: w.wort, type: 'wort', matchId: i })
      memCards.push({ id: i * 2 + 1, content: w.emoji, type: 'emoji', matchId: i })
    })
    setCards(shuffle(memCards))
    setFlipped([])
    setMatched([])
    setMoves(0)
    setShowConfetti(false)
  }, [])

  useEffect(() => { initGame() }, [initGame])

  const handleFlip = (id: number) => {
    if (lockRef.current) return
    if (flipped.includes(id) || matched.includes(id)) return
    const newFlipped = [...flipped, id]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      lockRef.current = true
      setMoves(m => m + 1)
      const [a, b] = newFlipped
      const cardA = cards.find(c => c.id === a)!
      const cardB = cards.find(c => c.id === b)!

      if (cardA.matchId === cardB.matchId) {
        setTimeout(() => {
          setMatched(prev => {
            const newMatched = [...prev, a, b]
            if (newMatched.length === cards.length) {
              onScore(8)
              setShowConfetti(true)
            } else {
              onScore(3)
            }
            return newMatched
          })
          setFlipped([])
          setShowStar(true)
          setTimeout(() => setShowStar(false), 600)
          lockRef.current = false
        }, 500)
      } else {
        setTimeout(() => {
          setFlipped([])
          lockRef.current = false
        }, 800)
      }
    }
  }

  const allMatched = matched.length === cards.length && cards.length > 0

  return (
    <div className="game-module">
      <Confetti active={showConfetti} />
      <StarBurst show={showStar} />
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>🧠 Wörter-Memory</h2>
        <div className="moves-counter">Züge: {moves}</div>
      </div>
      <p className="game-desc">Finde die passenden Paare! Wort + Bild gehören zusammen.</p>
      <div className="memory-grid">
        {cards.map(card => {
          const isFlipped = flipped.includes(card.id) || matched.includes(card.id)
          const isMatched = matched.includes(card.id)
          return (
            <button
              key={card.id}
              className={`memory-card ${isFlipped ? 'flipped' : ''} ${isMatched ? 'matched' : ''}`}
              onClick={() => handleFlip(card.id)}
            >
              <div className="memory-card-inner">
                <div className="memory-card-front">❓</div>
                <div className="memory-card-back">
                  {card.type === 'emoji' ? (
                    <span className="memory-emoji">{card.content}</span>
                  ) : (
                    <span className="memory-word">{card.content}</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {allMatched && (
        <div className="game-complete">
          <h3>🎉 Super gemacht!</h3>
          <p>Du hast alle Paare in {moves} Zügen gefunden!</p>
          <button className="play-again-btn" onClick={initGame}>Nochmal spielen</button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// MODULE 2: VERB-WERKSTATT
// ============================================================

function VerbWerkstatt({ onScore, onBack }: { onScore: (pts: number) => void; onBack: () => void }) {
  const [currentVerb, setCurrentVerb] = useState(() => VERB_KONJUGATIONEN[Math.floor(Math.random() * VERB_KONJUGATIONEN.length)])
  const [currentPronoun, setCurrentPronoun] = useState('ich')
  const [selectedEndung, setSelectedEndung] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [showStar, setShowStar] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const pronouns = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie']
  const endungen = ['e', 'st', 't', 'en']

  const nextRound = useCallback(() => {
    const v = VERB_KONJUGATIONEN[Math.floor(Math.random() * VERB_KONJUGATIONEN.length)]
    const p = pronouns[Math.floor(Math.random() * pronouns.length)]
    setCurrentVerb(v)
    setCurrentPronoun(p)
    setSelectedEndung(null)
    setFeedback(null)
  }, [])

  const checkAnswer = (endung: string) => {
    setSelectedEndung(endung)
    const correct = currentVerb.endungen[currentPronoun]
    if (endung === correct) {
      setFeedback('correct')
      setScore(s => s + 1)
      onScore(3)
      setShowStar(true)
      setTimeout(() => setShowStar(false), 600)
      if (round >= 10) {
        setShowConfetti(true)
      }
      setTimeout(() => {
        setRound(r => r + 1)
        nextRound()
      }, 1200)
    } else {
      setFeedback('wrong')
      setTimeout(() => {
        setSelectedEndung(null)
        setFeedback(null)
      }, 1000)
    }
  }

  const restart = () => {
    setRound(1)
    setScore(0)
    setShowConfetti(false)
    nextRound()
  }

  if (round > 10) {
    return (
      <div className="game-module">
        <Confetti active={showConfetti} />
        <div className="game-header">
          <button className="back-btn" onClick={onBack}>← Zurück</button>
          <h2>🔧 Verb-Werkstatt</h2>
        </div>
        <div className="game-complete">
          <h3>🎉 Geschafft!</h3>
          <p>Du hast {score} von 10 richtig!</p>
          {score >= 8 && <p className="perfect-msg">🌟 Fantastisch!</p>}
          <button className="play-again-btn" onClick={restart}>Nochmal spielen</button>
        </div>
      </div>
    )
  }

  return (
    <div className="game-module">
      <StarBurst show={showStar} />
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>🔧 Verb-Werkstatt</h2>
        <div className="moves-counter">Runde {round}/10</div>
      </div>
      <p className="game-desc">Baue das Verb zusammen! Wähle die richtige Endung.</p>

      <div className="verb-display">
        <div className="pronoun-bubble">{currentPronoun}</div>
        <div className="verb-builder">
          <span className="verb-stamm">{currentVerb.stamm}</span>
          <span className={`verb-endung-slot ${feedback === 'correct' ? 'correct-slot' : feedback === 'wrong' ? 'wrong-slot' : ''}`}>
            {selectedEndung || '???'}
          </span>
        </div>
      </div>

      <div className="endung-choices">
        {endungen.map(e => (
          <button
            key={e}
            className={`endung-btn ${selectedEndung === e ? (feedback === 'correct' ? 'correct-btn' : 'wrong-btn') : ''}`}
            onClick={() => !feedback && checkAnswer(e)}
            disabled={!!feedback}
          >
            -{e}
          </button>
        ))}
      </div>

      <div className="verb-score">
        ✅ {score} richtig
      </div>
    </div>
  )
}

// ============================================================
// MODULE 3: TIERLAUTE-QUIZ
// ============================================================

function TierlauteQuiz({ onScore, onBack }: { onScore: (pts: number) => void; onBack: () => void }) {
  const [questions, setQuestions] = useState<typeof TIERLAUTE>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [options, setOptions] = useState<string[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [showStar, setShowStar] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const setupOptions = useCallback((qs: typeof TIERLAUTE, idx: number) => {
    if (idx >= qs.length) return
    const correct = qs[idx].laut
    const others = TIERLAUTE.filter(t => t.laut !== correct).map(t => t.laut)
    const wrongOptions = pickRandom([...new Set(others)], 3)
    setOptions(shuffle([correct, ...wrongOptions]))
  }, [])

  const initGame = useCallback(() => {
    const q = pickRandom(TIERLAUTE, 8)
    setQuestions(q)
    setCurrentIdx(0)
    setScore(0)
    setShowConfetti(false)
    setFeedback(null)
    setupOptions(q, 0)
  }, [setupOptions])

  useEffect(() => { initGame() }, [initGame])

  const handleAnswer = (laut: string) => {
    if (feedback) return
    const current = questions[currentIdx]
    if (laut === current.laut) {
      setFeedback('correct')
      setScore(s => s + 1)
      onScore(3)
      setShowStar(true)
      setTimeout(() => setShowStar(false), 600)
    } else {
      setFeedback(current.laut)
    }
    setTimeout(() => {
      setFeedback(null)
      const nextIdx = currentIdx + 1
      if (nextIdx < questions.length) {
        setCurrentIdx(nextIdx)
        setupOptions(questions, nextIdx)
      } else {
        setCurrentIdx(nextIdx)
        setShowConfetti(true)
        onScore(5)
      }
    }, 1500)
  }

  if (questions.length === 0) return null

  if (currentIdx >= questions.length) {
    return (
      <div className="game-module">
        <Confetti active={showConfetti} />
        <div className="game-header">
          <button className="back-btn" onClick={onBack}>← Zurück</button>
          <h2>🐾 Tierlaute-Quiz</h2>
        </div>
        <div className="game-complete">
          <h3>🎉 Toll gemacht!</h3>
          <p>Du hast {score} von {questions.length} richtig!</p>
          {score >= 6 && <p className="perfect-msg">🌟 Du kennst die Tierlaute super!</p>}
          <button className="play-again-btn" onClick={initGame}>Nochmal spielen</button>
        </div>
      </div>
    )
  }

  const current = questions[currentIdx]

  return (
    <div className="game-module">
      <StarBurst show={showStar} />
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>🐾 Tierlaute-Quiz</h2>
        <div className="moves-counter">{currentIdx + 1}/{questions.length}</div>
      </div>
      <p className="game-desc">Welches Geräusch macht das Tier?</p>

      <div className="tier-display">
        <span className="tier-emoji-large">{current.emoji}</span>
        <span className="tier-name">{current.tier}</span>
      </div>

      <div className="laut-options">
        {options.map(laut => (
          <button
            key={laut}
            className={`laut-btn ${
              feedback && laut === current.laut ? 'correct-btn' :
              feedback && laut !== current.laut && feedback !== 'correct' ? 'faded-btn' : ''
            }`}
            onClick={() => handleAnswer(laut)}
            disabled={!!feedback}
          >
            {laut}
          </button>
        ))}
      </div>

      {feedback && feedback !== 'correct' && (
        <div className="tier-feedback">
          Richtig wäre: <strong>{feedback}</strong>
        </div>
      )}

      <div className="verb-score">⭐ {score} richtig</div>
    </div>
  )
}

// ============================================================
// MODULE 4: WÖRTER-KATEGORIEN
// ============================================================

type Wortart = 'nomen' | 'verb' | 'adjektiv'
const WORTART_LABELS: Record<Wortart, { label: string; color: string; emoji: string }> = {
  nomen: { label: 'Nomen', color: '#4ECDC4', emoji: '📦' },
  verb: { label: 'Verb', color: '#FF6B6B', emoji: '🏃' },
  adjektiv: { label: 'Adjektiv', color: '#FFE66D', emoji: '🎨' },
}

function WoerterKategorien({ onScore, onBack }: { onScore: (pts: number) => void; onBack: () => void }) {
  const [words, setWords] = useState<typeof WOERTER_200>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [score, setScore] = useState(0)
  const [showStar, setShowStar] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [correctArt, setCorrectArt] = useState<string | null>(null)

  const initGame = useCallback(() => {
    const nomen = pickRandom(WOERTER_200.filter(w => w.art === 'nomen'), 4)
    const verben = pickRandom(WOERTER_200.filter(w => w.art === 'verb'), 4)
    const adjektive = pickRandom(WOERTER_200.filter(w => w.art === 'adjektiv'), 4)
    setWords(shuffle([...nomen, ...verben, ...adjektive]))
    setCurrentIdx(0)
    setScore(0)
    setFeedback(null)
    setCorrectArt(null)
    setShowConfetti(false)
  }, [])

  useEffect(() => { initGame() }, [initGame])

  const handleSort = (art: Wortart) => {
    if (feedback) return
    const current = words[currentIdx]
    if (art === current.art) {
      setFeedback('correct')
      setScore(s => s + 1)
      onScore(3)
      setShowStar(true)
      setTimeout(() => setShowStar(false), 600)
    } else {
      setFeedback('wrong')
      setCorrectArt(current.art)
    }
    setTimeout(() => {
      setFeedback(null)
      setCorrectArt(null)
      const nextIdx = currentIdx + 1
      if (nextIdx < words.length) {
        setCurrentIdx(nextIdx)
      } else {
        setCurrentIdx(nextIdx)
        setShowConfetti(true)
        onScore(5)
      }
    }, 1200)
  }

  if (words.length === 0) return null

  if (currentIdx >= words.length) {
    return (
      <div className="game-module">
        <Confetti active={showConfetti} />
        <div className="game-header">
          <button className="back-btn" onClick={onBack}>← Zurück</button>
          <h2>📚 Wörter-Kategorien</h2>
        </div>
        <div className="game-complete">
          <h3>🎉 Klasse!</h3>
          <p>Du hast {score} von {words.length} richtig sortiert!</p>
          {score >= 10 && <p className="perfect-msg">🌟 Du bist ein Wortarten-Profi!</p>}
          <button className="play-again-btn" onClick={initGame}>Nochmal spielen</button>
        </div>
      </div>
    )
  }

  const current = words[currentIdx]

  return (
    <div className="game-module">
      <StarBurst show={showStar} />
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>📚 Wörter-Kategorien</h2>
        <div className="moves-counter">{currentIdx + 1}/{words.length}</div>
      </div>
      <p className="game-desc">In welche Gruppe gehört dieses Wort?</p>

      <div className={`sort-word-display ${feedback === 'correct' ? 'correct-word' : feedback === 'wrong' ? 'wrong-word' : ''}`}>
        <span className="sort-emoji">{current.emoji}</span>
        <span className="sort-word">{current.wort}</span>
      </div>

      {correctArt && (
        <div className="sort-feedback">
          Das ist ein <strong>{WORTART_LABELS[correctArt as Wortart].emoji} {WORTART_LABELS[correctArt as Wortart].label}</strong>!
        </div>
      )}

      <div className="sort-buckets">
        {(Object.keys(WORTART_LABELS) as Wortart[]).map(art => (
          <button
            key={art}
            className="sort-bucket"
            style={{ '--bucket-color': WORTART_LABELS[art].color } as React.CSSProperties}
            onClick={() => handleSort(art)}
            disabled={!!feedback}
          >
            <span className="bucket-emoji">{WORTART_LABELS[art].emoji}</span>
            <span className="bucket-label">{WORTART_LABELS[art].label}</span>
          </button>
        ))}
      </div>

      <div className="verb-score">⭐ {score} richtig</div>
    </div>
  )
}

// ============================================================
// LOGIN SCREEN
// ============================================================

function LoginScreen({ onLogin }: { onLogin: (user: PbUser) => void }) {
  const [username, setUsername] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!username.trim() || !code.trim()) return
    setLoading(true); setError('')
    try { const user = await loginWithCode(username.trim().toLowerCase(), code.trim()); onLogin(user) }
    catch { setError('Falscher Name oder Code – versuch nochmal! 🔑') }
    finally { setLoading(false) }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-emoji">🌟</div>
        <h1 className="login-title">Wort-Abenteuer</h1>
        <p className="login-subtitle">Gib deinen Namen und Code ein:</p>
        <input type="text" value={username} onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Dein Name..." className="login-input" autoComplete="off" autoCapitalize="none" />
        <input type="text" value={code} onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Dein Code..." className="login-input" autoComplete="off" autoCapitalize="none" />
        {error && <p className="login-error">{error}</p>}
        <button className="login-btn" onClick={handleLogin} disabled={!username.trim() || !code.trim() || loading}>
          {loading ? '⏳ Laden...' : 'Los geht\'s! 🚀'}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// MAIN APP
// ============================================================

type GameModule = 'menu' | 'memory' | 'verb' | 'tierlaute' | 'kategorien'

function App() {
  const [activeGame, setActiveGame] = useState<GameModule>('menu')
  const [coins, setCoins] = useState(loadCoins)
  const [totalScore, setTotalScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [pbUser, setPbUser] = useState<PbUser | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load saved auth on mount and seed from server
  useEffect(() => {
    const saved = getSavedAuth()
    if (saved) {
      setPbUser(saved)
      const serverCoins = saved.coins ?? 0
      const serverXp = saved.xp ?? 0
      setCoins(serverCoins); saveCoins(serverCoins)
      setTotalScore(serverXp)
      setLevel(Math.floor(serverXp / 100) + 1)
    }
  }, [])

  // Debounced sync to server on coins/score change
  useEffect(() => {
    if (!pbUser) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      syncToServer(pbUser, coins, totalScore, Math.floor(totalScore / 100) + 1)
    }, 3000)
  }, [coins, totalScore, pbUser])

  const handleLogin = (user: PbUser) => {
    setPbUser(user)
    const serverCoins = user.coins ?? 0
    const serverXp = user.xp ?? 0
    setCoins(serverCoins); saveCoins(serverCoins)
    setTotalScore(serverXp)
    setLevel(Math.floor(serverXp / 100) + 1)
  }

  const handleLogout = () => {
    logout()
    setPbUser(null)
    setTotalScore(0)
    setLevel(1)
  }

  if (!pbUser) return <LoginScreen onLogin={handleLogin} />

  // addCoins: verdient Münzen + erhöht XP für Level-Progression
  const addCoins = (pts: number) => {
    setCoins(prev => { const n = Math.max(0, prev + pts); saveCoins(n); return n })
    setTotalScore(prev => {
      const newScore = prev + pts
      const newLevel = Math.floor(newScore / 100) + 1
      if (newLevel > level) {
        setLevel(newLevel)
        setShowLevelUp(true)
        setTimeout(() => setShowLevelUp(false), 2500)
      }
      return newScore
    })
  }

  const games = [
    { id: 'memory' as GameModule, title: 'Wörter-Memory', emoji: '🧠', desc: 'Finde die passenden Paare', color: '#FF6B6B' },
    { id: 'verb' as GameModule, title: 'Verb-Werkstatt', emoji: '🔧', desc: 'Baue Verben zusammen', color: '#4ECDC4' },
    { id: 'tierlaute' as GameModule, title: 'Tierlaute-Quiz', emoji: '🐾', desc: 'Welches Tier macht welches Geräusch?', color: '#FFE66D' },
    { id: 'kategorien' as GameModule, title: 'Wörter-Kategorien', emoji: '📚', desc: 'Sortiere Wörter nach Wortart', color: '#A06CD5' },
  ]

  if (activeGame === 'menu') {
    return (
      <div className="app-container">
        {showLevelUp && (
          <div className="level-up-overlay">
            <div className="level-up-content">
              🎉 Level {level}! 🎉
            </div>
          </div>
        )}

        <header className="app-header">
          <h1 className="app-title">
            <span className="title-emoji">🌟</span>
            Wort-Abenteuer
            <span className="title-emoji">🌟</span>
          </h1>
          <div className="score-bar">
            <div className="score-display">
              <span className="score-star">🪙</span>
              <span className="score-number">{coins}</span>
              <span className="score-label">Münzen</span>
            </div>
            <div className="level-display">
              <span className="level-badge">Level {level}</span>
            </div>
          </div>
          <div className="xp-bar-container">
            <div className="xp-bar" style={{ width: `${(totalScore % 100)}%` }} />
          </div>
        </header>

        <div className="game-grid">
          {games.map((game, i) => (
            <button
              key={game.id}
              className="game-card"
              style={{
                '--card-color': game.color,
                animationDelay: `${i * 0.1}s`,
              } as React.CSSProperties}
              onClick={() => setActiveGame(game.id)}
            >
              <span className="game-card-emoji">{game.emoji}</span>
              <h3 className="game-card-title">{game.title}</h3>
              <p className="game-card-desc">{game.desc}</p>
            </button>
          ))}
        </div>

        <footer className="app-footer">
          Lerne die 200 wichtigsten Wörter! 📖
        </footer>
        <div className="footer-links">
          <a href="../" className="home-link">🏠 Alle Apps</a>
          <button className="logout-btn" onClick={handleLogout}>🚪 Abmelden</button>
        </div>
      </div>
    )
  }

  const goBack = () => setActiveGame('menu')

  return (
    <div className="app-container">
      {showLevelUp && (
        <div className="level-up-overlay">
          <div className="level-up-content">🎉 Level {level}! 🎉</div>
        </div>
      )}
      <div className="score-bar-mini">
        <span>🪙 {coins} Münzen</span>
        <span className="level-badge-mini">Level {level}</span>
      </div>
      {activeGame === 'memory' && <WoerterMemory onScore={addCoins} onBack={goBack} />}
      {activeGame === 'verb' && <VerbWerkstatt onScore={addCoins} onBack={goBack} />}
      {activeGame === 'tierlaute' && <TierlauteQuiz onScore={addCoins} onBack={goBack} />}
      {activeGame === 'kategorien' && <WoerterKategorien onScore={addCoins} onBack={goBack} />}
    </div>
  )
}

export default App
