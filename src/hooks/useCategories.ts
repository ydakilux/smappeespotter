import { useState, useEffect, useCallback } from 'react'
import type { Category } from '../types'
import { apiGetCategories, apiCreateCategory, apiUpdateCategory, apiDeleteCategory } from '../api'

interface UseCategoriesReturn {
  categories: Category[]
  addCategory: (name: string, color: string, emoji: string) => Promise<void>
  updateCategory: (id: number, fields: Partial<{ name: string; color: string; emoji: string }>) => Promise<void>
  deleteCategory: (id: number) => Promise<void>
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([])

  const loadCategories = useCallback(async () => {
    const data = await apiGetCategories()
    setCategories(data)
  }, [])

  useEffect(() => {
    loadCategories().catch(console.error)
  }, [loadCategories])

  const addCategory = useCallback(async (name: string, color: string, emoji: string) => {
    const cat = await apiCreateCategory(name, color, emoji)
    setCategories(prev => [...prev, cat])
  }, [])

  const updateCategory = useCallback(
    async (id: number, fields: Partial<{ name: string; color: string; emoji: string }>) => {
      const updated = await apiUpdateCategory(id, fields)
      setCategories(prev => prev.map(c => (c.id === id ? updated : c)))
    },
    [],
  )

  const deleteCategory = useCallback(async (id: number) => {
    await apiDeleteCategory(id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }, [])

  return { categories, addCategory, updateCategory, deleteCategory }
}
