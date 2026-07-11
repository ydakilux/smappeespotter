import { useState } from 'react'

export type WeatherLayer =
  | 'clouds_new'
  | 'temp_new'
  | 'wind_new'
  | 'pressure_new'
  | 'precipitation_new'
  | 'radar'
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
]

// Color legends per layer — OWM uses fixed palettes
const LEGENDS: Record<string, { label: string; stops: { color: string; value: string }[] }> = {
  temp_new: {
    label: 'Temperature',
    stops: [
      { color: '#821692', value: '≤ −40°C' },
      { color: '#0000ff', value: '−20°C' },
      { color: '#00aaff', value: '0°C' },
      { color: '#00ff00', value: '+10°C' },
      { color: '#ffff00', value: '+20°C' },
      { color: '#ff8800', value: '+30°C' },
      { color: '#ff0000', value: '≥ +40°C' },
    ],
  },
  wind_new: {
    label: 'Wind speed',
    stops: [
      { color: '#ffffff', value: '0 m/s' },
      { color: '#aaddff', value: '5 m/s' },
      { color: '#00aaff', value: '10 m/s' },
      { color: '#0044ff', value: '20 m/s' },
      { color: '#8800ff', value: '40 m/s' },
      { color: '#ff0000', value: '≥ 60 m/s' },
    ],
  },
  pressure_new: {
    label: 'Pressure',
    stops: [
      { color: '#0000cc', value: '950 hPa' },
      { color: '#0088ff', value: '980 hPa' },
      { color: '#00ffff', value: '1000 hPa' },
      { color: '#ffff00', value: '1010 hPa' },
      { color: '#ff4400', value: '1030 hPa' },
      { color: '#cc0000', value: '≥ 1050 hPa' },
    ],
  },
  clouds_new: {
    label: 'Cloud cover',
    stops: [
      { color: '#ffffff00', value: '0%' },
      { color: '#c8c8c864', value: '25%' },
      { color: '#c8c8c8aa', value: '50%' },
      { color: '#646464cc', value: '75%' },
      { color: '#646464ff', value: '100%' },
    ],
  },
  precipitation_new: {
    label: 'Precipitation',
    stops: [
      { color: '#ffffff00', value: '0 mm/h' },
      { color: '#a0f0f0', value: '0.1' },
      { color: '#00aaff', value: '1' },
      { color: '#0000ff', value: '4' },
      { color: '#aa00ff', value: '10' },
      { color: '#ff0000', value: '≥ 20 mm/h' },
    ],
  },
  radar: {
    label: 'Precipitation (radar)',
    stops: [
      { color: '#00aaff44', value: 'Light' },
      { color: '#00ff00aa', value: 'Moderate' },
      { color: '#ffff00cc', value: 'Heavy' },
      { color: '#ff4400ee', value: 'Intense' },
      { color: '#cc0000ff', value: 'Extreme' },
    ],
  },
}

interface WeatherPanelProps {
  activeLayer: WeatherLayer
  showWeatherClick: boolean
  onLayerChange: (layer: WeatherLayer) => void
  onShowWeatherClickChange: (v: boolean) => void
}

export function WeatherPanel({
  activeLayer,
  showWeatherClick,
  onLayerChange,
  onShowWeatherClickChange,
}: WeatherPanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const owmKey = (import.meta.env.VITE_OWM_API_KEY as string | undefined) ?? ''
  const hasKey = owmKey.length > 0 && owmKey !== 'your_owm_api_key_here'
  const legend = activeLayer ? LEGENDS[activeLayer] : null

  return (
    <div className="sidebar-section sidebar-section--collapsible">
      <button
        className="section-collapse-btn"
        onClick={() => setIsOpen(o => !o)}
      >
        <span>🌤️ Weather</span>
        <span className="collapse-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          <div className="weather-layer-grid">
            {LAYER_OPTIONS.map(opt => (
              <button
                key={String(opt.layer)}
                className={`btn weather-layer-btn ${activeLayer === opt.layer ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onLayerChange(opt.layer)}
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

          {!hasKey && (
            <p className="weather-note">⚠️ OWM layers need a key in .env → VITE_OWM_API_KEY</p>
          )}
        </>
      )}
    </div>
  )
}
