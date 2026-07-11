interface CapacityFilterProps {
  minKw: number
  maxKw: number
  showUnknown: boolean
  onMinChange: (v: number) => void
  onMaxChange: (v: number) => void
  onShowUnknownChange: (v: boolean) => void
}

export function CapacityFilter({
  minKw,
  maxKw,
  showUnknown,
  onMinChange,
  onMaxChange,
  onShowUnknownChange,
}: CapacityFilterProps) {
  return (
    <div className="capacity-filter">
      <h3>Capacity Filter</h3>
      <p className="filter-range">
        Showing: <strong>{minKw} kW – {maxKw} kW</strong>
      </p>

      <label className="slider-label">
        Min kW: {minKw}
        <input
          type="range"
          min={0}
          max={350}
          step={0.5}
          value={minKw}
          onChange={e => {
            const v = parseFloat(e.target.value)
            if (v <= maxKw) onMinChange(v)
          }}
          className="slider"
        />
      </label>

      <label className="slider-label">
        Max kW: {maxKw}
        <input
          type="range"
          min={0}
          max={350}
          step={0.5}
          value={maxKw}
          onChange={e => {
            const v = parseFloat(e.target.value)
            if (v >= minKw) onMaxChange(v)
          }}
          className="slider"
        />
      </label>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={showUnknown}
          onChange={e => onShowUnknownChange(e.target.checked)}
        />
        Show unknown capacity
      </label>
    </div>
  )
}
