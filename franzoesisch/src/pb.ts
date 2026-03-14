// PocketBase API Helper – Französisch
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
  } catch { /* silent failure */ }
}
