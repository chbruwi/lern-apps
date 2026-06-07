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

// ─── Dynamic Vocab Units ──────────────────────────────────────────────────────

export interface WordPair {
  s: string   // Quell-Häppchen (Sprache der Unit)
  de: string  // wörtliche deutsche Entsprechung
}

export interface VocabItem {
  id?: string
  en: string
  de: string
  type: 'word' | 'phrase'
  imageUrl?: string
  audioLangUrl?: string  // Aussprache en-Feld (EN/FR/ES/IT)
  audioDeUrl?: string    // Aussprache de-Feld (immer Deutsch)
  words?: WordPair[]     // Wort-für-Wort-Dekodierung (nur Phrasen)
  focus?: boolean        // Fokus-Wort (Prüfung) – zuerst üben
}

// Wie oft ein Wort richtig sein muss, damit es als "sitzt" gilt
export const MASTERY_CORRECT = 5

// PocketBase JSON-Felder kommen mal als Array, mal als String (v0.23) — robust parsen
function parseWordPairs(val: unknown): WordPair[] | undefined {
  let v = val
  if (typeof v === 'string') { try { v = JSON.parse(v) } catch { return undefined } }
  if (Array.isArray(v) && v.length > 0) {
    return v.filter((w: any) => w && typeof w.s === 'string' && typeof w.de === 'string')
  }
  return undefined
}

export interface VocabUnit {
  id: string
  title: string
  subtitle: string
  emoji: string
  targetUser: string
  language: string   // z.B. "en", "fr", "es" — default "en"
  itemCount?: number
}

const CACHE_KEY_VOCAB = 'lernheld-vocab-units-v1'

export async function fetchVocabUnits(token: string, fallback: VocabUnit[]): Promise<VocabUnit[]> {
  try {
    const res = await fetch(
      `${PB_URL}/api/collections/vocab_units/records?filter=(active=true)&sort=sort_order&perPage=50`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    if (!res.ok) throw new Error('fetch failed')
    const data = await res.json()
    const units: VocabUnit[] = (data.items ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      subtitle: r.subtitle ?? '',
      emoji: r.emoji ?? '📚',
      targetUser: r.target_user ?? '',
      language: r.language ?? 'en',
    }))
    if (units.length === 0) throw new Error('empty')
    localStorage.setItem(CACHE_KEY_VOCAB, JSON.stringify(units))
    return units
  } catch {
    try {
      const cached = localStorage.getItem(CACHE_KEY_VOCAB)
      if (cached) return JSON.parse(cached)
    } catch {}
    return fallback
  }
}

export async function fetchVocabItems(token: string, unitId: string): Promise<VocabItem[]> {
  const res = await fetch(
    `${PB_URL}/api/collections/vocab_items/records?filter=(unit='${unitId}')&sort=sort_order,en&perPage=200`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error('Wörter laden fehlgeschlagen')
  const data = await res.json()
  return (data.items ?? []).map((r: any) => ({
    id: r.id,
    en: r.en,
    de: r.de,
    type: r.type ?? 'word',
    // ?thumb=500x500 → ~50 KB statt ~1 MB (PocketBase liefert verkleinerte Version)
    imageUrl: r.image ? `${PB_URL}/api/files/vocab_items/${r.id}/${r.image}?thumb=500x500` : undefined,
    audioLangUrl: r.audio_lang ? `${PB_URL}/api/files/vocab_items/${r.id}/${r.audio_lang}` : undefined,
    audioDeUrl: r.audio_de ? `${PB_URL}/api/files/vocab_items/${r.id}/${r.audio_de}` : undefined,
    words: parseWordPairs(r.words),
    focus: !!r.focus,
  }))
}

// ─── Word Progress Tracking ───────────────────────────────────────────────────

export async function logWordProgress(
  token: string,
  userId: string,
  vocabItemId: string,
  gameMode: string,
  correct: boolean,
): Promise<void> {
  if (!vocabItemId) return  // Guard: Item ohne ID überspringen
  try {
    await fetch(`${PB_URL}/api/collections/word_progress/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ user: userId, vocab_item: vocabItemId, game_mode: gameMode, correct }),
    })
  } catch { /* fire-and-forget – Spiel läuft weiter */ }
}

// Liefert die IDs der Wörter, die das Kind schon "kann" (>= MASTERY_CORRECT richtige Antworten).
// Aggregiert word_progress über die OBJEKTIV bewerteten Spiele.
// Karteikarten ('flip') zählen NICHT mit – dort schätzt das Kind selbst ein (Gewusst/Nochmal).
// Bei Fehler: leeres Set (dann gilt nichts als gemeistert).
export async function fetchMasteredIds(token: string, userId: string): Promise<Set<string>> {
  try {
    const res = await fetch(
      `${PB_URL}/api/collections/word_progress/records?filter=(user='${userId}'%26%26correct=true%26%26game_mode!='flip')&perPage=1000&fields=vocab_item`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    if (!res.ok) throw new Error('progress fetch failed')
    const data = await res.json()
    const counts: Record<string, number> = {}
    for (const r of (data.items ?? [])) {
      const id = r.vocab_item
      if (id) counts[id] = (counts[id] ?? 0) + 1
    }
    const mastered = new Set<string>()
    for (const id in counts) if (counts[id] >= MASTERY_CORRECT) mastered.add(id)
    return mastered
  } catch {
    return new Set<string>()
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
  } catch { /* silent failure */ }
}
