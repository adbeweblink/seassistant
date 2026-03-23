'use client'

import React, { useCallback } from 'react'
import type { KeyDef } from '@/lib/keyboard-map'
import { getKeyColor } from '@/lib/keyboard-map'
import type { KeyBinding } from '@/lib/types'
import { useStore } from '@/store/useStore'

interface KeyCapProps {
  keyDef: KeyDef
  binding: KeyBinding | undefined
  isSelected: boolean
}

/** 基準寬度（px），對應 width=1 的按鍵 */
const BASE_WIDTH = 48
/** 按鍵高度（px） */
const KEY_HEIGHT = 48
/** 間距（px） */
const GAP = 4

/** 把十六進位色碼轉為 rgba（帶 alpha） */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** 截斷檔名顯示 */
function truncateFilename(filename: string, maxLen = 10): string {
  const noExt = filename.replace(/\.[^.]+$/, '')
  if (noExt.length <= maxLen) return noExt
  return noExt.slice(0, maxLen - 1) + '…'
}

const KeyCap = React.memo(function KeyCap({
  keyDef,
  binding,
  isSelected,
}: KeyCapProps) {
  const setSelectedKey = useStore((s) => s.setSelectedKey)
  const setBinding = useStore((s) => s.setBinding)
  const isPlaying = useStore((s) => s.playingKeys.has(keyDef.code))
  const pendingSound = useStore((s) => s.pendingSound)
  const setPendingSound = useStore((s) => s.setPendingSound)

  const hasBound = Boolean(binding?.soundFile)
  const hasPending = Boolean(pendingSound)
  const width = (keyDef.width ?? 1) * BASE_WIDTH + ((keyDef.width ?? 1) - 1) * GAP

  // --- 顏色計算 ---
  const accentColor = binding?.color || '#06b6d4'
  const bgColor = hasBound
    ? hexToRgba(accentColor, isPlaying ? 0.55 : 0.2)
    : '#1a1a2a'
  const topGradientColor = hasBound
    ? hexToRgba(accentColor, isPlaying ? 0.7 : 0.3)
    : '#1e1e30'
  const borderColor = isSelected
    ? '#06b6d4'
    : hasPending && !hasBound
    ? '#facc15'
    : hasBound
    ? hexToRgba(accentColor, 0.5)
    : '#252540'

  const boxShadow = isPlaying
    ? `0 0 12px 3px ${hexToRgba(accentColor, 0.6)}, inset 0 1px 0 ${hexToRgba(accentColor, 0.2)}`
    : isSelected
    ? '0 0 0 0 transparent, inset 0 1px 0 rgba(255,255,255,0.06)'
    : 'inset 0 1px 0 rgba(255,255,255,0.04)'

  // --- 事件 ---
  const handleClick = useCallback(() => {
    if (pendingSound) {
      // 有待綁定音效 → 直接綁到這個按鍵
      setBinding(keyDef.code, {
        keyCode: keyDef.code,
        soundFile: pendingSound,
        displayName: pendingSound.replace(/\.[^.]+$/, ''),
        startTime: 0,
        endTime: null,
        volume: 1,
        loop: false,
        color: getKeyColor(Math.random() * 10 | 0),
        playMode: 'oneshot',
        fadeIn: 0,
        fadeOut: 0,
      })
      setPendingSound(null)
    }
    setSelectedKey(keyDef.code)
  }, [keyDef.code, pendingSound, setSelectedKey, setBinding, setPendingSound])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const soundFile = e.dataTransfer.getData('text/plain')
      if (!soundFile) return
      setBinding(keyDef.code, {
        keyCode: keyDef.code,
        soundFile,
        displayName: soundFile.replace(/\.[^.]+$/, ''),
        startTime: 0,
        endTime: null,
        volume: 1,
        loop: false,
        color: accentColor,
        playMode: 'oneshot',
        fadeIn: 0,
        fadeOut: 0,
      })
      setSelectedKey(keyDef.code)
    },
    [keyDef.code, accentColor, setBinding, setSelectedKey]
  )

  // --- F 鍵列字體縮小 ---
  const isFKey =
    keyDef.code.startsWith('F') && /^F\d{1,2}$/.test(keyDef.code)
  const isEsc = keyDef.code === 'Escape'
  const isSmallLabel = isFKey || isEsc

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${keyDef.label}${hasBound ? ` — ${binding!.displayName}` : ''}`}
      aria-pressed={isSelected}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={isPlaying ? (hasBound ? 'key-playing-colored' : 'key-playing') : ''}
      style={{
        // 佈局
        width: `${width}px`,
        height: `${KEY_HEIGHT}px`,
        flexShrink: 0,
        // 外觀
        borderRadius: '8px',
        border: `${isSelected ? 2 : 1}px solid ${borderColor}`,
        background: `linear-gradient(180deg, ${topGradientColor} 0%, ${bgColor} 100%)`,
        boxShadow,
        // 文字
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 按鍵標籤 */}
      <span
        style={{
          fontSize: isSmallLabel ? '0.6rem' : '0.65rem',
          fontWeight: 600,
          letterSpacing: '0.03em',
          color: hasBound ? '#e2e8f0' : '#3a3a5a',
          lineHeight: 1,
          maxWidth: '100%',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          padding: '0 4px',
        }}
      >
        {keyDef.label}
      </span>

      {/* 已綁定的音效名稱 */}
      {hasBound && binding?.soundFile && (
        <span
          style={{
            fontSize: '0.5rem',
            color: hexToRgba(accentColor, 0.85),
            lineHeight: 1,
            maxWidth: '90%',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            padding: '0 2px',
          }}
        >
          {truncateFilename(binding.soundFile)}
        </span>
      )}

      {/* 播放中閃光蒙版 */}
      {isPlaying && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '7px',
            background: `radial-gradient(circle at center, ${hexToRgba(accentColor, 0.25)} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 選中頂部高亮條 */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: '2px',
            borderRadius: '0 0 2px 2px',
            background: '#06b6d4',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
})

export default KeyCap
