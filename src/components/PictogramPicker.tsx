import { useState, useRef, useEffect } from 'react'

const PICTOGRAMS: Record<string, string[]> = {
  'Places': ['🏠','🏢','🏪','🏨','🏦','🏥','🏫','🏛️','⛪','🕌','🏗️','🏭','🏰','🏯','🗼','🗽','🗿'],
  'Transport': ['🚗','🚕','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🛵','🏍️','🚲','🛴','✈️','🚢','⛽','🅿️','🚏'],
  'Nature': ['🌲','🌳','🌴','🌵','🌾','🍀','🌻','🌊','⛰️','🏔️','🌋','🏕️','🌅','🌄'],
  'Food & Drink': ['🍕','🍔','🍣','☕','🍺','🍷','🥐','🛒'],
  'Activities': ['⚽','🏀','🎾','🎯','🎮','🎭','🎨','🎵','🏋️','🧘'],
  'Markers': ['📍','📌','🚩','🏁','⭐','🌟','❤️','💛','💚','💙','💜','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🔶','🔷','✅','❌','⚠️','🔥','💧','⚡','🔑','🔒','🔧','💡','📷','💰','🎁'],
}

const EMOJI_NAMES: Record<string, string> = {
  '🏠': 'home house', '🏢': 'office building', '🏪': 'store shop', '🏨': 'hotel', '🏦': 'bank',
  '🏥': 'hospital medical', '🏫': 'school', '🏛️': 'museum government', '⛪': 'church',
  '🕌': 'mosque', '🏗️': 'construction site', '🏭': 'factory industrial', '🏰': 'castle',
  '🏯': 'japanese castle', '🗼': 'tower eiffel', '🗽': 'statue liberty', '🗿': 'statue moai',
  '🚗': 'car vehicle', '🚕': 'taxi cab', '🚌': 'bus public transport', '🚎': 'trolleybus',
  '🏎️': 'racing car sport', '🚓': 'police car', '🚑': 'ambulance emergency', '🚒': 'fire truck engine',
  '🚐': 'minibus van', '🛻': 'pickup truck', '🚚': 'delivery truck', '🚛': 'articulated lorry',
  '🛵': 'scooter moped', '🏍️': 'motorcycle motorbike', '🚲': 'bicycle bike', '🛴': 'kick scooter',
  '✈️': 'airplane plane flight', '🚢': 'ship boat ferry', '⛽': 'fuel gas station petrol',
  '🅿️': 'parking', '🚏': 'bus stop',
  '🌲': 'tree forest', '🌳': 'deciduous tree park', '🌴': 'palm tree tropical', '🌵': 'cactus desert',
  '🌾': 'wheat grain field', '🍀': 'four leaf clover luck', '🌻': 'sunflower garden', '🌊': 'wave ocean sea',
  '⛰️': 'mountain hill', '🏔️': 'snow mountain peak', '🌋': 'volcano eruption', '🏕️': 'camping tent',
  '🌅': 'sunrise sunset', '🌄': 'sunrise mountain',
  '🍕': 'pizza food', '🍔': 'burger hamburger', '🍣': 'sushi japanese food', '☕': 'coffee cafe hot drink',
  '🍺': 'beer pub bar', '🍷': 'wine restaurant', '🥐': 'croissant bakery', '🛒': 'shopping cart supermarket',
  '⚽': 'soccer football sport', '🏀': 'basketball sport', '🎾': 'tennis sport', '🎯': 'target dart',
  '🎮': 'video game controller', '🎭': 'theater arts', '🎨': 'art palette paint', '🎵': 'music note',
  '🏋️': 'gym weight lifting', '🧘': 'yoga meditation',
  '📍': 'pin location marker', '📌': 'pushpin marker', '🚩': 'flag red', '🏁': 'checkered flag finish',
  '⭐': 'star favorite', '🌟': 'glowing star special', '❤️': 'heart love red', '💛': 'heart yellow',
  '💚': 'heart green', '💙': 'heart blue', '💜': 'heart purple', '🔴': 'red circle dot',
  '🟠': 'orange circle', '🟡': 'yellow circle', '🟢': 'green circle', '🔵': 'blue circle',
  '🟣': 'purple circle', '⚫': 'black circle', '⚪': 'white circle', '🔶': 'orange diamond',
  '🔷': 'blue diamond', '✅': 'check tick done', '❌': 'cross x error', '⚠️': 'warning caution',
  '🔥': 'fire hot', '💧': 'water drop', '⚡': 'lightning bolt electric', '🔑': 'key lock access',
  '🔒': 'lock secure closed', '🔧': 'wrench tool repair', '💡': 'light bulb idea', '📷': 'camera photo',
  '💰': 'money bag cash', '🎁': 'gift present box',
}

// Flat list of all emojis for filtering
const ALL_EMOJIS = Object.values(PICTOGRAMS).flat()

interface PictogramPickerProps {
  value: string
  onChange: (emoji: string) => void
}

export function PictogramPicker({ value, onChange }: PictogramPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  const filtered = search.trim()
    ? ALL_EMOJIS.filter(e => (EMOJI_NAMES[e] ?? '').toLowerCase().includes(search.toLowerCase()))
    : null

  function handleSelect(emoji: string) {
    onChange(emoji)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        className="pictogram-trigger"
        onClick={() => setOpen(o => !o)}
        title="Choose pictogram"
      >
        {value || '📍'} <span style={{ fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <div className="pictogram-panel">
          <input
            type="text"
            className="pictogram-search"
            placeholder="Search pictogram…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />

          {filtered ? (
            // Search results — flat grid, no group labels
            <div className="pictogram-grid">
              {filtered.length === 0 && (
                <div style={{ fontSize: 12, color: '#666', padding: '4px 2px' }}>No results</div>
              )}
              {filtered.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  className={`pictogram-cell${emoji === value ? ' selected' : ''}`}
                  title={EMOJI_NAMES[emoji] ?? emoji}
                  onMouseDown={() => handleSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
            // Grouped view
            Object.entries(PICTOGRAMS).map(([group, emojis]) => (
              <div key={group}>
                <div className="pictogram-group-label">{group}</div>
                <div className="pictogram-grid">
                  {emojis.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      className={`pictogram-cell${emoji === value ? ' selected' : ''}`}
                      title={EMOJI_NAMES[emoji] ?? emoji}
                      onMouseDown={() => handleSelect(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
