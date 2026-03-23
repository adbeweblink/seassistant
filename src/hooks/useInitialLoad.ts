'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { preloadSound } from '@/lib/audio-engine'
import type { KeyboardConfig } from '@/lib/types'

/** 啟動時載入上次儲存的配置 + 預載所有綁定音效 */
export function useInitialLoad() {
  const loadConfig = useStore((s) => s.loadConfig)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true

    fetch('/api/config')
      .then((res) => res.json())
      .then((config: KeyboardConfig) => {
        if (config.bindings && Object.keys(config.bindings).length > 0) {
          loadConfig(config)
          // 預載所有綁定的音效
          const filenames = new Set<string>()
          for (const binding of Object.values(config.bindings)) {
            if (binding.soundFile) filenames.add(binding.soundFile)
          }
          filenames.forEach((f) => preloadSound(f).catch(() => {}))
        }
      })
      .catch(() => {})
  }, [loadConfig])
}
