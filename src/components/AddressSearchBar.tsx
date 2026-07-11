import { useState, useEffect } from 'react'
import { geocodeAddress, type NominatimResult } from '../api'

interface AddressSearchBarProps {
  onSelect: (lat: number, lng: number, address: string) => void
}

export function AddressSearchBar({ onSelect }: AddressSearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await geocodeAddress(trimmed)
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  function handleSelect(result: NominatimResult) {
    onSelect(parseFloat(result.lat), parseFloat(result.lon), result.display_name)
    setQuery('')
    setResults([])
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setResults([])
    }
  }

  return (
    <div className="address-search">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search address to add a pin…"
        autoComplete="off"
      />
      {loading && (
        <div className="address-results">
          <div className="address-result-item">…</div>
        </div>
      )}
      {!loading && results.length > 0 && (
        <div className="address-results">
          {results.map(r => (
            <div
              key={r.place_id}
              className="address-result-item"
              onMouseDown={() => handleSelect(r)}
            >
              {r.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
