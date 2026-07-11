import type { SmappeeCharger, CustomPin, Category } from './types'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function apiLogin(username: string, password: string): Promise<void> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  await handleResponse<unknown>(res)
}

export async function apiLogout(): Promise<void> {
  const res = await fetch('/api/auth/logout', { method: 'POST' })
  await handleResponse<unknown>(res)
}

export async function apiAuthStatus(): Promise<{ loggedIn: boolean }> {
  const res = await fetch('/api/auth/status')
  return handleResponse<{ loggedIn: boolean }>(res)
}

export async function apiGetChargers(minKw: number, maxKw: number): Promise<SmappeeCharger[]> {
  const params = new URLSearchParams({ minKw: String(minKw), maxKw: String(maxKw) })
  const res = await fetch(`/api/chargers?${params}`)
  return handleResponse<SmappeeCharger[]>(res)
}

export async function apiGetPins(): Promise<CustomPin[]> {
  const res = await fetch('/api/pins')
  return handleResponse<CustomPin[]>(res)
}

export async function apiCreatePin(
  lat: number,
  lng: number,
  color: string,
  label: string,
  categoryId?: number | null,
  address?: string,
): Promise<CustomPin> {
  const res = await fetch('/api/pins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, color, label, category_id: categoryId ?? null, address: address ?? '' }),
  })
  return handleResponse<CustomPin>(res)
}

export async function apiUpdatePin(
  id: number,
  color: string,
  label: string,
  categoryId?: number | null,
  address?: string,
): Promise<CustomPin> {
  const res = await fetch(`/api/pins/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ color, label, category_id: categoryId ?? null, address: address ?? '' }),
  })
  return handleResponse<CustomPin>(res)
}

export async function apiDeletePin(id: number): Promise<void> {
  const res = await fetch(`/api/pins/${id}`, { method: 'DELETE' })
  await handleResponse<unknown>(res)
}

// Category API

export async function apiGetCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories')
  return handleResponse<Category[]>(res)
}

export async function apiCreateCategory(
  name: string,
  color: string,
  emoji: string,
): Promise<Category> {
  const res = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color, emoji }),
  })
  return handleResponse<Category>(res)
}

export async function apiUpdateCategory(
  id: number,
  fields: Partial<{ name: string; color: string; emoji: string }>,
): Promise<Category> {
  const res = await fetch(`/api/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  })
  return handleResponse<Category>(res)
}

export async function apiDeleteCategory(id: number): Promise<void> {
  const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
  await handleResponse<unknown>(res)
}

// Nominatim geocoding

export interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

export async function geocodeAddress(query: string): Promise<NominatimResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`
  const res = await fetch(url, { headers: { 'User-Agent': 'SmappeeSpotter/1.0' } })
  if (!res.ok) throw new Error('Geocoding failed')
  return res.json() as Promise<NominatimResult[]>
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
  const res = await fetch(url, { headers: { 'User-Agent': 'SmappeeSpotter/1.0' } })
  if (!res.ok) return ''
  const data = await res.json() as { display_name?: string }
  return data.display_name ?? ''
}

// ── Weather (Open-Meteo, no key) ────────────────────────────

const WMO_CODES: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Rain showers', 81: 'Heavy showers', 82: 'Violent showers',
  95: 'Thunderstorm', 99: 'Heavy thunderstorm',
}

export interface PointWeather {
  temperature: number    // °C
  windSpeed: number      // km/h
  windDirection: number  // degrees
  precipitation: number  // mm
  description: string
  weatherCode: number
}

export async function fetchPointWeather(lat: number, lon: number): Promise<PointWeather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,precipitation` +
    `&wind_speed_unit=kmh&temperature_unit=celsius`
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Weather API rate limit reached (HTTP 429). Please try again in a few seconds.')
    }
    const errData = await res.json().catch(() => null) as { reason?: string; message?: string; error?: boolean } | null
    const reason = errData?.reason || errData?.message || `HTTP ${res.status}`
    throw new Error(`Weather load failed: ${reason}`)
  }
  const data = await res.json() as {
    current: {
      temperature_2m: number
      wind_speed_10m: number
      wind_direction_10m: number
      weather_code: number
      precipitation: number
    }
  }
  const c = data.current
  return {
    temperature: c.temperature_2m,
    windSpeed: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    precipitation: c.precipitation,
    weatherCode: c.weather_code,
    description: WMO_CODES[c.weather_code] ?? `Code ${c.weather_code}`,
  }
}
