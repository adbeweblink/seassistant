'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SoundFile } from '@/lib/types'

interface UseSoundLibraryReturn {
  sounds: SoundFile[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useSoundLibrary(): UseSoundLibraryReturn {
  const [sounds, setSounds] = useState<SoundFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sounds')
      if (!res.ok) throw new Error(`伺服器錯誤 ${res.status}`)
      const data = await res.json()
      setSounds(data.files ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法載入音效庫')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { sounds, loading, error, refresh }
}
