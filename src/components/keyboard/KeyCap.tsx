'use client'

import React, { useCallback, useEffect, useState } from 'react'
import type { KeyDef } from '@/lib/keyboard-map'
import { getColorForFilename } from '@/lib/keyboard-map'
import type { KeyBinding } from '@/lib/types'
import { useStore } from '@/store/useStore'
import { preloadSound, playSound, stopSound, getPlaybackProgress } from '@/lib/audio-engine'

interface KeyCapProps {
  keyDef: KeyDef
  binding: KeyBinding | undefined
  isSelected: boolean
  unitWidth?: number
}

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
  unitWidth: unitWidthProp,
}: KeyCapProps) {
  const setSelectedKey = useStore((s) => s.setSelectedKey)
  const setBinding = useStore((s) => s.setBinding)
  const removeBinding = useStore((s) => s.removeBinding)
  const isPlaying = useStore((s) => s.playingKeys.has(keyDef.code))
  const pendingSound = useStore((s) => s.pendingSound)
  const setPendingSound = useStore((s) => s.setPendingSound)
  const performanceMode = useStore((s) => s.performanceMode)

  // 拖曳高亮狀態
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragFilename, setDragFilename] = useState<string | null>(null)

  // 播放進度狀態
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isPlaying) {
      setProgress(0)
      return
    }
    let raf: number
    const tick = () => {
      const p = getPlaybackProgress(keyDef.code)
      setProgress(p ?? 0)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, keyDef.code])

  const BASE_WIDTH = unitWidthProp ?? (performanceMode ? 64 : 48)
  const KEY_HEIGHT = BASE_WIDTH

  const hasBound = Boolean(binding?.soundFile)
  const hasPending = Boolean(pendingSound)
  const width = (keyDef.width ?? 1) * BASE_WIDTH + ((keyDef.width ?? 1) - 1) * GAP

  // --- 顏色計算 ---
  const accentColor = binding?.color || '#06b6d4'
  const bgColor = isPlaying
    ? hasBound
      ? hexToRgba(accentColor, 0.7)
      : 'rgba(34,197,94,0.2)'
    : hasBound
    ? hexToRgba(accentColor, 0.2)
    : '#1a1a2a'
  const topGradientColor = isPlaying
    ? hasBound
      ? hexToRgba(accentColor, 0.8)
      : 'rgba(34,197,94,0.35)'
    : hasBound
    ? hexToRgba(accentColor, 0.3)
    : '#1e1e30'
  const borderColor = isPlaying
    ? '#22c55e'
    : isSelected
    ? '#06b6d4'
    : hasPending && !hasBound
    ? '#facc15'
    : hasBound
    ? hexToRgba(accentColor, 0.5)
    : '#252540'
  const borderWidth = isPlaying ? 3 : isSelected ? 2 : 1

  const boxShadow = isPlaying
    ? '0 0 16px 4px rgba(34, 197, 94, 0.6), inset 0 1px 0 rgba(34, 197, 94, 0.2)'
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
        color: getColorForFilename(pendingSound),
        playMode: 'oneshot',
        fadeIn: 0,
        fadeOut: 0,
      })
      setPendingSound(null)
      preloadSound(pendingSound).catch(() => {})
    }
    setSelectedKey(keyDef.code)
  }, [keyDef.code, pendingSound, setSelectedKey, setBinding, setPendingSound])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!isDragOver) {
      setIsDragOver(true)
      // 嘗試取得拖曳的檔名（某些瀏覽器 dragover 時無法讀 getData）
      const fn = e.dataTransfer.types.includes('text/plain') ? 'sound' : null
      setDragFilename(fn)
    }
  }, [isDragOver])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
    setDragFilename(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      setDragFilename(null)
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
        color: getColorForFilename(soundFile),
        playMode: 'oneshot',
        fadeIn: 0,
        fadeOut: 0,
      })
      setSelectedKey(keyDef.code)
      preloadSound(soundFile).catch(() => {})
    },
    [keyDef.code, accentColor, setBinding, setSelectedKey]
  )

  // 右鍵解綁
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!hasBound) return
    e.preventDefault()
    stopSound(keyDef.code)
    removeBinding(keyDef.code)
  }, [hasBound, keyDef.code, removeBinding])

  // 雙擊預聽
  const handleDoubleClick = useCallback(() => {
    if (!binding?.soundFile) return
    preloadSound(binding.soundFile).then(() => {
      playSound(`preview_${keyDef.code}`, binding.soundFile!, {
        startTime: binding.startTime,
        endTime: binding.endTime,
        volume: binding.volume,
        fadeIn: binding.fadeIn || 0,
      })
    }).catch(() => {})
  }, [binding, keyDef.code])

  // --- hover tooltip ---
  const [isHover, setIsHover] = useState(false)
  const tooltipText = hasBound && binding
    ? [
        binding.soundFile,
        binding.playMode === 'hold' ? '按住播放' : binding.playMode === 'toggle' ? '切換播放' : '單次播放',
        `音量 ${Math.round(binding.volume * 100)}%`,
        binding.loop ? '循環' : '',
        binding.fadeIn ? `淡入 ${(binding.fadeIn / 1000).toFixed(1)}s` : '',
        binding.fadeOut ? `淡出 ${(binding.fadeOut / 1000).toFixed(1)}s` : '',
        binding.exclusiveGroup ? `互斥群組 ${binding.exclusiveGroup}` : '',
      ].filter(Boolean).join(' · ')
    : ''

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
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      className={isPlaying ? (hasBound ? 'key-playing-colored' : 'key-playing') : ''}
      style={{
        // 佈局
        width: `${width}px`,
        height: `${KEY_HEIGHT}px`,
        flexShrink: 0,
        // 外觀
        borderRadius: '8px',
        border: isDragOver ? '2px solid #06b6d4' : `${borderWidth}px solid ${borderColor}`,
        background: isDragOver
          ? `linear-gradient(180deg, rgba(6,182,212,0.3) 0%, rgba(6,182,212,0.15) 100%)`
          : `linear-gradient(180deg, ${topGradientColor} 0%, ${bgColor} 100%)`,
        boxShadow: isDragOver ? '0 0 12px 2px rgba(6,182,212,0.4), inset 0 0 8px rgba(6,182,212,0.15)' : boxShadow,
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
          fontSize: isSmallLabel
            ? (performanceMode ? '0.75rem' : '0.6rem')
            : (performanceMode ? '0.85rem' : '0.65rem'),
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
            fontSize: performanceMode ? '0.65rem' : '0.5rem',
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

      {/* 播放進度條 */}
      {isPlaying && progress > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '3px',
            width: `${progress * 100}%`,
            background: '#22c55e',
            borderRadius: '0 0 8px 8px',
            transition: 'width 0.1s linear',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 拖曳中的 + 圖示 */}
      {isDragOver && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', color: '#06b6d4', fontWeight: 700,
          pointerEvents: 'none',
        }}>
          +
        </div>
      )}

      {/* Hover tooltip */}
      {isHover && hasBound && tooltipText && !isDragOver && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '6px',
          padding: '4px 8px',
          background: '#0a0a0f',
          border: '1px solid #1e1e3a',
          borderRadius: '6px',
          fontSize: '10px',
          color: '#94a3b8',
          whiteSpace: 'nowrap',
          zIndex: 50,
          pointerEvents: 'none',
          maxWidth: '250px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {tooltipText}
        </div>
      )}
    </div>
  )
})

export default KeyCap
