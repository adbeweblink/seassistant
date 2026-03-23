'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { playSound, stopSoundWithFade, stopSound, isKeyPlaying, resumeAudioContext } from '@/lib/audio-engine'

const PASS_THROUGH_KEYS = new Set([
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
  'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'Tab', 'PrintScreen', 'ScrollLock', 'Pause',
])

function isSystemCombo(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.altKey || e.metaKey
}

export function useKeyboardBinding() {
  const bindings = useStore((s) => s.banks[s.activeBank] ?? {})
  const banks = useStore((s) => s.banks)
  const activeBank = useStore((s) => s.activeBank)
  const isEditing = useStore((s) => s.isEditing)
  const addPlayingKey = useStore((s) => s.addPlayingKey)
  const removePlayingKey = useStore((s) => s.removePlayingKey)
  const addCueLog = useStore((s) => s.addCueLog)
  const performanceMode = useStore((s) => s.performanceMode)

  const pressedKeys = useRef<Set<string>>(new Set())
  const bindingsRef = useRef(bindings)
  const banksRef = useRef(banks)
  const activeBankRef = useRef(activeBank)
  const isEditingRef = useRef(isEditing)
  const addCueLogRef = useRef(addCueLog)
  const performanceModeRef = useRef(performanceMode)
  const addPlayingKeyRef = useRef(addPlayingKey)
  const removePlayingKeyRef = useRef(removePlayingKey)

  useEffect(() => { bindingsRef.current = bindings }, [bindings])
  useEffect(() => { banksRef.current = banks }, [banks])
  useEffect(() => { activeBankRef.current = activeBank }, [activeBank])
  useEffect(() => { isEditingRef.current = isEditing }, [isEditing])
  useEffect(() => { addCueLogRef.current = addCueLog }, [addCueLog])
  useEffect(() => { performanceModeRef.current = performanceMode }, [performanceMode])
  useEffect(() => { addPlayingKeyRef.current = addPlayingKey }, [addPlayingKey])
  useEffect(() => { removePlayingKeyRef.current = removePlayingKey }, [removePlayingKey])

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!performanceModeRef.current && isEditingRef.current) return
      if (isSystemCombo(e)) return
      if (PASS_THROUGH_KEYS.has(e.key)) return

      const code = e.code
      if (pressedKeys.current.has(code)) return
      pressedKeys.current.add(code)

      const binding = bindingsRef.current[code]
      if (!binding?.soundFile) return

      e.preventDefault()
      await resumeAudioContext()

      const mode = binding.playMode || 'oneshot'

      if (mode === 'toggle') {
        if (isKeyPlaying(code)) {
          stopSoundWithFade(code, binding.fadeOut || 0)
          removePlayingKeyRef.current(code)
          addCueLogRef.current({ keyCode: code, soundFile: binding.soundFile!, action: 'stop' })
          return
        }
      }

      // Exclusive group：停止同 group 的其他音效
      if (binding.exclusiveGroup != null) {
        const currentBank = banksRef.current[activeBankRef.current] ?? {}
        for (const [otherCode, otherBinding] of Object.entries(currentBank)) {
          if (otherCode !== code && otherBinding.exclusiveGroup === binding.exclusiveGroup && isKeyPlaying(otherCode)) {
            stopSoundWithFade(otherCode, otherBinding.fadeOut || 0)
            removePlayingKeyRef.current(otherCode)
          }
        }
      }

      playSound(code, binding.soundFile, {
        startTime: binding.startTime,
        endTime: binding.endTime,
        volume: binding.volume,
        loop: binding.loop,
        fadeIn: binding.fadeIn || 0,
        onEnded: () => removePlayingKeyRef.current(code),
      })

      addPlayingKeyRef.current(code)
      addCueLogRef.current({ keyCode: code, soundFile: binding.soundFile!, action: 'play' })
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code
      pressedKeys.current.delete(code)

      const binding = bindingsRef.current[code]
      if (!binding) return

      const mode = binding.playMode || 'oneshot'

      // hold 模式：放開就停（不管是否 loop）
      if (mode === 'hold') {
        stopSoundWithFade(code, binding.fadeOut || 0)
        removePlayingKeyRef.current(code)
      }
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
  }, [])
}
