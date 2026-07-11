import { useState } from 'react'
import type { Category } from '../types'
import { PictogramPicker } from './PictogramPicker'

interface CategoryManagerProps {
  categories: Category[]
  hiddenCategories: Set<number>
  onToggleVisibility: (id: number) => void
  onAdd: (name: string, color: string, emoji: string) => Promise<void>
  onUpdate: (id: number, fields: Partial<{ name: string; color: string; emoji: string }>) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

interface EditState {
  name: string
  color: string
  emoji: string
}

export function CategoryManager({
  categories,
  hiddenCategories,
  onToggleVisibility,
  onAdd,
  onUpdate,
  onDelete,
}: CategoryManagerProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState<EditState>({ name: '', color: '#f39c12', emoji: '📍' })
  const [showNew, setShowNew] = useState(false)
  const [newState, setNewState] = useState<EditState>({ name: '', color: '#3498db', emoji: '📍' })
  const [newError, setNewError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditState({ name: cat.name, color: cat.color, emoji: cat.emoji })
    setEditError(null)
  }

  async function saveEdit() {
    if (editingId === null) return
    if (!editState.name.trim()) { setEditError('Name is required'); return }
    setSaving(true)
    setEditError(null)
    try {
      await onUpdate(editingId, editState)
      setEditingId(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this category? Pins using it will become uncategorised.')) return
    await onDelete(id)
  }

  async function saveNew() {
    if (!newState.name.trim()) { setNewError('Name is required'); return }
    setSaving(true)
    setNewError(null)
    try {
      await onAdd(newState.name.trim(), newState.color, newState.emoji || '📍')
      setNewState({ name: '', color: '#3498db', emoji: '📍' })
      setShowNew(false)
    } catch (err) {
      setNewError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="category-manager">
      <div className="category-manager-header">
        <h3>Categories</h3>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setShowNew(s => !s); setNewError(null) }}
        >
          {showNew ? 'Cancel' : '+ New'}
        </button>
      </div>

      {/* New category form */}
      {showNew && (
        <div className="category-new-form">
          <input
            type="color"
            value={newState.color}
            title="Color"
            onChange={e => setNewState(s => ({ ...s, color: e.target.value }))}
          />
          <PictogramPicker
            value={newState.emoji}
            onChange={emoji => setNewState(s => ({ ...s, emoji }))}
          />
          <input
            type="text"
            value={newState.name}
            placeholder="Category name…"
            autoFocus
            onChange={e => { setNewState(s => ({ ...s, name: e.target.value })); setNewError(null) }}
            onKeyDown={e => { if (e.key === 'Enter') saveNew() }}
          />
          <button className="btn btn-primary btn-sm" onClick={saveNew} disabled={saving}>
            {saving ? '…' : 'Save'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setShowNew(false); setNewError(null) }}>
            Cancel
          </button>
          {newError && <div className="category-error">{newError}</div>}
        </div>
      )}

      <ul className="category-list">
        {categories.length === 0 && !showNew && (
          <li><p className="empty-state">No categories yet. Click "+ New" to add one.</p></li>
        )}
        {categories.map(cat => {
          const hidden = hiddenCategories.has(cat.id)
          return (
            <li key={cat.id}>
              {editingId === cat.id ? (
                <div className="category-edit-form">
                  <input
                    type="color"
                    value={editState.color}
                    title="Color"
                    onChange={e => setEditState(s => ({ ...s, color: e.target.value }))}
                  />
                  <PictogramPicker
                    value={editState.emoji}
                    onChange={emoji => setEditState(s => ({ ...s, emoji }))}
                  />
                  <input
                    type="text"
                    value={editState.name}
                    placeholder="Name"
                    autoFocus
                    onChange={e => { setEditState(s => ({ ...s, name: e.target.value })); setEditError(null) }}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit() }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving}>
                    {saving ? '…' : 'Save'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditingId(null); setEditError(null) }}>
                    Cancel
                  </button>
                  {editError && <div className="category-error">{editError}</div>}
                </div>
              ) : (
                <div className="category-item" style={{ opacity: hidden ? 0.45 : 1 }}>
                  <span className="category-emoji">{cat.emoji}</span>
                  <span
                    className="category-dot"
                    style={{ background: cat.color }}
                  />
                  <span className="category-name">{cat.name}</span>
                  <div className="category-actions">
                    <button
                      className={`btn btn-sm category-visibility-btn${hidden ? ' category-hidden' : ''}`}
                      title={hidden ? 'Show on map' : 'Hide from map'}
                      onClick={() => onToggleVisibility(cat.id)}
                    >
                      {hidden ? '👁️‍🗨️' : '👁️'}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      title="Edit"
                      onClick={() => startEdit(cat)}
                    >✎</button>
                    <button
                      className="btn btn-danger btn-sm"
                      title="Delete"
                      onClick={() => handleDelete(cat.id)}
                    >✕</button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
