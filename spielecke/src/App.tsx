import { useState, useEffect, useRef } from 'react'
import './App.css'
import { getSavedAuth, loginWithCode, syncToServer, logout, PbUser } from './pb'

// ============================================================
// SHARED
// ============================================================
const SK_COINS = 'lernheld-v1-coins'
const loadCoins = (): number => {
  try { return Math.max(0, parseInt(localStorage.getItem(SK_COINS) || '0') || 0) }
  catch { return 0 }
}
const saveCoins = (v: number) => {
  try { localStorage.setItem(SK_COINS, String(Math.max(0, v))) } catch {}
}

type Screen = 'menu' | 'rad' | 'ballon' | 'memo' | 'tipp' | 'schlange'

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ============================================================
// CONFETTI
// ============================================================
function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    left: `${rnd(0, 100)}%`,
    bg: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#A06CD5', '#FF8A5C', '#2ECC71'][i % 6],
    delay: `${(i * 0.08).toFixed(2)}s`,
    dur: `${(2 + Math.random()).toFixed(2)}s`,
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
// MENU
// ============================================================
const GAMES = [
  { id: 'rad'      as Screen, emoji: '🎰', title: 'Glücksrad',    desc: 'Drehe das Rad und gewinne Münzen!', cost: 10, color: '#FFE66D' },
  { id: 'ballon'   as Screen, emoji: '🎈', title: 'Ballon-Tipp',  desc: 'Platze alle Ballons in 30s!',       cost: 15, color: '#FF8A5C' },
  { id: 'memo'     as Screen, emoji: '🃏', title: 'Memo-Chaos',   desc: 'Finde alle Paare!',                 cost: 20, color: '#A06CD5' },
  { id: 'tipp'     as Screen, emoji: '🎯', title: 'Tipp-Meister', desc: 'Treffe das Ziel!',                  cost: 10, color: '#4ECDC4' },
  { id: 'schlange' as Screen, emoji: '🐍', title: 'Schlange',     desc: 'Iss soviel wie möglich!',           cost: 15, color: '#2ECC71' },
]

function Menu({ coins, onPlay, onLogout }: { coins: number; onPlay: (id: Screen) => void; onLogout: () => void }) {
  return (
    <>
      <header className="app-header">
        <h1 className="app-title"><span className="title-emoji">🎮</span> Spielecke</h1>
        <div className="header-coin"><span>🪙</span><span className="coin-number">{coins}</span></div>
        <p className="menu-sub">Verdiene Münzen in den Lern-Apps und spiele hier!</p>
      </header>
      <div className="game-grid">
        {GAMES.map(g => {
          const ok = coins >= g.cost
          return (
            <button key={g.id}
              className={`game-card${!ok ? ' game-card-locked' : ''}`}
              style={{ '--card-color': g.color } as React.CSSProperties}
              onClick={() => ok && onPlay(g.id)}>
              <span className="game-card-emoji">{g.emoji}</span>
              <div className="game-card-title">{g.title}</div>
              <div className="game-card-desc">{g.desc}</div>
              <div className={`game-card-cost${ok ? ' affordable' : ''}`}>
                {ok ? `Spielen · 🪙${g.cost}` : `🔒 ${g.cost} Münzen`}
              </div>
            </button>
          )
        })}
      </div>
      <div className="footer-links">
        <a href="../" className="home-link">🏠 Alle Apps</a>
        <button className="logout-btn" onClick={onLogout}>🚪 Abmelden</button>
      </div>
    </>
  )
}

// ============================================================
// GLÜCKSRAD
// ============================================================
const WHL = [
  { v: 5,   c: '#4ECDC4', l: '🪙 5'   },
  { v: 0,   c: '#FF6B6B', l: '💀 Leer' },
  { v: 15,  c: '#A06CD5', l: '✨ 15'  },
  { v: 5,   c: '#4ECDC4', l: '🪙 5'   },
  { v: 0,   c: '#FF6B6B', l: '💀 Leer' },
  { v: 30,  c: '#FF8A5C', l: '🔥 30'  },
  { v: 10,  c: '#FFE66D', l: '🪙 10'  },
  { v: 100, c: '#2ECC71', l: '💎 100' },
]
const WSEG      = 360 / WHL.length   // 45°
const SPIN_COST = 10

function Gluecksrad({ coins, onCoins, onBack }: { coins: number; onCoins: (n: number) => void; onBack: () => void }) {
  const [spinning, setSpinning] = useState(false)
  const [deg, setDeg]           = useState(0)
  const [result, setResult]     = useState<typeof WHL[0] | null>(null)
  const [confetti, setConfetti] = useState(false)
  const accRef = useRef(0)

  const gradient = WHL.map((s, i) => `${s.c} ${i * WSEG}deg ${(i + 1) * WSEG}deg`).join(', ')

  function spin() {
    if (spinning || coins < SPIN_COST) return
    onCoins(-SPIN_COST)
    setResult(null)
    const idx       = rnd(0, WHL.length - 1)
    const segMid    = idx * WSEG + WSEG / 2
    const targetRot = (360 - segMid + 360) % 360
    const curMod    = ((accRef.current % 360) + 360) % 360
    const delta     = ((targetRot - curMod) + 360) % 360
    accRef.current += delta + 6 * 360
    setDeg(accRef.current)
    setSpinning(true)
    setTimeout(() => {
      setSpinning(false)
      setResult(WHL[idx])
      if (WHL[idx].v > 0) {
        onCoins(WHL[idx].v)
        setConfetti(true)
        setTimeout(() => setConfetti(false), 2800)
      }
    }, 3650)
  }

  return (
    <div className="game-module">
      {confetti && <Confetti />}
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>🎰 Glücksrad</h2>
        <div className="header-coin small"><span>🪙</span><span className="coin-number">{coins}</span></div>
      </div>

      <div className="wheel-wrap">
        <div className="wheel-pointer">▼</div>
        <div className="wheel" style={{
          background: `conic-gradient(${gradient})`,
          transform: `rotate(${deg}deg)`,
          transition: spinning ? 'transform 3.5s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none',
        }} />
        <div className="wheel-center">🎰</div>
      </div>

      {result && (
        <div className={`wheel-result ${result.v > 0 ? 'win' : 'lose'}`}>
          {result.v > 0 ? `🎉 ${result.l} gewonnen!` : '😅 Leider leer!'}
        </div>
      )}

      <button className="spin-btn" onClick={spin} disabled={spinning || coins < SPIN_COST}>
        {spinning ? '🌀 Dreht sich...' : `Drehen! · 🪙${SPIN_COST}`}
      </button>

      <div className="wheel-legend">
        {WHL.map((s, i) => (
          <div key={i} className="legend-item">
            <div className="legend-dot" style={{ background: s.c }} />
            <span>{s.l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// BALLON-TIPP
// ============================================================
const BALLON_TIME   = 30
const BALLON_REWARD = 2
const B_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A06CD5', '#FF8A5C', '#2ECC71', '#5B9BF7']

interface Balloon { id: number; x: number; color: string; size: number; dur: number; popped: boolean }
let _bid = 0

function BallonTipp({ onBack, onCoins }: { onBack: () => void; onCoins: (n: number) => void }) {
  const [balloons, setBalloons] = useState<Balloon[]>([])
  const [timeLeft, setTimeLeft] = useState(BALLON_TIME)
  const [score, setScore]       = useState(0)
  const [done, setDone]         = useState(false)
  const [confetti, setConfetti] = useState(false)
  const scoreRef = useRef(0)
  const doneRef  = useRef(false)

  // Countdown
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(t); doneRef.current = true; setDone(true); return 0 }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Balloon spawner
  useEffect(() => {
    const t = setInterval(() => {
      if (doneRef.current) { clearInterval(t); return }
      setBalloons(prev => [
        ...prev.filter(b => !b.popped).slice(-12),
        { id: _bid++, x: rnd(8, 85), color: B_COLORS[rnd(0, B_COLORS.length - 1)], size: rnd(44, 70), dur: rnd(25, 42) / 10, popped: false },
      ])
    }, 800)
    return () => clearInterval(t)
  }, [])

  function pop(id: number) {
    if (doneRef.current) return
    setBalloons(prev => prev.map(b => b.id === id ? { ...b, popped: true } : b))
    scoreRef.current += BALLON_REWARD
    setScore(s => s + BALLON_REWARD)
    onCoins(BALLON_REWARD)
    setTimeout(() => setBalloons(prev => prev.filter(b => b.id !== id)), 350)
  }

  useEffect(() => {
    if (done && scoreRef.current > 0) {
      setConfetti(true)
      setTimeout(() => setConfetti(false), 3000)
    }
  }, [done])

  const timerColor = timeLeft > 15 ? '#4ECDC4' : timeLeft > 8 ? '#FFE66D' : '#FF6B6B'

  if (done) {
    return (
      <div className="game-module">
        {confetti && <Confetti />}
        <div className="result-screen">
          <div className="result-trophy">{score >= 20 ? '🏆' : score >= 10 ? '⭐' : '🎈'}</div>
          <h3>{score >= 20 ? 'Mega!' : score >= 10 ? 'Super!' : 'Gut gemacht!'}</h3>
          <p className="result-coins">🪙 {score} Münzen verdient!</p>
          <div className="result-buttons">
            <button className="play-again-btn" onClick={() => {
              setBalloons([]); scoreRef.current = 0; doneRef.current = false
              setTimeLeft(BALLON_TIME); setScore(0); setDone(false)
            }}>Nochmal!</button>
            <button className="back-to-menu-btn" onClick={onBack}>← Menü</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="game-module">
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>🎈 Ballon-Tipp</h2>
        <div className="timer-badge" style={{ color: timerColor }}>{timeLeft}s</div>
      </div>
      <p className="game-desc">Tippe die Ballons! 🪙 +{BALLON_REWARD} pro Ballon</p>
      <div className="balloon-arena">
        {balloons.map(b => (
          <div key={b.id}
            className={`balloon${b.popped ? ' popped' : ''}`}
            style={{ left: `${b.x}%`, width: b.size, height: b.size * 1.25, background: b.color, animationDuration: `${b.dur}s` }}
            onClick={() => pop(b.id)}
          />
        ))}
      </div>
      <div className="score-mini">🪙 +{score} gesammelt</div>
    </div>
  )
}

// ============================================================
// MEMO-CHAOS
// ============================================================
const MEMO_EMOJIS = ['🐶', '🐱', '🦊', '🐻', '🦁', '🐯', '🐮', '🐷']
interface MCard { id: number; emoji: string; flipped: boolean; matched: boolean }

function makeCards(): MCard[] {
  return shuffle([...MEMO_EMOJIS, ...MEMO_EMOJIS]).map((emoji, id) => ({ id, emoji, flipped: false, matched: false }))
}
function coinsForMoves(m: number) { return m <= 10 ? 50 : m <= 16 ? 35 : m <= 24 ? 20 : 10 }

function MemoChaos({ onBack, onCoins }: { onBack: () => void; onCoins: (n: number) => void }) {
  const [cards, setCards]       = useState(makeCards)
  const [open, setOpen]         = useState<number[]>([])
  const [moves, setMoves]       = useState(0)
  const [matched, setMatched]   = useState(0)
  const [locked, setLocked]     = useState(false)
  const [done, setDone]         = useState(false)
  const [confetti, setConfetti] = useState(false)
  const movesRef   = useRef(0)
  const matchedRef = useRef(0)

  function flip(id: number) {
    if (locked || done) return
    const card = cards[id]
    if (card.flipped || card.matched) return
    if (open.length === 1 && open[0] === id) return

    const updated = cards.map(c => c.id === id ? { ...c, flipped: true } : c)
    const newOpen  = [...open, id]
    setCards(updated)
    setOpen(newOpen)

    if (newOpen.length === 2) {
      movesRef.current++
      setMoves(movesRef.current)
      setLocked(true)
      const [a, b] = newOpen
      if (updated[a].emoji === updated[b].emoji) {
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === a || c.id === b) ? { ...c, matched: true } : c))
          setOpen([])
          setLocked(false)
          matchedRef.current++
          setMatched(matchedRef.current)
          if (matchedRef.current === MEMO_EMOJIS.length) {
            const earned = coinsForMoves(movesRef.current)
            onCoins(earned)
            setDone(true)
            setConfetti(true)
            setTimeout(() => setConfetti(false), 3500)
          }
        }, 500)
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === a || c.id === b) ? { ...c, flipped: false } : c))
          setOpen([])
          setLocked(false)
        }, 900)
      }
    }
  }

  if (done) {
    const earned = coinsForMoves(moves)
    return (
      <div className="game-module">
        {confetti && <Confetti />}
        <div className="result-screen">
          <div className="result-trophy">{moves <= 10 ? '🏆' : moves <= 16 ? '⭐' : '✅'}</div>
          <h3>{moves <= 10 ? 'Legendär!' : moves <= 16 ? 'Super!' : 'Geschafft!'}</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{moves} Versuche</p>
          <p className="result-coins">🪙 {earned} Münzen verdient!</p>
          <div className="result-buttons">
            <button className="play-again-btn" onClick={() => {
              movesRef.current = 0; matchedRef.current = 0
              setCards(makeCards()); setOpen([]); setMoves(0)
              setMatched(0); setLocked(false); setDone(false)
            }}>Nochmal!</button>
            <button className="back-to-menu-btn" onClick={onBack}>← Menü</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="game-module">
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>🃏 Memo-Chaos</h2>
        <div className="moves-counter">⭐ {matched}/{MEMO_EMOJIS.length}</div>
      </div>
      <p className="game-desc">Versuche: {moves} · Weniger = mehr Münzen!</p>
      <div className="memo-grid">
        {cards.map(c => (
          <div key={c.id}
            className={`memo-card${c.flipped || c.matched ? ' memo-flipped' : ''}${c.matched ? ' memo-matched' : ''}`}
            onClick={() => flip(c.id)}>
            <div className="memo-front">?</div>
            <div className="memo-back">{c.emoji}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// TIPP-MEISTER
// ============================================================
const TIPP_TIME   = 15
const TIPP_REWARD = 3

function TippMeister({ onBack, onCoins }: { onBack: () => void; onCoins: (n: number) => void }) {
  const [pos, setPos]           = useState({ x: 50, y: 50 })
  const [timeLeft, setTimeLeft] = useState(TIPP_TIME)
  const [hits, setHits]         = useState(0)
  const [done, setDone]         = useState(false)
  const [flash, setFlash]       = useState(false)
  const [confetti, setConfetti] = useState(false)
  const hitsRef = useRef(0)
  const doneRef = useRef(false)

  function newPos() { setPos({ x: rnd(8, 78), y: rnd(10, 72) }) }

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(t); doneRef.current = true; setDone(true); return 0 }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => { if (!doneRef.current) newPos() }, 1500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (done && hitsRef.current > 0) {
      setConfetti(true)
      setTimeout(() => setConfetti(false), 3000)
    }
  }, [done])

  function hit() {
    if (doneRef.current) return
    hitsRef.current++
    setHits(h => h + 1)
    onCoins(TIPP_REWARD)
    setFlash(true)
    setTimeout(() => setFlash(false), 300)
    newPos()
  }

  const timerColor = timeLeft > 8 ? '#4ECDC4' : timeLeft > 4 ? '#FFE66D' : '#FF6B6B'

  if (done) {
    return (
      <div className="game-module">
        {confetti && <Confetti />}
        <div className="result-screen">
          <div className="result-trophy">{hits >= 10 ? '🏆' : hits >= 6 ? '⭐' : '🎯'}</div>
          <h3>{hits >= 10 ? 'Scharfschütze!' : hits >= 6 ? 'Gut gezielt!' : 'Weiter üben!'}</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{hits} Treffer</p>
          <p className="result-coins">🪙 {hits * TIPP_REWARD} Münzen verdient!</p>
          <div className="result-buttons">
            <button className="play-again-btn" onClick={() => {
              hitsRef.current = 0; doneRef.current = false
              setPos({ x: 50, y: 50 }); setTimeLeft(TIPP_TIME); setHits(0); setDone(false)
            }}>Nochmal!</button>
            <button className="back-to-menu-btn" onClick={onBack}>← Menü</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="game-module">
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>🎯 Tipp-Meister</h2>
        <div className="timer-badge" style={{ color: timerColor }}>{timeLeft}s</div>
      </div>
      <p className="game-desc">Tippe das Ziel! · 🪙+{TIPP_REWARD} pro Treffer</p>
      <div className="tipp-arena">
        <button
          className={`tipp-target${flash ? ' hit-flash' : ''}`}
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          onClick={hit}>🎯</button>
      </div>
      <div className="score-mini">🎯 {hits} Treffer · 🪙 +{hits * TIPP_REWARD}</div>
    </div>
  )
}

// ============================================================
// SCHLANGE
// ============================================================
const GRID = 15
const TICK = 180
type Dir = 'up' | 'down' | 'left' | 'right'
type Pt  = { x: number; y: number }

function newFood(snake: Pt[]): Pt {
  let f: Pt
  do { f = { x: rnd(0, GRID - 1), y: rnd(0, GRID - 1) } }
  while (snake.some(s => s.x === f.x && s.y === f.y))
  return f
}

const INIT_SNAKE: Pt[] = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }]

function Schlange({ onBack, onCoins }: { onBack: () => void; onCoins: (n: number) => void }) {
  const initFood = newFood(INIT_SNAKE)
  const [snake, setSnake]     = useState<Pt[]>(INIT_SNAKE)
  const [food, setFood]       = useState<Pt>(initFood)
  const [dir, setDir]         = useState<Dir>('right')
  const [score, setScore]     = useState(0)
  const [started, setStarted] = useState(false)
  const [dead, setDead]       = useState(false)
  const [confetti, setConfetti] = useState(false)
  const snakeRef  = useRef<Pt[]>(INIT_SNAKE)
  const foodRef   = useRef<Pt>(initFood)
  const dirRef    = useRef<Dir>('right')
  const scoreRef  = useRef(0)
  const deadRef   = useRef(false)

  function changeDir(d: Dir) {
    const cur = dirRef.current
    if ((d === 'up' && cur === 'down') || (d === 'down' && cur === 'up') ||
        (d === 'left' && cur === 'right') || (d === 'right' && cur === 'left')) return
    dirRef.current = d
    setDir(d)
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
      const d = map[e.key]
      if (d) { e.preventDefault(); changeDir(d) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => {
    if (!started || dead) return
    const t = setInterval(() => {
      if (deadRef.current) { clearInterval(t); return }
      const head = snakeRef.current[0]
      const d    = dirRef.current
      const next: Pt = {
        x: d === 'left' ? head.x - 1 : d === 'right' ? head.x + 1 : head.x,
        y: d === 'up'   ? head.y - 1 : d === 'down'  ? head.y + 1 : head.y,
      }
      if (next.x < 0 || next.x >= GRID || next.y < 0 || next.y >= GRID) {
        deadRef.current = true; setDead(true)
        if (scoreRef.current > 3) { setConfetti(true); setTimeout(() => setConfetti(false), 3000) }
        return
      }
      if (snakeRef.current.slice(0, -1).some(s => s.x === next.x && s.y === next.y)) {
        deadRef.current = true; setDead(true)
        if (scoreRef.current > 3) { setConfetti(true); setTimeout(() => setConfetti(false), 3000) }
        return
      }
      const ate = next.x === foodRef.current.x && next.y === foodRef.current.y
      const ns  = [next, ...snakeRef.current]
      if (!ate) ns.pop()
      snakeRef.current = ns
      if (ate) {
        scoreRef.current++
        setScore(s => s + 1)
        onCoins(3)
        const f = newFood(ns)
        foodRef.current = f
        setFood(f)
      }
      setSnake([...ns])
    }, TICK)
    return () => clearInterval(t)
  }, [started, dead])

  function restart() {
    const s = [...INIT_SNAKE]
    const f = newFood(s)
    snakeRef.current = s; foodRef.current = f; dirRef.current = 'right'
    deadRef.current = false; scoreRef.current = 0
    setSnake(s); setFood(f); setDir('right')
    setScore(0); setDead(false); setStarted(false)
  }

  const snakeSet = new Set(snake.map(s => `${s.x},${s.y}`))

  return (
    <div className="game-module">
      {confetti && <Confetti />}
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <h2>🐍 Schlange</h2>
        <div className="moves-counter">🍎 {score} · 🪙+{score * 3}</div>
      </div>

      <div className="snake-wrap">
        <div className="snake-grid" style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}>
          {Array.from({ length: GRID * GRID }, (_, i) => {
            const x = i % GRID, y = Math.floor(i / GRID)
            const inS = snakeSet.has(`${x},${y}`)
            const isF = food.x === x && food.y === y
            const isH = inS && snake[0].x === x && snake[0].y === y
            return <div key={i} className={`sc${inS ? (isH ? ' sh' : ' sb') : ''}${isF ? ' sf' : ''}`} />
          })}
        </div>

        {!started && !dead && (
          <div className="snake-overlay">
            <button className="spin-btn" onClick={() => setStarted(true)}>▶ Start!</button>
            <p className="game-desc" style={{ marginTop: 12, marginBottom: 0 }}>🪙 +3 pro Apfel · Pfeiltasten oder D-Pad</p>
          </div>
        )}

        {dead && (
          <div className="snake-overlay">
            <p style={{ fontSize: '2rem', marginBottom: 8 }}>💀</p>
            <h3 style={{ marginBottom: 4 }}>Game Over!</h3>
            <p className="result-coins" style={{ marginBottom: 16 }}>🪙 {score * 3} Münzen verdient</p>
            <div className="result-buttons">
              <button className="play-again-btn" onClick={restart}>Nochmal!</button>
              <button className="back-to-menu-btn" onClick={onBack}>← Menü</button>
            </div>
          </div>
        )}
      </div>

      <div className="dpad">
        <button className="dpad-btn" style={{ gridColumn: 2, gridRow: 1 }} onClick={() => changeDir('up')}>▲</button>
        <button className="dpad-btn" style={{ gridColumn: 1, gridRow: 2 }} onClick={() => changeDir('left')}>◄</button>
        <div style={{ gridColumn: 2, gridRow: 2 }} className="dpad-center">{dir === 'up' ? '▲' : dir === 'down' ? '▼' : dir === 'left' ? '◄' : '►'}</div>
        <button className="dpad-btn" style={{ gridColumn: 3, gridRow: 2 }} onClick={() => changeDir('right')}>►</button>
        <button className="dpad-btn" style={{ gridColumn: 2, gridRow: 3 }} onClick={() => changeDir('down')}>▼</button>
      </div>
    </div>
  )
}

// ============================================================
// MAIN APP
// ============================================================
// ============================================================
// LOGIN SCREEN
// ============================================================

function LoginScreen({ onLogin }: { onLogin: (user: PbUser) => void }) {
  const [username, setUsername] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true); setError('')
    try { const user = await loginWithCode(username.trim().toLowerCase(), code.trim()); onLogin(user) }
    catch { setError('Falscher Code – versuch nochmal! 🔑') }
    finally { setLoading(false) }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-emoji">🎮</div>
        <h1 className="login-title">Spielecke</h1>
        <p className="login-subtitle">Wer spielt? Gib deinen Code ein:</p>
        <input type="text" value={username} onChange={e => setUsername(e.target.value)}
          placeholder="Dein Name (z.B. andrin)..." className="login-input"
          autoComplete="off" autoCapitalize="none" />
        <input type="text" value={code} onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Dein Code..." className="login-input"
          autoComplete="off" autoCapitalize="none" />
        {error && <p className="login-error">{error}</p>}
        <button className="login-btn" onClick={handleLogin} disabled={!code.trim() || !username.trim() || loading}>
          {loading ? '⏳ Laden...' : 'Los geht\'s! 🚀'}
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [coins, setCoins]   = useState(loadCoins)
  const [screen, setScreen] = useState<Screen>('menu')
  const [pbUser, setPbUser] = useState<PbUser | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load saved auth on mount and seed coins from server
  useEffect(() => {
    const saved = getSavedAuth()
    if (saved) {
      setPbUser(saved)
      const serverCoins = saved.coins ?? 0
      setCoins(serverCoins)
      saveCoins(serverCoins)
    }
  }, [])

  // Debounced sync to server on coin change
  useEffect(() => {
    if (!pbUser) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      syncToServer(pbUser, coins, pbUser.xp, pbUser.level)
    }, 3000)
  }, [coins, pbUser])

  const handleLogin = (user: PbUser) => {
    setPbUser(user)
    const serverCoins = user.coins ?? 0
    setCoins(serverCoins)
    saveCoins(serverCoins)
  }

  const handleLogout = () => {
    logout()
    setPbUser(null)
  }

  if (!pbUser) return <LoginScreen onLogin={handleLogin} />

  function addCoins(delta: number) {
    setCoins(prev => { const n = Math.max(0, prev + delta); saveCoins(n); return n })
  }

  function startGame(id: Screen) {
    // Glücksrad charges per spin internally; all others charge entry cost
    if (id !== 'rad') addCoins(-(GAMES.find(g => g.id === id)?.cost ?? 0))
    setScreen(id)
  }

  const back = () => setScreen('menu')
  const sp   = { onBack: back, onCoins: addCoins }

  return (
    <div className="app-container">
      {screen === 'menu'     && <Menu coins={coins} onPlay={startGame} onLogout={handleLogout} />}
      {screen === 'rad'      && <Gluecksrad coins={coins} onCoins={addCoins} onBack={back} />}
      {screen === 'ballon'   && <BallonTipp   {...sp} />}
      {screen === 'memo'     && <MemoChaos    {...sp} />}
      {screen === 'tipp'     && <TippMeister  {...sp} />}
      {screen === 'schlange' && <Schlange     {...sp} />}
    </div>
  )
}
