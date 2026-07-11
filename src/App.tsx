import { useState } from 'react'
import './App.css'
import { useSmappee } from './hooks/useSmappee'
import { usePins } from './hooks/usePins'
import { useCategories } from './hooks/useCategories'
import { LoginForm } from './components/LoginForm'
import { CapacityFilter } from './components/CapacityFilter'
import { MapView } from './components/MapView'
import { PinEditor } from './components/PinEditor'
import { CategoryManager } from './components/CategoryManager'
import { AddressSearchBar } from './components/AddressSearchBar'
import { WeatherPanel } from './components/WeatherPanel'
import type { WeatherLayer } from './components/WeatherPanel'
import { reverseGeocode } from './api'

function App() {
  const { loggedIn, chargers, loading, error, login, logout, refreshChargers } = useSmappee()
  const { pins, addPin, updatePin, deletePin } = usePins()
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories()

  const [minKw, setMinKw] = useState(0)
  const [maxKw, setMaxKw] = useState(350)
  const [showUnknown, setShowUnknown] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null)
  const [pendingPinAddress, setPendingPinAddress] = useState('')
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null)
  const [smappeeOpen, setSmappeeOpen] = useState(true)
  const [hiddenCategories, setHiddenCategories] = useState<Set<number>>(new Set())
  const [activeWeatherLayer, setActiveWeatherLayer] = useState<WeatherLayer>(null)
  const [showWeatherClick, setShowWeatherClick] = useState(false)

  const visibleCount = chargers.filter(c => {
    if (c.capacityKw === null) return showUnknown
    return c.capacityKw >= minKw && c.capacityKw <= maxKw
  }).length

  function toggleCategory(id: number) {
    setHiddenCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleMapClick(lat: number, lng: number) {
    setPendingPin({ lat, lng })
    setIsAdding(false)
    try {
      const addr = await reverseGeocode(lat, lng)
      setPendingPinAddress(addr)
    } catch {
      setPendingPinAddress('')
    }
  }

  async function handlePinSave(color: string, label: string, categoryId: number | null, address: string) {
    if (!pendingPin) return
    await addPin(pendingPin.lat, pendingPin.lng, color, label, categoryId, address)
    setPendingPin(null)
    setPendingPinAddress('')
  }

  function handleSearchSelect(lat: number, lng: number, address: string) {
    setPendingPin({ lat, lng })
    setPendingPinAddress(address)
    setFlyTo({ lat, lng })
  }

  async function handleMinChange(v: number) {
    setMinKw(v)
    await refreshChargers(v, maxKw)
  }

  async function handleMaxChange(v: number) {
    setMaxKw(v)
    await refreshChargers(minKw, v)
  }

  return (
    <div className="app-layout">
      <header className="top-bar">
        <h1 className="app-title">⚡ Smappee on Maps</h1>
        <div className="top-bar-right">
          {loading && <span className="badge badge-loading">Loading…</span>}
          {!loading && (
            <span className={`badge ${loggedIn ? 'badge-online' : 'badge-offline'}`}>
              {loggedIn ? 'Connected' : 'Not connected'}
            </span>
          )}
          {loggedIn && (
            <button className="btn btn-secondary" onClick={logout}>
              Logout
            </button>
          )}
        </div>
      </header>

      <div className="main-layout">
        <aside className="sidebar">

          {/* ── Smappee section (collapsible) ── */}
          <div className="sidebar-section sidebar-section--collapsible">
            <button
              className="section-collapse-btn"
              onClick={() => setSmappeeOpen(o => !o)}
            >
              <span>⚡ Smappee Chargers</span>
              <span className="collapse-arrow">{smappeeOpen ? '▲' : '▼'}</span>
            </button>

            {smappeeOpen && (
              <>
                {error && <div className="error-banner" style={{ margin: '8px 0 0' }}>{error}</div>}
                {!loggedIn ? (
                  <LoginForm onLogin={login} />
                ) : (
                  <>
                    <CapacityFilter
                      minKw={minKw}
                      maxKw={maxKw}
                      showUnknown={showUnknown}
                      onMinChange={handleMinChange}
                      onMaxChange={handleMaxChange}
                      onShowUnknownChange={setShowUnknown}
                    />
                    <p className="charger-count" style={{ padding: '0 16px 12px' }}>
                      {visibleCount} charger{visibleCount !== 1 ? 's' : ''} visible
                    </p>
                  </>
                )}
              </>
            )}
          </div>

          {/* ── Weather ── */}
          <WeatherPanel
            activeLayer={activeWeatherLayer}
            showWeatherClick={showWeatherClick}
            onLayerChange={setActiveWeatherLayer}
            onShowWeatherClickChange={setShowWeatherClick}
          />

          {/* ── Categories ── */}
          <div className="sidebar-section">
            <CategoryManager
              categories={categories}
              hiddenCategories={hiddenCategories}
              onToggleVisibility={toggleCategory}
              onAdd={addCategory}
              onUpdate={updateCategory}
              onDelete={deleteCategory}
            />
          </div>

          {/* ── Custom Pins ── */}
          <div className="sidebar-section">
            <button
              className={`btn btn-full ${isAdding ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => {
                setIsAdding(a => !a)
                setPendingPin(null)
                setPendingPinAddress('')
              }}
            >
              {isAdding ? '✕ Cancel – Click map to place pin' : '+ Add Pin'}
            </button>

            <h3 style={{ marginTop: 14 }}>Custom Pins</h3>
            {pins.length === 0 && <p className="empty-state">No pins yet. Click "+ Add Pin" then click the map.</p>}
            <ul className="pin-list">
              {pins.map(pin => (
                <li key={pin.id} className="pin-list-item">
                  <span
                    className="pin-dot"
                    style={{ background: pin.category_color ?? pin.color }}
                  />
                  {(pin.category_emoji) && (
                    <span style={{ fontSize: 13 }}>{pin.category_emoji}</span>
                  )}
                  <span className="pin-label">{pin.label || <em>No label</em>}</span>
                  <button
                    className="btn btn-danger btn-sm pin-delete"
                    onClick={() => deletePin(pin.id)}
                    title="Delete pin"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>

        </aside>

        <main className="map-area">
          <div className="map-search-bar">
            <AddressSearchBar onSelect={handleSearchSelect} />
          </div>
          <MapView
            chargers={chargers}
            minKw={minKw}
            maxKw={maxKw}
            showUnknown={showUnknown}
            pins={pins}
            categories={categories}
            hiddenCategories={hiddenCategories}
            isAdding={isAdding}
            flyTo={flyTo}
            activeWeatherLayer={activeWeatherLayer}
            showWeatherClick={showWeatherClick}
            onMapClick={handleMapClick}
            onPinUpdate={(id, color, label, categoryId, address) => updatePin(id, color, label, categoryId, address)}
            onPinDelete={deletePin}
          />
        </main>
      </div>

      {pendingPin && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>New Pin</h3>
            <p className="modal-coords">
              {pendingPin.lat.toFixed(5)}, {pendingPin.lng.toFixed(5)}
            </p>
            <PinEditor
              categories={categories}
              initialAddress={pendingPinAddress}
              onSave={(color, label, catId, address) => handlePinSave(color, label, catId, address)}
              onCancel={() => { setPendingPin(null); setPendingPinAddress('') }}
              onLocationChange={(lat, lng) => {
                setPendingPin({ lat, lng })
                setPendingPinAddress('')
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
