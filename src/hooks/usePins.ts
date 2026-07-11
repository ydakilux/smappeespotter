import { useState, useEffect, useCallback } from 'react'
import type { CustomPin } from '../types'
import { apiGetPins, apiCreatePin, apiUpdatePin, apiDeletePin } from '../api'

interface UsePinsReturn {
  pins: CustomPin[]
  loadPins: () => Promise<void>
  addPin: (lat: number, lng: number, color: string, label: string, categoryId?: number | null, address?: string) => Promise<void>
  updatePin: (id: number, color: string, label: string, categoryId?: number | null, address?: string) => Promise<void>
  deletePin: (id: number) => Promise<void>
}

export function usePins(): UsePinsReturn {
  const [pins, setPins] = useState<CustomPin[]>([])

  const loadPins = useCallback(async () => {
    const data = await apiGetPins()
    setPins(data)
  }, [])

  useEffect(() => {
    loadPins().catch(console.error)
  }, [loadPins])

  const addPin = useCallback(
    async (lat: number, lng: number, color: string, label: string, categoryId?: number | null, address?: string) => {
      const pin = await apiCreatePin(lat, lng, color, label, categoryId, address)
      setPins(prev => [...prev, pin])
    },
    [],
  )

  const updatePin = useCallback(
    async (id: number, color: string, label: string, categoryId?: number | null, address?: string) => {
      const updated = await apiUpdatePin(id, color, label, categoryId, address)
      setPins(prev => prev.map(p => (p.id === id ? updated : p)))
    },
    [],
  )

  const deletePin = useCallback(async (id: number) => {
    await apiDeletePin(id)
    setPins(prev => prev.filter(p => p.id !== id))
  }, [])

  return { pins, loadPins, addPin, updatePin, deletePin }
}
