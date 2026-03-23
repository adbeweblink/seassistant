'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RotateCcw } from 'lucide-react'
import { useStore } from '@/store/useStore'

interface TimeRangeControlProps {
  startTime: number
  endTime: number | null
  duration: number
  onChange: (updates: { startTime?: number; endTime?: number | null }) => void
}

/** 將秒數轉為 mm:ss.ms 字串 */
function secondsToDisplay(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

/** 解析 mm:ss.ms 字串為秒數，失敗回傳 null */
function parseDisplay(value: string): number | null {
  // 支援格式：mm:ss.ms、mm:ss、ss.ms、ss
  const trimmed = value.trim()

  // mm:ss.ms 或 mm:ss
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/)
  if (colonMatch) {
    const m = parseInt(colonMatch[1], 10)
    const s = parseInt(colonMatch[2], 10)
    const ms = colonMatch[3]
      ? parseInt(colonMatch[3].padEnd(3, '0'), 10)
      : 0
    if (s >= 60) return null
    return m * 60 + s + ms / 1000
  }

  // ss.ms 或 ss
  const decimalMatch = trimmed.match(/^(\d+)(?:\.(\d{1,3}))?$/)
  if (decimalMatch) {
    const s = parseInt(decimalMatch[1], 10)
    const ms = decimalMatch[2]
      ? parseInt(decimalMatch[2].padEnd(3, '0'), 10)
      : 0
    return s + ms / 1000
  }

  return null
}

interface TimeInputProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (seconds: number) => void
}

function TimeInput({ label, value, min, max, onChange }: TimeInputProps) {
  const [inputValue, setInputValue] = useState(secondsToDisplay(value))
  const [hasError, setHasError] = useState(false)
  const isFocusedRef = useRef(false)

  // 當 prop value 改變且 input 未在編輯中，同步顯示
  useEffect(() => {
    if (!isFocusedRef.current) {
      setInputValue(secondsToDisplay(value))
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setHasError(false)
  }

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false
    setIsEditing(false)
    const parsed = parseDisplay(inputValue)
    if (parsed === null || parsed < min || parsed > max) {
      // 無效輸入 → 還原
      setInputValue(secondsToDisplay(value))
      setHasError(false)
    } else {
      setInputValue(secondsToDisplay(parsed))
      if (Math.abs(parsed - value) > 0.001) {
        onChange(parsed)
      }
    }
  }, [inputValue, value, min, max, onChange])

  const setIsEditing = useStore((s) => s.setIsEditing)

  const handleFocus = () => {
    isFocusedRef.current = true
    setIsEditing(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      setInputValue(secondsToDisplay(value))
      setHasError(false)
      e.currentTarget.blur()
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className={[
          'w-32 px-2 py-1.5 rounded-md text-sm font-mono',
          'bg-slate-800 text-slate-100',
          'border transition-colors outline-none',
          hasError
            ? 'border-red-500 focus:border-red-400'
            : 'border-slate-600 focus:border-cyan-500',
        ].join(' ')}
        placeholder="00:00.000"
        spellCheck={false}
      />
    </div>
  )
}

export default function TimeRangeControl({
  startTime,
  endTime,
  duration,
  onChange,
}: TimeRangeControlProps) {
  const effectiveEnd = endTime ?? duration

  const handleStartChange = (seconds: number) => {
    // start 不能超過 end
    const clampedStart = Math.min(seconds, effectiveEnd - 0.01)
    onChange({ startTime: Math.max(0, clampedStart) })
  }

  const handleEndChange = (seconds: number) => {
    // end 不能小於 start
    const clampedEnd = Math.max(seconds, startTime + 0.01)
    onChange({ endTime: Math.min(clampedEnd, duration) })
  }

  const handleReset = () => {
    onChange({ startTime: 0, endTime: null })
  }

  return (
    <div className="flex items-end gap-3">
      <TimeInput
        label="起始時間"
        value={startTime}
        min={0}
        max={effectiveEnd - 0.001}
        onChange={handleStartChange}
      />

      <div className="flex items-center pb-1.5 text-slate-500 select-none">
        →
      </div>

      <TimeInput
        label="結束時間"
        value={effectiveEnd}
        min={startTime + 0.001}
        max={duration}
        onChange={handleEndChange}
      />

      {/* 時長顯示 */}
      <div className="flex flex-col gap-1 pb-0.5">
        <span className="text-xs text-slate-500">區間長度</span>
        <span className="text-sm font-mono text-cyan-400 py-1.5">
          {secondsToDisplay(effectiveEnd - startTime)}
        </span>
      </div>

      {/* Reset 按鈕 */}
      <button
        onClick={handleReset}
        className="flex items-center gap-1.5 px-3 py-1.5 mb-0 rounded-md text-xs text-slate-400 border border-slate-600 hover:border-slate-500 hover:text-slate-200 transition-colors self-end"
        title="重置為完整音效"
      >
        <RotateCcw className="w-3 h-3" />
        重置
      </button>
    </div>
  )
}
