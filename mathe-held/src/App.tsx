import { useState, useCallback, useRef, useEffect } from 'react'
import './App.css'
import { getSavedAuth, loginWithCode, syncToServer, logout, PbUser } from './pb'

// ============================================================
// TYPES
// ============================================================
type Screen = 'menu' | 'blitz' | 'luecke' | 'wahrfalsch' | 'sprint' | 'complete' | 'schatzkiste' | 'duell'

interface Problem {
  a: number; b: number; op: '+' | '-' | '×' | '÷'; result: number
}
interface GameResult {
  game: Screen; score: number; total: number; coinsEarned: number
}

// ============================================================
// MATH UNITS – von Eltern definierbar
// ============================================================
// Neue Einheiten hier anhängen! Dann npm run build und deployen.
// ============================================================
type Operation = 'add' | 'sub' | 'mul' | 'div'
interface MathUnit {
  id: string
  title: string       // z.B. "Plus & Minus"
  subtitle: string    // z.B. "Zehnerübergreifend bis 100"
  emoji: string
  operations: Operation[]
  maxNumber: number   // für add/sub: max Ergebnis; für mul/div: max Tabellenzahl
  tableOf?: number[]  // Einmaleins-Reihen, z.B. [2, 5, 10]
}

const MATH_UNITS: MathUnit[] = [
  {
    id: 'plus-minus-100',
    title: 'Plus & Minus',
    subtitle: 'Zehnerübergreifend bis 100',
    emoji: '➕',
    operations: ['add', 'sub'],
    maxNumber: 100,
  },
  // Neue Einheiten einfach hier anhängen ↓
  // {
  //   id: 'einmaleins',
  //   title: 'Mal-Einmaleins',
  //   subtitle: '2er bis 10er Reihe',
  //   emoji: '✖️',
  //   operations: ['mul'],
  //   maxNumber: 10,
  //   tableOf: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  // },
  // {
  //   id: 'division',
  //   title: 'Teilen',
  //   subtitle: 'Einfache Division',
  //   emoji: '➗',
  //   operations: ['div'],
  //   maxNumber: 10,
  //   tableOf: [2, 5, 10],
  // },
  // {
  //   id: 'gemischt',
  //   title: 'Mal & Teilen',
  //   subtitle: 'Einmaleins gemischt',
  //   emoji: '🔀',
  //   operations: ['mul', 'div'],
  //   maxNumber: 10,
  //   tableOf: [2, 3, 4, 5, 10],
  // },
]

interface GameProps {
  onFinish: (game: Screen, score: number, total: number, coins: number) => void
  onBack: () => void
  onXp: (amount: number) => void
  onCoins: (amount: number) => void
  difficulty: number
  unit: MathUnit
}

// ============================================================
// DIFFICULTY
// ============================================================
const getDifficulty = (level: number) => level <= 2 ? 1 : level <= 5 ? 2 : level <= 8 ? 3 : 4
const DIFFICULTY_LABELS = ['', '🌱 Starter', '⭐ Einsteiger', '🌟 Fortgeschritten', '🦸 Held']
const DIFFICULTY_COLORS = ['', '#4ECDC4', '#FFE66D', '#FF8A5C', '#FF6B6B']

// ============================================================
// MATH GENERATION
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

function makeEasy(): Problem {
  for (let i = 0; i < 100; i++) {
    const a = rand(1, 9)
    const minB = 10 - a + 1; const maxB = 19 - a
    if (maxB < minB) continue
    const b = rand(minB, maxB); const r = a + b
    if (r >= 11 && r <= 19) return { a, b, op: '+', result: r }
  }
  return { a: 7, b: 5, op: '+', result: 12 }
}

function makeMedium(): Problem {
  for (let i = 0; i < 200; i++) {
    const a = rand(1, 39)
    if (a % 10 === 0) continue
    const nextTen = Math.ceil((a + 1) / 10) * 10
    const minB = nextTen - a; const maxB = Math.min(nextTen + 9 - a, 49 - a)
    if (maxB < minB) continue
    const b = rand(minB, maxB); const r = a + b
    if (Math.abs(Math.floor(r / 10) - Math.floor(a / 10)) !== 1) continue
    return { a, b, op: '+', result: r }
  }
  return { a: 17, b: 5, op: '+', result: 22 }
}

function makeHard(): Problem {
  for (let i = 0; i < 200; i++) {
    if (Math.random() > 0.4) {
      const a = rand(1, 59)
      if (a % 10 === 0) continue
      const nextTen = Math.ceil((a + 1) / 10) * 10
      const minB = nextTen - a; const maxB = nextTen + 9 - a
      if (a + maxB > 69 || maxB < minB) continue
      const b = rand(minB, maxB); const r = a + b
      if (Math.abs(Math.floor(r / 10) - Math.floor(a / 10)) !== 1) continue
      return { a, b, op: '+', result: r }
    } else {
      const a = rand(12, 69)
      if (a % 10 === 0) continue
      const prevTen = Math.floor(a / 10) * 10
      const minB = a - prevTen + 1; const maxB = a - (prevTen - 10)
      if (prevTen - 10 < 0 || maxB < minB) continue
      const b = rand(minB, maxB); const r = a - b
      if (r <= 0) continue
      if (Math.abs(Math.floor(r / 10) - Math.floor(a / 10)) !== 1) continue
      return { a, b, op: '-', result: r }
    }
  }
  return { a: 27, b: 8, op: '+', result: 35 }
}

function makeExpert(): Problem {
  for (let i = 0; i < 200; i++) {
    if (Math.random() > 0.4) {
      const a = rand(2, 89)
      if (a % 10 === 0) continue
      const nextTen = Math.ceil((a + 1) / 10) * 10
      const minB = nextTen - a; const maxB = nextTen + 9 - a
      if (maxB > 100 - a || maxB < minB) continue
      const b = rand(minB, maxB); const r = a + b
      if (Math.abs(Math.floor(r / 10) - Math.floor(a / 10)) !== 1) continue
      return { a, b, op: '+', result: r }
    } else {
      const a = rand(12, 99)
      if (a % 10 === 0) continue
      const prevTen = Math.floor(a / 10) * 10
      const minB = a - prevTen + 1; const maxB = a - (prevTen - 10)
      if (prevTen - 10 < 0 || maxB < minB) continue
      const b = rand(minB, maxB); const r = a - b
      if (r <= 0) continue
      if (Math.abs(Math.floor(r / 10) - Math.floor(a / 10)) !== 1) continue
      return { a, b, op: '-', result: r }
    }
  }
  return { a: 27, b: 8, op: '+', result: 35 }
}

function makeProblem(difficulty: number): Problem {
  switch (difficulty) {
    case 1: return makeEasy()
    case 2: return makeMedium()
    case 3: return makeHard()
    default: return makeExpert()
  }
}

function makeMulProblem(unit: MathUnit, difficulty: number): Problem {
  const allTables = unit.tableOf ?? Array.from({ length: unit.maxNumber }, (_, i) => i + 2)
  const tables =
    difficulty === 1 ? allTables.filter(t => [2, 5, 10].includes(t)).length > 0
      ? allTables.filter(t => [2, 5, 10].includes(t)) : allTables.slice(0, 3)
    : difficulty === 2 ? allTables.filter(t => t <= 5 || t === 10).length > 0
      ? allTables.filter(t => t <= 5 || t === 10) : allTables.slice(0, Math.ceil(allTables.length / 2))
    : allTables
  const b = tables[Math.floor(Math.random() * tables.length)]
  const aMax = difficulty <= 1 ? 5 : difficulty <= 2 ? 7 : 10
  const a = rand(1, aMax)
  return { a, b, op: '×', result: a * b }
}

function makeDivProblem(unit: MathUnit, difficulty: number): Problem {
  const allTables = unit.tableOf ?? Array.from({ length: unit.maxNumber }, (_, i) => i + 2)
  const tables =
    difficulty === 1 ? allTables.filter(t => [2, 5, 10].includes(t)).length > 0
      ? allTables.filter(t => [2, 5, 10].includes(t)) : allTables.slice(0, 3)
    : difficulty === 2 ? allTables.filter(t => t <= 5 || t === 10).length > 0
      ? allTables.filter(t => t <= 5 || t === 10) : allTables.slice(0, Math.ceil(allTables.length / 2))
    : allTables
  const divisor = tables[Math.floor(Math.random() * tables.length)]
  const quotientMax = difficulty <= 1 ? 5 : difficulty <= 2 ? 7 : 10
  const quotient = rand(1, quotientMax)
  return { a: divisor * quotient, b: divisor, op: '÷', result: quotient }
}

function generateProblem(unit: MathUnit, difficulty: number): Problem {
  const hasMul = unit.operations.includes('mul')
  const hasDiv = unit.operations.includes('div')
  if (hasMul && hasDiv) return Math.random() > 0.5 ? makeMulProblem(unit, difficulty) : makeDivProblem(unit, difficulty)
  if (hasMul) return makeMulProblem(unit, difficulty)
  if (hasDiv) return makeDivProblem(unit, difficulty)
  return makeProblem(difficulty) // add/sub: bestehendes System
}

function uniqueProblems(n: number, difficulty: number, unit: MathUnit): Problem[] {
  const seen = new Set<string>(); const result: Problem[] = []
  let tries = 0
  while (result.length < n && tries < n * 30) {
    tries++
    const p = generateProblem(unit, difficulty); const key = `${p.a}${p.op}${p.b}`
    if (!seen.has(key)) { seen.add(key); result.push(p) }
  }
  return result
}

// ============================================================
// PERSISTENCE
// ============================================================
const SK_XP = 'mathe-held-v1-xp'; const SK_COINS = 'lernheld-v1-coins'
const loadXp    = (): number => { try { return parseInt(localStorage.getItem(SK_XP)    || '0') || 0 } catch { return 0 } }
const loadCoins = (): number => { try { return parseInt(localStorage.getItem(SK_COINS) || '0') || 0 } catch { return 0 } }
const saveXp    = (v: number) => { try { localStorage.setItem(SK_XP,    String(v)) } catch {} }
const saveCoins = (v: number) => { try { localStorage.setItem(SK_COINS, String(v)) } catch {} }

// ============================================================
// XP / LEVEL
// ============================================================
const XP_PER_LEVEL = 60
const getLevel      = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1
const getXpInLevel  = (xp: number) => xp % XP_PER_LEVEL
const getLevelEmoji = (level: number) => ['🌱','⭐','🌟','💫','🦸','🚀','🏆','👑','🌈','🦄'][Math.min(level-1, 9)]

// ============================================================
// NUMPAD
// ============================================================
interface NumPadProps {
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  disabled?: boolean
}

function NumPad({ value, onChange, onConfirm, disabled }: NumPadProps) {
  function press(key: string) {
    if (disabled) return
    if (key === '⌫') { onChange(value.slice(0, -1)); return }
    if (key === '✓') { if (value) onConfirm(); return }
    if (value.length >= 3) return
    onChange(value + key)
  }
  const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','✓']
  return (
    <div className="numpad">
      {keys.map(k => (
        <button key={k}
          className={`numpad-key${k==='✓'?' numpad-confirm':''}${k==='⌫'?' numpad-delete':''}`}
          onClick={() => press(k)}
          disabled={(disabled && k !== '⌫') || (k === '✓' && !value)}>
          {k}
        </button>
      ))}
    </div>
  )
}

// ============================================================
// CONFETTI + OVERLAYS
// ============================================================
function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    left: `${rand(0, 100)}%`,
    bg: ['#FF6B6B','#FFE66D','#4ECDC4','#A06CD5','#FF8A5C','#2ECC71'][i % 6],
    delay: `${(i * 0.08).toFixed(2)}s`, dur: `${(2 + Math.random() * 1.5).toFixed(2)}s`,
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

function LevelUpOverlay({ level }: { level: number }) {
  return (
    <div className="level-up-overlay"><div className="level-up-content">
      {getLevelEmoji(level)} Level {level}!
    </div></div>
  )
}

function StreakToast({ visible }: { visible: boolean }) {
  if (!visible) return null
  return <div className="streak-toast">🔥 Streak! +5 🪙</div>
}

// ============================================================
// SHARED GAME HOOK
// ============================================================
function useGameCoins(onCoins: (n: number) => void) {
  const coinsRef  = useRef(0)
  const streakRef = useRef(0)
  const [showStreak, setShowStreak] = useState(false)

  const recordCorrect = useCallback(() => {
    coinsRef.current += 3; onCoins(3)
    streakRef.current++
    if (streakRef.current % 3 === 0) {
      coinsRef.current += 5; onCoins(5)
      setShowStreak(true)
      setTimeout(() => setShowStreak(false), 900)
    }
  }, [onCoins])

  const recordWrong  = useCallback(() => { streakRef.current = 0 }, [])
  const finishCoins  = useCallback((score: number, total: number) => {
    const b = score === total ? 15 : 0
    if (b > 0) { coinsRef.current += b; onCoins(b) }
    return coinsRef.current
  }, [onCoins])

  return { recordCorrect, recordWrong, finishCoins, showStreak }
}

// ============================================================
// BLITZ-RECHNEN – mit NumPad
// ============================================================
const BLITZ_TOTAL = 10

function BlitzRechnen({ onFinish, onBack, onXp, onCoins, difficulty, unit }: GameProps) {
  const [problems]  = useState(() => uniqueProblems(BLITZ_TOTAL, difficulty, unit))
  const [idx, setIdx]       = useState(0)
  const [input, setInput]   = useState('')
  const [feedback, setFeedback] = useState<'correct'|'wrong'|null>(null)
  const [score, setScore]   = useState(0)
  const { recordCorrect, recordWrong, finishCoins, showStreak } = useGameCoins(onCoins)

  const p = problems[idx]

  function check() {
    if (feedback || !input) return
    const val = parseInt(input)
    if (isNaN(val)) return
    const correct = val === p.result
    const newScore = correct ? score + 1 : score
    if (correct) { setScore(newScore); onXp(5); recordCorrect() } else { recordWrong() }
    setFeedback(correct ? 'correct' : 'wrong')
    setTimeout(() => {
      setFeedback(null); setInput('')
      const next = idx + 1
      if (next >= BLITZ_TOTAL) onFinish('blitz', newScore, BLITZ_TOTAL, finishCoins(newScore, BLITZ_TOTAL))
      else setIdx(next)
    }, correct ? 650 : 1100)
  }

  return (
    <div className="game-module">
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>⚡ Blitz-Rechnen</h2>
        <div className="moves-counter">{idx + 1}/{BLITZ_TOTAL}</div>
      </div>
      <p className="game-desc">Was ist das Ergebnis?</p>
      <StreakToast visible={showStreak} />

      <div className={`equation-display ${feedback || ''}`}>
        <span className="eq-num">{p.a}</span>
        <span className="eq-op">{p.op}</span>
        <span className="eq-num">{p.b}</span>
        <span className="eq-op">=</span>
        <span className={`eq-question${input ? ' eq-typed' : ''}`}>{input || '?'}</span>
      </div>

      {feedback && (
        <div className={`feedback-msg ${feedback}`}>
          {feedback === 'correct' ? '✅ Richtig! +5 XP 🪙+3' : `❌ Es wäre ${p.result} gewesen`}
        </div>
      )}

      <NumPad value={input} onChange={setInput} onConfirm={check} disabled={!!feedback} />
      <div className="score-mini">⭐ {score}/{BLITZ_TOTAL}</div>
    </div>
  )
}

// ============================================================
// LÜCKEN-DETEKTIV – mit NumPad
// ============================================================
const LUECKE_TOTAL = 10
type MissingPos = 'left' | 'right'
interface LueckeProblem { problem: Problem; missing: MissingPos; answer: number }

const makeLueckeProblem = (p: Problem): LueckeProblem => {
  const missing: MissingPos = Math.random() > 0.5 ? 'left' : 'right'
  return { problem: p, missing, answer: missing === 'left' ? p.a : p.b }
}

function LueckenDetektiv({ onFinish, onBack, onXp, onCoins, difficulty, unit }: GameProps) {
  const [luecken] = useState(() => uniqueProblems(LUECKE_TOTAL, difficulty, unit).map(makeLueckeProblem))
  const [idx, setIdx]       = useState(0)
  const [input, setInput]   = useState('')
  const [feedback, setFeedback] = useState<'correct'|'wrong'|null>(null)
  const [score, setScore]   = useState(0)
  const { recordCorrect, recordWrong, finishCoins, showStreak } = useGameCoins(onCoins)

  const lp = luecken[idx]; const p = lp.problem

  function check() {
    if (feedback || !input) return
    const val = parseInt(input)
    if (isNaN(val)) return
    const correct = val === lp.answer
    const newScore = correct ? score + 1 : score
    if (correct) { setScore(newScore); onXp(6); recordCorrect() } else { recordWrong() }
    setFeedback(correct ? 'correct' : 'wrong')
    setTimeout(() => {
      setFeedback(null); setInput('')
      const next = idx + 1
      if (next >= LUECKE_TOTAL) onFinish('luecke', newScore, LUECKE_TOTAL, finishCoins(newScore, LUECKE_TOTAL))
      else setIdx(next)
    }, correct ? 650 : 1100)
  }

  const gapEl  = <span className={`eq-gap${input ? ' eq-gap-filled' : ''}`}>{input || '?'}</span>
  const leftEl  = lp.missing === 'left'  ? gapEl : <span className="eq-num">{p.a}</span>
  const rightEl = lp.missing === 'right' ? gapEl : <span className="eq-num">{p.b}</span>

  return (
    <div className="game-module">
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>🔍 Lücken-Detektiv</h2>
        <div className="moves-counter">{idx + 1}/{LUECKE_TOTAL}</div>
      </div>
      <p className="game-desc">Welche Zahl gehört in die Lücke?</p>
      <StreakToast visible={showStreak} />

      <div className={`equation-display ${feedback || ''}`}>
        {leftEl}
        <span className="eq-op">{p.op}</span>
        {rightEl}
        <span className="eq-op">=</span>
        <span className="eq-result">{p.result}</span>
      </div>

      {feedback && (
        <div className={`feedback-msg ${feedback}`}>
          {feedback === 'correct' ? '✅ Richtig! +6 XP 🪙+3' : `❌ Die Antwort wäre ${lp.answer}`}
        </div>
      )}

      <NumPad value={input} onChange={setInput} onConfirm={check} disabled={!!feedback} />
      <div className="score-mini">⭐ {score}/{LUECKE_TOTAL}</div>
    </div>
  )
}

// ============================================================
// RICHTIG ODER FALSCH?
// ============================================================
const WF_TOTAL = 10
interface WFProblem { problem: Problem; shown: number; isCorrect: boolean }

const makeWFProblem = (p: Problem): WFProblem => {
  const isCorrect = Math.random() > 0.5
  let shown = p.result
  if (!isCorrect) {
    const off = [-5,-4,-3,-2,-1,1,2,3,4,5].filter(o => p.result+o > 0)
    shown = p.result + off[Math.floor(Math.random() * off.length)]
  }
  return { problem: p, shown, isCorrect }
}

function RichtigFalsch({ onFinish, onBack, onXp, onCoins, difficulty, unit }: GameProps) {
  const [wfList] = useState(() => shuffle(uniqueProblems(WF_TOTAL, difficulty, unit).map(makeWFProblem)))
  const [idx, setIdx]       = useState(0)
  const [feedback, setFeedback] = useState<'correct'|'wrong'|null>(null)
  const [lastAnswer, setLastAnswer] = useState<boolean|null>(null)
  const [score, setScore]   = useState(0)
  const { recordCorrect, recordWrong, finishCoins, showStreak } = useGameCoins(onCoins)

  const wf = wfList[idx]; const p = wf.problem

  function answer(isRichtig: boolean) {
    if (feedback) return
    setLastAnswer(isRichtig)
    const correct = isRichtig === wf.isCorrect
    const newScore = correct ? score + 1 : score
    if (correct) { setScore(newScore); onXp(4); recordCorrect() } else { recordWrong() }
    setFeedback(correct ? 'correct' : 'wrong')
    setTimeout(() => {
      setFeedback(null); setLastAnswer(null)
      const next = idx + 1
      if (next >= WF_TOTAL) onFinish('wahrfalsch', newScore, WF_TOTAL, finishCoins(newScore, WF_TOTAL))
      else setIdx(next)
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
      <StreakToast visible={showStreak} />

      <div className={`equation-display ${feedback || ''}`}>
        <span className="eq-num">{p.a}</span><span className="eq-op">{p.op}</span>
        <span className="eq-num">{p.b}</span><span className="eq-op">=</span>
        <span className={`eq-num ${!wf.isCorrect ? 'eq-wrong' : ''}`}>{wf.shown}</span>
      </div>

      <div className="wf-buttons">
        <button className={`wf-btn wf-richtig${feedback&&lastAnswer===true?(wf.isCorrect?' correct-btn':' wrong-btn'):''}`}
          onClick={() => answer(true)} disabled={!!feedback}>✅ Richtig</button>
        <button className={`wf-btn wf-falsch${feedback&&lastAnswer===false?(!wf.isCorrect?' correct-btn':' wrong-btn'):''}`}
          onClick={() => answer(false)} disabled={!!feedback}>❌ Falsch</button>
      </div>

      {feedback && (
        <div className={`feedback-msg ${feedback}`}>
          {feedback === 'correct'
            ? `✅ Genau! ${wf.isCorrect ? `${p.a} ${p.op} ${p.b} = ${p.result}` : 'Die Rechnung war falsch!'}`
            : `❌ Falsch! ${wf.isCorrect ? `${p.a} ${p.op} ${p.b} = ${p.result} stimmt` : `Das Ergebnis wäre ${p.result}`}`}
        </div>
      )}
      <div className="score-mini">⭐ {score}/{WF_TOTAL}</div>
    </div>
  )
}

// ============================================================
// ZAHLEN-SPRINT
// ============================================================
const SPRINT_TOTAL = 10
interface SprintProblem { target: number; correct: Problem; options: Problem[] }

const makeSprintProblem = (p: Problem, difficulty: number, unit: MathUnit): SprintProblem => {
  const distractors: Problem[] = []; let tries = 0
  while (distractors.length < 3 && tries < 60) {
    tries++; const d = generateProblem(unit, difficulty)
    if (d.result !== p.result && !distractors.find(x => x.result === d.result)) distractors.push(d)
  }
  return { target: p.result, correct: p, options: shuffle([p, ...distractors]) }
}

function ZahlenSprint({ onFinish, onBack, onXp, onCoins, difficulty, unit }: GameProps) {
  const [sprints] = useState(() => uniqueProblems(SPRINT_TOTAL, difficulty, unit).map(p => makeSprintProblem(p, difficulty, unit)))
  const [idx, setIdx]       = useState(0)
  const [selected, setSelected] = useState<number|null>(null)
  const [feedback, setFeedback] = useState<'correct'|'wrong'|null>(null)
  const [score, setScore]   = useState(0)
  const { recordCorrect, recordWrong, finishCoins, showStreak } = useGameCoins(onCoins)

  const sp = sprints[idx]

  function pick(i: number) {
    if (feedback) return
    setSelected(i)
    const correct = sp.options[i].result === sp.target
    const newScore = correct ? score + 1 : score
    if (correct) { setScore(newScore); onXp(5); recordCorrect() } else { recordWrong() }
    setFeedback(correct ? 'correct' : 'wrong')
    setTimeout(() => {
      setFeedback(null); setSelected(null)
      const next = idx + 1
      if (next >= SPRINT_TOTAL) onFinish('sprint', newScore, SPRINT_TOTAL, finishCoins(newScore, SPRINT_TOTAL))
      else setIdx(next)
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
      <StreakToast visible={showStreak} />

      <div className="sprint-target">
        <span className="sprint-equals">=</span>
        <span className="sprint-number">{sp.target}</span>
      </div>

      <div className="sprint-options">
        {sp.options.map((opt, i) => {
          let cls = 'sprint-btn'
          if (feedback) { if (opt.result === sp.target) cls += ' correct-btn'; else if (selected === i) cls += ' wrong-btn' }
          return <button key={i} className={cls} onClick={(e) => { (e.currentTarget as HTMLElement).blur(); pick(i) }} disabled={!!feedback}>{opt.a} {opt.op} {opt.b}</button>
        })}
      </div>

      {feedback && (
        <div className={`feedback-msg ${feedback}`}>
          {feedback === 'correct' ? '🎯 Treffer! +5 XP 🪙+3' : `❌ Richtig wäre: ${sp.correct.a} ${sp.correct.op} ${sp.correct.b}`}
        </div>
      )}
      <div className="score-mini">⭐ {score}/{SPRINT_TOTAL}</div>
    </div>
  )
}

// ============================================================
// BLITZ-DUELL  –  Belohnungsspiel
// ============================================================
const DUELL_COST   = 20
const DUELL_ROUNDS = 10
const ROUND_TIME   = 7   // Sekunden pro Aufgabe

interface DuellProblem { problem: Problem; options: number[]; correct: number }

function makeDuellProblem(difficulty: number, unit: MathUnit): DuellProblem {
  const p = generateProblem(unit, difficulty)
  const correct = p.result
  const opts = new Set<number>([correct])
  let tries = 0
  while (opts.size < 4 && tries < 60) {
    tries++
    const delta = rand(1, 9) * (Math.random() > 0.5 ? 1 : -1)
    const d = correct + delta
    if (d >= 1) opts.add(d)
  }
  // fallback: fill with nearby numbers
  let fill = correct + 1
  while (opts.size < 4) { if (fill !== correct) opts.add(fill); fill++ }
  return { problem: p, options: shuffle([...opts]), correct }
}

type DuellFeedback = { type: 'correct' | 'wrong' | 'timeout'; coins: number }

function BlitzDuell({ onBack, onCoins, difficulty, unit }: { onBack: () => void; onCoins: (n: number) => void; difficulty: number; unit: MathUnit }) {
  const duellRef = useRef(Array.from({ length: DUELL_ROUNDS }, () => makeDuellProblem(difficulty, unit)))
  const [round, setRound]       = useState(0)
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME)
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<DuellFeedback | null>(null)
  const [totalCoins, setTotalCoins] = useState(0)
  const [score, setScore]       = useState(0)
  const [done, setDone]         = useState(false)
  const roundStartRef = useRef<number>(Date.now())

  const dp = duellRef.current[round]

  // Countdown timer per round
  useEffect(() => {
    if (done || feedback !== null) return
    roundStartRef.current = Date.now()
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setFeedback({ type: 'timeout', coins: 0 })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [round, feedback, done])

  // Auto-advance after feedback
  useEffect(() => {
    if (!feedback) return
    const delay = feedback.type === 'correct' ? 700 : 1100
    const t = setTimeout(() => {
      const next = round + 1
      if (next >= DUELL_ROUNDS) { setDone(true) }
      else { setRound(next); setSelected(null); setFeedback(null); setTimeLeft(ROUND_TIME) }
    }, delay)
    return () => clearTimeout(t)
  }, [feedback, round])

  function pick(optIdx: number) {
    if (feedback) return
    setSelected(optIdx)
    const elapsed = (Date.now() - roundStartRef.current) / 1000
    const isCorrect = dp.options[optIdx] === dp.correct
    if (isCorrect) {
      const coins = elapsed < 2 ? 10 : elapsed < 4 ? 6 : 3
      setScore(s => s + 1)
      setTotalCoins(t => t + coins)
      onCoins(coins)
      setFeedback({ type: 'correct', coins })
    } else {
      setFeedback({ type: 'wrong', coins: 0 })
    }
  }

  const timerPct   = (timeLeft / ROUND_TIME) * 100
  const timerColor = timeLeft > 4 ? '#4ECDC4' : timeLeft > 2 ? '#FFE66D' : '#FF6B6B'

  const speedLabel = (coins: number) =>
    coins >= 10 ? '🔥 BLITZ!' : coins >= 6 ? '⚡ Schnell!' : '✅ Richtig!'

  if (done) {
    const trophy = score >= 8 ? '🏆' : score >= 5 ? '⭐' : '💪'
    const msg    = score >= 8 ? 'Mega gemacht!' : score >= 5 ? 'Super!' : 'Weiter üben!'
    return (
      <div className="game-module">
        <div className="game-complete" style={{ marginTop: 40 }}>
          <div className="complete-trophy">{trophy}</div>
          <h3>{msg}</h3>
          <p style={{ fontSize: '1.4rem', color: '#FFE66D', fontWeight: 700 }}>{score}/{DUELL_ROUNDS} richtig!</p>
          <p style={{ color: '#4ECDC4', fontSize: '1.2rem', marginTop: 8 }}>🪙 {totalCoins} Münzen verdient!</p>
          <div className="complete-buttons" style={{ marginTop: 28 }}>
            <button className="play-again-btn" onClick={() => {
              duellRef.current = Array.from({ length: DUELL_ROUNDS }, () => makeDuellProblem(difficulty))
              setRound(0); setTimeLeft(ROUND_TIME); setSelected(null); setFeedback(null)
              setTotalCoins(0); setScore(0); setDone(false)
            }}>Nochmal!</button>
            <button className="back-to-menu-btn" onClick={onBack}>← Zurück</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="game-module">
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>⚔️ Blitz-Duell</h2>
        <div className="moves-counter">⭐ {score}/{DUELL_ROUNDS}</div>
      </div>

      <div className="duell-timer-bar">
        <div className="duell-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
      </div>
      <div className="duell-timer-label" style={{ color: timerColor }}>{timeLeft}s</div>

      <div className={`equation-display ${feedback ? (feedback.type === 'correct' ? 'correct' : 'wrong') : ''}`}>
        <span className="eq-num">{dp.problem.a}</span>
        <span className="eq-op">{dp.problem.op}</span>
        <span className="eq-num">{dp.problem.b}</span>
        <span className="eq-op">=</span>
        <span className="eq-question">?</span>
      </div>

      <div className="duell-options">
        {dp.options.map((opt, i) => {
          let cls = 'duell-option'
          if (feedback) {
            if (opt === dp.correct) cls += ' correct-btn'
            else if (selected === i) cls += ' wrong-btn'
          }
          return (
            <button key={i} className={cls} onClick={(e) => { (e.currentTarget as HTMLElement).blur(); pick(i) }} disabled={!!feedback}>
              {opt}
            </button>
          )
        })}
      </div>

      {feedback && (
        <div className={`feedback-msg ${feedback.type === 'correct' ? 'correct' : 'wrong'}`}>
          {feedback.type === 'correct'  && `${speedLabel(feedback.coins)} +${feedback.coins} 🪙`}
          {feedback.type === 'wrong'    && `❌ Richtig wäre ${dp.correct}`}
          {feedback.type === 'timeout' && `⏱ Zeit! ${dp.problem.a} ${dp.problem.op} ${dp.problem.b} = ${dp.correct}`}
        </div>
      )}

      <div className="score-mini">🪙 +{totalCoins} heute</div>
    </div>
  )
}

// ============================================================
// SCHATZKISTE
// ============================================================
function Schatzkiste({ xp, coins, onBack, onPlayDuell }: {
  xp: number; coins: number; onBack: () => void; onPlayDuell: () => void
}) {
  const level = getLevel(xp); const difficulty = getDifficulty(level)
  const canAfford = coins >= DUELL_COST; const diffColor = DIFFICULTY_COLORS[difficulty]

  return (
    <div className="game-module">
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>💰 Schatzkiste</h2>
        <div style={{ width: 80 }} />
      </div>

      <div className="treasure-stats">
        <div className="treasure-card">
          <div className="treasure-icon">🪙</div>
          <div className="treasure-value">{coins}</div>
          <div className="treasure-label">Münzen</div>
        </div>
        <div className="treasure-card">
          <div className="treasure-icon">{getLevelEmoji(level)}</div>
          <div className="treasure-value">{level}</div>
          <div className="treasure-label">Level</div>
        </div>
        <div className="treasure-card">
          <div className="treasure-icon">⭐</div>
          <div className="treasure-value">{xp}</div>
          <div className="treasure-label">XP gesamt</div>
        </div>
      </div>

      <div className="difficulty-info">
        <span>RechenLevel:</span>
        <span className="diff-badge" style={{ background: diffColor+'22', color: diffColor, border:`2px solid ${diffColor}` }}>
          {DIFFICULTY_LABELS[difficulty]}
        </span>
      </div>

      <div className="shop-section">
        <h3 className="shop-title">🎮 Spielen mit Münzen</h3>
        <div className={`shop-item ${!canAfford ? 'shop-item-locked' : ''}`}>
          <div className="shop-item-info">
            <span className="shop-item-emoji">⚔️</span>
            <div>
              <div className="shop-item-name">Blitz-Duell</div>
              <div className="shop-item-desc">10 Aufgaben – je schneller du bist, desto mehr Münzen! 🔥=10 ⚡=6 ✅=3</div>
            </div>
          </div>
          <button className={`shop-btn ${canAfford ? 'shop-btn-active' : 'shop-btn-locked'}`}
            onClick={canAfford ? onPlayDuell : undefined} disabled={!canAfford}>
            {canAfford ? `Spielen 🪙${DUELL_COST}` : `🔒 ${DUELL_COST}🪙`}
          </button>
        </div>
        <p className="shop-hint">
          {canAfford ? '✨ Du hast genug Münzen. Viel Spass!'
            : `Noch ${DUELL_COST - coins} Münzen – weiter üben!`}
        </p>
      </div>

      <div className="earn-info">
        <h3 className="shop-title">💡 So verdienst du Münzen</h3>
        <div className="earn-row"><span>✅ Richtige Antwort</span>        <span className="earn-coins">🪙 +3</span></div>
        <div className="earn-row"><span>🔥 3 richtig hintereinander</span> <span className="earn-coins">🪙 +5 Bonus</span></div>
        <div className="earn-row"><span>🏆 Perfekte Runde</span>          <span className="earn-coins">🪙 +15 Bonus</span></div>
        <div className="earn-row"><span>⚔️ Duell Blitz (&lt;2s)</span>   <span className="earn-coins">🪙 +10</span></div>
      </div>
    </div>
  )
}

// ============================================================
// UNIT PICKER
// ============================================================
function UnitPicker({ onSelect }: { onSelect: (unit: MathUnit) => void }) {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title"><span className="title-emoji">🦸</span> Mathe-Held</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 4 }}>Wähle dein Thema:</p>
      </header>
      <div className="unit-grid">
        {MATH_UNITS.map((unit, i) => (
          <button
            key={unit.id}
            className="unit-card"
            style={{ animationDelay: `${i * 0.08}s` }}
            onClick={() => onSelect(unit)}
          >
            <span className="unit-emoji">{unit.emoji}</span>
            <span className="unit-title">{unit.title}</span>
            <span className="unit-subtitle">{unit.subtitle}</span>
          </button>
        ))}
      </div>
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
    try {
      const user = await loginWithCode(username.trim().toLowerCase(), code.trim())
      onLogin(user)
    } catch {
      setError('Falscher Name oder Code – versuch nochmal! 🔑')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-emoji">🦸</div>
        <h1 className="login-title">Mathe-Held</h1>
        <p className="login-subtitle">Gib deinen Namen und Code ein:</p>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Dein Name..."
          className="login-input"
          autoComplete="off"
          autoCapitalize="none"
        />
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Dein Code..."
          className="login-input"
          autoComplete="off"
          autoCapitalize="none"
        />
        {error && <p className="login-error">{error}</p>}
        <button
          className="login-btn"
          onClick={handleLogin}
          disabled={!username.trim() || !code.trim() || loading}
        >
          {loading ? '⏳ Laden...' : 'Los geht\'s! 🚀'}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [screen, setScreen]       = useState<Screen>('menu')
  const [xp, setXp]               = useState(loadXp)
  const [coins, setCoins]         = useState(loadCoins)
  const [showLevelUp, setShowLevelUp]   = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [result, setResult]       = useState<GameResult | null>(null)
  const [pbUser, setPbUser]       = useState<PbUser | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<MathUnit | null>(
    MATH_UNITS.length === 1 ? MATH_UNITS[0] : null
  )
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const level = getLevel(xp); const xpInLevel = getXpInLevel(xp); const difficulty = getDifficulty(level)

  // Beim Start: gespeicherte Auth laden
  useEffect(() => {
    const saved = getSavedAuth()
    if (saved) {
      setPbUser(saved)
      saveXp(saved.xp); setXp(saved.xp)
      saveCoins(saved.coins); setCoins(saved.coins)
    }
  }, [])

  // Debounced Sync: 3 Sekunden nach letzter Coins/XP-Änderung
  useEffect(() => {
    if (!pbUser) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      syncToServer(pbUser, coins, xp, getLevel(xp))
    }, 3000)
  }, [xp, coins, pbUser])

  const handleLogin = useCallback((user: PbUser) => {
    setPbUser(user)
    saveXp(user.xp); setXp(user.xp)
    saveCoins(user.coins); setCoins(user.coins)
  }, [])

  const handleLogout = useCallback(() => {
    logout(); setPbUser(null)
  }, [])

  const addXp = useCallback((amount: number) => {
    setXp(prev => {
      const next = prev + amount
      if (getLevel(next) > getLevel(prev)) { setShowLevelUp(true); setTimeout(() => setShowLevelUp(false), 2200) }
      saveXp(next); return next
    })
  }, [])

  const addCoins = useCallback((amount: number) => {
    setCoins(prev => { const next = Math.max(0, prev + amount); saveCoins(next); return next })
  }, [])

  const handleFinish = useCallback((game: Screen, score: number, total: number, coinsEarned: number) => {
    setResult({ game, score, total, coinsEarned })
    if (score === total) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3500) }
    setScreen('complete')
  }, [])

  const handlePlayDuell = useCallback(() => { addCoins(-DUELL_COST); setScreen('duell') }, [addCoins])

  // Login-Screen anzeigen wenn nicht eingeloggt
  if (!pbUser) return <LoginScreen onLogin={handleLogin} />
  // Themen-Auswahl wenn mehr als 1 Einheit und noch keine gewählt
  if (!selectedUnit) return <UnitPicker onSelect={u => { setSelectedUnit(u); setScreen('menu') }} />

  const GAMES = [
    { id: 'blitz'      as Screen, emoji: '⚡', title: 'Blitz-Rechnen',    desc: 'Tippe das Ergebnis ein!',        color: '#FFE66D' },
    { id: 'luecke'     as Screen, emoji: '🔍', title: 'Lücken-Detektiv',  desc: 'Finde die fehlende Zahl!',       color: '#4ECDC4' },
    { id: 'wahrfalsch' as Screen, emoji: '✅', title: 'Richtig oder Falsch?', desc: 'Stimmt die Rechnung?',       color: '#A06CD5' },
    { id: 'sprint'     as Screen, emoji: '🎯', title: 'Zahlen-Sprint',    desc: 'Wähle die richtige Rechnung!',   color: '#FF8A5C' },
  ]

  const gameProps: GameProps = { onFinish: handleFinish, onBack: () => setScreen('menu'), onXp: addXp, onCoins: addCoins, difficulty, unit: selectedUnit }
  const diffColor = DIFFICULTY_COLORS[difficulty]

  return (
    <div className="app-container">
      {showConfetti && <Confetti />}
      {showLevelUp  && <LevelUpOverlay level={level} />}

      {screen === 'menu' && (
        <>
          <header className="app-header">
            <h1 className="app-title"><span className="title-emoji">🦸</span> Mathe-Held</h1>
            <div className="score-bar">
              <div className="score-display">
                <span className="score-star">⭐</span>
                <span className="score-number">{xp}</span>
                <span className="score-label">XP</span>
              </div>
              <div className="coin-display"><span>🪙</span><span className="coin-number">{coins}</span></div>
              <div className="level-badge">{getLevelEmoji(level)} Lv.{level}</div>
            </div>
            <div className="xp-bar-container">
              <div className="xp-bar" style={{ width: `${(xpInLevel / XP_PER_LEVEL) * 100}%` }} />
            </div>
            <div className="diff-bar">
              <span className="diff-badge" style={{ background: diffColor+'22', color: diffColor, border:`2px solid ${diffColor}` }}>
                {DIFFICULTY_LABELS[difficulty]}
              </span>
            </div>
          </header>

          <p className="menu-subtitle">{selectedUnit.emoji} {selectedUnit.title} – {selectedUnit.subtitle}</p>

          <div className="game-grid">
            {GAMES.map(g => (
              <button key={g.id} className="game-card"
                style={{ '--card-color': g.color } as React.CSSProperties}
                onClick={() => setScreen(g.id)}>
                <span className="game-card-emoji">{g.emoji}</span>
                <div className="game-card-title">{g.title}</div>
                <div className="game-card-desc">{g.desc}</div>
              </button>
            ))}
          </div>

          <button className="treasure-btn" onClick={() => setScreen('schatzkiste')}>
            💰 Schatzkiste
            <span className="treasure-coins">🪙 {coins}</span>
          </button>
          <footer className="app-footer">Viel Spass! 🎉</footer>
          <div className="footer-links">
            {MATH_UNITS.length > 1 && (
              <button className="unit-switch-btn" onClick={() => setSelectedUnit(null)}>📚 Thema wechseln</button>
            )}
            <a href="../" className="home-link">🏠 Alle Apps</a>
            <button className="logout-btn" onClick={handleLogout}>Abmelden</button>
          </div>
        </>
      )}

      {screen === 'blitz'      && <BlitzRechnen   {...gameProps} />}
      {screen === 'luecke'     && <LueckenDetektiv {...gameProps} />}
      {screen === 'wahrfalsch' && <RichtigFalsch   {...gameProps} />}
      {screen === 'sprint'     && <ZahlenSprint    {...gameProps} />}
      {screen === 'schatzkiste' && <Schatzkiste xp={xp} coins={coins} onBack={() => setScreen('menu')} onPlayDuell={handlePlayDuell} />}
      {screen === 'duell'      && <BlitzDuell onBack={() => setScreen('schatzkiste')} onCoins={addCoins} difficulty={difficulty} unit={selectedUnit} />}

      {screen === 'complete' && result && (
        <div className="game-complete-screen">
          {showConfetti && <Confetti />}
          <div className="game-complete">
            {result.score === result.total ? (
              <><div className="complete-trophy">🏆</div><h3>Perfekt!</h3>
                <p className="perfect-msg">Alle {result.total} richtig!<br />Du bist ein echter Mathe-Held!</p></>
            ) : result.score >= Math.ceil(result.total * 0.7) ? (
              <><div className="complete-trophy">⭐</div><h3>Gut gemacht!</h3>
                <p>{result.score} von {result.total} richtig</p></>
            ) : (
              <><div className="complete-trophy">💪</div><h3>Weiter üben!</h3>
                <p>{result.score} von {result.total} – du schaffst das!</p></>
            )}
            <p className="xp-gained">🪙 {result.coinsEarned} Münzen verdient!</p>
            <div className="complete-buttons">
              <button className="play-again-btn" onClick={() => setScreen(result.game)}>Nochmal!</button>
              <button className="back-to-menu-btn" onClick={() => setScreen('menu')}>Zum Menü</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
