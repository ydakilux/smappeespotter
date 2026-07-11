import { useState, useEffect, type FormEvent } from 'react'
import type { Category } from '../types'
import { geocodeAddress, type NominatimResult } from '../api'

interface PinEditorProps {
  initialColor?: string
  initialLabel?: string
  initialCategoryId?: number | null
  initialAddress?: string
  categories: Category[]
  onSave: (color: string, label: string, categoryId: number | null, address: string) => void
  onCancel: () => void
  onLocationChange?: (lat: number, lng: number) => void
}

export function PinEditor({
  initialColor = '#e74c3c',
  initialLabel = '',
  initialCategoryId = null,
  initialAddress = '',
  categories,
  onSave,
  onCancel,
  onLocationChange,
}: PinEditorProps) {
  const [color, setColor] = useState(initialColor)
  const [label, setLabel] = useState(initialLabel)
  const [categoryId, setCategoryId] = useState<number | null>(initialCategoryId ?? null)

  const [addressInput, setAddressInput] = useState(initialAddress)
  const [addressResults, setAddressResults] = useState<NominatimResult[]>([])
  const [addressLoading, setAddressLoading] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState(initialAddress)

  // Sync if initialAddress changes (e.g. reverse geocode arrives after mount)
  useEffect(() => {
    setAddressInput(initialAddress)
    setSelectedAddress(initialAddress)
  }, [initialAddress])

  // Debounced search
  useEffect(() => {
    const trimmed = addressInput.trim()
    // Don't search if it matches the already-selected address
    if (!trimmed || trimmed === selectedAddress) {
      setAddressResults([])
      return
    }
    const timer = setTimeout(async () => {
      setAddressLoading(true)
      try {
        const results = await geocodeAddress(trimmed)
        setAddressResults(results)
      } catch {
        setAddressResults([])
      } finally {
        setAddressLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [addressInput, selectedAddress])

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    if (val === '') {
      setCategoryId(null)
    } else {
      const id = Number(val)
      setCategoryId(id)
      const cat = categories.find(c => c.id === id)
      if (cat) setColor(cat.color)
    }
  }

  function handleSelectResult(result: NominatimResult) {
    setSelectedAddress(result.display_name)
    setAddressInput(result.display_name)
    setAddressResults([])
    if (onLocationChange) {
      onLocationChange(parseFloat(result.lat), parseFloat(result.lon))
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSave(color, label, categoryId, selectedAddress)
  }

  return (
    <div className="pin-editor">
      <form onSubmit={handleSubmit}>
        {/* 1. Address search */}
        <div className="pin-editor-field">
          <label>🔍 Address</label>
          <div className="address-search">
            <input
              type="text"
              className="address-search-input"
              value={addressInput}
              onChange={e => setAddressInput(e.target.value)}
              placeholder="Search address…"
              autoComplete="off"
            />
            {addressLoading && (
              <div className="address-results">
                <div className="address-result-item">…</div>
              </div>
            )}
            {!addressLoading && addressResults.length > 0 && (
              <div className="address-results">
                {addressResults.map(r => (
                  <div
                    key={r.place_id}
                    className="address-result-item"
                    onMouseDown={() => handleSelectResult(r)}
                  >
                    {r.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Category */}
        <label className="pin-editor-field">
          Category
          <select value={categoryId ?? ''} onChange={handleCategoryChange}>
            <option value="">-- No category --</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.emoji} {cat.name}
              </option>
            ))}
          </select>
        </label>

        {/* 3. Color */}
        <label className="pin-editor-field">
          Color
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
          />
        </label>

        {/* 4. Label */}
        <label className="pin-editor-field">
          Label
          <input
            type="text"
            value={label}
            maxLength={100}
            onChange={e => setLabel(e.target.value)}
            placeholder="Optional label…"
          />
        </label>

        {/* 5. Actions */}
        <div className="pin-editor-actions">
          <button type="submit" className="btn btn-primary btn-sm">Save</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
