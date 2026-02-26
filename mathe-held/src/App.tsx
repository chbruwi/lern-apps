import { useState, useCallback, useRef } from 'react'
import './App.css'

// ============================================================
// TYPES
// ============================================================
type Screen = 'menu' | 'blitz' | 'luecke' | 'wahrfalsch' | 'sprint' | 'complete'

interface Problem {
  a: number      // linker Operand
  b: number      // rechter Operand
  op: '+' | '-'
  result: number // a op b = result
}

interface GameResult {
  game: Screen
  score: number
  total: number
}

interface GameProps {
  onFinish: (game: Screen, score: number, total: number) => void
  onBack: () => void
  onXp: (amount: number) => void
}

// ============================================================
// MATH GENERATION – zehnerübergreifend
// ============================================================
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeZehnerubergreifend(): Problem {
  for (let i = 0; i < 200; i++) {
    if (Math.random() > 0.4) {
      // Addition: a + b = r, überquert GENAU eine Zehnerstelle
      // r muss in der nächsten Zehngruppe liegen (nextTen bis nextTen+9)
      const a = rand(2, 89)
      if (a % 10 === 0) continue
      const nextTen = Math.ceil((a + 1) / 10) * 10
      const minB = nextTen - a          // kleinster Wert um die Zehn zu überqueren
      const maxB = nextTen + 9 - a     // größter Wert der nur EINE Zehn überquert
      if (maxB > 100 - a) continue     // kein Überlauf
      if (maxB < minB) continue
      const b = rand(minB, maxB)
      const r = a + b
      // Sicherheitscheck: genau eine Zehnerstelle überquert
      if (Math.abs(Math.floor(r / 10) - Math.floor(a / 10)) !== 1) continue
      return { a, b, op: '+', result: r }
    } else {
      // Subtraktion: a - b = r, überquert GENAU eine Zehnerstelle
      // r muss in der vorherigen Zehngruppe liegen (prevTen-10 bis prevTen-1)
      const a = rand(12, 99)
      if (a % 10 === 0) continue
      const prevTen = Math.floor(a / 10) * 10
      const minB = a - prevTen + 1     // kleinster Wert um die Zehn zu unterqueren
      const maxB = a - (prevTen - 10)  // größter Wert der nur EINE Zehn unterquert
      if (prevTen - 10 < 0) continue
      if (maxB < minB) continue
      const b = rand(minB, maxB)
      const r = a - b
      if (r <= 0) continue
      // Sicherheitscheck: genau eine Zehnerstelle überquert
      if (Math.abs(Math.floor(r / 10) - Math.floor(a / 10)) !== 1) continue
      return { a, b, op: '-', result: r }
    }
  }
  return { a: 27, b: 8, op: '+', result: 35 }
}

function uniqueProblems(n: number): Problem[] {
  const seen = new Set<string>()
  const result: Problem[] = []
  let tries = 0
  while (result.length < n && tries < n * 20) {
    tries++
    const p = makeZehnerubergreifend()
    const key = `${p.a}${p.op}${p.b}`
    if (!seen.has(key)) { seen.add(key); result.push(p) }
  }
  return result
}

// ============================================================
// XP / LEVEL
// ============================================================
const XP_PER_LEVEL = 60
const getLevel = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1
const getXpInLevel = (xp: number) => xp % XP_PER_LEVEL
const getLevelEmoji = (level: number) => {
  const emojis = ['🌱', '⭐', '🌟', '💫', '🦸', '🚀', '🏆', '👑', '🌈', '🦄']
  return emojis[Math.min(level - 1, emojis.length - 1)]
}

// ============================================================
// CONFETTI
// ============================================================
function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    left: `${rand(0, 100)}%`,
    bg: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#A06CD5', '#FF8A5C', '#2ECC71'][i % 6],
    delay: `${(i * 0.08).toFixed(2)}s`,
    dur: `${(2 + Math.random() * 1.5).toFixed(2)}s`,
  }))
  return (
    <div className="confetti-container" aria-hidden>
      {pieces.map((p, i) => (
        <div key={i} className="confetti-piece"
          style={{ left: p.left, background: p.bg, animationDelay: p.delay, animationDuration: p.dur }} />
      ))}
    </div>
  )
}

// ============================================================
// LEVEL UP OVERLAY
// ============================================================
function LevelUpOverlay({ level }: { level: number }) {
  return (
    <div className="level-up-overlay" aria-live="polite">
      <div className="level-up-content">
        {getLevelEmoji(level)} Level {level}!
      </div>
    </div>
  )
}

// ============================================================
// BLITZ-RECHNEN  (Ergebnis eintippen)
// ============================================================
const BLITZ_TOTAL = 15

function BlitzRechnen({ onFinish, onBack, onXp }: GameProps) {
  const [problems] = useState(() => uniqueProblems(BLITZ_TOTAL))
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [score, setScore] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const p = problems[idx]

  function check() {
    if (feedback) return
    const val = parseInt(input)
    if (isNaN(val)) return
    const correct = val === p.result
    const newScore = correct ? score + 1 : score
    if (correct) { setScore(newScore); onXp(5) }
    setFeedback(correct ? 'correct' : 'wrong')
    setTimeout(() => {
      setFeedback(null)
      setInput('')
      const next = idx + 1
      if (next >= BLITZ_TOTAL) {
        onFinish('blitz', newScore, BLITZ_TOTAL)
      } else {
        setIdx(next)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }, correct ? 650 : 1100)
  }

  return (
    <div className="game-module">
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>⚡ Blitz-Rechnen</h2>
        <div className="moves-counter">{idx + 1}/{BLITZ_TOTAL}</div>
      </div>
      <p className="game-desc">Tippe das Ergebnis ein!</p>

      <div className={`equation-display ${feedback || ''}`}>
        <span className="eq-num">{p.a}</span>
        <span className="eq-op">{p.op}</span>
        <span className="eq-num">{p.b}</span>
        <span className="eq-op">=</span>
        <span className="eq-question">?</span>
      </div>

      <div className="input-row">
        <input
          ref={inputRef}
          className={`number-input ${feedback || ''}`}
          type="number"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && check()}
          placeholder="?"
          autoFocus
          disabled={!!feedback}
          min={0}
          max={100}
        />
        <button className="check-btn" onClick={check} disabled={!input || !!feedback}>
          ✓
        </button>
      </div>

      {feedback && (
        <div className={`feedback-msg ${feedback}`}>
          {feedback === 'correct' ? '✅ Richtig! +5 XP' : `❌ Es wäre ${p.result} gewesen`}
        </div>
      )}

      <div className="score-mini">⭐ {score} von {BLITZ_TOTAL}</div>
    </div>
  )
}

// ============================================================
// LÜCKEN-DETEKTIV  (fehlende Zahl finden)
// ============================================================
const LUECKE_TOTAL = 12
type MissingPos = 'left' | 'right'

interface LueckeProblem {
  problem: Problem
  missing: MissingPos
  answer: number
}

function makeLueckeProblem(p: Problem): LueckeProblem {
  const missing: MissingPos = Math.random() > 0.5 ? 'left' : 'right'
  // answer ist immer der versteckte Operand
  const answer = missing === 'left' ? p.a : p.b
  return { problem: p, missing, answer }
}

function LueckenDetektiv({ onFinish, onBack, onXp }: GameProps) {
  const [luecken] = useState(() => uniqueProblems(LUECKE_TOTAL).map(makeLueckeProblem))
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [score, setScore] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const lp = luecken[idx]
  const p = lp.problem

  function check() {
    if (feedback) return
    const val = parseInt(input)
    if (isNaN(val)) return
    const correct = val === lp.answer
    const newScore = correct ? score + 1 : score
    if (correct) { setScore(newScore); onXp(6) }
    setFeedback(correct ? 'correct' : 'wrong')
    setTimeout(() => {
      setFeedback(null)
      setInput('')
      const next = idx + 1
      if (next >= LUECKE_TOTAL) {
        onFinish('luecke', newScore, LUECKE_TOTAL)
      } else {
        setIdx(next)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }, correct ? 650 : 1100)
  }

  const gap = <span className="eq-gap">?</span>
  const leftEl = lp.missing === 'left' ? gap : <span className="eq-num">{p.a}</span>
  const rightEl = lp.missing === 'right' ? gap : <span className="eq-num">{p.b}</span>

  return (
    <div className="game-module">
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>🔍 Lücken-Detektiv</h2>
        <div className="moves-counter">{idx + 1}/{LUECKE_TOTAL}</div>
      </div>
      <p className="game-desc">Welche Zahl gehört in die Lücke?</p>

      <div className={`equation-display ${feedback || ''}`}>
        {leftEl}
        <span className="eq-op">{p.op}</span>
        {rightEl}
        <span className="eq-op">=</span>
        <span className="eq-result">{p.result}</span>
      </div>

      <div className="input-row">
        <input
          ref={inputRef}
          className={`number-input ${feedback || ''}`}
          type="number"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && check()}
          placeholder="?"
          autoFocus
          disabled={!!feedback}
          min={0}
          max={100}
        />
        <button className="check-btn" onClick={check} disabled={!input || !!feedback}>
          ✓
        </button>
      </div>

      {feedback && (
        <div className={`feedback-msg ${feedback}`}>
          {feedback === 'correct' ? '✅ Richtig! +6 XP' : `❌ Die Antwort wäre ${lp.answer}`}
        </div>
      )}

      <div className="score-mini">⭐ {score} von {LUECKE_TOTAL}</div>
    </div>
  )
}

// ============================================================
// RICHTIG ODER FALSCH?
// ============================================================
const WF_TOTAL = 12

interface WFProblem {
  problem: Problem
  shown: number
  isCorrect: boolean
}

function makeWFProblem(p: Problem): WFProblem {
  const isCorrect = Math.random() > 0.5
  let shown = p.result
  if (!isCorrect) {
    const offsets = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]
      .filter(o => p.result + o > 0 && p.result + o <= 100)
    shown = p.result + offsets[Math.floor(Math.random() * offsets.length)]
  }
  return { problem: p, shown, isCorrect }
}

function RichtigFalsch({ onFinish, onBack, onXp }: GameProps) {
  const [wfList] = useState(() => shuffle(uniqueProblems(WF_TOTAL).map(makeWFProblem)))
  const [idx, setIdx] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [lastAnswer, setLastAnswer] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)

  const wf = wfList[idx]
  const p = wf.problem

  function answer(isRichtig: boolean) {
    if (feedback) return
    setLastAnswer(isRichtig)
    const correct = isRichtig === wf.isCorrect
    const newScore = correct ? score + 1 : score
    if (correct) { setScore(newScore); onXp(4) }
    setFeedback(correct ? 'correct' : 'wrong')
    setTimeout(() => {
      setFeedback(null)
      setLastAnswer(null)
      const next = idx + 1
      if (next >= WF_TOTAL) {
        onFinish('wahrfalsch', newScore, WF_TOTAL)
      } else {
        setIdx(next)
      }
    }, 1000)
  }

  return (
    <div className="game-module">
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>✅ Richtig oder Falsch?</h2>
        <div className="moves-counter">{idx + 1}/{WF_TOTAL}</div>
      </div>
      <p className="game-desc">Stimmt diese Rechnung?</p>

      <div className={`equation-display ${feedback || ''}`}>
        <span className="eq-num">{p.a}</span>
        <span className="eq-op">{p.op}</span>
        <span className="eq-num">{p.b}</span>
        <span className="eq-op">=</span>
        <span className={`eq-num ${!wf.isCorrect ? 'eq-wrong' : ''}`}>{wf.shown}</span>
      </div>

      <div className="wf-buttons">
        <button
          className={`wf-btn wf-richtig${feedback && lastAnswer === true ? (wf.isCorrect ? ' correct-btn' : ' wrong-btn') : ''}`}
          onClick={() => answer(true)}
          disabled={!!feedback}
        >
          ✅ Richtig
        </button>
        <button
          className={`wf-btn wf-falsch${feedback && lastAnswer === false ? (!wf.isCorrect ? ' correct-btn' : ' wrong-btn') : ''}`}
          onClick={() => answer(false)}
          disabled={!!feedback}
        >
          ❌ Falsch
        </button>
      </div>

      {feedback && (
        <div className={`feedback-msg ${feedback}`}>
          {feedback === 'correct'
            ? `✅ Genau! ${wf.isCorrect ? `${p.a} ${p.op} ${p.b} = ${p.result}` : 'Die Rechnung war falsch!'}`
            : `❌ Falsch! ${wf.isCorrect ? `${p.a} ${p.op} ${p.b} = ${p.result} stimmt` : `Das Ergebnis wäre ${p.result}`}`}
        </div>
      )}

      <div className="score-mini">⭐ {score} von {WF_TOTAL}</div>
    </div>
  )
}

// ============================================================
// ZAHLEN-SPRINT  (Multiple Choice)
// ============================================================
const SPRINT_TOTAL = 12

interface SprintProblem {
  target: number
  correct: Problem
  options: Problem[]
}

function makeSprintProblem(p: Problem): SprintProblem {
  const distractors: Problem[] = []
  let tries = 0
  while (distractors.length < 3 && tries < 60) {
    tries++
    const d = makeZehnerubergreifend()
    if (d.result !== p.result && !distractors.find(x => x.result === d.result)) {
      distractors.push(d)
    }
  }
  return { target: p.result, correct: p, options: shuffle([p, ...distractors]) }
}

function ZahlenSprint({ onFinish, onBack, onXp }: GameProps) {
  const [sprints] = useState(() => uniqueProblems(SPRINT_TOTAL).map(makeSprintProblem))
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [score, setScore] = useState(0)

  const sp = sprints[idx]

  function pick(i: number) {
    if (feedback) return
    setSelected(i)
    const correct = sp.options[i].result === sp.target
    const newScore = correct ? score + 1 : score
    if (correct) { setScore(newScore); onXp(5) }
    setFeedback(correct ? 'correct' : 'wrong')
    setTimeout(() => {
      setFeedback(null)
      setSelected(null)
      const next = idx + 1
      if (next >= SPRINT_TOTAL) {
        onFinish('sprint', newScore, SPRINT_TOTAL)
      } else {
        setIdx(next)
      }
    }, 950)
  }

  return (
    <div className="game-module">
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>🎯 Zahlen-Sprint</h2>
        <div className="moves-counter">{idx + 1}/{SPRINT_TOTAL}</div>
      </div>
      <p className="game-desc">Welche Rechnung ergibt dieses Ergebnis?</p>

      <div className="sprint-target">
        <span className="sprint-equals">=</span>
        <span className="sprint-number">{sp.target}</span>
      </div>

      <div className="sprint-options">
        {sp.options.map((opt, i) => {
          let cls = 'sprint-btn'
          if (feedback) {
            if (opt.result === sp.target) cls += ' correct-btn'
            else if (selected === i) cls += ' wrong-btn'
          }
          return (
            <button key={i} className={cls} onClick={() => pick(i)} disabled={!!feedback}>
              {opt.a} {opt.op} {opt.b}
            </button>
          )
        })}
      </div>

      {feedback && (
        <div className={`feedback-msg ${feedback}`}>
          {feedback === 'correct'
            ? '🎯 Treffer! +5 XP'
            : `❌ Richtig wäre: ${sp.correct.a} ${sp.correct.op} ${sp.correct.b}`}
        </div>
      )}

      <div className="score-mini">⭐ {score} von {SPRINT_TOTAL}</div>
    </div>
  )
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [xp, setXp] = useState(0)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [result, setResult] = useState<GameResult | null>(null)

  const level = getLevel(xp)
  const xpInLevel = getXpInLevel(xp)

  const addXp = useCallback((amount: number) => {
    setXp(prev => {
      const next = prev + amount
      if (getLevel(next) > getLevel(prev)) {
        setShowLevelUp(true)
        setTimeout(() => setShowLevelUp(false), 2000)
      }
      return next
    })
  }, [])

  const handleFinish = useCallback((game: Screen, score: number, total: number) => {
    addXp(score * 5)
    setResult({ game, score, total })
    if (score === total) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3500)
    }
    setScreen('complete')
  }, [addXp])

  const GAMES = [
    { id: 'blitz' as Screen, emoji: '⚡', title: 'Blitz-Rechnen', desc: 'Tippe das Ergebnis ein!', color: '#FFE66D' },
    { id: 'luecke' as Screen, emoji: '🔍', title: 'Lücken-Detektiv', desc: 'Finde die fehlende Zahl!', color: '#4ECDC4' },
    { id: 'wahrfalsch' as Screen, emoji: '✅', title: 'Richtig oder Falsch?', desc: 'Stimmt die Rechnung?', color: '#A06CD5' },
    { id: 'sprint' as Screen, emoji: '🎯', title: 'Zahlen-Sprint', desc: 'Wähle die richtige Rechnung!', color: '#FF8A5C' },
  ]

  const gameProps: GameProps = { onFinish: handleFinish, onBack: () => setScreen('menu'), onXp: addXp }

  return (
    <div className="app-container">
      {showConfetti && <Confetti />}
      {showLevelUp && <LevelUpOverlay level={level} />}

      {screen === 'menu' && (
        <>
          <header className="app-header">
            <h1 className="app-title">
              <span className="title-emoji">🦸</span> Mathe-Held
            </h1>
            <div className="score-bar">
              <div className="score-display">
                <span className="score-star">⭐</span>
                <span className="score-number">{xp}</span>
                <span className="score-label">XP</span>
              </div>
              <div className="level-badge">{getLevelEmoji(level)} Level {level}</div>
            </div>
            <div className="xp-bar-container">
              <div className="xp-bar" style={{ width: `${(xpInLevel / XP_PER_LEVEL) * 100}%` }} />
            </div>
          </header>

          <p className="menu-subtitle">Rechnen bis 100 – zehnerübergreifend 🔢</p>

          <div className="game-grid">
            {GAMES.map(g => (
              <button
                key={g.id}
                className="game-card"
                style={{ '--card-color': g.color } as React.CSSProperties}
                onClick={() => setScreen(g.id)}
              >
                <span className="game-card-emoji">{g.emoji}</span>
                <div className="game-card-title">{g.title}</div>
                <div className="game-card-desc">{g.desc}</div>
              </button>
            ))}
          </div>

          <footer className="app-footer">Viel Spass, Andrin! 🎉</footer>
        </>
      )}

      {screen === 'blitz' && <BlitzRechnen {...gameProps} />}
      {screen === 'luecke' && <LueckenDetektiv {...gameProps} />}
      {screen === 'wahrfalsch' && <RichtigFalsch {...gameProps} />}
      {screen === 'sprint' && <ZahlenSprint {...gameProps} />}

      {screen === 'complete' && result && (
        <div className="game-complete-screen">
          {showConfetti && <Confetti />}
          <div className="game-complete">
            {result.score === result.total ? (
              <>
                <div className="complete-trophy">🏆</div>
                <h3>Perfekt!</h3>
                <p className="perfect-msg">Alle {result.total} richtig!<br />Du bist ein echter Mathe-Held!</p>
              </>
            ) : result.score >= Math.ceil(result.total * 0.7) ? (
              <>
                <div className="complete-trophy">⭐</div>
                <h3>Gut gemacht!</h3>
                <p>{result.score} von {result.total} richtig</p>
              </>
            ) : (
              <>
                <div className="complete-trophy">💪</div>
                <h3>Weiter üben!</h3>
                <p>{result.score} von {result.total} – du schaffst das!</p>
              </>
            )}
            <p className="xp-gained">+{result.score * 5} XP verdient!</p>
            <div className="complete-buttons">
              <button className="play-again-btn" onClick={() => setScreen(result.game)}>
                Nochmal!
              </button>
              <button className="back-to-menu-btn" onClick={() => setScreen('menu')}>
                Zum Menü
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
