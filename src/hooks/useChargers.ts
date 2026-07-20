import { useState, useCallback } from 'react'
import L from 'leaflet'
import { apiGetChargers, apiGetIrveChargers, apiGetOperators, apiGetIrveOperators } from '../api'
import type { OcmOperator } from '../api'
import type { PublicCharger } from '../types'

export type DataSource = 'OCM' | 'IRVE';

export interface UseChargersReturn {
  chargers: PublicCharger[]
  operators: OcmOperator[]
  loading: boolean
  error: string | null
  dataSource: DataSource
  setDataSource: (source: DataSource) => void
  refreshChargers: (bounds: L.LatLngBounds, operatorIds: (string | number)[], minKw: number, maxKw: number) => Promise<void>
  loadOperators: () => Promise<void>
}

export function useChargers(): UseChargersReturn {
  const [chargers, setChargers] = useState<PublicCharger[]>([])
  const [operators, setOperators] = useState<OcmOperator[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [dataSource, setDataSource] = useState<DataSource>(() => {
    const saved = localStorage.getItem('dataSource');
    return (saved === 'IRVE') ? 'IRVE' : 'OCM';
  });

  const loadOperators = useCallback(async () => {
    try {
      const ops = dataSource === 'IRVE' ? await apiGetIrveOperators() : await apiGetOperators();
      setOperators(ops)
    } catch (err) {
      console.error('Failed to load operators:', err)
    }
  }, [dataSource])

  const refreshChargers = useCallback(
    async (bounds: L.LatLngBounds, operatorIds: (string | number)[], minKw: number, maxKw: number) => {
      setLoading(true)
      setError(null)
      try {
        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()
        
        const fetcher = dataSource === 'IRVE' ? apiGetIrveChargers : apiGetChargers;
        const data = await fetcher(sw.lat, sw.lng, ne.lat, ne.lng, operatorIds, minKw, maxKw)
        
        setChargers(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [dataSource]
  )

  return { chargers, operators, loading, error, dataSource, setDataSource, refreshChargers, loadOperators }
}
