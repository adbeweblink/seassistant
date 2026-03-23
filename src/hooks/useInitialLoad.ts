'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { preloadSound } from '@/lib/audio-engine'
import type { KeyboardConfig, KeyboardConfigV1 } from '@/lib/types'

export function useInitialLoad() {
  const loadConfig = useStore((s) => s.loadConfig)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true

    fetch('/api/config')
      .then((res) => res.json())
      .then((config: KeyboardConfig | KeyboardConfigV1) => {
        loadConfig(config)

        // 預載所有 bank 的音效
        const filenames = new Set<string>()
        if (config.version === 1) {
          const v1 = config as KeyboardConfigV1
          for (const b of Object.values(v1.bindings)) {
            if (b.soundFile) filenames.add(b.soundFile)
          }
        } else {
          const v2 = config as KeyboardConfig
          for (const bank of Object.values(v2.banks)) {
            for (const b of Object.values(bank)) {
              if (b.soundFile) filenames.add(b.soundFile)
            }
          }
        }
        filenames.forEach((f) => preloadSound(f).catch(() => {}))
      })
      .catch(() => {})
  }, [loadConfig])
}
