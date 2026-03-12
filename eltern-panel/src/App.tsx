import { useState, useEffect, useCallback } from 'react'
import {
  Parent, Child, MathUnit, VocabUnit, VocabItem, ActivityEntry, Operation,
  parentLogin, getParentAuth, parentLogout,
  fetchChildren, fetchActivityLog,
  fetchMathUnits, createMathUnit, updateMathUnit, deleteMathUnit,
  fetchVocabUnits, createVocabUnit, updateVocabUnit, deleteVocabUnit,
  fetchVocabItems, createVocabItem, deleteVocabItem,
  bulkImportVocab, parseBulkText,
} from './pb'

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | 'login' | 'dashboard'
  | 'math-list' | 'math-form'
  | 'vocab-list' | 'vocab-detail' | 'vocab-bulk'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const XP_PER_LEVEL = 60
function getLevel(xp: number) { return Math.floor(xp / XP_PER_LEVEL) + 1 }
function getXpInLevel(xp: number) { return xp % XP_PER_LEVEL }

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
}

function formatDateShort(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })
    + ' ' + d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
}

const APP_LABELS: Record<string, string> = {
  'mathe-held': '🦸 Mathe',
  'vocabhero': '🃏 Vocab',
  'wort-abenteuer': '🌟 Wörter',
}
const MODE_LABELS: Record<string, string> = {
  blitz: '⚡ Blitz', luecke: '🔍 Lücke', wahrfalsch: '✅ W/F', sprint: '🎯 Sprint',
  flip: '🃏 Flip', match: '🔗 Match', speed: '⚡ Speed', scramble: '🔀 Salat',
}
const OP_LABELS: Record<string, string> = { add: '➕ Plus', sub: '➖ Minus', mul: '✖️ Mal', div: '➗ Geteilt' }

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (p: Parent) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true); setError('')
    try {
      const parent = await parentLogin(email.trim(), password.trim())
      onLogin(parent)
    } catch (err: any) {
      setError(err.message || 'Login fehlgeschlagen')
    } finally { setLoading(false) }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🔑</div>
        <h1>Eltern-Panel</h1>
        <p className="login-sub">Verwalte Lerneinheiten & beobachte den Fortschritt</p>
        <form onSubmit={handleLogin}>
          <input
            className="field" type="email" placeholder="Email..." autoComplete="email"
            value={email} onChange={e => setEmail(e.target.value)}
          />
          <input
            className="field" type="password" placeholder="Passwort..."
            value={password} onChange={e => setPassword(e.target.value)}
          />
          {error && <p className="error-msg">{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading || !email || !password}>
            {loading ? '⏳ Laden...' : 'Einloggen'}
          </button>
        </form>
        <p className="login-hint">Zugang nur für Eltern · Kinder-Apps unter <a href="../">lern-apps</a></p>
      </div>
    </div>
  )
}

// ─── Nav Bar ──────────────────────────────────────────────────────────────────

function NavBar({ screen, onNav, onLogout, parentName }: {
  screen: Screen; onNav: (s: Screen) => void; onLogout: () => void; parentName: string
}) {
  return (
    <nav className="navbar">
      <span className="nav-logo">🔑 Eltern-Panel</span>
      <div className="nav-links">
        <button className={`nav-btn ${screen === 'dashboard' ? 'active' : ''}`} onClick={() => onNav('dashboard')}>
          📊 Dashboard
        </button>
        <button className={`nav-btn ${screen.startsWith('math') ? 'active' : ''}`} onClick={() => onNav('math-list')}>
          🦸 Mathe
        </button>
        <button className={`nav-btn ${screen.startsWith('vocab') ? 'active' : ''}`} onClick={() => onNav('vocab-list')}>
          🃏 Vokabeln
        </button>
      </div>
      <div className="nav-right">
        <span className="nav-user">👤 {parentName}</span>
        <button className="nav-logout" onClick={onLogout}>Abmelden</button>
      </div>
    </nav>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ token }: { token: string }) {
  const [children, setChildren] = useState<Child[]>([])
  const [log, setLog] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChild, setSelectedChild] = useState<string>('all')

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchChildren(token), fetchActivityLog(token)])
      .then(([c, l]) => { setChildren(c); setLog(l) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const filteredLog = selectedChild === 'all' ? log : log.filter(e => e.userId === selectedChild)

  return (
    <div className="content">
      <h2 className="page-title">📊 Dashboard</h2>

      {loading ? <div className="loading">Lade...</div> : (
        <>
          <div className="children-grid">
            {children.map(child => {
              const level = getLevel(child.xp)
              const xpIn = getXpInLevel(child.xp)
              const lastEntry = log.find(e => e.userId === child.id)
              return (
                <div key={child.id} className="child-card">
                  <div className="child-avatar">{child.username === 'andrin' ? '🧒' : '👧'}</div>
                  <div className="child-info">
                    <div className="child-name">{child.username}</div>
                    <div className="child-stats">
                      <span>Lv.{level}</span>
                      <span>⭐ {child.xp} XP</span>
                      <span>🪙 {child.coins}</span>
                    </div>
                    <div className="xp-bar-wrap">
                      <div className="xp-bar-fill" style={{ width: `${(xpIn / XP_PER_LEVEL) * 100}%` }} />
                    </div>
                    <div className="child-last">
                      {lastEntry ? `Zuletzt: ${formatDateShort(lastEntry.playedAt)}` : 'Noch kein Eintrag'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="section-header">
            <h3>📋 Lernprotokoll</h3>
            <select className="field-sm" value={selectedChild} onChange={e => setSelectedChild(e.target.value)}>
              <option value="all">Alle Kinder</option>
              {children.map(c => <option key={c.id} value={c.id}>{c.username}</option>)}
            </select>
          </div>

          {filteredLog.length === 0 ? (
            <p className="empty-msg">Noch keine Einträge. Die Kinder müssen erst ein Spiel spielen!</p>
          ) : (
            <div className="table-wrap">
              <table className="log-table">
                <thead>
                  <tr>
                    <th>Datum</th><th>Kind</th><th>App</th><th>Einheit</th>
                    <th>Modus</th><th>Score</th><th>Münzen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLog.map(e => (
                    <tr key={e.id}>
                      <td className="td-date">{formatDate(e.playedAt)}</td>
                      <td><strong>{e.username}</strong></td>
                      <td>{APP_LABELS[e.app] ?? e.app}</td>
                      <td>{e.unitTitle || '—'}</td>
                      <td>{MODE_LABELS[e.gameMode] ?? e.gameMode}</td>
                      <td className={e.score === e.total ? 'score-perfect' : 'score-ok'}>
                        {e.score}/{e.total}
                      </td>
                      <td>🪙 {e.coinsEarned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Math Units List ──────────────────────────────────────────────────────────

function MathList({ token, onEdit }: { token: string; onEdit: (u: MathUnit | null) => void }) {
  const [units, setUnits] = useState<MathUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetchMathUnits(token).then(setUnits).catch(() => setError('Laden fehlgeschlagen')).finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleDelete(u: MathUnit) {
    if (!confirm(`Einheit "${u.title}" wirklich löschen?`)) return
    try { await deleteMathUnit(token, u.id); load() }
    catch { alert('Löschen fehlgeschlagen') }
  }

  async function handleToggleActive(u: MathUnit) {
    try { await updateMathUnit(token, u.id, { active: !u.active }); load() }
    catch { alert('Fehler') }
  }

  async function handleMove(u: MathUnit, dir: 'up' | 'down') {
    const idx = units.indexOf(u)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= units.length) return
    const swap = units[swapIdx]
    try {
      await Promise.all([
        updateMathUnit(token, u.id, { sortOrder: swap.sortOrder }),
        updateMathUnit(token, swap.id, { sortOrder: u.sortOrder }),
      ])
      load()
    } catch { alert('Reihenfolge ändern fehlgeschlagen') }
  }

  return (
    <div className="content">
      <div className="page-header">
        <h2 className="page-title">🦸 Mathe-Einheiten</h2>
        <button className="btn-primary" onClick={() => onEdit(null)}>+ Neue Einheit</button>
      </div>
      {error && <p className="error-msg">{error}</p>}
      {loading ? <div className="loading">Lade...</div> : units.length === 0 ? (
        <div className="empty-card">
          <p>Noch keine Mathe-Einheiten.</p>
          <button className="btn-primary" onClick={() => onEdit(null)}>Erste Einheit erstellen</button>
        </div>
      ) : (
        <div className="unit-list">
          {units.map((u, i) => (
            <div key={u.id} className={`unit-row ${u.active ? '' : 'unit-inactive'}`}>
              <div className="unit-row-emoji">{u.emoji}</div>
              <div className="unit-row-info">
                <div className="unit-row-title">{u.title}</div>
                <div className="unit-row-sub">{u.subtitle}</div>
                <div className="unit-row-tags">
                  {u.operations.map(op => <span key={op} className="tag">{OP_LABELS[op]}</span>)}
                  <span className="tag tag-gray">bis {u.maxNumber}</span>
                  {u.tableOf && u.tableOf.length > 0 && (
                    <span className="tag tag-gray">Reihen: {u.tableOf.join(', ')}</span>
                  )}
                </div>
              </div>
              <div className="unit-row-actions">
                <button className="icon-btn" title="Nach oben" onClick={() => handleMove(u, 'up')} disabled={i === 0}>↑</button>
                <button className="icon-btn" title="Nach unten" onClick={() => handleMove(u, 'down')} disabled={i === units.length - 1}>↓</button>
                <button className={`tag-btn ${u.active ? 'tag-active' : 'tag-off'}`} onClick={() => handleToggleActive(u)}>
                  {u.active ? 'Aktiv' : 'Inaktiv'}
                </button>
                <button className="btn-sm" onClick={() => onEdit(u)}>Bearbeiten</button>
                <button className="btn-sm btn-danger" onClick={() => handleDelete(u)}>Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Math Unit Form ───────────────────────────────────────────────────────────

const EMPTY_MATH: Omit<MathUnit, 'id'> = {
  title: '', subtitle: '', emoji: '➕', operations: ['add', 'sub'],
  maxNumber: 100, tableOf: null, active: true, sortOrder: 0,
}

function MathForm({ token, existing, onSave, onCancel }: {
  token: string; existing: MathUnit | null;
  onSave: () => void; onCancel: () => void
}) {
  const [form, setForm] = useState<Omit<MathUnit, 'id'>>(
    existing ? { ...existing } : { ...EMPTY_MATH }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const mulDiv = form.operations.includes('mul') || form.operations.includes('div')

  function toggleOp(op: Operation) {
    setForm(f => {
      const ops = f.operations.includes(op)
        ? f.operations.filter(o => o !== op)
        : [...f.operations, op]
      // If no mul/div selected anymore, clear tableOf
      const hasMulDiv = ops.includes('mul') || ops.includes('div')
      return { ...f, operations: ops, tableOf: hasMulDiv ? f.tableOf : null }
    })
  }

  function toggleTable(n: number) {
    setForm(f => {
      const cur = f.tableOf ?? []
      const next = cur.includes(n) ? cur.filter(x => x !== n) : [...cur, n].sort((a, b) => a - b)
      return { ...f, tableOf: next.length > 0 ? next : null }
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Titel fehlt'); return }
    if (form.operations.length === 0) { setError('Mindestens eine Rechenart wählen'); return }
    setSaving(true); setError('')
    try {
      if (existing) {
        await updateMathUnit(token, existing.id, form)
      } else {
        await createMathUnit(token, form)
      }
      onSave()
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern')
    } finally { setSaving(false) }
  }

  return (
    <div className="content">
      <div className="page-header">
        <h2 className="page-title">{existing ? '✏️ Einheit bearbeiten' : '➕ Neue Einheit'}</h2>
        <button className="btn-secondary" onClick={onCancel}>← Zurück</button>
      </div>
      <form className="form-card" onSubmit={handleSave}>
        <div className="form-row">
          <div className="form-group form-group-sm">
            <label>Emoji</label>
            <input className="field" value={form.emoji}
              onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} maxLength={4} />
          </div>
          <div className="form-group form-group-grow">
            <label>Titel *</label>
            <input className="field" placeholder="z.B. Plus & Minus" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
        </div>

        <div className="form-group">
          <label>Untertitel</label>
          <input className="field" placeholder="z.B. Zehnerübergreifend bis 100" value={form.subtitle}
            onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} />
        </div>

        <div className="form-group">
          <label>Rechenarten *</label>
          <div className="op-row">
            {(['add', 'sub', 'mul', 'div'] as Operation[]).map(op => (
              <button key={op} type="button"
                className={`op-btn ${form.operations.includes(op) ? 'op-active' : ''}`}
                onClick={() => toggleOp(op)}
              >{OP_LABELS[op]}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>{mulDiv ? 'Bis Reihe / Max Tabelle' : 'Maximale Zahl'}</label>
          <input className="field field-sm" type="number" min="1" max="1000"
            value={form.maxNumber}
            onChange={e => setForm(f => ({ ...f, maxNumber: Number(e.target.value) }))} />
          <span className="field-hint">
            {mulDiv ? 'z.B. 10 = bis 10er Reihe' : 'z.B. 100 = Zahlen bis 100'}
          </span>
        </div>

        {mulDiv && (
          <div className="form-group">
            <label>Einmaleins-Reihen (welche sollen geübt werden?)</label>
            <div className="table-pills">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} type="button"
                  className={`table-pill ${(form.tableOf ?? []).includes(n) ? 'pill-active' : ''}`}
                  onClick={() => toggleTable(n)}
                >{n}×</button>
              ))}
            </div>
            <span className="field-hint">Leer = alle Reihen bis Max</span>
          </div>
        )}

        <div className="form-group">
          <label className="checkbox-label">
            <input type="checkbox" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
            Aktiv (für Kinder sichtbar)
          </label>
        </div>

        {error && <p className="error-msg">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Abbrechen</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? '⏳ Speichern...' : '💾 Speichern'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Vocab Units List ─────────────────────────────────────────────────────────

function VocabList({ token, onDetail }: { token: string; onDetail: (u: VocabUnit) => void }) {
  const [units, setUnits] = useState<VocabUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', subtitle: '', emoji: '📚', targetUser: '', active: true })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchVocabUnits(token).then(setUnits).catch(() => setError('Laden fehlgeschlagen')).finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleDelete(u: VocabUnit) {
    if (!confirm(`Einheit "${u.title}" und alle ${u.itemCount ?? 0} Wörter löschen?`)) return
    try { await deleteVocabUnit(token, u.id); load() }
    catch { alert('Löschen fehlgeschlagen') }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await createVocabUnit(token, { ...form, sortOrder: units.length })
      setShowForm(false); setForm({ title: '', subtitle: '', emoji: '📚', targetUser: '', active: true })
      load()
    } catch { alert('Erstellen fehlgeschlagen') }
    finally { setSaving(false) }
  }

  return (
    <div className="content">
      <div className="page-header">
        <h2 className="page-title">🃏 Vokabel-Einheiten</h2>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Abbrechen' : '+ Neue Einheit'}
        </button>
      </div>

      {showForm && (
        <form className="form-card form-inline" onSubmit={handleCreate}>
          <div className="form-row">
            <div className="form-group form-group-sm">
              <label>Emoji</label>
              <input className="field" value={form.emoji} maxLength={4}
                onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} />
            </div>
            <div className="form-group form-group-grow">
              <label>Titel *</label>
              <input className="field" placeholder="z.B. Unit 4" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group form-group-grow">
              <label>Untertitel</label>
              <input className="field" placeholder="z.B. Sport & Freizeit" value={form.subtitle}
                onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Für wen?</label>
              <select className="field" value={form.targetUser}
                onChange={e => setForm(f => ({ ...f, targetUser: e.target.value }))}>
                <option value="">Alle Kinder</option>
                <option value="andrin">Nur Andrin</option>
                <option value="fiona">Nur Fiona</option>
              </select>
            </div>
            <div className="form-group">
              <label className="checkbox-label" style={{ marginTop: 28 }}>
                <input type="checkbox" checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                Aktiv
              </label>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving || !form.title}>
              {saving ? '⏳...' : '💾 Erstellen'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="error-msg">{error}</p>}
      {loading ? <div className="loading">Lade...</div> : units.length === 0 ? (
        <div className="empty-card">
          <p>Noch keine Vokabel-Einheiten.</p>
        </div>
      ) : (
        <div className="unit-list">
          {units.map(u => (
            <div key={u.id} className={`unit-row ${u.active ? '' : 'unit-inactive'}`}>
              <div className="unit-row-emoji">{u.emoji}</div>
              <div className="unit-row-info">
                <div className="unit-row-title">{u.title}</div>
                <div className="unit-row-sub">{u.subtitle}</div>
                <div className="unit-row-tags">
                  <span className="tag">{u.itemCount ?? 0} Wörter</span>
                  {u.targetUser && <span className="tag tag-purple">Für {u.targetUser}</span>}
                  {!u.active && <span className="tag tag-gray">Inaktiv</span>}
                </div>
              </div>
              <div className="unit-row-actions">
                <button className="btn-sm" onClick={() => onDetail(u)}>✏️ Bearbeiten</button>
                <button className="btn-sm btn-danger" onClick={() => handleDelete(u)}>Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Vocab Detail ─────────────────────────────────────────────────────────────

function VocabDetail({ token, unit: initialUnit, onBack, onBulk }: {
  token: string; unit: VocabUnit;
  onBack: () => void; onBulk: (u: VocabUnit) => void
}) {
  const [unit, setUnit] = useState(initialUnit)
  const [items, setItems] = useState<VocabItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newItem, setNewItem] = useState({ en: '', de: '', type: 'word' as 'word' | 'phrase' })
  const [editInfo, setEditInfo] = useState(false)
  const [infoForm, setInfoForm] = useState({ title: unit.title, subtitle: unit.subtitle, emoji: unit.emoji, targetUser: unit.targetUser, active: unit.active })

  const load = useCallback(() => {
    setLoading(true)
    fetchVocabItems(token, unit.id).then(setItems).finally(() => setLoading(false))
  }, [token, unit.id])

  useEffect(() => { load() }, [load])

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.en.trim() || !newItem.de.trim()) return
    setSaving(true)
    try {
      const created = await createVocabItem(token, { unitId: unit.id, ...newItem })
      setItems(prev => [...prev, created])
      setNewItem({ en: '', de: '', type: 'word' })
    } catch { alert('Fehler beim Hinzufügen') }
    finally { setSaving(false) }
  }

  async function handleDeleteItem(id: string) {
    try {
      await deleteVocabItem(token, id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch { alert('Löschen fehlgeschlagen') }
  }

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateVocabUnit(token, unit.id, infoForm)
      setUnit(u => ({ ...u, ...infoForm }))
      setEditInfo(false)
    } catch { alert('Speichern fehlgeschlagen') }
    finally { setSaving(false) }
  }

  return (
    <div className="content">
      <div className="page-header">
        <h2 className="page-title">{unit.emoji} {unit.title}</h2>
        <button className="btn-secondary" onClick={onBack}>← Zurück</button>
      </div>

      {/* Unit Info */}
      {editInfo ? (
        <form className="form-card" onSubmit={handleSaveInfo}>
          <div className="form-row">
            <div className="form-group form-group-sm">
              <label>Emoji</label>
              <input className="field" value={infoForm.emoji} maxLength={4}
                onChange={e => setInfoForm(f => ({ ...f, emoji: e.target.value }))} />
            </div>
            <div className="form-group form-group-grow">
              <label>Titel</label>
              <input className="field" value={infoForm.title}
                onChange={e => setInfoForm(f => ({ ...f, title: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Untertitel</label>
            <input className="field" value={infoForm.subtitle}
              onChange={e => setInfoForm(f => ({ ...f, subtitle: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Für wen?</label>
              <select className="field" value={infoForm.targetUser}
                onChange={e => setInfoForm(f => ({ ...f, targetUser: e.target.value }))}>
                <option value="">Alle Kinder</option>
                <option value="andrin">Nur Andrin</option>
                <option value="fiona">Nur Fiona</option>
              </select>
            </div>
            <div className="form-group">
              <label className="checkbox-label" style={{ marginTop: 28 }}>
                <input type="checkbox" checked={infoForm.active}
                  onChange={e => setInfoForm(f => ({ ...f, active: e.target.checked }))} />
                Aktiv
              </label>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setEditInfo(false)}>Abbrechen</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? '⏳...' : '💾 Speichern'}
            </button>
          </div>
        </form>
      ) : (
        <div className="info-bar">
          <span>{unit.subtitle}</span>
          {unit.targetUser && <span className="tag tag-purple">Für {unit.targetUser}</span>}
          {!unit.active && <span className="tag tag-gray">Inaktiv</span>}
          <button className="btn-sm" onClick={() => setEditInfo(true)}>Einheit bearbeiten</button>
        </div>
      )}

      {/* Word Actions */}
      <div className="section-header">
        <h3>📝 Wörter ({items.length})</h3>
        <button className="btn-secondary" onClick={() => onBulk(unit)}>📋 Bulk-Import</button>
      </div>

      {/* Add Word Form */}
      <form className="add-word-form" onSubmit={handleAddItem}>
        <input className="field" placeholder="Englisch..." value={newItem.en}
          onChange={e => setNewItem(f => ({ ...f, en: e.target.value }))} />
        <input className="field" placeholder="Deutsch..." value={newItem.de}
          onChange={e => setNewItem(f => ({ ...f, de: e.target.value }))} />
        <select className="field-sm" value={newItem.type}
          onChange={e => setNewItem(f => ({ ...f, type: e.target.value as 'word' | 'phrase' }))}>
          <option value="word">Wort</option>
          <option value="phrase">Satz</option>
        </select>
        <button type="submit" className="btn-primary" disabled={saving || !newItem.en || !newItem.de}>
          {saving ? '⏳' : '+ Hinzufügen'}
        </button>
      </form>

      {/* Word Table */}
      {loading ? <div className="loading">Lade...</div> : items.length === 0 ? (
        <div className="empty-card">
          <p>Noch keine Wörter. Füge sie einzeln hinzu oder nutze den Bulk-Import.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="word-table">
            <thead>
              <tr><th>Englisch</th><th>Deutsch</th><th>Typ</th><th></th></tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>{item.en}</td>
                  <td>{item.de}</td>
                  <td><span className={`tag ${item.type === 'phrase' ? 'tag-purple' : ''}`}>{item.type}</span></td>
                  <td>
                    <button className="btn-sm btn-danger" onClick={() => handleDeleteItem(item.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Bulk Import ──────────────────────────────────────────────────────────────

function BulkImport({ token, unit, onBack }: {
  token: string; unit: VocabUnit; onBack: (reload: boolean) => void
}) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<{ en: string; de: string; type: 'word' | 'phrase' }[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string>('')

  function handlePreview() {
    const parsed = parseBulkText(text)
    setPreview(parsed)
    setShowPreview(true)
  }

  async function handleImport() {
    setImporting(true); setResult('')
    try {
      const created = await bulkImportVocab(token, unit.id, text)
      setResult(`✅ ${created.length} Wörter importiert!`)
      setText(''); setPreview([]); setShowPreview(false)
    } catch {
      setResult('❌ Fehler beim Import')
    } finally { setImporting(false) }
  }

  return (
    <div className="content">
      <div className="page-header">
        <h2 className="page-title">📋 Bulk-Import – {unit.emoji} {unit.title}</h2>
        <button className="btn-secondary" onClick={() => onBack(!!result)}>← Zurück</button>
      </div>

      <div className="form-card">
        <p className="field-hint" style={{ marginBottom: 12 }}>
          Format: <code>englisch = deutsch</code> pro Zeile. Für Sätze: <code>Zeile [phrase]</code> anhängen.
        </p>
        <div className="format-example">
          <code>accident = Unfall</code><br />
          <code>first aid = erste Hilfe</code><br />
          <code>Stay calm. = Bleib ruhig. [phrase]</code>
        </div>

        <div className="form-group" style={{ marginTop: 16 }}>
          <label>Wörter einfügen</label>
          <textarea
            className="field textarea"
            placeholder="accident = Unfall&#10;first aid = erste Hilfe&#10;Stay calm. = Bleib ruhig. [phrase]"
            value={text}
            onChange={e => { setText(e.target.value); setShowPreview(false) }}
            rows={12}
          />
        </div>

        {result && <p className={result.startsWith('✅') ? 'success-msg' : 'error-msg'}>{result}</p>}

        <div className="form-actions">
          <button className="btn-secondary" onClick={handlePreview} disabled={!text.trim()}>
            🔍 Vorschau
          </button>
          {showPreview && preview.length > 0 && (
            <button className="btn-primary" onClick={handleImport} disabled={importing}>
              {importing ? `⏳ Importiere...` : `📥 ${preview.length} Wörter importieren`}
            </button>
          )}
        </div>

        {showPreview && (
          <div style={{ marginTop: 20 }}>
            <h4 style={{ marginBottom: 8 }}>Vorschau ({preview.length} Einträge):</h4>
            {preview.length === 0 ? (
              <p className="error-msg">Keine gültigen Einträge gefunden. Prüfe das Format.</p>
            ) : (
              <div className="table-wrap">
                <table className="word-table">
                  <thead><tr><th>Englisch</th><th>Deutsch</th><th>Typ</th></tr></thead>
                  <tbody>
                    {preview.map((item, i) => (
                      <tr key={i}>
                        <td>{item.en}</td><td>{item.de}</td>
                        <td><span className={`tag ${item.type === 'phrase' ? 'tag-purple' : ''}`}>{item.type}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [parent, setParent] = useState<Parent | null>(getParentAuth)
  const [screen, setScreen] = useState<Screen>(parent ? 'dashboard' : 'login')
  const [editingMathUnit, setEditingMathUnit] = useState<MathUnit | null | 'new'>(null)
  const [detailVocabUnit, setDetailVocabUnit] = useState<VocabUnit | null>(null)
  const [bulkVocabUnit, setBulkVocabUnit] = useState<VocabUnit | null>(null)

  function handleLogin(p: Parent) {
    setParent(p)
    setScreen('dashboard')
  }

  function handleLogout() {
    parentLogout()
    setParent(null)
    setScreen('login')
  }

  function navTo(s: Screen) {
    setScreen(s)
    setEditingMathUnit(null)
    setDetailVocabUnit(null)
    setBulkVocabUnit(null)
  }

  if (!parent) return <LoginScreen onLogin={handleLogin} />

  return (
    <div className="app">
      <NavBar
        screen={screen}
        onNav={navTo}
        onLogout={handleLogout}
        parentName={parent.name}
      />
      <main className="main">
        {screen === 'dashboard' && <Dashboard token={parent.token} />}

        {screen === 'math-list' && editingMathUnit === null && (
          <MathList token={parent.token} onEdit={u => {
            setEditingMathUnit(u ?? 'new')
            setScreen('math-form')
          }} />
        )}

        {screen === 'math-form' && (
          <MathForm
            token={parent.token}
            existing={editingMathUnit !== 'new' ? editingMathUnit : null}
            onSave={() => { setEditingMathUnit(null); setScreen('math-list') }}
            onCancel={() => { setEditingMathUnit(null); setScreen('math-list') }}
          />
        )}

        {screen === 'vocab-list' && !detailVocabUnit && (
          <VocabList token={parent.token} onDetail={u => {
            setDetailVocabUnit(u)
            setScreen('vocab-detail')
          }} />
        )}

        {screen === 'vocab-detail' && detailVocabUnit && (
          <VocabDetail
            token={parent.token}
            unit={detailVocabUnit}
            onBack={() => { setDetailVocabUnit(null); setScreen('vocab-list') }}
            onBulk={u => { setBulkVocabUnit(u); setScreen('vocab-bulk') }}
          />
        )}

        {screen === 'vocab-bulk' && bulkVocabUnit && (
          <BulkImport
            token={parent.token}
            unit={bulkVocabUnit}
            onBack={(reload) => {
              if (reload && bulkVocabUnit) setDetailVocabUnit(bulkVocabUnit)
              setBulkVocabUnit(null)
              setScreen('vocab-detail')
            }}
          />
        )}
      </main>
    </div>
  )
}
