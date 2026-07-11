import { useState, useEffect } from 'react'
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import type { SmappeeCharger, CustomPin, Category } from '../types'
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

interface MapViewProps {
  chargers: SmappeeCharger[]
  minKw: number
  maxKw: number
  showUnknown: boolean
  pins: CustomPin[]
  categories: Category[]
  hiddenCategories: Set<number>
  isAdding: boolean
  flyTo?: { lat: number; lng: number } | null
  activeWeatherLayer: WeatherLayer
  showWeatherClick: boolean
  onMapClick: (lat: number, lng: number) => void
  onPinUpdate: (id: number, color: string, label: string, categoryId: number | null, address: string) => void
  onPinDelete: (id: number) => void
}

export function MapView({
  chargers,
  minKw,
  maxKw,
  showUnknown,
  pins,
  categories,
  hiddenCategories,
  isAdding,
  flyTo,
  activeWeatherLayer,
  showWeatherClick,
  onMapClick,
  onPinUpdate,
  onPinDelete,
}: MapViewProps) {
  const [editingPinId, setEditingPinId] = useState<number | null>(null)

  const visibleChargers = chargers.filter(c => {
    if (c.capacityKw === null) return showUnknown
    return c.capacityKw >= minKw && c.capacityKw <= maxKw
  })

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
      <FlyToLocation target={flyTo ?? null} />
      <WeatherOverlay activeLayer={activeWeatherLayer} showWeatherClick={showWeatherClick} />

      {visibleChargers.map(c => (
        <Marker key={c.serviceLocationId} position={[c.lat, c.lon]} icon={chargerIcon}>
          <Popup>
            <strong>{c.name}</strong><br />
            Capacity: {c.capacityKw !== null ? `${c.capacityKw} kW` : 'Unknown'}<br />
            {c.serialNumber && <>Serial: {c.serialNumber}<br /></>}
            {c.liveWatts !== null && <>Live: {c.liveWatts} W</>}
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
    </MapContainer>
  )
}
