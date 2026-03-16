import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { getSavedAuth, loginWithCode, syncToServer, logout, fetchVocabUnits, fetchVocabItems, logActivity, PbUser, VocabItem, VocabUnit } from './pb'

// Shared coin storage (same key as Mathe-Held & Spielecke)
const SK_COINS = 'lernheld-v1-coins'
const loadCoins = (): number => { try { return Math.max(0, parseInt(localStorage.getItem(SK_COINS) || '0') || 0) } catch { return 0 } }
const saveCoins = (v: number) => { try { localStorage.setItem(SK_COINS, String(Math.max(0, v))) } catch {} }

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
  language: string    // z.B. "en", "fr", "es" — default "en"
  vocab: VocabItem[]  // leer wenn noch nicht geladen
  itemCount?: number  // Hinweis-Anzahl von PocketBase
}

const LANG_LABELS: Record<string, { code: string; name: string }> = {
  en: { code: 'EN', name: 'Englisch' },
  fr: { code: 'FR', name: 'Französisch' },
  es: { code: 'ES', name: 'Spanisch' },
  it: { code: 'IT', name: 'Italienisch' },
}
function getLangLabel(lang: string) {
  return LANG_LABELS[lang.toLowerCase()] ?? { code: lang.toUpperCase(), name: lang.toUpperCase() }
}

function pbUnitToUnit(u: VocabUnit): Unit {
  return { id: u.id, title: u.title, subtitle: u.subtitle, emoji: u.emoji, language: u.language ?? 'en', vocab: [], itemCount: u.itemCount }
}

const UNITS_FALLBACK: Unit[] = [
  {
    id: 'unit3',
    language: 'en',
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
// SPEAKER BUTTON
// ============================================================

function SpeakerButton({ url, label }: { url?: string; label?: string }) {
  const [playing, setPlaying] = useState(false)
  if (!url) return null
  function handlePlay(e: React.MouseEvent) {
    e.stopPropagation()  // verhindert Karteikarten-Flip beim Klick
    const a = new Audio(url)
    setPlaying(true)
    a.onended = () => setPlaying(false)
    a.onerror = () => setPlaying(false)
    a.play().catch(() => setPlaying(false))
  }
  return (
    <button
      className={`speaker-btn ${playing ? 'speaker-playing' : ''}`}
      onClick={handlePlay}
      title={label ? `${label} abspielen` : 'Abspielen'}
      aria-label="Abspielen"
    >
      {playing ? '🔉' : '🔊'}
    </button>
  )
}

// ============================================================
// MODULE 1: FLIP CARDS
// ============================================================

function FlipCards({ vocab, lang, onScore, onBack }: { vocab: VocabItem[]; lang: string; onScore: (n: number) => void; onBack: () => void }) {
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
    if (knew) { setKnown(k => k + 1); onScore(2) }
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
  const langCode = getLangLabel(lang).code
  const frontLang = showEn ? langCode : 'DE'

  return (
    <div className="module">
      <Header title="Karteikarten" onBack={onBack} right={`${idx + 1} / ${cards.length}`} />
      <p className="hint">Tippe auf die Karte zum Umdrehen</p>

      <div className="flip-scene" onClick={() => setFlipped(!flipped)}>
        <div className={`flip-card ${flipped ? 'is-flipped' : ''}`}>
          <div className="flip-face flip-front">
            <span className="flip-lang">{frontLang}</span>
            {card.imageUrl && (
              <img src={card.imageUrl} alt={card.en}
                style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 8, marginBottom: 6 }} />
            )}
            <span className="flip-text">{front}</span>
            <SpeakerButton url={showEn ? card.audioLangUrl : card.audioDeUrl} label={front} />
          </div>
          <div className="flip-face flip-back">
            <span className="flip-lang">{showEn ? 'DE' : langCode}</span>
            {card.imageUrl && (
              <img src={card.imageUrl} alt={card.en}
                style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 8, marginBottom: 6 }} />
            )}
            <span className="flip-text">{back}</span>
            <SpeakerButton url={showEn ? card.audioDeUrl : card.audioLangUrl} label={back} />
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

function MatchIt({ vocab, lang, onScore, onBack }: { vocab: VocabItem[]; lang: string; onScore: (n: number) => void; onBack: () => void }) {
  const [pairs, setPairs] = useState<VocabItem[]>([])
  const [leftItems, setLeftItems] = useState<{ id: number; text: string; imageUrl?: string }[]>([])
  const [rightItems, setRightItems] = useState<{ id: number; text: string }[]>([])
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [matched, setMatched] = useState<number[]>([])
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const init = useCallback(() => {
    const chosen = pickRandom(vocab, 6)
    setPairs(chosen)
    const showEnLeft = Math.random() > 0.5
    setLeftItems(shuffle(chosen.map((v, i) => ({ id: i, text: showEnLeft ? v.en : v.de, imageUrl: showEnLeft ? v.imageUrl : undefined }))))
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
      onScore(3)
      if (newMatched.length === pairs.length) {
        setShowConfetti(true)
        onScore(5)
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
                {item.imageUrl && <img src={item.imageUrl} alt={item.text} style={{ width: '100%', maxHeight: 60, objectFit: 'contain', borderRadius: 4, marginBottom: 4, display: 'block' }} />}
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

function SpeedQuiz({ vocab, lang, onScore, onBack }: { vocab: VocabItem[]; lang: string; onScore: (n: number) => void; onBack: () => void }) {
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
            else { setShowConfetti(true); onScore(5) }
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
    ;(document.activeElement as HTMLElement)?.blur()
    if (timerRef.current) clearInterval(timerRef.current)
    if (ans === correctAnswer) {
      setFeedback('correct')
      setScore(s => s + 1)
      onScore(3)
    } else {
      setFeedback('wrong')
    }
    setTimeout(() => {
      setFeedback(null)
      const next = idx + 1
      setIdx(next)
      if (next < questions.length) setupQ(questions, next)
      else { setShowConfetti(true); onScore(5) }
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
        <span className="quiz-lang">{showEn ? getLangLabel(lang).code : 'DE'}</span>
        {q.imageUrl && (
          <img src={q.imageUrl} alt={q.en}
            style={{ width: '100%', maxHeight: 140, objectFit: 'contain', borderRadius: 8, marginBottom: 4 }} />
        )}
        <span className="quiz-word">{questionText}</span>
        <SpeakerButton url={showEn ? q.audioLangUrl : q.audioDeUrl} label={questionText} />
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

      <div className="quiz-score">✅ {score} richtig</div>
    </div>
  )
}

// ============================================================
// MODULE 4: BUCHSTABEN-SALAT
// ============================================================

// Strip leading articles for non-EN languages so the scramble is a clean single word
// e.g. "la chaise" → "chaise", "le cahier" → "cahier"
function stripArticle(word: string): string {
  return word.replace(/^(la |le |les |l'|l'|un |une |des |el |los |las |il |gli )/i, '').trim()
}

function getScrambleTarget(item: VocabItem, showEn: boolean, lang: string): string {
  if (showEn) return lang !== 'en' ? stripArticle(item.en) : item.en
  return item.de
}

function BuchstabenSalat({ vocab, lang, onScore, onBack }: { vocab: VocabItem[]; lang: string; onScore: (n: number) => void; onBack: () => void }) {
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
    // EN: random direction; non-EN: always show DE as clue, scramble the source word (article stripped)
    const enDir = lang === 'en' ? Math.random() > 0.5 : true
    setShowEn(enDir)
    const answer = getScrambleTarget(qs[i], enDir, lang)
    const letters = answer.split('')
    const mixed = shuffle(letters)
    setScrambled(mixed)
    setUserAnswer([])
    setAvailable(mixed.map(() => true))
    setFeedback(null)
  }, [lang])

  const init = useCallback(() => {
    const wordOnly = vocab.filter(v => {
      if (v.type !== 'word') return false
      if (lang === 'en') {
        return v.en.split(' ').length === 1 && v.de.split(/[,;]/).length === 1 && !v.de.includes(' ')
      } else {
        // For FR/ES/IT: strip article, result must be a single word; DE is just the clue
        const stripped = stripArticle(v.en)
        return stripped.split(' ').length === 1 && v.de.split(/[,;]/).length === 1
      }
    })
    const qs = pickRandom(wordOnly, 8)
    setQuestions(qs)
    setIdx(0)
    setScore(0)
    setShowConfetti(false)
    setupQ(qs, 0)
  }, [setupQ, vocab, lang])

  useEffect(() => { init() }, [init])

  const addLetter = (i: number) => {
    if (feedback || !available[i]) return
    const newAnswer = [...userAnswer, scrambled[i]]
    const newAvail = [...available]
    newAvail[i] = false
    setUserAnswer(newAnswer)
    setAvailable(newAvail)

    if (newAnswer.length === scrambled.length) {
      const target = getScrambleTarget(questions[idx], showEn, lang)
      if (newAnswer.join('') === target) {
        setFeedback('correct')
        setScore(s => s + 1)
        onScore(4)
        setTimeout(() => {
          const next = idx + 1
          setIdx(next)
          if (next < questions.length) setupQ(questions, next)
          else { setShowConfetti(true); onScore(5) }
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
        <span className="scramble-lang">{showEn ? 'DE' : getLangLabel(lang).code}</span>
        {showEn && q.imageUrl && (
          <img src={q.imageUrl} alt={q.en}
            style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 8, margin: '6px 0' }} />
        )}
        <span className="scramble-word">{clue}</span>
        <SpeakerButton url={showEn ? q.audioDeUrl : q.audioLangUrl} label={clue} />
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

      <div className="quiz-score">✅ {score} richtig</div>
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
// GEMINI LIVE API – AUSSPRACHE-TRAINER
// ============================================================

const LIVE_WS_URL = 'wss://lernheld.synology.me/live'

const AUSSPRACHE_PROMPT = `Du bist ein geduldiger, freundlicher Sprachlehrer für Kinder im Alter von 8-14 Jahren.
Einige Kinder haben ADHS oder Legasthenie – sei immer ermutigend, nie frustrierend.
Sprich immer auf Deutsch, ausser wenn du das Vokabular in der Lernsprache vorliest.
Ablauf: Sprich das Wort klar in der Lernsprache vor. Höre dem Kind zu. Gib kurzes freundliches Feedback (maximal 1-2 Sätze). Entscheide selbst ob ein weiterer Versuch sinnvoll ist – maximal 2-3 Versuche. Schliesse immer positiv ab.`

function f32ToBase64Pcm(buf: Float32Array): string {
  const i16 = new Int16Array(buf.length)
  for (let i = 0; i < buf.length; i++) {
    const s = Math.max(-1, Math.min(1, buf[i]))
    i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  const bytes = new Uint8Array(i16.buffer)
  let b = ''; for (let i = 0; i < bytes.length; i++) b += String.fromCharCode(bytes[i])
  return btoa(b)
}

function buildPcmWav(chunks: string[], rate = 24000): Blob {
  const parts = chunks.map(c => Uint8Array.from(atob(c), x => x.charCodeAt(0)))
  const len = parts.reduce((s, p) => s + p.length, 0)
  const pcm = new Uint8Array(len); let off = 0
  for (const p of parts) { pcm.set(p, off); off += p.length }
  const h = new ArrayBuffer(44); const v = new DataView(h)
  const wr = (pos: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(pos + i, s.charCodeAt(i)) }
  wr(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true)
  wr(8, 'WAVE'); wr(12, 'fmt '); v.setUint32(16, 16, true)
  v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true)
  v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  wr(36, 'data'); v.setUint32(40, pcm.length, true)
  return new Blob([h, pcm], { type: 'audio/wav' })
}

type TrainerPhase = 'connecting' | 'intro' | 'mic-ready' | 'recording' | 'processing' | 'feedback' | 'done' | 'error'

function AusspracheTrainer({ vocab, lang, onScore, onBack }: {
  vocab: VocabItem[]; lang: string; onScore: (n: number, mode?: string) => void; onBack: () => void
}) {
  const [phase, setPhase] = useState<TrainerPhase>('connecting')
  const [wordIdx, setWordIdx] = useState(0)
  const [errMsg, setErrMsg] = useState('')

  const wsRef = useRef<WebSocket | null>(null)
  const chunksRef = useRef<string[]>([])
  const stopRecRef = useRef<(() => void) | null>(null)
  const phaseRef = useRef<TrainerPhase>('connecting')
  const wordIdxRef = useRef(0)
  const scoreRef = useRef(0)
  const closingRef = useRef(false)
  const sendWordRef = useRef<((idx: number) => void) | null>(null)

  const setP = (p: TrainerPhase) => { phaseRef.current = p; setPhase(p) }
  const langName = getLangLabel(lang).name
  const words = vocab.filter(v => v.en && v.de)

  useEffect(() => {
    if (words.length === 0) { setP('done'); return }
    const ws = new WebSocket(LIVE_WS_URL)
    wsRef.current = ws

    const sendWord = (idx: number) => {
      const word = words[idx]; if (!word) return
      ws.send(JSON.stringify({
        clientContent: {
          turns: [{ role: 'user', parts: [{ text: `Sprich das Wort "${word.en}" auf ${langName} vor. Auf Deutsch bedeutet es "${word.de}".` }] }],
          turnComplete: true
        }
      }))
      wordIdxRef.current = idx; setWordIdx(idx); setP('intro')
    }
    sendWordRef.current = sendWord

    ws.onopen = () => {
      ws.send(JSON.stringify({
        setup: {
          model: 'models/gemini-2.5-flash-native-audio-latest',
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } }
          },
          systemInstruction: { parts: [{ text: AUSSPRACHE_PROMPT }] }
        }
      }))
    }

    ws.onmessage = async (ev) => {
      try {
        // Gemini-2.5-flash-native-audio sendet Binary-Frames → zuerst in Text konvertieren
        let text: string
        if (typeof ev.data === 'string') {
          text = ev.data
        } else if (ev.data instanceof Blob) {
          text = await ev.data.text()
        } else if (ev.data instanceof ArrayBuffer) {
          text = new TextDecoder().decode(ev.data)
        } else {
          return
        }
        const msg = JSON.parse(text)
        if (msg.setupComplete) { sendWord(0); return }
        if (msg.serverContent?.modelTurn?.parts) {
          for (const p of msg.serverContent.modelTurn.parts) {
            if (p.inlineData?.data) chunksRef.current.push(p.inlineData.data)
          }
        }
        if (msg.serverContent?.turnComplete) {
          const chunks = [...chunksRef.current]; chunksRef.current = []
          if (chunks.length > 0) {
            const blob = buildPcmWav(chunks, 24000)
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            audio.onended = () => URL.revokeObjectURL(url)
            audio.play().catch(console.error)
          }
          setP(phaseRef.current === 'intro' ? 'mic-ready' : 'feedback')
        }
      } catch { /* ignoriere Parse-Fehler */ }
    }

    ws.onerror = (e) => { console.error('[live] WS error', e); setP('error'); setErrMsg('Verbindungsfehler. Bitte erneut versuchen.') }
    ws.onclose = (e) => { console.warn('[live] WS closed', e.code, e.reason); if (!closingRef.current && phaseRef.current !== 'done') { setP('error'); setErrMsg(`Verbindung getrennt (Code ${e.code}${e.reason ? ': ' + e.reason : ''}).`) } }

    return () => { closingRef.current = true; ws.close(); stopRecRef.current?.() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMicDown = async () => {
    if (phaseRef.current !== 'mic-ready' && phaseRef.current !== 'feedback') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new AudioContext({ sampleRate: 16000 })
      const src = ctx.createMediaStreamSource(stream)
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const proc = ctx.createScriptProcessor(4096, 1, 1)
      wsRef.current?.send(JSON.stringify({ realtimeInput: { activityStart: {} } }))
      proc.onaudioprocess = (e) => {
        const b64 = f32ToBase64Pcm(e.inputBuffer.getChannelData(0))
        wsRef.current?.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: b64 }] } }))
      }
      src.connect(proc); proc.connect(ctx.destination); setP('recording')
      stopRecRef.current = () => { proc.disconnect(); src.disconnect(); stream.getTracks().forEach(t => t.stop()); ctx.close(); stopRecRef.current = null }
    } catch { setErrMsg('Mikrofon nicht verfügbar. Bitte Berechtigung erteilen.'); setP('error') }
  }

  const handleMicUp = () => {
    if (phaseRef.current !== 'recording') return
    stopRecRef.current?.()
    wsRef.current?.send(JSON.stringify({ realtimeInput: { activityEnd: {} } }))
    setP('processing')
  }

  const handleNext = () => {
    const next = wordIdxRef.current + 1
    scoreRef.current += 1
    if (next >= words.length) {
      closingRef.current = true; wsRef.current?.close()
      setP('done'); onScore(scoreRef.current * 2, 'pronunciation')
    } else {
      sendWordRef.current?.(next)
    }
  }

  const cur = words[wordIdx]

  if (phase === 'done') return (
    <div className="content" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🎉</div>
      <h2>Super gemacht!</h2>
      <p style={{ color: 'var(--text-dim)' }}>{words.length} Wörter geübt</p>
      <button className="btn-primary" style={{ marginTop: '1.5rem', fontFamily: 'var(--font-main)' }} onClick={onBack}>← Zurück zum Menü</button>
    </div>
  )

  if (phase === 'error') return (
    <div className="content" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>😕</div>
      <p>{errMsg}</p>
      <button className="btn-secondary" style={{ marginTop: '1rem', fontFamily: 'var(--font-main)' }} onClick={onBack}>← Zurück</button>
    </div>
  )

  return (
    <div className="content">
      <Header title="🎤 Aussprache" onBack={onBack} right={`${wordIdx + 1} / ${words.length}`} />

      <div style={{ textAlign: 'center', padding: '1.5rem 1rem 1rem' }}>
        {cur?.imageUrl && (
          <img src={cur.imageUrl} alt={cur.en}
            style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 16, display: 'block', margin: '0 auto 1rem' }} />
        )}
        <p style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.25rem', fontFamily: 'var(--font-main)' }}>{cur?.en}</p>
        <p style={{ color: 'var(--text-dim)', margin: 0 }}>{cur?.de}</p>
      </div>

      <div style={{ textAlign: 'center', minHeight: '2.5rem', marginBottom: '1.5rem', fontFamily: 'var(--font-main)' }}>
        {phase === 'connecting' && <p style={{ color: 'var(--text-dim)' }}>🔌 Verbinde mit KI...</p>}
        {phase === 'intro'      && <p style={{ color: 'var(--text-dim)' }}>🔊 KI spricht vor...</p>}
        {phase === 'mic-ready'  && <p>👇 Halte den Button und sprich nach!</p>}
        {phase === 'recording'  && <p style={{ color: '#ef4444', fontWeight: 600 }}>🔴 Aufnahme läuft...</p>}
        {phase === 'processing' && <p style={{ color: 'var(--text-dim)' }}>⏳ KI wertet aus...</p>}
        {phase === 'feedback'   && <p style={{ color: 'var(--text-dim)' }}>🔊 Feedback...</p>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        {(phase === 'mic-ready' || phase === 'recording' || phase === 'feedback') && (
          <button
            className={`mic-btn${phase === 'recording' ? ' mic-btn--active' : ''}`}
            onMouseDown={handleMicDown}
            onMouseUp={handleMicUp}
            onMouseLeave={handleMicUp}
            onTouchStart={e => { e.preventDefault(); handleMicDown() }}
            onTouchEnd={e => { e.preventDefault(); handleMicUp() }}
          >
            🎙️
          </button>
        )}
        {phase === 'feedback' && (
          <button className="btn-secondary" style={{ fontFamily: 'var(--font-main)' }} onClick={handleNext}>
            Weiter →
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// MAIN APP
// ============================================================

type View = 'menu' | 'flip' | 'match' | 'speed' | 'scramble' | 'pronunciation'

const GAMES = [
  { id: 'flip' as View,         title: 'Karteikarten',    emoji: '🃏', desc: 'Flip & learn',           gradient: 'linear-gradient(135deg, #f472b6, #e879f9)' },
  { id: 'match' as View,        title: 'Match-It',        emoji: '🔗', desc: 'Paare verbinden',        gradient: 'linear-gradient(135deg, #60a5fa, #818cf8)' },
  { id: 'speed' as View,        title: 'Speed-Quiz',      emoji: '⚡', desc: 'Schnell antworten',      gradient: 'linear-gradient(135deg, #fbbf24, #f97316)' },
  { id: 'scramble' as View,     title: 'Buchstaben-Salat',emoji: '🔤', desc: 'Wörter zusammensetzen',  gradient: 'linear-gradient(135deg, #34d399, #2dd4bf)' },
  { id: 'pronunciation' as View,title: 'Aussprache',      emoji: '🎤', desc: 'Mit KI üben',            gradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)' },
]

function App() {
  const [view, setView] = useState<View>('menu')
  const [units, setUnits] = useState<Unit[]>(UNITS_FALLBACK)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [loadingVocab, setLoadingVocab] = useState(false)
  const [coins, setCoins] = useState(loadCoins)
  const [totalScore, setTotalScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [levelUp, setLevelUp] = useState(false)
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
      setLevel(Math.floor(serverXp / 120) + 1)
      // Units von PocketBase laden (gleich wie handleLogin)
      fetchVocabUnits(saved.token, UNITS_FALLBACK.map(u => ({ id: u.id, title: u.title, subtitle: u.subtitle, emoji: u.emoji, targetUser: '' }))).then(pbUnits => {
        const loaded = pbUnits.map(pbUnitToUnit)
        setUnits(loaded)
        if (loaded.length === 1) {
          fetchVocabItems(saved.token, loaded[0].id).then(items => {
            setSelectedUnit({ ...loaded[0], vocab: items })
          }).catch(() => setSelectedUnit(loaded[0]))
        }
        // Bei mehreren Units: UnitPicker erscheint (selectedUnit bleibt null)
      }).catch(() => {
        // PB nicht erreichbar: kein Auto-Select → UnitPicker zeigt Fallback
      })
    }
    // Kein savedAuth → LoginScreen wird angezeigt (kein Auto-Select nötig)
  }, [])

  // Debounced sync to server on coins/score change
  useEffect(() => {
    if (!pbUser) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      syncToServer(pbUser, coins, totalScore, Math.floor(totalScore / 120) + 1)
    }, 3000)
  }, [coins, totalScore, pbUser])

  const handleLogin = (user: PbUser) => {
    setPbUser(user)
    const serverCoins = user.coins ?? 0
    const serverXp = user.xp ?? 0
    setCoins(serverCoins); saveCoins(serverCoins)
    setTotalScore(serverXp)
    setLevel(Math.floor(serverXp / 120) + 1)
    // Dynamische Einheiten von PocketBase laden
    fetchVocabUnits(user.token, UNITS_FALLBACK.map(u => ({ id: u.id, title: u.title, subtitle: u.subtitle, emoji: u.emoji, targetUser: '' }))).then(pbUnits => {
      const loaded = pbUnits.map(pbUnitToUnit)
      setUnits(loaded)
      if (loaded.length === 1) {
        fetchVocabItems(user.token, loaded[0].id).then(items => {
          setSelectedUnit({ ...loaded[0], vocab: items })
        }).catch(() => setSelectedUnit(loaded[0]))
      }
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
    setSelectedUnit(null)
  }

  if (!pbUser) return <LoginScreen onLogin={handleLogin} />
  if (loadingVocab) return (
    <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ fontSize: '1.3rem', color: 'var(--text-muted)' }}>⏳ Lade Wörter...</p>
    </div>
  )
  if (!selectedUnit) return <UnitPicker units={units} onSelect={handleSelectUnit} />

  // addCoins: verdient Münzen + erhöht XP für Level-Progression
  const addCoins = (pts: number, gameMode?: View) => {
    setCoins(prev => { const n = Math.max(0, prev + pts); saveCoins(n); return n })
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
        coins_earned: pts,
      })
    }
  }

  const goMenu = () => setView('menu')

  if (view !== 'menu') {
    return (
      <div className="app">
        {levelUp && <div className="level-up-toast">🎉 Level {level}!</div>}
        <div className="top-bar">
          <span className="top-score">🪙 {coins}</span>
          <span className="top-level">Lvl {level}</span>
        </div>
        {view === 'flip'         && <FlipCards vocab={selectedUnit.vocab} lang={selectedUnit.language} onScore={addCoins} onBack={goMenu} />}
        {view === 'match'        && <MatchIt vocab={selectedUnit.vocab} lang={selectedUnit.language} onScore={addCoins} onBack={goMenu} />}
        {view === 'speed'        && <SpeedQuiz vocab={selectedUnit.vocab} lang={selectedUnit.language} onScore={addCoins} onBack={goMenu} />}
        {view === 'scramble'     && <BuchstabenSalat vocab={selectedUnit.vocab} lang={selectedUnit.language} onScore={addCoins} onBack={goMenu} />}
        {view === 'pronunciation'&& <AusspracheTrainer vocab={selectedUnit.vocab} lang={selectedUnit.language} onScore={addCoins} onBack={goMenu} />}
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
          <div className="stat-pill">🪙 {coins} Münzen</div>
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

      <p className="footer-text">{selectedUnit.vocab.length} Vokabeln · {getLangLabel(selectedUnit.language).name} ↔ Deutsch</p>
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
