import { useState, useEffect, useCallback } from 'react'
import type { SmappeeCharger } from '../types'
import { apiAuthStatus, apiLogin, apiLogout, apiGetChargers } from '../api'

interface UseSmappeeReturn {
  loggedIn: boolean
  chargers: SmappeeCharger[]
  loading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshChargers: (minKw?: number, maxKw?: number) => Promise<void>
}

export function useSmappee(): UseSmappeeReturn {
  const [loggedIn, setLoggedIn] = useState(false)
  const [chargers, setChargers] = useState<SmappeeCharger[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshChargers = useCallback(async (minKw = 0, maxKw = 350) => {
    try {
      const data = await apiGetChargers(minKw, maxKw)
      setChargers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chargers')
    }
  }, [])

  useEffect(() => {
    apiAuthStatus()
      .then(({ loggedIn: li }) => {
        setLoggedIn(li)
        if (li) return refreshChargers()
      })
      .catch(() => setError('Failed to check auth status'))
      .finally(() => setLoading(false))
  }, [refreshChargers])

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true)
      setError(null)
      try {
        await apiLogin(username, password)
        setLoggedIn(true)
        await refreshChargers()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login failed')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [refreshChargers],
  )

  const logout = useCallback(async () => {
    try {
      await apiLogout()
      setLoggedIn(false)
      setChargers([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed')
    }
  }, [])

  return { loggedIn, chargers, loading, error, login, logout, refreshChargers }
}
