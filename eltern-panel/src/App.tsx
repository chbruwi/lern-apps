import { useState, useEffect, useCallback } from 'react'
import {
  Parent, Child, MathUnit, VocabUnit, VocabItem, ActivityEntry, Operation,
  parentLogin, getParentAuth, parentLogout,
  fetchChildren, fetchActivityLog,
  fetchMathUnits, createMathUnit, updateMathUnit, deleteMathUnit,
  fetchVocabUnits, createVocabUnit, updateVocabUnit, deleteVocabUnit,
  fetchVocabItems, createVocabItem, deleteVocabItem,
  createVocabItemWithImage, bulkImportVocab, parseBulkText,
} from './pb'

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | 'login' | 'dashboard'
  | 'math-list' | 'math-form'
  | 'vocab-list' | 'vocab-detail' | 'vocab-bulk' | 'vocab-photo'

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

function NavBar({ screen, onNav, onLogout, parentName, onSettings }: {
  screen: Screen; onNav: (s: Screen) => void; onLogout: () => void; parentName: string; onSettings: () => void
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
        <button className="nav-logout" onClick={onSettings} title="Einstellungen">⚙️</button>
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

function VocabList({ token, onDetail, onPhoto }: { token: string; onDetail: (u: VocabUnit) => void; onPhoto: () => void }) {
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={onPhoto}>📸 Aus Foto</button>
          <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? '✕ Abbrechen' : '+ Neue Einheit'}
          </button>
        </div>
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

// ─── Gemini API Helpers ───────────────────────────────────────────────────────

const GEMINI_KEY_SK = 'lernheld-gemini-key'
export function getGeminiKey(): string {
  try { return localStorage.getItem(GEMINI_KEY_SK) || '' } catch { return '' }
}
function saveGeminiKey(key: string) {
  try { localStorage.setItem(GEMINI_KEY_SK, key) } catch {}
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mimeType })
}

async function ocrVocabFromPhoto(apiKey: string, imageBase64: string): Promise<{ en: string; de: string }[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'This image shows a vocabulary list. Extract all word/phrase pairs. Return ONLY a JSON array like: [{"en":"word","de":"Übersetzung"}]. English on left, German translation on right. No markdown, no explanation — only the raw JSON array.' },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
          ]
        }]
      })
    }
  )
  if (!res.ok) throw new Error(`Gemini Fehler (${res.status})`)
  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Keine Wörter erkannt – bitte manuell eingeben')
  return JSON.parse(match[0])
}

async function generateVocabImage(apiKey: string, en: string, de: string): Promise<Blob | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{
            prompt: `Children's educational flashcard illustration: "${en}" (German: ${de}). Simple, colorful, clear depiction of the concept, cartoon style, no text, white background.`
          }],
          parameters: { sampleCount: 1, aspectRatio: '1:1' }
        })
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const b64: string | undefined = data.predictions?.[0]?.bytesBase64Encoded
    if (!b64) return null
    return base64ToBlob(b64, 'image/png')
  } catch { return null }
}

// ─── Settings Modal ───────────────────────────────────────────────────────────

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState(getGeminiKey)
  const [saved, setSaved] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    saveGeminiKey(key.trim())
    setSaved(true)
    setTimeout(onClose, 800)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚙️ Einstellungen</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Gemini API Key</label>
            <input className="field" type="password" placeholder="AIza..."
              value={key} onChange={e => setKey(e.target.value)} autoComplete="off" />
            <span className="field-hint">
              Holen unter <a href="https://aistudio.google.com" target="_blank" rel="noopener">aistudio.google.com</a> → "Get API key". Wird nur lokal gespeichert.
            </span>
          </div>
          {saved && <p className="success-msg">✅ Gespeichert!</p>}
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={!key.trim()}>💾 Speichern</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Photo Wizard ─────────────────────────────────────────────────────────────

interface WizardWord {
  en: string
  de: string
  type: 'word' | 'phrase'
  imageBlob: Blob | null
  imagePreview: string | null
  status: 'pending' | 'generating' | 'done' | 'failed'
}

function PhotoWizard({ token, geminiKey, onDone, onBack }: {
  token: string; geminiKey: string
  onDone: () => void; onBack: () => void
}) {
  type Step = 'upload' | 'review' | 'generate'
  const [step, setStep] = useState<Step>('upload')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [words, setWords] = useState<WizardWord[]>([])
  const [unitForm, setUnitForm] = useState({ title: '', emoji: '📚', targetUser: 'fiona', active: true })
  const [genProgress, setGenProgress] = useState(0)
  const [genRunning, setGenRunning] = useState(false)
  const [genDone, setGenDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)
  const [saveDone, setSaveDone] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrError('')
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      setPhotoPreview(dataUrl)
      const base64 = dataUrl.split(',')[1]
      setOcrLoading(true)
      try {
        const extracted = await ocrVocabFromPhoto(geminiKey, base64)
        setWords(extracted.map(w => ({ ...w, type: 'word' as const, imageBlob: null, imagePreview: null, status: 'pending' as const })))
        setStep('review')
      } catch (err: any) {
        setOcrError(err.message || 'OCR fehlgeschlagen')
      } finally { setOcrLoading(false) }
    }
    reader.readAsDataURL(file)
  }

  function removeWord(i: number) { setWords(w => w.filter((_, j) => j !== i)) }
  function updateWord(i: number, field: 'en' | 'de' | 'type', val: string) {
    setWords(w => w.map((word, j) => j === i ? { ...word, [field]: val } : word))
  }
  function addWord() {
    setWords(w => [...w, { en: '', de: '', type: 'word', imageBlob: null, imagePreview: null, status: 'pending' }])
  }

  async function handleGenerate() {
    setStep('generate')
    setGenRunning(true)
    setGenProgress(0)
    const updated = [...words]
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: 'generating' }
      setWords([...updated])
      const blob = await generateVocabImage(geminiKey, updated[i].en, updated[i].de)
      updated[i] = {
        ...updated[i],
        imageBlob: blob,
        imagePreview: blob ? URL.createObjectURL(blob) : null,
        status: blob ? 'done' : 'failed',
      }
      setWords([...updated])
      setGenProgress(i + 1)
      // Small delay to avoid rate limiting
      if (i < updated.length - 1) await new Promise(r => setTimeout(r, 300))
    }
    setGenRunning(false)
    setGenDone(true)
  }

  async function handleSave() {
    if (!unitForm.title.trim()) { setSaveError('Bitte Titel eingeben'); return }
    setSaving(true); setSaveError(''); setSaveProgress(0)
    try {
      const unit = await createVocabUnit(token, {
        title: unitForm.title.trim(), subtitle: '', emoji: unitForm.emoji,
        targetUser: unitForm.targetUser, active: unitForm.active, sortOrder: 99,
      })
      const validWords = words.filter(w => w.en.trim() && w.de.trim())
      for (let i = 0; i < validWords.length; i++) {
        const w = validWords[i]
        await createVocabItemWithImage(token, unit.id, w.en, w.de, w.type, w.imageBlob)
        setSaveProgress(i + 1)
      }
      setSaveDone(true)
    } catch (err: any) {
      setSaveError(err.message || 'Speichern fehlgeschlagen')
    } finally { setSaving(false) }
  }

  if (saveDone) {
    return (
      <div className="content">
        <div className="empty-card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <h3 style={{ marginTop: 12 }}>Unit erstellt!</h3>
          <p>{unitForm.emoji} {unitForm.title} mit {words.filter(w => w.en && w.de).length} Wörtern</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={onDone}>Zur Unit-Liste</button>
        </div>
      </div>
    )
  }

  return (
    <div className="content">
      <div className="page-header">
        <h2 className="page-title">📸 Neue Unit aus Foto</h2>
        <button className="btn-secondary" onClick={onBack}>← Zurück</button>
      </div>

      {/* Step indicator */}
      <div className="wizard-steps">
        {(['upload', 'review', 'generate'] as Step[]).map((s, i) => (
          <div key={s} className={`wizard-step ${step === s ? 'step-active' : steps_done(step, s) ? 'step-done' : ''}`}>
            <span className="step-num">{steps_done(step, s) ? '✓' : i + 1}</span>
            <span className="step-label">{s === 'upload' ? 'Foto' : s === 'review' ? 'Prüfen' : 'Generieren'}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="form-card">
          {!geminiKey && (
            <div className="warning-box">⚠️ Kein Gemini API Key gesetzt. Bitte zuerst unter ⚙️ den Key eintragen.</div>
          )}
          <div className="form-group">
            <label>Foto der Vokabelliste</label>
            <input type="file" accept="image/*" capture="environment" className="field"
              onChange={handleFileChange} disabled={ocrLoading || !geminiKey} />
            <span className="field-hint">Foto machen oder Bild aus Galerie wählen. Gemini liest die Wörter automatisch aus.</span>
          </div>
          {ocrLoading && <p className="loading">⏳ Wörter werden erkannt...</p>}
          {ocrError && <p className="error-msg">{ocrError}</p>}
          {photoPreview && <img src={photoPreview} alt="Foto" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginTop: 12 }} />}
        </div>
      )}

      {/* Step 2: Review */}
      {step === 'review' && (
        <div className="form-card">
          <div className="form-row" style={{ marginBottom: 16 }}>
            <div className="form-group form-group-sm">
              <label>Emoji</label>
              <input className="field" value={unitForm.emoji} maxLength={4}
                onChange={e => setUnitForm(f => ({ ...f, emoji: e.target.value }))} />
            </div>
            <div className="form-group form-group-grow">
              <label>Unit-Titel *</label>
              <input className="field" placeholder="z.B. Unit 4 – Sport & Fitness"
                value={unitForm.title} onChange={e => setUnitForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Für wen?</label>
              <select className="field" value={unitForm.targetUser}
                onChange={e => setUnitForm(f => ({ ...f, targetUser: e.target.value }))}>
                <option value="">Alle</option>
                <option value="andrin">Andrin</option>
                <option value="fiona">Fiona</option>
              </select>
            </div>
          </div>

          <div className="section-header" style={{ marginBottom: 8 }}>
            <h4>📝 {words.length} Wörter erkannt</h4>
            <button type="button" className="btn-sm" onClick={addWord}>+ Wort</button>
          </div>
          <div className="table-wrap">
            <table className="word-table">
              <thead><tr><th>Englisch</th><th>Deutsch</th><th>Typ</th><th></th></tr></thead>
              <tbody>
                {words.map((w, i) => (
                  <tr key={i}>
                    <td><input className="field field-inline" value={w.en}
                      onChange={e => updateWord(i, 'en', e.target.value)} /></td>
                    <td><input className="field field-inline" value={w.de}
                      onChange={e => updateWord(i, 'de', e.target.value)} /></td>
                    <td>
                      <select className="field-sm" value={w.type}
                        onChange={e => updateWord(i, 'type', e.target.value)}>
                        <option value="word">Wort</option>
                        <option value="phrase">Satz</option>
                      </select>
                    </td>
                    <td><button className="btn-sm btn-danger" onClick={() => removeWord(i)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={handleGenerate}
              disabled={words.length === 0 || !unitForm.title.trim()}>
              🎨 Bilder generieren →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Generate & Save */}
      {step === 'generate' && (
        <div className="form-card">
          {genRunning && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ marginBottom: 8 }}>⏳ Generiere Bild {genProgress + 1} von {words.length}...</p>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${(genProgress / words.length) * 100}%` }} />
              </div>
            </div>
          )}
          {genDone && !saving && !saveDone && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <span className="success-msg" style={{ margin: 0 }}>✅ {words.filter(w => w.status === 'done').length} Bilder generiert</span>
                {words.filter(w => w.status === 'failed').length > 0 && (
                  <span className="error-msg" style={{ margin: 0 }}>⚠️ {words.filter(w => w.status === 'failed').length} fehlgeschlagen (werden ohne Bild gespeichert)</span>
                )}
              </div>
              <div className="image-preview-grid">
                {words.map((w, i) => (
                  <div key={i} className="preview-item">
                    {w.imagePreview
                      ? <img src={w.imagePreview} alt={w.en} className="preview-img" />
                      : <div className="preview-placeholder">{w.status === 'failed' ? '❌' : '⏳'}</div>
                    }
                    <div className="preview-label">{w.en}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {saving && (
            <div style={{ marginBottom: 16 }}>
              <p>💾 Speichere {saveProgress} / {words.filter(w => w.en && w.de).length}...</p>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${(saveProgress / words.filter(w => w.en && w.de).length) * 100}%` }} />
              </div>
            </div>
          )}
          {saveError && <p className="error-msg">{saveError}</p>}
          {genDone && !saving && !saveDone && (
            <div className="form-actions">
              <button className="btn-primary" onClick={handleSave}>💾 In PocketBase speichern</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function steps_done(current: string, check: string): boolean {
  const order = ['upload', 'review', 'generate']
  return order.indexOf(current) > order.indexOf(check)
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [parent, setParent] = useState<Parent | null>(getParentAuth)
  const [screen, setScreen] = useState<Screen>(parent ? 'dashboard' : 'login')
  const [editingMathUnit, setEditingMathUnit] = useState<MathUnit | null | 'new'>(null)
  const [detailVocabUnit, setDetailVocabUnit] = useState<VocabUnit | null>(null)
  const [bulkVocabUnit, setBulkVocabUnit] = useState<VocabUnit | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [geminiKey, setGeminiKeyState] = useState(getGeminiKey)

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

  function handleSettingsClose() {
    setShowSettings(false)
    setGeminiKeyState(getGeminiKey())
  }

  if (!parent) return <LoginScreen onLogin={handleLogin} />

  return (
    <div className="app">
      {showSettings && <SettingsModal onClose={handleSettingsClose} />}
      <NavBar
        screen={screen}
        onNav={navTo}
        onLogout={handleLogout}
        parentName={parent.name}
        onSettings={() => setShowSettings(true)}
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
          }} onPhoto={() => setScreen('vocab-photo')} />
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

        {screen === 'vocab-photo' && (
          <PhotoWizard
            token={parent.token}
            geminiKey={geminiKey}
            onDone={() => setScreen('vocab-list')}
            onBack={() => setScreen('vocab-list')}
          />
        )}
      </main>
    </div>
  )
}
