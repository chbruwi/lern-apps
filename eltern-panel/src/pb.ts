// PocketBase API Helper – Eltern-Panel
const PB_URL = 'https://lernheld.synology.me'
const PARENT_KEY = 'lernheld-parent-auth'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Operation = 'add' | 'sub' | 'mul' | 'div'

export interface Parent {
  id: string
  email: string
  name: string
  token: string
}

export interface Child {
  id: string
  username: string
  coins: number
  xp: number
  level: number
}

export interface MathUnit {
  id: string
  title: string
  subtitle: string
  emoji: string
  operations: Operation[]
  maxNumber: number
  tableOf: number[] | null
  active: boolean
  sortOrder: number
}

export interface VocabUnit {
  id: string
  title: string
  subtitle: string
  emoji: string
  targetUser: string
  language: string   // z.B. "en", "fr", "es" — default "en"
  active: boolean
  sortOrder: number
  itemCount?: number
}

export interface VocabItem {
  id: string
  unitId: string
  en: string
  de: string
  type: 'word' | 'phrase'
}

export interface ActivityEntry {
  id: string
  userId: string
  username: string
  app: string
  unitTitle: string
  gameMode: string
  score: number
  total: number
  coinsEarned: number
  playedAt: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function parentLogin(email: string, password: string): Promise<Parent> {
  const res = await fetch(`${PB_URL}/api/collections/parents/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password }),
  })
  if (!res.ok) throw new Error('Falsches Passwort oder Email')
  const data = await res.json()
  const parent: Parent = {
    id: data.record.id,
    email: data.record.email,
    name: data.record.name ?? email.split('@')[0],
    token: data.token,
  }
  try { localStorage.setItem(PARENT_KEY, JSON.stringify(parent)) } catch {}
  return parent
}

export function getParentAuth(): Parent | null {
  try {
    const s = localStorage.getItem(PARENT_KEY)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

export function parentLogout(): void {
  try { localStorage.removeItem(PARENT_KEY) } catch {}
}

// ─── Children ─────────────────────────────────────────────────────────────────

export async function fetchChildren(token: string): Promise<Child[]> {
  const res = await fetch(
    `${PB_URL}/api/collections/users/records?sort=username&perPage=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error('Kinder laden fehlgeschlagen')
  const data = await res.json()
  return (data.items ?? []).map((r: any) => ({
    id: r.id,
    username: r.username,
    coins: r.coins ?? 0,
    xp: r.xp ?? 0,
    level: r.level ?? 1,
  }))
}

export async function fetchActivityLog(token: string, userId?: string): Promise<ActivityEntry[]> {
  const filter = userId ? `&filter=(user='${userId}')` : ''
  const res = await fetch(
    `${PB_URL}/api/collections/activity_log/records?sort=-played_at&perPage=50${filter}&expand=user`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.items ?? []).map((r: any) => ({
    id: r.id,
    userId: r.user,
    username: r.expand?.user?.username ?? '?',
    app: r.app ?? '',
    unitTitle: r.unit_title ?? '',
    gameMode: r.game_mode ?? '',
    score: r.score ?? 0,
    total: r.total ?? 0,
    coinsEarned: r.coins_earned ?? 0,
    playedAt: r.played_at ?? r.created,
  }))
}

// ─── Math Units ───────────────────────────────────────────────────────────────

function mapMathUnit(r: any): MathUnit {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? '',
    emoji: r.emoji ?? '➕',
    operations: r.operations ?? ['add', 'sub'],
    maxNumber: r.max_number ?? 100,
    tableOf: r.table_of ?? null,
    active: r.active !== false,
    sortOrder: r.sort_order ?? 0,
  }
}

export async function fetchMathUnits(token: string): Promise<MathUnit[]> {
  const res = await fetch(
    `${PB_URL}/api/collections/math_units/records?sort=sort_order&perPage=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error('Mathe-Einheiten laden fehlgeschlagen')
  const data = await res.json()
  return (data.items ?? []).map(mapMathUnit)
}

export async function createMathUnit(token: string, d: Omit<MathUnit, 'id'>): Promise<MathUnit> {
  const res = await fetch(`${PB_URL}/api/collections/math_units/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: d.title, subtitle: d.subtitle, emoji: d.emoji,
      operations: d.operations, max_number: d.maxNumber,
      table_of: d.tableOf, active: d.active, sort_order: d.sortOrder,
    }),
  })
  if (!res.ok) throw new Error('Speichern fehlgeschlagen')
  return mapMathUnit(await res.json())
}

export async function updateMathUnit(token: string, id: string, d: Partial<MathUnit>): Promise<void> {
  const body: any = {}
  if (d.title !== undefined) body.title = d.title
  if (d.subtitle !== undefined) body.subtitle = d.subtitle
  if (d.emoji !== undefined) body.emoji = d.emoji
  if (d.operations !== undefined) body.operations = d.operations
  if (d.maxNumber !== undefined) body.max_number = d.maxNumber
  if (d.tableOf !== undefined) body.table_of = d.tableOf
  if (d.active !== undefined) body.active = d.active
  if (d.sortOrder !== undefined) body.sort_order = d.sortOrder
  const res = await fetch(`${PB_URL}/api/collections/math_units/records/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Speichern fehlgeschlagen')
}

export async function deleteMathUnit(token: string, id: string): Promise<void> {
  const res = await fetch(`${PB_URL}/api/collections/math_units/records/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Löschen fehlgeschlagen')
}

// ─── Vocab Units ──────────────────────────────────────────────────────────────

function mapVocabUnit(r: any): VocabUnit {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? '',
    emoji: r.emoji ?? '📚',
    targetUser: r.target_user ?? '',
    language: r.language ?? 'en',
    active: r.active !== false,
    sortOrder: r.sort_order ?? 0,
    itemCount: r.itemCount,
  }
}

export async function fetchVocabUnits(token: string): Promise<VocabUnit[]> {
  const res = await fetch(
    `${PB_URL}/api/collections/vocab_units/records?sort=sort_order&perPage=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error('Vokabel-Einheiten laden fehlgeschlagen')
  const data = await res.json()
  const units: VocabUnit[] = (data.items ?? []).map(mapVocabUnit)
  // Fetch item counts
  await Promise.all(units.map(async u => {
    try {
      const r = await fetch(
        `${PB_URL}/api/collections/vocab_items/records?filter=(unit='${u.id}')&perPage=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (r.ok) { const d = await r.json(); u.itemCount = d.totalItems }
    } catch {}
  }))
  return units
}

export async function createVocabUnit(token: string, d: Omit<VocabUnit, 'id' | 'itemCount'>): Promise<VocabUnit> {
  const res = await fetch(`${PB_URL}/api/collections/vocab_units/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: d.title, subtitle: d.subtitle, emoji: d.emoji,
      target_user: d.targetUser, language: d.language ?? 'en', active: d.active, sort_order: d.sortOrder,
    }),
  })
  if (!res.ok) throw new Error('Speichern fehlgeschlagen')
  return mapVocabUnit(await res.json())
}

export async function updateVocabUnit(token: string, id: string, d: Partial<VocabUnit>): Promise<void> {
  const body: any = {}
  if (d.title !== undefined) body.title = d.title
  if (d.subtitle !== undefined) body.subtitle = d.subtitle
  if (d.emoji !== undefined) body.emoji = d.emoji
  if (d.targetUser !== undefined) body.target_user = d.targetUser
  if (d.language !== undefined) body.language = d.language
  if (d.active !== undefined) body.active = d.active
  if (d.sortOrder !== undefined) body.sort_order = d.sortOrder
  const res = await fetch(`${PB_URL}/api/collections/vocab_units/records/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Speichern fehlgeschlagen')
}

export async function deleteVocabUnit(token: string, id: string): Promise<void> {
  const res = await fetch(`${PB_URL}/api/collections/vocab_units/records/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Löschen fehlgeschlagen')
}

// ─── Vocab Items ──────────────────────────────────────────────────────────────

export async function fetchVocabItems(token: string, unitId: string): Promise<VocabItem[]> {
  const res = await fetch(
    `${PB_URL}/api/collections/vocab_items/records?filter=(unit='${unitId}')&sort=sort_order,en&perPage=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error('Wörter laden fehlgeschlagen')
  const data = await res.json()
  return (data.items ?? []).map((r: any) => ({
    id: r.id, unitId: r.unit,
    en: r.en, de: r.de, type: r.type ?? 'word',
  }))
}

export async function createVocabItem(
  token: string,
  d: { unitId: string; en: string; de: string; type: 'word' | 'phrase' }
): Promise<VocabItem> {
  const res = await fetch(`${PB_URL}/api/collections/vocab_items/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ unit: d.unitId, en: d.en.trim(), de: d.de.trim(), type: d.type }),
  })
  if (!res.ok) throw new Error('Wort speichern fehlgeschlagen')
  const r = await res.json()
  return { id: r.id, unitId: r.unit, en: r.en, de: r.de, type: r.type }
}

export async function deleteVocabItem(token: string, id: string): Promise<void> {
  const res = await fetch(`${PB_URL}/api/collections/vocab_items/records/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Löschen fehlgeschlagen')
}

export async function bulkImportVocab(token: string, unitId: string, rawText: string): Promise<VocabItem[]> {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  const parsed: { en: string; de: string; type: 'word' | 'phrase' }[] = []
  for (const line of lines) {
    const eqIdx = line.indexOf('=')
    if (eqIdx < 1) continue
    let en = line.slice(0, eqIdx).trim()
    let de = line.slice(eqIdx + 1).trim()
    let type: 'word' | 'phrase' = 'word'
    if (de.endsWith('[phrase]')) { type = 'phrase'; de = de.slice(0, -8).trim() }
    if (en && de) parsed.push({ en, de, type })
  }
  const created: VocabItem[] = []
  for (const item of parsed) {
    const r = await createVocabItem(token, { unitId, ...item })
    created.push(r)
  }
  return created
}

export async function createVocabItemWithImage(
  token: string,
  unitId: string,
  en: string,
  de: string,
  type: 'word' | 'phrase',
  imageBlob: Blob | null
): Promise<VocabItem> {
  const formData = new FormData()
  formData.append('unit', unitId)
  formData.append('en', en.trim())
  formData.append('de', de.trim())
  formData.append('type', type)
  if (imageBlob) {
    formData.append('image', imageBlob, `${en.trim().replace(/\s+/g, '_')}.jpg`)
  }
  // No Content-Type header — browser sets multipart boundary automatically
  const res = await fetch(`${PB_URL}/api/collections/vocab_items/records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) throw new Error('Wort speichern fehlgeschlagen')
  const r = await res.json()
  return { id: r.id, unitId: r.unit, en: r.en, de: r.de, type: r.type }
}

export function parseBulkText(rawText: string): { en: string; de: string; type: 'word' | 'phrase' }[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  const parsed: { en: string; de: string; type: 'word' | 'phrase' }[] = []
  for (const line of lines) {
    const eqIdx = line.indexOf('=')
    if (eqIdx < 1) continue
    let en = line.slice(0, eqIdx).trim()
    let de = line.slice(eqIdx + 1).trim()
    let type: 'word' | 'phrase' = 'word'
    if (de.endsWith('[phrase]')) { type = 'phrase'; de = de.slice(0, -8).trim() }
    if (en && de) parsed.push({ en, de, type })
  }
  return parsed
}
