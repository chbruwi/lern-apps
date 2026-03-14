import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { VOCAB, LESSONS } from './data'
import type { VocabItem } from './data'
import { getSavedAuth, loginWithCode, syncToServer, logout, logActivity } from './pb'
import type { PbUser } from './pb'

// ── Coins ──────────────────────────────────────────────────────────────────
const SK_COINS = 'lernheld-v1-coins'
const loadCoins = () => { try { return parseInt(localStorage.getItem(SK_COINS) || '0') || 0 } catch { return 0 } }
const saveCoins = (v: number) => { try { localStorage.setItem(SK_COINS, String(Math.max(0, v))) } catch {} }

// ── Speech ─────────────────────────────────────────────────────────────────
function speak(text: string, rate = 0.7) {
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'fr-FR'
  utt.rate = rate
  speechSynthesis.cancel()
  speechSynthesis.speak(utt)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Mode = 'menu' | 'dekodieren' | 'bilder' | 'memory' | 'quiz'

// ── Login Screen ───────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (u: PbUser) => void }) {
  const [username, setUsername] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !code.trim()) return
    setLoading(true); setError('')
    try {
      const user = await loginWithCode(username.trim().toLowerCase(), code.trim())
      onLogin(user)
    } catch { setError('Falscher Benutzername oder Code') }
    finally { setLoading(false) }
  }

  return (
    <div className="login-screen">
      <div className="login-hero">🇫🇷</div>
      <h1 className="login-title">Français</h1>
      <p className="login-subtitle">Les Loisirs – Hobbys auf Französisch</p>
      <form className="login-form" onSubmit={handleSubmit}>
        <input className="login-input" placeholder="Benutzername" value={username}
          onChange={e => setUsername(e.target.value)} autoComplete="off" />
        <input className="login-input" placeholder="Code" type="password" value={code}
          onChange={e => setCode(e.target.value)} autoComplete="off" />
        {error && <p className="login-error">{error}</p>}
        <button className="login-btn" type="submit" disabled={loading}>
          {loading ? '…' : 'Einloggen'}
        </button>
      </form>
    </div>
  )
}

// ── De-Kodieren ────────────────────────────────────────────────────────────
function DekodiertModus({ addCoins }: { addCoins: (n: number) => void }) {
  const [lessonIdx, setLessonIdx] = useState(0)
  const lesson = LESSONS[lessonIdx]

  return (
    <div>
      <div className="lesson-tabs">
        {LESSONS.map((l, i) => (
          <button key={i} className={`lesson-tab${i === lessonIdx ? ' active' : ''}`}
            onClick={() => setLessonIdx(i)}>{l.title}</button>
        ))}
      </div>
      <div className="sentence-list">
        {lesson.sentences.map((s, i) => (
          <div key={i} className="sentence-card">
            <div className="sentence-fr">{s.fr}</div>
            <div className="sentence-de">{s.de}</div>
            <div className="sentence-actions">
              <button className="speak-btn" onClick={() => { speak(s.fr); addCoins(1) }}>
                🔊 Vorlesen +1🪙
              </button>
            </div>
            <div className="word-table">
              {s.words.map((w, j) => (
                <div key={j} className="word-pair">
                  <span className="word-fr">{w.fr}</span>
                  <span className="word-de">{w.de}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bild-Vokabeln ──────────────────────────────────────────────────────────
function BildVokabeln({ addCoins }: { addCoins: (n: number) => void }) {
  function tap(item: VocabItem) {
    speak(item.fr)
    addCoins(1)
  }

  return (
    <div className="vocab-grid">
      {VOCAB.map((item, i) => (
        <div key={i} className="vocab-card" onClick={() => tap(item)}>
          <img src={item.svgData} alt={item.fr} />
          <div className="vocab-card-fr">{item.emoji} {item.fr}</div>
          <div className="vocab-card-de">{item.de}</div>
        </div>
      ))}
    </div>
  )
}

// ── Memory Spiel ───────────────────────────────────────────────────────────
interface MemoryCard { id: number; type: 'img' | 'word'; item: VocabItem; matched: boolean; faceUp: boolean }

function buildMemoryDeck(): MemoryCard[] {
  const picked = shuffle(VOCAB).slice(0, 6)
  const cards: MemoryCard[] = []
  picked.forEach((item, i) => {
    cards.push({ id: i * 2,     type: 'img',  item, matched: false, faceUp: false })
    cards.push({ id: i * 2 + 1, type: 'word', item, matched: false, faceUp: false })
  })
  return shuffle(cards)
}

function MemorySpiel({ addCoins, onFinish }: { addCoins: (n: number) => void; onFinish: (coins: number) => void }) {
  const [cards, setCards] = useState<MemoryCard[]>(buildMemoryDeck)
  const [selected, setSelected] = useState<number[]>([])
  const [locked, setLocked] = useState(false)
  const [pairs, setPairs] = useState(0)
  const [coinsEarned, setCoinsEarned] = useState(0)

  function flip(id: number) {
    if (locked) return
    const card = cards.find(c => c.id === id)
    if (!card || card.faceUp || card.matched) return

    const newCards = cards.map(c => c.id === id ? { ...c, faceUp: true } : c)
    setCards(newCards)
    const newSelected = [...selected, id]

    if (newSelected.length < 2) {
      setSelected(newSelected)
      return
    }

    setLocked(true)
    const [id1, id2] = newSelected
    const c1 = newCards.find(c => c.id === id1)!
    const c2 = newCards.find(c => c.id === id2)!

    if (c1.item.fr === c2.item.fr && c1.type !== c2.type) {
      // Match!
      setTimeout(() => {
        setCards(prev => prev.map(c =>
          c.id === id1 || c.id === id2 ? { ...c, matched: true, faceUp: true } : c
        ))
        const newPairs = pairs + 1
        setPairs(newPairs)
        addCoins(2)
        setCoinsEarned(prev => prev + 2)
        setSelected([])
        setLocked(false)
        if (newPairs === 6) {
          addCoins(5)
          setTimeout(() => onFinish(coinsEarned + 2 + 5), 400)
        }
      }, 500)
    } else {
      setTimeout(() => {
        setCards(prev => prev.map(c =>
          c.id === id1 || c.id === id2 ? { ...c, faceUp: false } : c
        ))
        setSelected([])
        setLocked(false)
      }, 900)
    }
  }

  return (
    <div>
      <div className="memory-info">
        <span>🃏 {pairs}/6 Paare</span>
        <span>🪙 +{coinsEarned}</span>
      </div>
      <div className="memory-grid">
        {cards.map(card => (
          <div key={card.id}
            className={`memory-card ${card.matched ? 'matched' : card.faceUp ? 'face-up' : 'face-down'}`}
            onClick={() => flip(card.id)}>
            {card.faceUp || card.matched ? (
              card.type === 'img'
                ? <img className="memory-card-img" src={card.item.svgData} alt={card.item.fr} />
                : <span className="memory-card-text">{card.item.fr}<br/><small style={{color:'#888',fontWeight:400}}>{card.item.de}</small></span>
            ) : '🇫🇷'}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bild-Quiz ──────────────────────────────────────────────────────────────
function buildQuizQuestions() {
  return shuffle(VOCAB).slice(0, 15).map(correct => {
    const distractors = shuffle(VOCAB.filter(v => v.fr !== correct.fr)).slice(0, 3)
    return { correct, answers: shuffle([correct, ...distractors]) }
  })
}

function BildQuiz({ addCoins, onFinish }: { addCoins: (n: number) => void; onFinish: (coins: number) => void }) {
  const [questions] = useState(buildQuizQuestions)
  const [qIdx, setQIdx] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [coinsEarned, setCoinsEarned] = useState(0)
  const [score, setScore] = useState(0)

  const q = questions[qIdx]

  function answer(fr: string) {
    if (chosen) return
    setChosen(fr)
    const correct = fr === q.correct.fr
    if (correct) {
      addCoins(2)
      setCoinsEarned(prev => prev + 2)
      setScore(prev => prev + 1)
    }
    setTimeout(() => {
      if (qIdx + 1 >= questions.length) {
        addCoins(5)
        onFinish(coinsEarned + (correct ? 2 : 0) + 5)
      } else {
        setQIdx(prev => prev + 1)
        setChosen(null)
      }
    }, 900)
  }

  return (
    <div>
      <div className="quiz-progress">
        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${(qIdx / questions.length) * 100}%` }} />
        </div>
        <span className="quiz-counter">{qIdx + 1}/{questions.length}</span>
      </div>
      <div className="quiz-image-wrap">
        <img src={q.correct.svgData} alt="?" />
        <span className="quiz-question-label">Was ist das auf Französisch?</span>
      </div>
      <div className="quiz-answers">
        {q.answers.map(a => (
          <button key={a.fr}
            className={`quiz-answer-btn${chosen ? (a.fr === q.correct.fr ? ' correct' : a.fr === chosen ? ' wrong' : '') : ''}`}
            onClick={() => answer(a.fr)} disabled={!!chosen}>
            {a.fr}<br/><small style={{fontWeight:400,fontSize:'0.75rem',color:'#888'}}>{a.de}</small>
          </button>
        ))}
      </div>
      <div className={`quiz-feedback${chosen ? (chosen === q.correct.fr ? ' correct' : ' wrong') : ''}`}>
        {chosen ? (chosen === q.correct.fr ? '✅ Richtig! +2🪙' : `❌ ${q.correct.fr}`) : ''}
      </div>
    </div>
  )
}

// ── Result Screen ──────────────────────────────────────────────────────────
function ResultScreen({ coins, onBack }: { coins: number; onBack: () => void }) {
  return (
    <div className="result-screen">
      <div className="result-emoji">🎉</div>
      <h2 className="result-title">Super gemacht!</h2>
      <p className="result-coins">+{coins} 🪙 Münzen verdient</p>
      <button className="result-btn" onClick={onBack}>Zurück zum Menü</button>
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [pbUser, setPbUser] = useState<PbUser | null>(() => getSavedAuth())
  const [coins, setCoins] = useState(loadCoins)
  const [totalScore, setTotalScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [mode, setMode] = useState<Mode>('menu')
  const [resultCoins, setResultCoins] = useState(0)
  const [toast, setToast] = useState('')
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load user data on login
  useEffect(() => {
    if (pbUser) {
      setCoins(pbUser.coins ?? 0)
      saveCoins(pbUser.coins ?? 0)
      setTotalScore(pbUser.xp ?? 0)
      setLevel(pbUser.level ?? 1)
    }
  }, [pbUser?.id])

  // Debounced PB sync
  const scheduleSync = useCallback((c: number, xp: number, lv: number) => {
    if (!pbUser) return
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => syncToServer(pbUser, c, xp, lv), 3000)
  }, [pbUser])

  function addCoins(delta: number) {
    setCoins(prev => {
      const n = Math.max(0, prev + delta)
      saveCoins(n)
      const newXp = totalScore + delta
      const newLevel = Math.floor(newXp / 50) + 1
      setTotalScore(newXp)
      setLevel(newLevel)
      scheduleSync(n, newXp, newLevel)
      return n
    })
    setToast(`+${delta}🪙`)
    setTimeout(() => setToast(''), 2000)
  }

  function handleLogin(user: PbUser) {
    setPbUser(user)
  }

  function handleLogout() {
    logout()
    setPbUser(null)
    setMode('menu')
  }

  function handleFinish(earnedCoins: number) {
    if (pbUser) {
      logActivity(pbUser, {
        app: 'franzoesisch',
        unit_id: 'les-loisirs',
        unit_title: 'Les Loisirs',
        game_mode: mode,
        score: earnedCoins,
        total: 0,
        coins_earned: earnedCoins,
      })
    }
    setResultCoins(earnedCoins)
    setMode('menu')
  }

  if (!pbUser) return <LoginScreen onLogin={handleLogin} />

  return (
    <div className="app-container">
      <header className="top-bar">
        <span className="top-bar-title">🇫🇷 Français</span>
        <div className="top-bar-right">
          <span className="coins-display">🪙 {coins}</span>
          <span className="level-pill">Lv.{level}</span>
          <button className="logout-btn" onClick={handleLogout} title="Ausloggen">🚪</button>
        </div>
      </header>

      {toast && <div className="coin-toast">{toast}</div>}

      {mode === 'menu' && (
        <div className="mode-menu">
          <h2>Bonjour, {pbUser.username}! 👋</h2>
          <p className="mode-menu-subtitle">Was möchtest du heute lernen?</p>
          {resultCoins > 0 && (
            <ResultScreen coins={resultCoins} onBack={() => setResultCoins(0)} />
          )}
          {resultCoins === 0 && (
            <div className="mode-grid">
              <div className="mode-card" onClick={() => setMode('dekodieren')}>
                <span className="mode-card-emoji">🔤</span>
                <div className="mode-card-title">De-Kodieren</div>
                <div className="mode-card-desc">Sätze Wort für Wort verstehen</div>
              </div>
              <div className="mode-card" onClick={() => setMode('bilder')}>
                <span className="mode-card-emoji">🖼️</span>
                <div className="mode-card-title">Bild-Vokabeln</div>
                <div className="mode-card-desc">36 Vokabeln mit Bildern</div>
              </div>
              <div className="mode-card" onClick={() => setMode('memory')}>
                <span className="mode-card-emoji">🃏</span>
                <div className="mode-card-title">Memory</div>
                <div className="mode-card-desc">Bild und Wort zuordnen</div>
              </div>
              <div className="mode-card" onClick={() => setMode('quiz')}>
                <span className="mode-card-emoji">❓</span>
                <div className="mode-card-title">Bild-Quiz</div>
                <div className="mode-card-desc">15 Fragen mit 4 Antworten</div>
              </div>
            </div>
          )}
        </div>
      )}

      {mode !== 'menu' && (
        <div className="game-container">
          <button className="back-btn" onClick={() => setMode('menu')}>← Menü</button>
          <h2 className="game-title">
            {mode === 'dekodieren' && '🔤 De-Kodieren'}
            {mode === 'bilder' && '🖼️ Bild-Vokabeln'}
            {mode === 'memory' && '🃏 Memory'}
            {mode === 'quiz' && '❓ Bild-Quiz'}
          </h2>

          {mode === 'dekodieren' && <DekodiertModus addCoins={addCoins} />}
          {mode === 'bilder' && <BildVokabeln addCoins={addCoins} />}
          {mode === 'memory' && (
            <MemorySpiel key={Math.random()} addCoins={addCoins}
              onFinish={(c) => handleFinish(c)} />
          )}
          {mode === 'quiz' && (
            <BildQuiz key={Math.random()} addCoins={addCoins}
              onFinish={(c) => handleFinish(c)} />
          )}
        </div>
      )}
    </div>
  )
}
