interface CapacityFilterProps {
  minKw: number
  maxKw: number
  showUnknown: boolean
  onMinChange: (v: number) => void
  onMaxChange: (v: number) => void
  onShowUnknownChange: (v: boolean) => void
}

const COMMON_KW_VALUES = [0, 3, 7, 11, 22, 43, 50, 100, 150, 200, 250, 300, 350];

function getClosestIndex(val: number) {
  let closestIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < COMMON_KW_VALUES.length; i++) {
    const diff = Math.abs(COMMON_KW_VALUES[i] - val);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }
  return closestIdx;
}

export function CapacityFilter({
  minKw,
  maxKw,
  showUnknown,
  onMinChange,
  onMaxChange,
  onShowUnknownChange,
}: CapacityFilterProps) {
  const minIdx = getClosestIndex(minKw);
  const maxIdx = getClosestIndex(maxKw);

  return (
    <div className="capacity-filter">
      <h3 style={{ marginBottom: '8px' }}>Capacity Filter</h3>
      <p className="filter-range">
        Showing: <strong>{minKw} kW – {maxKw} kW</strong>
      </p>

      <label className="slider-label">
        Min kW: {minKw}
        <input
          type="range"
          min={0}
          max={COMMON_KW_VALUES.length - 1}
          step={1}
          value={minIdx}
          onChange={e => {
            const idx = parseInt(e.target.value, 10)
            if (idx <= maxIdx) onMinChange(COMMON_KW_VALUES[idx])
          }}
          className="slider"
        />
      </label>

      <label className="slider-label">
        Max kW: {maxKw}
        <input
          type="range"
          min={0}
          max={COMMON_KW_VALUES.length - 1}
          step={1}
          value={maxIdx}
          onChange={e => {
            const idx = parseInt(e.target.value, 10)
            if (idx >= minIdx) onMaxChange(COMMON_KW_VALUES[idx])
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
