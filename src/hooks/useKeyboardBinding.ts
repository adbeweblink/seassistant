'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { playSound, stopSound, resumeAudioContext } from '@/lib/audio-engine'

/** 不應被攔截的系統快捷鍵 */
const PASS_THROUGH_KEYS = new Set([
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
  'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'Tab',           // 允許 Tab 正常跳焦
  'PrintScreen',
  'ScrollLock',
  'Pause',
])

/** 需要忽略的 modifier-key 組合（Ctrl/Alt/Meta 開頭） */
function isSystemCombo(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.altKey || e.metaKey
}

export function useKeyboardBinding() {
  const bindings = useStore((s) => s.bindings)
  const isEditing = useStore((s) => s.isEditing)
  const addPlayingKey = useStore((s) => s.addPlayingKey)
  const removePlayingKey = useStore((s) => s.removePlayingKey)

  // 追蹤當前按下的鍵（防止 keydown repeat）
  const pressedKeys = useRef<Set<string>>(new Set())

  // 用 ref 讀取最新的 bindings / isEditing，避免 effect 頻繁重綁
  const bindingsRef = useRef(bindings)
  const isEditingRef = useRef(isEditing)

  useEffect(() => {
    bindingsRef.current = bindings
  }, [bindings])

  useEffect(() => {
    isEditingRef.current = isEditing
  }, [isEditing])

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // 正在輸入文字 → 忽略
      if (isEditingRef.current) return

      // 系統快捷鍵組合 → 忽略
      if (isSystemCombo(e)) return

      // 系統保留鍵 → 不攔截
      if (PASS_THROUGH_KEYS.has(e.key)) return

      const code = e.code  // 使用 e.code（物理鍵位），避免輸入法影響

      // 防止 keydown repeat（按住不放的重複事件）
      if (pressedKeys.current.has(code)) return
      pressedKeys.current.add(code)

      const binding = bindingsRef.current[code]
      if (!binding?.soundFile) return

      // 阻止瀏覽器預設行為（空白鍵捲頁、方向鍵捲頁等）
      e.preventDefault()

      // 確保 AudioContext 已啟動（需要用戶互動）
      await resumeAudioContext()

      playSound(code, binding.soundFile, {
        startTime: binding.startTime,
        endTime: binding.endTime,
        volume: binding.volume,
        loop: binding.loop,
        onEnded: () => removePlayingKey(code),
      })

      addPlayingKey(code)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code
      pressedKeys.current.delete(code)

      const binding = bindingsRef.current[code]
      if (!binding) return

      // 非 loop 模式：keyup 停止播放
      if (!binding.loop) {
        stopSound(code)
        removePlayingKey(code)
      }
      // loop 模式：繼續播放直到手動停止
    }

    // 視窗失焦時清除所有按下狀態
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
  // bindings/isEditing 透過 ref 讀取，不列在依賴中，避免頻繁重綁事件
}
