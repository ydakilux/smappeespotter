import { useState, useEffect } from 'react'

export type WeatherLayer =
  | 'clouds_new'
  | 'temp_new'
  | 'wind_new'
  | 'pressure_new'
  | 'precipitation_new'
  | 'radar'
  | 'fwi'
  | 'arome_temp'
  | null

interface LayerOption {
  layer: WeatherLayer
  emoji: string
  label: string
}

const LAYER_OPTIONS: LayerOption[] = [
  { layer: null,                emoji: '❌', label: 'None' },
  { layer: 'clouds_new',        emoji: '☁️', label: 'Clouds' },
  { layer: 'temp_new',          emoji: '🌡️', label: 'Temp' },
  { layer: 'wind_new',          emoji: '💨', label: 'Wind' },
  { layer: 'pressure_new',      emoji: '🔵', label: 'Pressure' },
  { layer: 'precipitation_new', emoji: '🌧️', label: 'Rain' },
  { layer: 'radar',             emoji: '📡', label: 'Radar' },
  { layer: 'fwi',               emoji: '🔥', label: 'Fire Risk' },
  { layer: 'arome_temp',        emoji: '🇫🇷', label: 'MF Temp' },
]

// Color legends per layer — OWM uses fixed palettes
const LEGENDS: Record<string, { label: string; stops: { color: string; value: string }[] }> = {
  temp_new: {
    label: 'Temperature',
    stops: [
      { color: '#821692', value: '≤ −45°C' },
      { color: '#8257db', value: '−40°C' },
      { color: '#208cec', value: '−20°C' },
      { color: '#20c4e8', value: '−10°C' },
      { color: '#23dddd', value: '0°C' },
      { color: '#c2ff28', value: '+10°C' },
      { color: '#fff028', value: '+20°C' },
      { color: '#ffc228', value: '+25°C' },
      { color: '#fc8014', value: '≥ +30°C' },
    ],
  },
  wind_new: {
    label: 'Wind speed',
    stops: [
      { color: '#ffffff00', value: '0 m/s' },
      { color: '#eeeeee', value: '5 m/s' },
      { color: '#b364bc', value: '15 m/s' },
      { color: '#3f223b', value: '25 m/s' },
      { color: '#744cac', value: '≥ 50 m/s' },
    ],
  },
  pressure_new: {
    label: 'Pressure',
    stops: [
      { color: '#0010d8', value: '950 hPa' },
      { color: '#0085ff', value: '980 hPa' },
      { color: '#00eeff', value: '1000 hPa' },
      { color: '#e0ff00', value: '1010 hPa' },
      { color: '#ffaa00', value: '1030 hPa' },
      { color: '#ff0000', value: '1050 hPa' },
      { color: '#830000', value: '≥ 1070 hPa' },
    ],
  },
  clouds_new: {
    label: 'Cloud cover',
    stops: [
      { color: '#ffffff00', value: '0%' },
      { color: '#e6e6e6', value: '10%' },
      { color: '#cccccc', value: '20%' },
      { color: '#b3b3b3', value: '30%' },
      { color: '#999999', value: '40%' },
      { color: '#808080', value: '50%' },
      { color: '#666666', value: '60%' },
      { color: '#4d4d4d', value: '70%' },
      { color: '#333333', value: '80%' },
      { color: '#1a1a1a', value: '90%' },
      { color: '#000000', value: '100%' },
    ],
  },
  precipitation_new: {
    label: 'Precipitation',
    stops: [
      { color: '#ffffff00', value: '0 mm/h' },
      { color: '#c0e1e1', value: '1 mm/h' },
      { color: '#78b4d2', value: '2 mm/h' },
      { color: '#4b78c8', value: '3 mm/h' },
      { color: '#a050f0', value: '5 mm/h' },
      { color: '#fa2828', value: '≥ 10 mm/h' },
    ],
  },
  radar: {
    label: 'Precipitation (radar)',
    stops: [
      { color: '#00aaff44', value: 'Light' },
      { color: '#0000ffcc', value: 'Moderate' },
      { color: '#ff0000ff', value: 'Heavy' },
      { color: '#ff00ffff', value: 'Extreme' },
    ],
  },
  fwi: {
    label: 'Fire Weather Index',
    stops: [
      { color: '#008000', value: 'Low (< 5.2)' },
      { color: '#ffff00', value: 'Moderate (5.2 - 11.2)' },
      { color: '#ffa500', value: 'High (11.2 - 21.3)' },
      { color: '#ff0000', value: 'Very High (21.3 - 50.0)' },
      { color: '#7f1d1d', value: 'Extreme (≥ 50.0)' },
    ],
  },
}

interface WeatherPanelProps {
  activeLayer: WeatherLayer
  showWeatherClick: boolean
  onLayerChange: (layer: WeatherLayer) => void
  onShowWeatherClickChange: (val: boolean) => void
  showWeather: boolean
  onShowWeatherChange: (val: boolean) => void
}

export function WeatherPanel({
  activeLayer,
  showWeatherClick,
  onLayerChange,
  onShowWeatherClickChange,
  showWeather,
  onShowWeatherChange
}: WeatherPanelProps) {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('weatherPanelOpen');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('weatherPanelOpen', String(isOpen));
  }, [isOpen]);

  const owmKey = (import.meta.env.VITE_OPENWEATHERMAP_API_KEY as string | undefined) ?? ''
  const hasKey = owmKey.length > 0 && owmKey !== 'your_owm_api_key_here'
  
  // Météo-France authentication is now handled securely in the backend

  const legend = activeLayer && activeLayer !== 'arome_temp' ? LEGENDS[activeLayer] : null

  return (
    <div className="sidebar-section sidebar-section--collapsible">
      <div className="section-collapse-btn" style={{ cursor: 'default' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={showWeather} 
            onChange={(e) => onShowWeatherChange(e.target.checked)} 
          />
          <span>🌤️ Weather</span>
        </label>
        <button 
          onClick={() => setIsOpen(o => !o)} 
          style={{ background: 'transparent', border: 'none', color: '#8888aa', cursor: 'pointer', padding: '0 8px' }}
        >
          <span className="collapse-arrow">{isOpen ? '▲' : '▼'}</span>
        </button>
      </div>

      {isOpen && (
        <>
          <div className="weather-layer-grid">
            {LAYER_OPTIONS.map(opt => (
              <button
                key={String(opt.layer)}
                className={`btn weather-layer-btn ${activeLayer === opt.layer ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  onLayerChange(opt.layer)
                  if (opt.layer !== null) {
                    onShowWeatherChange(true)
                  }
                }}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Color legend */}
          {legend && (
            <div className="weather-legend">
              <div className="weather-legend-title">{legend.label}</div>
              <div className="weather-legend-bar">
                {legend.stops.map((s, i) => (
                  <div key={i} className="weather-legend-stop">
                    <span className="weather-legend-swatch" style={{ background: s.color }} />
                    <span className="weather-legend-value">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="weather-divider" />

          <label className="weather-click-label">
            <input
              type="checkbox"
              checked={showWeatherClick}
              onChange={e => onShowWeatherClickChange(e.target.checked)}
            />
            Click map for weather
          </label>

          {!hasKey && activeLayer && activeLayer !== 'arome_temp' && activeLayer !== 'radar' && (
            <p className="weather-note">⚠️ OWM layers need a key in .env → VITE_OPENWEATHERMAP_API_KEY</p>
          )}

        </>
      )}
    </div>
  )
}
