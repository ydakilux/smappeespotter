export interface SmappeeCharger {
  serviceLocationId: number
  name: string
  lat: number
  lon: number
  serialNumber: string | null
  capacityKw: number | null
  liveWatts: number | null
}

export interface Category {
  id: number
  name: string
  color: string   // hex e.g. "#f39c12"
  emoji: string   // e.g. "📍"
  created_at: string
}

export interface CustomPin {
  id: number
  lat: number
  lng: number
  color: string
  label: string
  address: string
  category_id: number | null
  // joined fields (may be null if no category)
  category_name: string | null
  category_color: string | null
  category_emoji: string | null
  created_at: string
}
