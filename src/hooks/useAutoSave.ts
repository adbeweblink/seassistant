'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'

const DEBOUNCE_MS = 2000

export function useAutoSave() {
  const isDirty = useStore((s) => s.isDirty)
  const exportConfig = useStore((s) => s.exportConfig)
  const setDirty = useStore((s) => s.setDirty)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 避免在 effect 裡直接依賴函式導致不必要的重跑
  const exportConfigRef = useRef(exportConfig)
  const setDirtyRef = useRef(setDirty)

  useEffect(() => {
    exportConfigRef.current = exportConfig
  }, [exportConfig])

  useEffect(() => {
    setDirtyRef.current = setDirty
  }, [setDirty])

  useEffect(() => {
    if (!isDirty) {
      // 若在 debounce 等待期間 isDirty 被外部清除，取消計時器
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // 清除前一個計時器（debounce）
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(async () => {
      timerRef.current = null
      const config = exportConfigRef.current()

      try {
        const res = await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '未知錯誤')
          console.error('[AutoSave] 儲存失敗:', res.status, text)
          return
        }

        setDirtyRef.current(false)
      } catch (err) {
        console.error('[AutoSave] 網路錯誤:', err)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isDirty])
}
