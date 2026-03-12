import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { getSavedAuth, loginWithCode, syncToServer, logout, fetchVocabUnits, fetchVocabItems, logActivity, PbUser, VocabItem, VocabUnit } from './pb'

// ============================================================
// VOCABULARY DATA
// ============================================================
// Unit = VocabUnit + cached vocab items. Fallback enthält
// hardcodierte Daten; nach Login werden Einheiten von PocketBase geladen.
// ============================================================

interface Unit {
  id: string
  title: string
  subtitle: string
  emoji: string
  vocab: VocabItem[]  // leer wenn noch nicht geladen
  itemCount?: number  // Hinweis-Anzahl von PocketBase
}

function pbUnitToUnit(u: VocabUnit): Unit {
  return { id: u.id, title: u.title, subtitle: u.subtitle, emoji: u.emoji, vocab: [], itemCount: u.itemCount }
}

const UNITS_FALLBACK: Unit[] = [
  {
    id: 'unit3',
    title: 'Unit 3',
    subtitle: 'Accidents & First Aid',
    emoji: '🏥',
    vocab: [
      { en: 'accident', de: 'Unfall', type: 'word' },
      { en: 'injured', de: 'verletzt', type: 'word' },
      { en: 'injury', de: 'Verletzung', type: 'word' },
      { en: 'hurt', de: 'wehtun, schmerzen', type: 'word' },
      { en: 'blood', de: 'Blut', type: 'word' },
      { en: 'dangerous', de: 'gefährlich', type: 'word' },
      { en: 'unconscious', de: 'bewusstlos', type: 'word' },
      { en: 'lying on the ground', de: 'auf dem Boden liegend', type: 'phrase' },
      { en: 'ambulance', de: 'Krankenwagen', type: 'word' },
      { en: 'emergency centre', de: 'Notrufzentrale', type: 'word' },
      { en: 'phone number', de: 'Telefonnummer', type: 'word' },
      { en: 'phone call', de: '(Telefon-)Anruf', type: 'word' },
      { en: 'emergency call', de: 'Notruf', type: 'word' },
      { en: 'mobile', de: 'Handy, Natel', type: 'word' },
      { en: 'safety', de: 'Sicherheit', type: 'word' },
      { en: 'adult', de: 'Erwachsene/-r', type: 'word' },
      { en: 'help', de: 'helfen; Hilfe', type: 'word' },
      { en: 'first aid', de: 'erste Hilfe', type: 'word' },
      { en: 'cyclist', de: 'Velofahrer/-in', type: 'word' },
      { en: 'breakdown triangle', de: 'Pannendreieck, Warndreieck', type: 'word' },
      { en: 'Stay calm.', de: 'Bleib ruhig.', type: 'phrase' },
      { en: 'Call immediately.', de: 'Ruf sofort an.', type: 'phrase' },
      { en: 'Who are you?', de: 'Wer bist du?', type: 'phrase' },
      { en: 'What happened?', de: 'Was ist passiert?', type: 'phrase' },
      { en: 'When did it happen?', de: 'Wann ist es passiert?', type: 'phrase' },
      { en: 'Where are you?', de: 'Wo bist du?', type: 'phrase' },
      { en: 'How many people are hurt?', de: 'Wie viele Personen sind verletzt?', type: 'phrase' },
      { en: 'safety first', de: 'Sicherheit geht vor', type: 'phrase' },
    ]
  },
  // Weitere Fallback-Units ggf. hier anhängen (werden durch PocketBase ersetzt)
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
  return shuffle(arr).slice(0, Math.min(n, arr.length))
}

// ============================================================
// CONFETTI
// ============================================================

function Confetti({ active }: { active: boolean }) {
  if (!active) return null
  const colors = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#fb923c']
  return (
    <div className="confetti-wrap">
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} className="confetti-dot" style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 0.6}s`,
          backgroundColor: colors[i % colors.length],
          width: `${6 + Math.random() * 6}px`,
          height: `${6 + Math.random() * 6}px`,
        }} />
      ))}
    </div>
  )
}

// ============================================================
// MODULE 1: FLIP CARDS
// ============================================================

function FlipCards({ vocab, onScore, onBack }: { vocab: VocabItem[]; onScore: (n: number) => void; onBack: () => void }) {
  const [cards, setCards] = useState<VocabItem[]>([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [showEn, setShowEn] = useState(true)
  const [known, setKnown] = useState(0)
  const [unknown, setUnknown] = useState(0)

  const init = useCallback(() => {
    setCards(shuffle(vocab))
    setIdx(0)
    setFlipped(false)
    setShowEn(Math.random() > 0.5)
    setKnown(0)
    setUnknown(0)
  }, [vocab])

  useEffect(() => { init() }, [init])

  const next = (knew: boolean) => {
    if (knew) { setKnown(k => k + 1); onScore(5) }
    else setUnknown(u => u + 1)
    setFlipped(false)
    setTimeout(() => {
      setIdx(i => i + 1)
      setShowEn(Math.random() > 0.5)
    }, 200)
  }

  if (cards.length === 0) return null

  if (idx >= cards.length) {
    return (
      <div className="module">
        <Confetti active={true} />
        <Header title="Karteikarten" onBack={onBack} />
        <div className="complete-box">
          <div className="complete-emoji">🎉</div>
          <h3>Alle durch!</h3>
          <p className="complete-stats">
            <span className="stat-good">✓ {known} gewusst</span>
            <span className="stat-bad">✗ {unknown} nochmal üben</span>
          </p>
          <button className="btn-primary" onClick={init}>Nochmal</button>
        </div>
      </div>
    )
  }

  const card = cards[idx]
  const front = showEn ? card.en : card.de
  const back = showEn ? card.de : card.en
  const lang = showEn ? 'EN' : 'DE'

  return (
    <div className="module">
      <Header title="Karteikarten" onBack={onBack} right={`${idx + 1} / ${cards.length}`} />
      <p className="hint">Tippe auf die Karte zum Umdrehen</p>

      <div className="flip-scene" onClick={() => setFlipped(!flipped)}>
        <div className={`flip-card ${flipped ? 'is-flipped' : ''}`}>
          <div className="flip-face flip-front">
            <span className="flip-lang">{lang}</span>
            <span className="flip-text">{front}</span>
          </div>
          <div className="flip-face flip-back">
            <span className="flip-lang">{showEn ? 'DE' : 'EN'}</span>
            <span className="flip-text">{back}</span>
          </div>
        </div>
      </div>

      {flipped && (
        <div className="flip-actions">
          <button className="btn-know" onClick={() => next(true)}>✓ Gewusst</button>
          <button className="btn-noknow" onClick={() => next(false)}>✗ Nochmal</button>
        </div>
      )}

      <div className="progress-dots">
        {cards.map((_, i) => (
          <div key={i} className={`dot ${i === idx ? 'dot-active' : i < idx ? 'dot-done' : ''}`} />
        ))}
      </div>
    </div>
  )
}

// ============================================================
// MODULE 2: MATCH-IT
// ============================================================

function MatchIt({ vocab, onScore, onBack }: { vocab: VocabItem[]; onScore: (n: number) => void; onBack: () => void }) {
  const [pairs, setPairs] = useState<VocabItem[]>([])
  const [leftItems, setLeftItems] = useState<{ id: number; text: string }[]>([])
  const [rightItems, setRightItems] = useState<{ id: number; text: string }[]>([])
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [matched, setMatched] = useState<number[]>([])
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const init = useCallback(() => {
    const chosen = pickRandom(vocab, 6)
    setPairs(chosen)
    const showEnLeft = Math.random() > 0.5
    setLeftItems(shuffle(chosen.map((v, i) => ({ id: i, text: showEnLeft ? v.en : v.de }))))
    setRightItems(shuffle(chosen.map((v, i) => ({ id: i, text: showEnLeft ? v.de : v.en }))))
    setSelectedLeft(null)
    setMatched([])
    setWrongPair(null)
    setShowConfetti(false)
  }, [vocab])

  useEffect(() => { init() }, [init])

  const handleLeft = (id: number) => {
    if (matched.includes(id)) return
    setSelectedLeft(id)
    setWrongPair(null)
  }

  const handleRight = (id: number) => {
    if (matched.includes(id) || selectedLeft === null) return
    if (selectedLeft === id) {
      const newMatched = [...matched, id]
      setMatched(newMatched)
      setSelectedLeft(null)
      onScore(10)
      if (newMatched.length === pairs.length) {
        setShowConfetti(true)
        onScore(20)
      }
    } else {
      setWrongPair([selectedLeft, id])
      setTimeout(() => {
        setWrongPair(null)
        setSelectedLeft(null)
      }, 800)
    }
  }

  return (
    <div className="module">
      <Confetti active={showConfetti} />
      <Header title="Match-It" onBack={onBack} right={`${matched.length} / ${pairs.length}`} />
      <p className="hint">Wähle links ein Wort, dann rechts die Übersetzung</p>

      {showConfetti && matched.length === pairs.length ? (
        <div className="complete-box">
          <div className="complete-emoji">🎯</div>
          <h3>Alle Paare gefunden!</h3>
          <button className="btn-primary" onClick={init}>Neue Runde</button>
        </div>
      ) : (
        <div className="match-grid">
          <div className="match-col">
            {leftItems.map(item => (
              <button
                key={item.id}
                className={`match-btn ${matched.includes(item.id) ? 'match-done' : ''} ${selectedLeft === item.id ? 'match-selected' : ''} ${wrongPair && wrongPair[0] === item.id ? 'match-wrong' : ''}`}
                onClick={() => handleLeft(item.id)}
                disabled={matched.includes(item.id)}
              >
                {item.text}
              </button>
            ))}
          </div>
          <div className="match-col">
            {rightItems.map(item => (
              <button
                key={item.id}
                className={`match-btn ${matched.includes(item.id) ? 'match-done' : ''} ${wrongPair && wrongPair[1] === item.id ? 'match-wrong' : ''}`}
                onClick={() => handleRight(item.id)}
                disabled={matched.includes(item.id)}
              >
                {item.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// MODULE 3: SPEED QUIZ
// ============================================================

function SpeedQuiz({ vocab, onScore, onBack }: { vocab: VocabItem[]; onScore: (n: number) => void; onBack: () => void }) {
  const [questions, setQuestions] = useState<VocabItem[]>([])
  const [idx, setIdx] = useState(0)
  const [options, setOptions] = useState<string[]>([])
  const [showEn, setShowEn] = useState(true)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [timer, setTimer] = useState(15)
  const [showConfetti, setShowConfetti] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const setupQ = useCallback((qs: VocabItem[], i: number) => {
    if (i >= qs.length) return
    const enDir = Math.random() > 0.5
    setShowEn(enDir)
    const correct = enDir ? qs[i].de : qs[i].en
    setCorrectAnswer(correct)
    const pool = vocab.filter(v => (enDir ? v.de : v.en) !== correct).map(v => enDir ? v.de : v.en)
    const wrongs = pickRandom([...new Set(pool)], 3)
    setOptions(shuffle([correct, ...wrongs]))
    setTimer(15)
  }, [vocab])

  const init = useCallback(() => {
    const qs = pickRandom(vocab, 10)
    setQuestions(qs)
    setIdx(0)
    setScore(0)
    setFeedback(null)
    setShowConfetti(false)
    setupQ(qs, 0)
  }, [setupQ, vocab])

  useEffect(() => { init() }, [init])

  useEffect(() => {
    if (feedback || idx >= questions.length) return
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          setFeedback('wrong')
          setTimeout(() => {
            setFeedback(null)
            const next = idx + 1
            setIdx(next)
            if (next < questions.length) setupQ(questions, next)
            else { setShowConfetti(true); onScore(15) }
          }, 1200)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [idx, feedback, questions, setupQ, onScore])

  const handleAnswer = (ans: string) => {
    if (feedback) return
    if (timerRef.current) clearInterval(timerRef.current)
    if (ans === correctAnswer) {
      setFeedback('correct')
      setScore(s => s + 1)
      onScore(10 + Math.min(timer, 10))
    } else {
      setFeedback('wrong')
    }
    setTimeout(() => {
      setFeedback(null)
      const next = idx + 1
      setIdx(next)
      if (next < questions.length) setupQ(questions, next)
      else { setShowConfetti(true); onScore(15) }
    }, 1200)
  }

  if (questions.length === 0) return null

  if (idx >= questions.length) {
    return (
      <div className="module">
        <Confetti active={showConfetti} />
        <Header title="Speed-Quiz" onBack={onBack} />
        <div className="complete-box">
          <div className="complete-emoji">⚡</div>
          <h3>Fertig!</h3>
          <p>{score} von {questions.length} richtig</p>
          {score >= 8 && <p className="perfect-msg">Mega schnell!</p>}
          <button className="btn-primary" onClick={init}>Nochmal</button>
        </div>
      </div>
    )
  }

  const q = questions[idx]
  const questionText = showEn ? q.en : q.de

  return (
    <div className="module">
      <Header title="Speed-Quiz" onBack={onBack} right={`${idx + 1}/${questions.length}`} />

      <div className="timer-bar-wrap">
        <div className="timer-bar" style={{ width: `${(timer / 15) * 100}%`, background: timer <= 5 ? '#ef4444' : timer <= 10 ? '#f59e0b' : '#22c55e' }} />
      </div>
      <div className="timer-text">{timer}s</div>

      <div className={`quiz-question ${feedback === 'correct' ? 'q-correct' : feedback === 'wrong' ? 'q-wrong' : ''}`}>
        <span className="quiz-lang">{showEn ? 'EN' : 'DE'}</span>
        <span className="quiz-word">{questionText}</span>
      </div>

      <div className="quiz-options">
        {options.map((opt, i) => (
          <button
            key={`${idx}-${i}`}
            className={`quiz-opt ${feedback && opt === correctAnswer ? 'opt-correct' : ''} ${feedback === 'wrong' && opt !== correctAnswer ? 'opt-faded' : ''}`}
            onClick={() => handleAnswer(opt)}
            disabled={!!feedback}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="quiz-score">⭐ {score} richtig</div>
    </div>
  )
}

// ============================================================
// MODULE 4: BUCHSTABEN-SALAT
// ============================================================

function BuchstabenSalat({ vocab, onScore, onBack }: { vocab: VocabItem[]; onScore: (n: number) => void; onBack: () => void }) {
  const [questions, setQuestions] = useState<VocabItem[]>([])
  const [idx, setIdx] = useState(0)
  const [showEn, setShowEn] = useState(true)
  const [scrambled, setScrambled] = useState<string[]>([])
  const [userAnswer, setUserAnswer] = useState<string[]>([])
  const [available, setAvailable] = useState<boolean[]>([])
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [score, setScore] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)

  const setupQ = useCallback((qs: VocabItem[], i: number) => {
    if (i >= qs.length) return
    const enDir = Math.random() > 0.5
    setShowEn(enDir)
    const answer = enDir ? qs[i].en : qs[i].de
    const letters = answer.split('')
    const mixed = shuffle(letters)
    setScrambled(mixed)
    setUserAnswer([])
    setAvailable(mixed.map(() => true))
    setFeedback(null)
  }, [])

  const init = useCallback(() => {
    const wordOnly = vocab.filter(v => v.type === 'word' && v.en.split(' ').length === 1 && v.de.split(/[,;]/).length === 1 && !v.de.includes(' '))
    const qs = pickRandom(wordOnly, 8)
    setQuestions(qs)
    setIdx(0)
    setScore(0)
    setShowConfetti(false)
    setupQ(qs, 0)
  }, [setupQ, vocab])

  useEffect(() => { init() }, [init])

  const addLetter = (i: number) => {
    if (feedback || !available[i]) return
    const newAnswer = [...userAnswer, scrambled[i]]
    const newAvail = [...available]
    newAvail[i] = false
    setUserAnswer(newAnswer)
    setAvailable(newAvail)

    if (newAnswer.length === scrambled.length) {
      const target = showEn ? questions[idx].en : questions[idx].de
      if (newAnswer.join('') === target) {
        setFeedback('correct')
        setScore(s => s + 1)
        onScore(15)
        setTimeout(() => {
          const next = idx + 1
          setIdx(next)
          if (next < questions.length) setupQ(questions, next)
          else { setShowConfetti(true); onScore(20) }
        }, 1000)
      } else {
        setFeedback('wrong')
        setTimeout(() => {
          setUserAnswer([])
          setAvailable(scrambled.map(() => true))
          setFeedback(null)
        }, 1000)
      }
    }
  }

  const removeLetter = () => {
    if (feedback || userAnswer.length === 0) return
    const lastLetter = userAnswer[userAnswer.length - 1]
    const newAnswer = userAnswer.slice(0, -1)
    setUserAnswer(newAnswer)
    const newAvail = [...available]
    for (let i = newAvail.length - 1; i >= 0; i--) {
      if (!newAvail[i] && scrambled[i] === lastLetter) {
        newAvail[i] = true
        break
      }
    }
    setAvailable(newAvail)
  }

  if (questions.length === 0) return null

  if (idx >= questions.length) {
    return (
      <div className="module">
        <Confetti active={showConfetti} />
        <Header title="Buchstaben-Salat" onBack={onBack} />
        <div className="complete-box">
          <div className="complete-emoji">🔤</div>
          <h3>Geschafft!</h3>
          <p>{score} von {questions.length} richtig beim ersten Versuch</p>
          <button className="btn-primary" onClick={init}>Nochmal</button>
        </div>
      </div>
    )
  }

  const q = questions[idx]
  const clue = showEn ? q.de : q.en

  return (
    <div className="module">
      <Header title="Buchstaben-Salat" onBack={onBack} right={`${idx + 1}/${questions.length}`} />
      <p className="hint">Bringe die Buchstaben in die richtige Reihenfolge!</p>

      <div className="scramble-clue">
        <span className="scramble-lang">{showEn ? 'DE' : 'EN'}</span>
        <span className="scramble-word">{clue}</span>
      </div>

      <div className={`scramble-answer ${feedback === 'correct' ? 'ans-correct' : feedback === 'wrong' ? 'ans-wrong' : ''}`}>
        {scrambled.map((_, i) => (
          <span key={i} className={`answer-slot ${userAnswer[i] ? 'slot-filled' : ''}`}>
            {userAnswer[i] || ''}
          </span>
        ))}
        {userAnswer.length > 0 && !feedback && (
          <button className="undo-btn" onClick={removeLetter}>↩</button>
        )}
      </div>

      <div className="scramble-letters">
        {scrambled.map((letter, i) => (
          <button
            key={i}
            className={`letter-btn ${!available[i] ? 'letter-used' : ''}`}
            onClick={() => addLetter(i)}
            disabled={!available[i] || !!feedback}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="quiz-score">⭐ {score} richtig</div>
    </div>
  )
}

// ============================================================
// SHARED HEADER
// ============================================================

function Header({ title, onBack, right }: { title: string; onBack: () => void; right?: string }) {
  return (
    <div className="mod-header">
      <button className="back-btn" onClick={onBack}>←</button>
      <h2 className="mod-title">{title}</h2>
      {right && <span className="mod-right">{right}</span>}
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
    catch { setError('Wrong name or code – try again! 🔑') }
    finally { setLoading(false) }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-emoji">🦸‍♀️</div>
        <h1 className="login-title">Vocab<span className="login-accent">Hero</span></h1>
        <p className="login-subtitle">Enter your name and code:</p>
        <input type="text" value={username} onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Your name..." className="login-input" autoComplete="off" autoCapitalize="none" />
        <input type="text" value={code} onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Your code..." className="login-input" autoComplete="off" autoCapitalize="none" />
        {error && <p className="login-error">{error}</p>}
        <button className="login-btn" onClick={handleLogin} disabled={!username.trim() || !code.trim() || loading}>
          {loading ? '⏳ Loading...' : 'Let\'s go! 🚀'}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// UNIT PICKER
// ============================================================

function UnitPicker({ units, onSelect }: { units: Unit[]; onSelect: (unit: Unit) => void }) {
  return (
    <div className="app">
      <header className="hero">
        <h1 className="hero-title">Vocab<span className="hero-accent">Hero</span></h1>
        <p className="hero-sub">Choose your unit</p>
      </header>
      <div className="unit-grid">
        {units.map((unit, i) => (
          <button
            key={unit.id}
            className="unit-card"
            style={{ animationDelay: `${i * 0.08}s` }}
            onClick={() => onSelect(unit)}
          >
            <span className="unit-emoji">{unit.emoji}</span>
            <span className="unit-title">{unit.title}</span>
            <span className="unit-subtitle">{unit.subtitle}</span>
            <span className="unit-count">{unit.itemCount ?? unit.vocab.length} words</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// MAIN APP
// ============================================================

type View = 'menu' | 'flip' | 'match' | 'speed' | 'scramble'

const GAMES = [
  { id: 'flip' as View, title: 'Karteikarten', emoji: '🃏', desc: 'Flip & learn', gradient: 'linear-gradient(135deg, #f472b6, #e879f9)' },
  { id: 'match' as View, title: 'Match-It', emoji: '🔗', desc: 'Paare verbinden', gradient: 'linear-gradient(135deg, #60a5fa, #818cf8)' },
  { id: 'speed' as View, title: 'Speed-Quiz', emoji: '⚡', desc: 'Schnell antworten', gradient: 'linear-gradient(135deg, #fbbf24, #f97316)' },
  { id: 'scramble' as View, title: 'Buchstaben-Salat', emoji: '🔤', desc: 'Wörter zusammensetzen', gradient: 'linear-gradient(135deg, #34d399, #2dd4bf)' },
]

function App() {
  const [view, setView] = useState<View>('menu')
  const [units, setUnits] = useState<Unit[]>(UNITS_FALLBACK)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [loadingVocab, setLoadingVocab] = useState(false)
  const [totalScore, setTotalScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [levelUp, setLevelUp] = useState(false)
  const [pbUser, setPbUser] = useState<PbUser | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load saved auth on mount and seed score from server
  useEffect(() => {
    const saved = getSavedAuth()
    if (saved) {
      setPbUser(saved)
      const serverXp = saved.xp ?? 0
      setTotalScore(serverXp)
      setLevel(Math.floor(serverXp / 120) + 1)
    }
    // Auto-select if only one fallback unit
    if (UNITS_FALLBACK.length === 1) setSelectedUnit(UNITS_FALLBACK[0])
  }, [])

  // Debounced sync to server on score change
  useEffect(() => {
    if (!pbUser) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      syncToServer(pbUser, pbUser.coins, totalScore, Math.floor(totalScore / 120) + 1)
    }, 3000)
  }, [totalScore, pbUser])

  const handleLogin = (user: PbUser) => {
    setPbUser(user)
    const serverXp = user.xp ?? 0
    setTotalScore(serverXp)
    setLevel(Math.floor(serverXp / 120) + 1)
    // Dynamische Einheiten von PocketBase laden
    fetchVocabUnits(user.token, UNITS_FALLBACK.map(u => ({ id: u.id, title: u.title, subtitle: u.subtitle, emoji: u.emoji, targetUser: '' }))).then(pbUnits => {
      const loaded = pbUnits.map(pbUnitToUnit)
      setUnits(loaded)
      if (loaded.length === 1) setSelectedUnit(loaded[0])
    })
  }

  // Wählt eine Unit aus und lädt bei Bedarf die Vokabeln lazy von PocketBase
  const handleSelectUnit = async (unit: Unit) => {
    if (unit.vocab.length > 0) {
      setSelectedUnit(unit); setView('menu'); return
    }
    if (!pbUser) {
      setSelectedUnit(unit); setView('menu'); return
    }
    setLoadingVocab(true)
    try {
      const items = await fetchVocabItems(pbUser.token, unit.id)
      const loaded = { ...unit, vocab: items }
      setSelectedUnit(loaded)
      setUnits(prev => prev.map(u => u.id === unit.id ? loaded : u))
    } catch {
      setSelectedUnit(unit)  // Fallback: leere Vokabeln
    }
    setLoadingVocab(false)
    setView('menu')
  }

  const handleLogout = () => {
    logout()
    setPbUser(null)
    setTotalScore(0)
    setLevel(1)
    setUnits(UNITS_FALLBACK)
    setSelectedUnit(UNITS_FALLBACK.length === 1 ? UNITS_FALLBACK[0] : null)
  }

  if (!pbUser) return <LoginScreen onLogin={handleLogin} />
  if (loadingVocab) return (
    <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ fontSize: '1.3rem', color: 'var(--text-muted)' }}>⏳ Lade Wörter...</p>
    </div>
  )
  if (!selectedUnit) return <UnitPicker units={units} onSelect={handleSelectUnit} />

  const addScore = (pts: number, gameMode?: View) => {
    setTotalScore(prev => {
      const next = prev + pts
      const newLvl = Math.floor(next / 120) + 1
      if (newLvl > level) {
        setLevel(newLvl)
        setLevelUp(true)
        setTimeout(() => setLevelUp(false), 2200)
      }
      return next
    })
    // Activity Log – fire and forget
    if (pbUser && selectedUnit && pts > 0) {
      logActivity(pbUser, {
        app: 'vocabhero',
        unit_id: selectedUnit.id,
        unit_title: selectedUnit.title,
        game_mode: gameMode ?? view,
        score: pts,
        total: pts,
        coins_earned: 0,
      })
    }
  }

  const goMenu = () => setView('menu')

  if (view !== 'menu') {
    return (
      <div className="app">
        {levelUp && <div className="level-up-toast">🎉 Level {level}!</div>}
        <div className="top-bar">
          <span className="top-score">⭐ {totalScore}</span>
          <span className="top-level">Lvl {level}</span>
        </div>
        {view === 'flip' && <FlipCards vocab={selectedUnit.vocab} onScore={addScore} onBack={goMenu} />}
        {view === 'match' && <MatchIt vocab={selectedUnit.vocab} onScore={addScore} onBack={goMenu} />}
        {view === 'speed' && <SpeedQuiz vocab={selectedUnit.vocab} onScore={addScore} onBack={goMenu} />}
        {view === 'scramble' && <BuchstabenSalat vocab={selectedUnit.vocab} onScore={addScore} onBack={goMenu} />}
      </div>
    )
  }

  return (
    <div className="app">
      {levelUp && <div className="level-up-toast">🎉 Level {level}!</div>}

      <header className="hero">
        <h1 className="hero-title">Vocab<span className="hero-accent">Hero</span></h1>
        <p className="hero-sub">{selectedUnit.emoji} {selectedUnit.title} · {selectedUnit.subtitle}</p>
        <div className="hero-stats">
          <div className="stat-pill">⭐ {totalScore} Punkte</div>
          <div className="stat-pill pill-level">Level {level}</div>
        </div>
        <div className="xp-track">
          <div className="xp-fill" style={{ width: `${(totalScore % 120) / 120 * 100}%` }} />
        </div>
      </header>

      <div className="menu-grid">
        {GAMES.map((g, i) => (
          <button
            key={g.id}
            className="menu-card"
            style={{ '--g': g.gradient, animationDelay: `${i * 0.08}s` } as React.CSSProperties}
            onClick={() => setView(g.id)}
          >
            <div className="card-bg" style={{ background: g.gradient }} />
            <span className="card-emoji">{g.emoji}</span>
            <span className="card-title">{g.title}</span>
            <span className="card-desc">{g.desc}</span>
          </button>
        ))}
      </div>

      <p className="footer-text">{selectedUnit.vocab.length} Vokabeln · Englisch ↔ Deutsch</p>
      <div className="footer-links">
        {units.length > 1 && (
          <button className="unit-switch-btn" onClick={() => setSelectedUnit(null)}>📚 Unit wechseln</button>
        )}
        <a href="../" className="home-link">🏠 Alle Apps</a>
        <button className="logout-btn" onClick={handleLogout}>🚪 Sign out</button>
      </div>
    </div>
  )
}

export default App
