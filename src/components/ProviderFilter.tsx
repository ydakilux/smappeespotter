import { useState, useMemo, useEffect } from 'react'
import type { OcmOperator } from '../api'

export interface ProviderFilterProps {
  dataSource: string
  operators: OcmOperator[]
  selectedOperatorIds: (number | string)[]
  onChange: (ids: (number | string)[]) => void
}

export function ProviderFilter({ dataSource, operators, selectedOperatorIds, onChange }: ProviderFilterProps) {
  const [search, setSearch] = useState('')
  const [recentIds, setRecentIds] = useState<(number | string)[]>(() => {
    const saved = localStorage.getItem(`recentOperatorIds_${dataSource}`)
    if (saved) {
      try { return JSON.parse(saved) } catch { return [] }
    }
    return []
  })

  useEffect(() => {
    if (selectedOperatorIds.length > 0) {
      setRecentIds(prev => {
        const next = Array.from(new Set([...selectedOperatorIds, ...prev]))
        localStorage.setItem(`recentOperatorIds_${dataSource}`, JSON.stringify(next))
        return next
      })
    }
  }, [selectedOperatorIds, dataSource])

  const filteredOperators = useMemo(() => {
    let result = operators
    if (search.trim()) {
      const lowerSearch = search.toLowerCase()
      result = operators.filter(o => o.name.toLowerCase().includes(lowerSearch))
    }
    
    return [...result].sort((a, b) => {
      const aSelected = selectedOperatorIds.includes(a.id)
      const bSelected = selectedOperatorIds.includes(b.id)
      
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1
      
      const aRecent = recentIds.includes(a.id)
      const bRecent = recentIds.includes(b.id)
      
      if (aRecent && !bRecent) return -1
      if (!aRecent && bRecent) return 1
      
      return a.name.localeCompare(b.name)
    })
  }, [operators, search, selectedOperatorIds, recentIds])

  function toggleOperator(id: number | string) {
    if (selectedOperatorIds.includes(id)) {
      onChange(selectedOperatorIds.filter(x => x !== id))
    } else {
      onChange([...selectedOperatorIds, id])
    }
  }
  interface SavedFilter {
    id: string;
    name: string;
    operatorIds: (number | string)[];
  }

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    const saved = localStorage.getItem(`savedProviderFilters_${dataSource}`)
    if (saved) {
      try { return JSON.parse(saved) } catch { return [] }
    }
    return []
  })

  const [showSavePrompt, setShowSavePrompt] = useState(false)
  const [newFilterName, setNewFilterName] = useState('')

  useEffect(() => {
    localStorage.setItem(`savedProviderFilters_${dataSource}`, JSON.stringify(savedFilters))
  }, [savedFilters, dataSource])

  function handleSaveFilter() {
    if (!newFilterName.trim() || selectedOperatorIds.length === 0) return
    const newFilter: SavedFilter = {
      id: Math.random().toString(36).substring(2, 9),
      name: newFilterName.trim(),
      operatorIds: [...selectedOperatorIds],
    }
    setSavedFilters(prev => [...prev, newFilter])
    setNewFilterName('')
    setShowSavePrompt(false)
  }

  function handleDeleteFilter(id: string) {
    setSavedFilters(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div className="provider-filter">
      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>
        Provider / Operator ({selectedOperatorIds.length === 0 ? 'All' : selectedOperatorIds.length})
      </label>
      
      <input
        type="text"
        placeholder="Search providers..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '6px',
          marginBottom: '8px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          boxSizing: 'border-box',
          color: '#333',
          background: '#fff'
        }}
      />
      
      <div style={{
        maxHeight: '150px',
        overflowY: 'auto',
        border: '1px solid #ccc',
        borderRadius: '4px',
        background: '#fff',
        padding: '4px',
        boxSizing: 'border-box',
        color: '#333',
        marginBottom: '8px'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', padding: '4px', cursor: 'pointer', borderBottom: '1px solid #eee' }}>
          <input
            type="checkbox"
            checked={selectedOperatorIds.length === 0}
            onChange={() => onChange([])}
            style={{ marginRight: '8px' }}
          />
          <em>All Providers</em>
        </label>
        
        {filteredOperators.map(op => (
          <label key={op.id} style={{ display: 'flex', alignItems: 'center', padding: '4px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selectedOperatorIds.includes(op.id)}
              onChange={() => toggleOperator(op.id)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {op.name}
            </span>
          </label>
        ))}
        {filteredOperators.length === 0 && (
          <div style={{ padding: '8px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
            No providers found.
          </div>
        )}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '4px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#ccc' }}>Saved Filters</div>
        
        {savedFilters.length > 0 && (
          <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {savedFilters.map(filter => (
              <div key={filter.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => onChange([...filter.operatorIds])}
                  style={{ flex: 1, textAlign: 'left', padding: '4px 8px', fontSize: '12px', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {filter.name} ({filter.operatorIds.length})
                </button>
                <button
                  onClick={() => handleDeleteFilter(filter.id)}
                  style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', cursor: 'pointer' }}
                  title="Delete filter"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        
        {selectedOperatorIds.length > 0 && !showSavePrompt && (
          <button
            onClick={() => setShowSavePrompt(true)}
            style={{ width: '100%', padding: '4px', fontSize: '12px', background: 'transparent', color: '#3498db', border: '1px dashed #3498db', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Save current selection
          </button>
        )}
        
        {showSavePrompt && (
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
            <input
              type="text"
              placeholder="Filter name..."
              value={newFilterName}
              onChange={e => setNewFilterName(e.target.value)}
              style={{ flex: 1, padding: '4px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveFilter()
                if (e.key === 'Escape') setShowSavePrompt(false)
              }}
            />
            <button
              onClick={handleSaveFilter}
              disabled={!newFilterName.trim()}
              style={{ padding: '4px 8px', fontSize: '12px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: newFilterName.trim() ? 1 : 0.5 }}
            >
              Save
            </button>
            <button
              onClick={() => setShowSavePrompt(false)}
              style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent', color: '#ccc', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
