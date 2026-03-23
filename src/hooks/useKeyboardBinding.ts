'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { playSound, stopSoundWithFade, isKeyPlaying, resumeAudioContext } from '@/lib/audio-engine'

/** 不應被攔截的系統快捷鍵 */
const PASS_THROUGH_KEYS = new Set([
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
  'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'Tab', 'PrintScreen', 'ScrollLock', 'Pause',
])

function isSystemCombo(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.altKey || e.metaKey
}

export function useKeyboardBinding() {
  const bindings = useStore((s) => s.bindings)
  const isEditing = useStore((s) => s.isEditing)
  const addPlayingKey = useStore((s) => s.addPlayingKey)
  const removePlayingKey = useStore((s) => s.removePlayingKey)

  const pressedKeys = useRef<Set<string>>(new Set())
  const bindingsRef = useRef(bindings)
  const isEditingRef = useRef(isEditing)

  useEffect(() => { bindingsRef.current = bindings }, [bindings])
  useEffect(() => { isEditingRef.current = isEditing }, [isEditing])

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (isEditingRef.current) return
      if (isSystemCombo(e)) return
      if (PASS_THROUGH_KEYS.has(e.key)) return

      const code = e.code

      // 防止 keydown repeat
      if (pressedKeys.current.has(code)) return
      pressedKeys.current.add(code)

      const binding = bindingsRef.current[code]
      if (!binding?.soundFile) return

      e.preventDefault()
      await resumeAudioContext()

      const mode = binding.playMode || 'hold'

      if (mode === 'toggle') {
        // Toggle 模式：正在播放就停，沒在播就播
        if (isKeyPlaying(code)) {
          stopSoundWithFade(code, binding.fadeOut || 0)
          removePlayingKey(code)
          return
        }
      }

      // hold / oneshot / toggle(開始播放) → 都播放
      // 從頭播放（已在播的會被 playSound 內部先 stop 再重播）
      playSound(code, binding.soundFile, {
        startTime: binding.startTime,
        endTime: binding.endTime,
        volume: binding.volume,
        loop: binding.loop,
        fadeIn: binding.fadeIn || 0,
        onEnded: () => removePlayingKey(code),
      })

      addPlayingKey(code)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code
      pressedKeys.current.delete(code)

      const binding = bindingsRef.current[code]
      if (!binding) return

      const mode = binding.playMode || 'hold'

      // hold 模式：放開就停（淡出）
      if (mode === 'hold' && !binding.loop) {
        stopSoundWithFade(code, binding.fadeOut || 0)
        removePlayingKey(code)
      }
      // oneshot 模式：放開不管，播完自己停
      // toggle 模式：放開不管，等下次按鍵切換
    }

    const handleBlur = () => {
      pressedKeys.current.clear()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      pressedKeys.current.clear()
    }
  }, [addPlayingKey, removePlayingKey])
}
