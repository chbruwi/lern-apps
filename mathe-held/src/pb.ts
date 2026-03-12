// PocketBase API Helper – Lernheld
const PB_URL = 'https://lernheld.synology.me'
const AUTH_KEY = 'lernheld-pb-auth'

export interface PbUser {
  id: string
  username: string
  coins: number
  xp: number
  level: number
  token: string
}

export function getSavedAuth(): PbUser | null {
  try {
    const s = localStorage.getItem(AUTH_KEY)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

function saveAuth(user: PbUser) {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(user)) } catch {}
}

export async function loginWithCode(username: string, code: string): Promise<PbUser> {
  const res = await fetch(`${PB_URL}/api/collections/users/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: username, password: code })
  })
  if (!res.ok) throw new Error('Falscher Code')
  const data = await res.json()
  const user: PbUser = {
    id: data.record.id,
    username: data.record.username,
    coins: data.record.coins ?? 0,
    xp: data.record.xp ?? 0,
    level: data.record.level ?? 1,
    token: data.token
  }
  saveAuth(user)
  return user
}

export async function syncToServer(user: PbUser, coins: number, xp: number, level: number): Promise<void> {
  try {
    const res = await fetch(`${PB_URL}/api/collections/users/records/${user.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify({ coins, xp, level })
    })
    if (res.ok) saveAuth({ ...user, coins, xp, level })
  } catch { /* offline – ignorieren */ }
}

export function logout() {
  try { localStorage.removeItem(AUTH_KEY) } catch {}
}

// ─── Dynamic Math Units ───────────────────────────────────────────────────────

export type Operation = 'add' | 'sub' | 'mul' | 'div'

export interface MathUnit {
  id: string
  title: string
  subtitle: string
  emoji: string
  operations: Operation[]
  maxNumber: number
  tableOf?: number[]
}

const CACHE_KEY_MATH = 'lernheld-math-units-v1'

// Hilfsfunktion: JSON-Feld sicher als Array parsen (robust gegen String-Encoding)
function parseJsonArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') { try { const p = JSON.parse(val); if (Array.isArray(p)) return p } catch {} }
  return []
}

export async function fetchMathUnits(token: string, fallback: MathUnit[]): Promise<MathUnit[]> {
  try {
    const res = await fetch(
      `${PB_URL}/api/collections/math_units/records?filter=(active=true)&sort=sort_order&perPage=50`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    if (!res.ok) throw new Error('fetch failed')
    const data = await res.json()
    const units: MathUnit[] = (data.items ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      subtitle: r.subtitle ?? '',
      emoji: r.emoji ?? '➕',
      operations: parseJsonArray(r.operations) as Operation[],
      maxNumber: r.max_number ?? 100,
      tableOf: r.table_of ? parseJsonArray(r.table_of) as number[] : undefined,
    }))
    if (units.length === 0) throw new Error('empty')
    localStorage.setItem(CACHE_KEY_MATH, JSON.stringify(units))
    return units
  } catch {
    try {
      const cached = localStorage.getItem(CACHE_KEY_MATH)
      if (cached) return JSON.parse(cached)
    } catch {}
    return fallback
  }
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export async function logActivity(user: PbUser, entry: {
  app: string
  unit_id: string
  unit_title: string
  game_mode: string
  score: number
  total: number
  coins_earned: number
}): Promise<void> {
  try {
    await fetch(`${PB_URL}/api/collections/activity_log/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
      },
      body: JSON.stringify({
        user: user.id,
        app: entry.app,
        unit_id: entry.unit_id,
        unit_title: entry.unit_title,
        game_mode: entry.game_mode,
        score: entry.score,
        total: entry.total,
        coins_earned: entry.coins_earned,
      }),
    })
  } catch { /* silent failure – offline or NAS unreachable */ }
}
