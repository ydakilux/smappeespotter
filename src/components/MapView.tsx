import { useState, useEffect } from 'react'
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import type { PublicCharger, CustomPin, Category } from '../types'
import { PinEditor } from './PinEditor'
import { WeatherOverlay } from './WeatherOverlay'
import type { WeatherLayer } from './WeatherPanel'

// Fix Leaflet default icon in bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

function makeCircleIcon(color: string, emoji: string, size: number) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2px solid rgba(255,255,255,0.8);
      display:flex;align-items:center;justify-content:center;
      font-size:13px;line-height:1;box-shadow:0 2px 6px rgba(0,0,0,0.4);
    ">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  })
}

function makeChargerIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:#2ecc71;border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.4)
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -14],
  })
}

const chargerIcon = makeChargerIcon()

interface MapClickHandlerProps {
  isAdding: boolean
  onMapClick: (lat: number, lng: number) => void
}

function MapClickHandler({ isAdding, onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      if (isAdding) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

function FlyToLocation({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 15)
  }, [target, map])
  return null
}

function BoundsHandler({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMap()
  useEffect(() => {
    onBoundsChange(map.getBounds())
  }, [map, onBoundsChange])

  useMapEvents({
    moveend() {
      onBoundsChange(map.getBounds())
    },
    zoomend() {
      onBoundsChange(map.getBounds())
    }
  })
  return null
}

export interface TempPin {
  id: string
  lat: number
  lng: number
  label: string
}

interface MapViewProps {
  chargers: PublicCharger[]
  pins: CustomPin[]
  tempPins?: TempPin[]
  categories: Category[]
  hiddenCategories: Set<number>
  isAdding: boolean
  flyTo?: { lat: number; lng: number } | null
  activeWeatherLayer: WeatherLayer
  showWeatherClick: boolean
  onMapClick: (lat: number, lng: number) => void
  onPinUpdate: (id: number, color: string, label: string, categoryId: number | null, address: string) => void
  onPinDelete: (id: number) => void
  onBoundsChange: (bounds: L.LatLngBounds) => void
}

export function MapView({
  chargers,
  pins,
  tempPins = [],
  categories,
  hiddenCategories,
  isAdding,
  flyTo,
  activeWeatherLayer,
  showWeatherClick,
  onMapClick,
  onPinUpdate,
  onPinDelete,
  onBoundsChange,
}: MapViewProps) {
  const [editingPinId, setEditingPinId] = useState<number | null>(null)

  const visiblePins = pins.filter(pin => {
    if (pin.category_id !== null && hiddenCategories.has(pin.category_id)) return false
    return true
  })

  return (
    <MapContainer
      center={[50.85, 4.35]}
      zoom={10}
      style={{ width: '100%', height: '100%', cursor: isAdding ? 'crosshair' : '' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      <MapClickHandler isAdding={isAdding} onMapClick={onMapClick} />
      <BoundsHandler onBoundsChange={onBoundsChange} />
      <FlyToLocation target={flyTo ?? null} />
      <WeatherOverlay activeLayer={activeWeatherLayer} showWeatherClick={showWeatherClick} />

      {chargers.map(c => (
        <Marker key={c.id} position={[c.lat, c.lon]} icon={chargerIcon}>
          <Popup maxWidth={350} minWidth={250}>
            <div style={{ padding: '4px' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '16px' }}>{c.name}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>ID: {c.id}</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  {c.operatorName}
                </div>
              </div>

              <div style={{ marginBottom: '12px', fontSize: '13px' }}>
                <strong style={{ display: 'block', marginBottom: '4px', borderBottom: '1px solid #ddd' }}>Location Details</strong>
                {c.address && <div>{c.address}</div>}
                {c.town && <div>{c.town}</div>}
                {c.state && <div>{c.state}</div>}
                {c.postcode && <div>{c.postcode}</div>}
                {c.country && <div>{c.country}</div>}
                <div style={{ color: '#666', marginTop: '4px' }}>
                  Lat/Long: {c.lat.toFixed(6)} , {c.lon.toFixed(6)}
                </div>
              </div>

              <div style={{ fontSize: '13px' }}>
                <strong style={{ display: 'block', marginBottom: '4px', borderBottom: '1px solid #ddd' }}>Equipment Details</strong>
                <div>Stations/Bays: {c.connectionsCount}</div>
                {c.capacityKw && (!c.equipmentDetails || c.equipmentDetails.length === 0) && (
                  <div style={{ marginTop: '4px' }}>
                    Max Power: <strong>{c.capacityKw} kW</strong>
                  </div>
                )}
                {c.equipmentDetails && c.equipmentDetails.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {c.equipmentDetails.map((eq, idx) => (
                      <div key={idx} style={{ background: '#f8f9fa', padding: '6px', borderRadius: '4px' }}>
                        <strong style={{ display: 'block' }}>{eq.type}</strong>
                        {eq.powerKw && <span>{eq.powerKw} kW </span>}
                        {eq.currentType && <span>({eq.currentType})</span>}
                        {eq.status && (
                          <div style={{ fontSize: '12px', marginTop: '2px', color: eq.status.includes('Operational') ? 'green' : '#666' }}>
                            <span style={{ background: '#e0e0e0', padding: '1px 4px', borderRadius: '4px', marginRight: '4px', color: '#000' }}>{eq.count} x</span> {eq.status}
                          </div>
                        )}
                        {!eq.status && (
                          <div style={{ fontSize: '12px', marginTop: '2px', color: '#666' }}>
                            <span style={{ background: '#e0e0e0', padding: '1px 4px', borderRadius: '4px', marginRight: '4px', color: '#000' }}>{eq.count} x</span> (Status Unknown)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {c.rawData && (
                <div style={{ marginTop: '12px', borderTop: '1px solid #ddd', paddingTop: '8px', textAlign: 'center' }}>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => {
                      console.log('--- Raw Data for', c.name, '---');
                      console.log(c.rawData);
                      alert('Raw data has been logged to the browser console (press F12 to view).');
                    }}
                  >
                    View Raw Data
                  </button>
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {visiblePins.map(pin => {
        const pinColor = pin.category_color ?? pin.color
        const pinEmoji = pin.category_emoji ?? '📍'
        return (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={makeCircleIcon(pinColor, pinEmoji, 26)}
          >
            <Popup>
              {editingPinId === pin.id ? (
                <PinEditor
                  initialColor={pin.color}
                  initialLabel={pin.label}
                  initialCategoryId={pin.category_id}
                  initialAddress={pin.address}
                  categories={categories}
                  onSave={(color, label, categoryId, address) => {
                    onPinUpdate(pin.id, color, label, categoryId, address)
                    setEditingPinId(null)
                  }}
                  onCancel={() => setEditingPinId(null)}
                />
              ) : (
                <div className="pin-popup">
                  {pin.label && <strong>{pin.label}</strong>}
                  {pin.address && (
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 4, maxWidth: 180 }}>
                      📍 {pin.address}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                    <span
                      style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: pinColor, display: 'inline-block', border: '1px solid #ccc',
                      }}
                    />
                    <span>{pinColor}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                    Category: {pin.category_name ?? 'None'}
                  </div>
                  <div className="pin-popup-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingPinId(pin.id)}>
                      Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => onPinDelete(pin.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </Popup>
          </Marker>
        )
      })}

      {tempPins.map(pin => (
        <Marker
          key={pin.id}
          position={[pin.lat, pin.lng]}
          icon={makeCircleIcon('#95a5a6', '⭐', 22)}
        >
          <Popup>
            <div className="pin-popup">
              <strong>{pin.label}</strong>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                📍 Temporary Pin
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
