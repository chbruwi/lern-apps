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
