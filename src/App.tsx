import { useState, useEffect } from 'react'
import L from 'leaflet'
import './App.css'
import { useChargers } from './hooks/useChargers'
import { usePins } from './hooks/usePins'
import { useCategories } from './hooks/useCategories'
import { CapacityFilter } from './components/CapacityFilter'
import { MapView } from './components/MapView'
import { PinEditor } from './components/PinEditor'
import { CategoryManager } from './components/CategoryManager'
import { AddressSearchBar } from './components/AddressSearchBar'
import { WeatherPanel } from './components/WeatherPanel'
import { ProviderFilter } from './components/ProviderFilter'
import type { WeatherLayer } from './components/WeatherPanel'
import { ImportLocationsPanel, type ValidatedLocation } from './components/ImportLocationsPanel'
import type { TempPin } from './components/MapView'
import { reverseGeocode } from './api'

function App() {
  const { chargers, operators, loading, error, dataSource, setDataSource, refreshChargers, loadOperators } = useChargers()
  const { pins, addPin, updatePin, deletePin } = usePins()
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories()

  const [minKw, setMinKw] = useState(() => {
    const saved = localStorage.getItem('minKw');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [maxKw, setMaxKw] = useState(() => {
    const saved = localStorage.getItem('maxKw');
    return saved ? parseInt(saved, 10) : 350;
  });
  const [showUnknown, setShowUnknown] = useState(() => {
    const saved = localStorage.getItem('showUnknown');
    return saved ? saved === 'true' : true;
  });
  const [operatorIdsOcm, setOperatorIdsOcm] = useState<number[]>(() => {
    const saved = localStorage.getItem('operatorIdsOcm');
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    return [];
  })
  const [operatorIdsIrve, setOperatorIdsIrve] = useState<string[]>(() => {
    const saved = localStorage.getItem('operatorIdsIrve');
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    return [];
  })

  const operatorIds = dataSource === 'IRVE' ? operatorIdsIrve : operatorIdsOcm;

  function handleOperatorIdsChange(ids: (number | string)[]) {
    if (dataSource === 'IRVE') {
      setOperatorIdsIrve(ids as string[]);
    } else {
      setOperatorIdsOcm(ids as number[]);
    }
  }
  
  const [isAdding, setIsAdding] = useState(false)
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null)
  const [pendingPinAddress, setPendingPinAddress] = useState('')
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null)
  const [chargersOpen, setChargersOpen] = useState(() => {
    const saved = localStorage.getItem('chargersOpen');
    return saved !== null ? saved === 'true' : true;
  });
  const [hiddenCategories, setHiddenCategories] = useState<Set<number>>(new Set())
  const [activeWeatherLayer, setActiveWeatherLayer] = useState<WeatherLayer>(null)
  const [showWeatherClick, setShowWeatherClick] = useState(false)
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null)
  const [activePinMenuId, setActivePinMenuId] = useState<number | null>(null)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  
  const [tempPins, setTempPins] = useState<TempPin[]>([])
  
  const [showChargers, setShowChargers] = useState(() => {
    const saved = localStorage.getItem('showChargers');
    return saved !== null ? saved === 'true' : true;
  });
  const [showWeather, setShowWeather] = useState(() => {
    const saved = localStorage.getItem('showWeather');
    return saved !== null ? saved === 'true' : true;
  });
  const [pinsOpen, setPinsOpen] = useState(() => {
    const saved = localStorage.getItem('pinsOpen');
    return saved !== null ? saved === 'true' : true;
  });
  const [categoriesOpen, setCategoriesOpen] = useState(() => {
    const saved = localStorage.getItem('categoriesOpen');
    return saved !== null ? saved === 'true' : true;
  });
  const [aiImportOpen, setAiImportOpen] = useState(() => {
    const saved = localStorage.getItem('aiImportOpen');
    return saved !== null ? saved === 'true' : false;
  });

  useEffect(() => {
    loadOperators()
  }, [loadOperators])

  useEffect(() => {
    if (mapBounds) {
      const timeoutId = setTimeout(() => {
        refreshChargers(mapBounds, operatorIds, minKw, maxKw)
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [mapBounds, operatorIds, minKw, maxKw, refreshChargers])

  useEffect(() => {
    localStorage.setItem('minKw', String(minKw));
    localStorage.setItem('maxKw', String(maxKw));
    localStorage.setItem('showUnknown', String(showUnknown));
    localStorage.setItem('operatorIdsOcm', JSON.stringify(operatorIdsOcm));
    localStorage.setItem('operatorIdsIrve', JSON.stringify(operatorIdsIrve));
    localStorage.setItem('chargersOpen', String(chargersOpen));
    localStorage.setItem('showChargers', String(showChargers));
    localStorage.setItem('showWeather', String(showWeather));
    localStorage.setItem('pinsOpen', String(pinsOpen));
    localStorage.setItem('categoriesOpen', String(categoriesOpen));
    localStorage.setItem('aiImportOpen', String(aiImportOpen));
  }, [minKw, maxKw, showUnknown, operatorIdsOcm, operatorIdsIrve, chargersOpen, showChargers, showWeather, pinsOpen, categoriesOpen, aiImportOpen]);

  const visibleCount = chargers.length

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

  async function handleSaveAILocations(locations: ValidatedLocation[], categoryId: number | null = null) {
    // Save to DB and refresh pins list
    for (const loc of locations) {
      await addPin(loc.lat, loc.lng, '#9b59b6', loc.label, categoryId, loc.originalName)
    }
  }

  return (
    <div className="app-layout">
      <header className="top-bar">
        <div className="top-bar-left">
          <h1 className="app-title">⚡ Public Chargers on Maps</h1>
        </div>
        <div className="top-bar-right">
          {loading && <span className="badge badge-loading">Loading…</span>}
          <button 
            className="mobile-menu-btn" 
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>
      </header>

      <div className="main-layout">
        <main className="map-area">
          <div className="map-search-bar">
             <AddressSearchBar onSelect={handleSearchSelect} />
          </div>
          <MapView
            chargers={showChargers ? chargers : []}
            pins={pins}
            tempPins={tempPins}
            categories={categories}
            hiddenCategories={hiddenCategories}
            isAdding={isAdding}
            flyTo={flyTo}
            activeWeatherLayer={showWeather ? activeWeatherLayer : null}
            showWeatherClick={showWeatherClick}
            onMapClick={handleMapClick}
            onPinUpdate={(id, color, label, categoryId, address) => updatePin(id, color, label, categoryId, address)}
            onPinDelete={(id) => {
              if (window.confirm("Are you sure you want to delete this pin?")) {
                deletePin(id);
              }
            }}
            onBoundsChange={setMapBounds}
          />
        </main>

        <aside className={`sidebar ${isMobileSidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header-mobile">
            <h2 style={{ margin: 0, fontSize: '16px' }}>Menu</h2>
            <button className="close-btn" onClick={() => setIsMobileSidebarOpen(false)}>✕</button>
          </div>

          {/* ── Chargers section (collapsible) ── */}
          <div className="sidebar-section sidebar-section--collapsible">
            <div className="section-collapse-btn" style={{ cursor: 'default' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={showChargers} 
                  onChange={(e) => setShowChargers(e.target.checked)} 
                />
                <span>⚡ Charging Stations</span>
              </label>
              <button 
                onClick={() => setChargersOpen(o => !o)} 
                style={{ background: 'transparent', border: 'none', color: '#8888aa', cursor: 'pointer', padding: '0 8px' }}
              >
                <span className="collapse-arrow">{chargersOpen ? '▲' : '▼'}</span>
              </button>
            </div>

            {chargersOpen && (
              <>
                {error && <div className="error-banner" style={{ margin: '8px 0 0' }}>{error}</div>}
                
                <div style={{ padding: '16px 16px 0' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                    Data Source
                  </label>
                  <select
                    value={dataSource}
                    onChange={(e) => {
                      const newSource = e.target.value as 'OCM' | 'IRVE';
                      setDataSource(newSource);
                      localStorage.setItem('dataSource', newSource);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      marginBottom: '16px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      background: '#fff',
                      color: '#333'
                    }}
                  >
                    <option value="OCM">OpenChargeMap (Global)</option>
                    <option value="IRVE">IRVE Data.gouv (France)</option>
                  </select>
                </div>
                <div style={{ padding: '16px 16px 0' }}>
                  <ProviderFilter
                    key={dataSource}
                    dataSource={dataSource}
                    operators={operators}
                    selectedOperatorIds={operatorIds}
                    onChange={handleOperatorIdsChange}
                  />
                </div>

                <CapacityFilter
                  minKw={minKw}
                  maxKw={maxKw}
                  showUnknown={showUnknown}
                  onMinChange={setMinKw}
                  onMaxChange={setMaxKw}
                  onShowUnknownChange={setShowUnknown}
                />
                <p className="charger-count" style={{ padding: '0 16px 12px' }}>
                  {visibleCount} charger{visibleCount !== 1 ? 's' : ''} visible
                </p>
              </>
            )}
          </div>

          {/* ── Weather ── */}
          <WeatherPanel
            activeLayer={activeWeatherLayer}
            showWeatherClick={showWeatherClick}
            onLayerChange={setActiveWeatherLayer}
            onShowWeatherClickChange={setShowWeatherClick}
            showWeather={showWeather}
            onShowWeatherChange={setShowWeather}
          />

          {/* ── Categories ── */}
          <div className="sidebar-section sidebar-section--collapsible">
            <button
              className="section-collapse-btn"
              onClick={() => setCategoriesOpen(o => !o)}
            >
              <span>📁 Categories</span>
              <span className="collapse-arrow">{categoriesOpen ? '▲' : '▼'}</span>
            </button>
            {categoriesOpen && (
              <div style={{ padding: '0 16px 16px' }}>
                <CategoryManager
                  categories={categories}
                  hiddenCategories={hiddenCategories}
                  onToggleVisibility={toggleCategory}
                  onAdd={addCategory}
                  onUpdate={updateCategory}
                  onDelete={async (id) => {
                    if (window.confirm("Are you sure you want to delete this category? All pins in it will lose their category.")) {
                      await deleteCategory(id);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* ── AI Import ── */}
          <div className="sidebar-section sidebar-section--collapsible">
            <button
              className="section-collapse-btn"
              onClick={() => setAiImportOpen(o => !o)}
            >
              <span>✨ AI Import</span>
              <span className="collapse-arrow">{aiImportOpen ? '▲' : '▼'}</span>
            </button>
            {aiImportOpen && (
              <ImportLocationsPanel
                categories={categories}
                onAddTempPins={setTempPins}
                onClearTempPins={() => setTempPins([])}
                onSavePins={handleSaveAILocations}
                onFlyTo={(lat, lng) => setFlyTo({ lat, lng })}
              />
            )}
          </div>

          {/* ── Custom Pins ── */}
          <div className="sidebar-section sidebar-section--collapsible">
            <button
              className="section-collapse-btn"
              onClick={() => setPinsOpen(o => !o)}
            >
              <span>📍 Custom Pins</span>
              <span className="collapse-arrow">{pinsOpen ? '▲' : '▼'}</span>
            </button>
            {pinsOpen && (
              <div style={{ padding: '16px' }}>
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

                {pins.length === 0 && <p className="empty-state" style={{ marginTop: 14 }}>No pins yet. Click "+ Add Pin" then click the map.</p>}
                {pins.length > 0 && (
                  <ul className="pin-list" style={{ marginTop: 14 }}>
                    {pins.map(pin => (
                      <li key={pin.id} className="pin-list-item" style={{ position: 'relative' }}>
                        <span
                          className="pin-dot"
                          style={{ background: pin.category_color ?? pin.color }}
                        />
                        {(pin.category_emoji) && (
                          <span style={{ fontSize: 13 }}>{pin.category_emoji}</span>
                        )}
                        <span className="pin-label">{pin.label || <em>No label</em>}</span>
                        
                        <div style={{ position: 'relative' }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => setActivePinMenuId(activePinMenuId === pin.id ? null : pin.id)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '18px', color: '#666' }}
                          >
                            ⋮
                          </button>
                          {activePinMenuId === pin.id && (
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              background: 'white',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              zIndex: 10,
                              minWidth: '100px',
                              display: 'flex',
                              flexDirection: 'column'
                            }}>
                              <button
                                onClick={() => {
                                  setFlyTo({ lat: pin.lat, lng: pin.lng })
                                  setActivePinMenuId(null)
                                  setIsMobileSidebarOpen(false)
                                }}
                                style={{ padding: '8px 12px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid #eee' }}
                              >
                                🔍 Zoom to
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to delete this pin?")) {
                                    deletePin(pin.id)
                                    setActivePinMenuId(null)
                                  }
                                }}
                                style={{ padding: '8px 12px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: 'red' }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

        </aside>

        {/* Mobile backdrop */}
        {isMobileSidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setIsMobileSidebarOpen(false)} />
        )}
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
