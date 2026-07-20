import { useState, useEffect } from 'react'
import { apiExtractLocations, geocodeAddress, apiGetModels } from '../api'
import type { Category } from '../api'
import type { TempPin } from './MapView'

export interface ValidatedLocation extends TempPin {
  selected: boolean;
  context?: string;
  originalName: string;
}

interface ImportLocationsPanelProps {
  categories: Category[];
  onAddTempPins: (pins: TempPin[]) => void;
  onClearTempPins: () => void;
  onSavePins: (pins: ValidatedLocation[], categoryId: number | null) => void;
  onFlyTo: (lat: number, lng: number) => void;
}

export function ImportLocationsPanel({ categories, onAddTempPins, onClearTempPins, onSavePins, onFlyTo }: ImportLocationsPanelProps) {
  const [text, setText] = useState('')
  const [model, setModel] = useState(() => localStorage.getItem('wattmap_ai_model') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locations, setLocations] = useState<ValidatedLocation[]>([])
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>('')

  useEffect(() => {
    apiGetModels()
      .then(models => {
        if (models.length > 0) {
          setAvailableModels(models);
          const savedModel = localStorage.getItem('wattmap_ai_model');
          if (savedModel && models.includes(savedModel)) {
            setModel(savedModel);
          } else {
            // Cheapest available flash model (e.g., 2.5 is cheaper than 3.5)
            const cheapest = models.find(m => m.includes('2.5')) || models.find(m => m.includes('2.0')) || models[0];
            setModel(cheapest);
            localStorage.setItem('wattmap_ai_model', cheapest);
          }
        }
      })
      .catch(err => console.error("Failed to load models:", err));
  }, []);

  function handleModelChange(m: string) {
    setModel(m);
    localStorage.setItem('wattmap_ai_model', m);
  }
  
  async function handleAnalyze() {
    if (!text.trim()) return;
    setLoading(true)
    setError('')
    setLocations([])
    onClearTempPins()

    try {
      const extracted = await apiExtractLocations(text, model);
      if (extracted.length === 0) {
        setError('No locations found in the text.');
        setLoading(false);
        return;
      }

      const validated: ValidatedLocation[] = [];
      
      for (const loc of extracted) {
        if (loc.lat !== undefined && loc.lng !== undefined && !isNaN(loc.lat) && !isNaN(loc.lng)) {
          validated.push({
            id: Math.random().toString(36).substr(2, 9),
            lat: loc.lat,
            lng: loc.lng,
            label: loc.name,
            originalName: loc.name,
            context: loc.context,
            selected: true,
          });
          continue; // Skip geocoding if we already have coordinates
        }

        try {
          const results = await geocodeAddress(loc.name);
          if (results.length > 0) {
            const best = results[0];
            validated.push({
              id: Math.random().toString(36).substr(2, 9),
              lat: parseFloat(best.lat),
              lng: parseFloat(best.lon),
              label: best.display_name.split(',')[0] || loc.name,
              originalName: loc.name,
              context: loc.context,
              selected: true,
            });
          }
        } catch (e) {
          console.warn(`Failed to geocode: ${loc.name}`, e);
        }
      }

      if (validated.length === 0) {
        setError('Locations found but geocoding failed for all of them.');
      } else {
        setLocations(validated);
        onAddTempPins(validated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to extract locations');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(id: string) {
    const next = locations.map(l => l.id === id ? { ...l, selected: !l.selected } : l);
    setLocations(next);
    onAddTempPins(next.filter(l => l.selected));
  }

  function handleSave() {
    const selected = locations.filter(l => l.selected);
    onSavePins(selected, selectedCategoryId === '' ? null : Number(selectedCategoryId));
    setLocations([]);
    onClearTempPins();
    setText('');
  }

  return (
    <div style={{ padding: '16px' }}>
      <p style={{ fontSize: '13px', marginBottom: '12px', color: '#555' }}>
        Paste an Instagram description (or any text) to automatically extract places to visit.
      </p>
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. My top 5 places to visit in Paris! 1. Eiffel Tower 2. Louvre..."
        style={{
          width: '100%',
          minHeight: '100px',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          marginBottom: '12px',
          fontFamily: 'inherit',
          resize: 'vertical'
        }}
      />
      
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px', color: '#555' }}>
          AI Model
        </label>
        <select
          value={model}
          onChange={(e) => handleModelChange(e.target.value)}
          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #3a3a5a', background: '#12122a', color: '#e0e0f0' }}
        >
          {availableModels.length > 0 ? (
            availableModels.map(m => (
              <option key={m} value={m}>{m}</option>
            ))
          ) : (
            <>
              <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            </>
          )}
        </select>
      </div>

      <button 
        className="btn btn-primary btn-full"
        onClick={handleAnalyze}
        disabled={loading || !text.trim()}
      >
        {loading ? 'Analyzing with AI...' : 'Extract Locations'}
      </button>

      {error && <div className="error-banner" style={{ marginTop: '12px' }}>{error}</div>}

      {locations.length > 0 && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0' }}>Validate Locations</h4>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {locations.map(loc => (
              <li key={loc.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px', background: '#12122a', border: '1px solid #2a2a45', borderRadius: '6px' }}>
                <input
                  type="checkbox"
                  checked={loc.selected}
                  onChange={() => toggleSelection(loc.id)}
                  style={{ marginTop: '4px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#e0e0e8' }}>
                    {loc.label} 
                    <button 
                      onClick={() => onFlyTo(loc.lat, loc.lng)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '12px' }}
                      title="View on map"
                    >
                      🔍
                    </button>
                  </div>
                  {loc.context && <div style={{ fontSize: '12px', color: '#aaaacc', marginTop: '4px', lineHeight: 1.3 }}><em>{loc.context}</em></div>}
                  <div style={{ fontSize: '11px', color: '#666688', marginTop: '4px' }}>Lat: {loc.lat.toFixed(4)}, Lng: {loc.lng.toFixed(4)}</div>
                </div>
              </li>
            ))}
          </ul>
          
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1 }}
              onClick={() => {
                setLocations([]);
                onClearTempPins();
              }}
            >
              Cancel
            </button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <select 
                value={selectedCategoryId} 
                onChange={e => setSelectedCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #3a3a5a', background: '#12122a', color: '#e0e0f0' }}
              >
                <option value="">No Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.name}
                  </option>
                ))}
              </select>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                onClick={handleSave}
                disabled={locations.filter(l => l.selected).length === 0}
              >
                Save {locations.filter(l => l.selected).length} Pins
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
