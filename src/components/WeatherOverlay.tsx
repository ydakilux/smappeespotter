import { useState, useEffect } from 'react'
import L from 'leaflet'
import { TileLayer, Popup, useMapEvents, WMSTileLayer } from 'react-leaflet'
import type { WeatherLayer } from './WeatherPanel'
import { fetchPointWeather, reverseGeocode, type PointWeather } from '../api'

// ── RainViewer radar layer ───────────────────────────────────

interface RainViewerMeta {
  host: string
  radar: {
    past: Array<{ time: number; path: string }>
  }
}

function RainViewerLayer() {
  const [tileUrl, setTileUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(r => r.json() as Promise<RainViewerMeta>)
      .then(data => {
        const past = data.radar.past
        const latest = past[past.length - 1]
        setTileUrl(`${data.host}${latest.path}/512/{z}/{x}/{y}/2/1_1.png`)
      })
      .catch(console.error)
  }, [])

  if (!tileUrl) return null

  return (
    <TileLayer
      url={tileUrl}
      tileSize={512}
      maxNativeZoom={7}
      opacity={0.8}
      zIndex={10}
      attribution='<a href="https://rainviewer.com">RainViewer</a>'
    />
  )
}

// ── Weather click handler ────────────────────────────────────

interface WeatherClickHandlerProps {
  enabled: boolean
}

function WeatherClickHandler({ enabled }: WeatherClickHandlerProps) {
  const [weatherData, setWeatherData] = useState<PointWeather | null>(null)
  const [locationName, setLocationName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [popupPos, setPopupPos] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(false)

  useMapEvents({
    click(e) {
      if (!enabled) return
      const { lat, lng } = e.latlng
      setPopupPos([lat, lng])
      setWeatherData(null)
      setLocationName(null)
      setError(null)
      setLoading(true)
      
      Promise.all([
        fetchPointWeather(lat, lng),
        reverseGeocode(lat, lng).catch(() => '')
      ])
        .then(([data, loc]) => {
          setWeatherData(data)
          setLocationName(loc)
          setLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'An unknown error occurred')
          setLoading(false)
        })
    },
  })

  if (!popupPos) return null

  return (
    <Popup
      position={popupPos}
      eventHandlers={{ remove: () => { setPopupPos(null); setWeatherData(null); setLocationName(null); setError(null) } }}
    >
      <div className="weather-popup">
        {loading && <div>Loading…</div>}
        {!loading && weatherData && (
          <>
            {locationName && <div className="weather-popup-location" style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '4px' }}>📍 {locationName}</div>}
            <div className="weather-popup-title">{weatherData.description}</div>
            <div>🌡️ {weatherData.temperature}°C</div>
            <div>💨 {weatherData.windSpeed} km/h ({weatherData.windDirection}°)</div>
            <div>🌧️ {weatherData.precipitation} mm</div>
          </>
        )}
        {!loading && error && (
          <div className="weather-popup-error" style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
            ⚠️ {error}
          </div>
        )}
        {!loading && !weatherData && !error && <div>Could not load weather data.</div>}
      </div>
    </Popup>
  )
}

// ── WeatherOverlay (exported) ────────────────────────────────

interface WeatherOverlayProps {
  activeLayer: WeatherLayer
  showWeatherClick: boolean
}

export function WeatherOverlay({ activeLayer, showWeatherClick }: WeatherOverlayProps) {
  const owmKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY as string | undefined

  return (
    <>
      {activeLayer === 'radar' && <RainViewerLayer />}

      {activeLayer === 'arome_temp' && (
        <WMSTileLayer
          key="arome_temp_512"
          url={`/api/meteofrance-wms?v=2`}
          layers="TEMPERATURE__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND"
          format="image/png"
          transparent={true}
          opacity={0.6}
          version="1.3.0"
          crs={L.CRS.EPSG4326}
          bounds={[[37.5, -12.0], [55.4, 16.0]]}
          minZoom={5}
          maxNativeZoom={11}
          tileSize={512}
          attribution='Weather data &copy; <a href="https://meteofrance.com">Météo-France</a>'
        />
      )}

      {activeLayer && activeLayer !== 'radar' && activeLayer !== 'fwi' && activeLayer !== 'arome_temp' && owmKey && owmKey.length > 0 && (
        <TileLayer
          key={activeLayer}
          url={`https://tile.openweathermap.org/map/${activeLayer}/{z}/{x}/{y}.png?appid=${owmKey}`}
          opacity={0.6}
          updateWhenIdle={true}
          updateWhenZooming={false}
          maxNativeZoom={18}
          zIndex={10}
          attribution='Weather &copy; <a href="https://openweathermap.org">OpenWeatherMap</a>'
        />
      )}

      {activeLayer === 'fwi' && owmKey && owmKey.length > 0 && (
        <TileLayer
          key="fwi"
          url={`https://maps.openweathermap.org/maps/2.0/fwi/{z}/{x}/{y}?appid=${owmKey}`}
          opacity={0.6}
          updateWhenIdle={true}
          updateWhenZooming={false}
          maxNativeZoom={18}
          zIndex={10}
          attribution='Weather &copy; <a href="https://openweathermap.org">OpenWeatherMap</a>'
        />
      )}

      <WeatherClickHandler enabled={showWeatherClick} />
    </>
  )
}
