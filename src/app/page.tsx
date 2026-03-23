'use client'

import { useEffect, useCallback, useState } from 'react'
import KeyboardLayout from '@/components/keyboard/KeyboardLayout'
import EditorPanel from '@/components/editor/EditorPanel'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { useKeyboardBinding } from '@/hooks/useKeyboardBinding'
import { useAutoSave } from '@/hooks/useAutoSave'
import { resumeAudioContext, stopAll, setMasterVolume, getVULevel, setLimiterEnabled } from '@/lib/audio-engine'
import { useInitialLoad } from '@/hooks/useInitialLoad'
import { StopCircle, Zap, X, HelpCircle } from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { CueLogEntry } from '@/store/useStore'
import { HelpOverlay } from '@/components/ui/HelpOverlay'

export default function Home() {
  useKeyboardBinding()
  useAutoSave()
  useInitialLoad()

  const performanceMode = useStore((s) => s.performanceMode)
  const setPerformanceMode = useStore((s) => s.setPerformanceMode)
  const masterVolume = useStore((s) => s.masterVolume)
  const setMasterVolumeStore = useStore((s) => s.setMasterVolume)
  const cueLog = useStore((s) => s.cueLog)
  const undo = useStore((s) => s.undo)
  const isDirty = useStore((s) => s.isDirty)

  // Banks
  const banks = useStore((s) => s.banks)
  const activeBank = useStore((s) => s.activeBank)
  const setActiveBank = useStore((s) => s.setActiveBank)
  const addBank = useStore((s) => s.addBank)

  // Limiter
  const limiterEnabled = useStore((s) => s.limiterEnabled)
  const setLimiterEnabledStore = useStore((s) => s.setLimiterEnabled)

  // Copy/Paste
  const copyBinding = useStore((s) => s.copyBinding)
  const pasteBinding = useStore((s) => s.pasteBinding)
  const selectedKey = useStore((s) => s.selectedKey)

  // VU Meter
  const [vuLevel, setVuLevel] = useState(0)
  useEffect(() => {
    let raf: number
    const tick = () => {
      setVuLevel(getVULevel())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // 演出模式時鐘
  const [clock, setClock] = useState('')
  useEffect(() => {
    if (!performanceMode) return
    const tick = () => {
      const now = new Date()
      setClock(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [performanceMode])

  // 第一次互動時啟動 AudioContext
  useEffect(() => {
    const handler = () => {
      resumeAudioContext()
      window.removeEventListener('click', handler)
      window.removeEventListener('keydown', handler)
    }
    window.addEventListener('click', handler)
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('keydown', handler)
    }
  }, [])

  // Escape 退出演出模式
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && performanceMode) {
        setPerformanceMode(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [performanceMode, setPerformanceMode])

  // beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault() }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Ctrl+Z / Ctrl+C / Ctrl+V + Ctrl+1~9 切換 bank
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault()
          undo()
        } else if (e.key === 'c') {
          if (selectedKey) {
            e.preventDefault()
            copyBinding(selectedKey)
          }
        } else if (e.key === 'v') {
          if (selectedKey) {
            e.preventDefault()
            pasteBinding(selectedKey)
          }
        }
      }
      // Ctrl+1~9 切換 bank
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1
        const bankKeys = Object.keys(banks)
        if (bankKeys[idx]) {
          e.preventDefault()
          setActiveBank(bankKeys[idx])
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, selectedKey, copyBinding, pasteBinding, banks, setActiveBank])

  const handleMasterVolume = useCallback(
    (vol: number) => {
      setMasterVolumeStore(vol)
      setMasterVolume(vol)
    },
    [setMasterVolumeStore]
  )

  const handleLimiterToggle = useCallback(() => {
    const next = !limiterEnabled
    setLimiterEnabledStore(next)
    setLimiterEnabled(next)
  }, [limiterEnabled, setLimiterEnabledStore])

  const handleAddBank = useCallback(() => {
    const existingKeys = Object.keys(banks)
    // 找下一個可用字母 A~Z
    let nextName = 'A'
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i)
      if (!existingKeys.includes(letter)) {
        nextName = letter
        break
      }
    }
    addBank(nextName)
  }, [banks, addBank])

  const volPct = Math.round(masterVolume * 100)

  // 顯示最近 8 筆
  const recentCueLog: CueLogEntry[] = cueLog.slice(0, 8)

  // ── Bank Tab 列 ──
  const BankTabBar = () => (
    <div
      className="flex items-center gap-1 px-4 py-1 shrink-0"
      style={{ backgroundColor: '#0a0a14', borderBottom: '1px solid #1a1a2e' }}
    >
      <span className="text-xs mr-2" style={{ color: '#374151', fontFamily: 'monospace' }}>BANK</span>
      {Object.keys(banks).map((bankName, idx) => (
        <button
          key={bankName}
          onClick={() => setActiveBank(bankName)}
          className="px-2.5 py-0.5 rounded text-xs transition-all"
          style={{
            fontFamily: 'monospace',
            fontWeight: 600,
            background: activeBank === bankName ? 'rgba(6,182,212,0.15)' : 'transparent',
            color: activeBank === bankName ? '#06b6d4' : '#4b5563',
            border: activeBank === bankName ? '1px solid rgba(6,182,212,0.4)' : '1px solid transparent',
            cursor: 'pointer',
          }}
          title={`切換到 Bank ${bankName}（Ctrl+${idx + 1}）`}
        >
          {bankName}
        </button>
      ))}
      <button
        onClick={handleAddBank}
        className="px-2 py-0.5 rounded text-xs transition-all"
        style={{
          fontFamily: 'monospace',
          background: 'transparent',
          color: '#374151',
          border: '1px solid #1f2937',
          cursor: 'pointer',
          lineHeight: 1,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#06b6d4'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(6,182,212,0.3)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#374151'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#1f2937' }}
        title="新增 Bank"
      >
        +
      </button>
    </div>
  )

  // ── VU Meter + Limiter toggle（嵌在 header 音量區） ──
  const VUMeterAndLimiter = () => {
    const pct = vuLevel * 100
    let vuColor: string
    if (pct < 60) {
      vuColor = '#22c55e'
    } else if (pct < 85) {
      vuColor = '#eab308'
    } else {
      vuColor = '#ef4444'
    }

    return (
      <div className="flex items-center gap-2">
        {/* VU Meter */}
        <div
          style={{
            width: 80,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#1f2937',
            overflow: 'hidden',
            position: 'relative',
          }}
          title={`VU: ${Math.round(pct)}%`}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              backgroundColor: vuColor,
              borderRadius: 4,
              transition: 'width 0.05s linear, background-color 0.05s linear',
            }}
          />
        </div>
        {/* Limiter 開關 */}
        <button
          onClick={handleLimiterToggle}
          className="px-1.5 py-0.5 rounded text-xs transition-all"
          style={{
            fontFamily: 'monospace',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.05em',
            background: limiterEnabled ? 'rgba(6,182,212,0.15)' : 'transparent',
            color: limiterEnabled ? '#06b6d4' : '#4b5563',
            border: limiterEnabled ? '1px solid rgba(6,182,212,0.4)' : '1px solid #374151',
            cursor: 'pointer',
          }}
          title={`Limiter ${limiterEnabled ? '開啟' : '關閉'}`}
        >
          LIM
        </button>
      </div>
    )
  }

  /* ── 演出模式 ── */
  if (performanceMode) {
    return (
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{ backgroundColor: '#000' }}
      >
        <HelpOverlay />
        {/* 縮小版 header */}
        <header
          className="flex items-center justify-between px-4 py-1.5 shrink-0"
          style={{ backgroundColor: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}
        >
          {/* logo + 時鐘 */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-wider" style={{ color: '#06b6d4' }}>
              SEAssistant
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#6b7280', letterSpacing: '0.1em' }}>{clock}</span>
          </div>

          {/* 右側控制 */}
          <div className="flex items-center gap-3">
            {/* VU Meter + Limiter */}
            <VUMeterAndLimiter />

            {/* 主音量 */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#6b7280', fontFamily: 'monospace', minWidth: '2.5rem', textAlign: 'right' }}>
                {volPct}%
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={masterVolume}
                onChange={(e) => handleMasterVolume(Number(e.target.value))}
                style={{ width: 120, accentColor: '#9ca3af', cursor: 'pointer' }}
                title="主音量"
              />
            </div>

            {/* 全部停止 */}
            <button
              onClick={() => stopAll()}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-all border"
              style={{ background: 'transparent', borderColor: '#7f1d1d', color: '#f87171' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#7f1d1d33' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              title="停止所有播放（Panic）"
            >
              <StopCircle size={13} />
              全部停止
            </button>

            {/* 退出演出 */}
            <button
              onClick={() => setPerformanceMode(false)}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-all border"
              style={{ background: 'transparent', borderColor: '#dc2626', color: '#f87171' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#7f1d1d55' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              title="退出演出模式（Escape）"
            >
              <X size={13} />
              退出演出
            </button>
          </div>
        </header>

        {/* Bank Tab 列 */}
        <BankTabBar />

        {/* 鍵盤區域：撐滿剩餘空間 */}
        <div className="flex items-center justify-center flex-1 overflow-hidden p-4" style={{ minHeight: 0 }}>
          <KeyboardLayout />
        </div>

        {/* Cue Log — 演出模式，最近 8 筆，半透明覆蓋在底部 */}
        <div
          className="shrink-0 px-4 py-2"
          style={{
            backgroundColor: 'rgba(0,0,0,0.75)',
            borderTop: '1px solid #1a1a1a',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div className="text-xs mb-1" style={{ color: '#4b5563', fontFamily: 'monospace' }}>
            CUE LOG
          </div>
          {recentCueLog.length === 0 ? (
            <div className="text-xs" style={{ color: '#374151', fontFamily: 'monospace' }}>
              — 尚無 cue
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {recentCueLog.map((entry, i) => (
                <CueLogRow key={i} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── 一般模式 ── */
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
      <HelpOverlay />
      {/* 左側邊欄 */}
      <Sidebar />

      {/* 主要區域 */}
      <main className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* 頂部工具列 */}
        <header
          className="flex items-center justify-between px-4 py-2 shrink-0 border-b"
          style={{ borderColor: '#1e1e3a', backgroundColor: '#0f0f1a' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-wider" style={{ color: '#06b6d4' }}>
              SEAssistant
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'rgba(6,182,212,0.1)',
                color: '#06b6d4',
                border: '1px solid rgba(6,182,212,0.2)',
              }}
            >
              音效鍵盤
            </span>
          </div>

          {/* 右側控制 */}
          <div className="flex items-center gap-3">
            {/* VU Meter + Limiter */}
            <VUMeterAndLimiter />

            {/* 主音量推桿 */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#6b7280', fontFamily: 'monospace', minWidth: '2.5rem', textAlign: 'right' }}>
                {volPct}%
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={masterVolume}
                onChange={(e) => handleMasterVolume(Number(e.target.value))}
                style={{ width: 120, accentColor: '#9ca3af', cursor: 'pointer' }}
                title="主音量"
              />
            </div>

            {/* 全部停止 */}
            <button
              onClick={() => stopAll()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all border"
              style={{ background: 'transparent', borderColor: '#7f1d1d', color: '#f87171' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#7f1d1d33' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              title="停止所有播放（Panic）"
            >
              <StopCircle size={14} />
              全部停止
            </button>

            {/* 演出模式按鈕 */}
            <button
              onClick={() => setPerformanceMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all border"
              style={{ background: 'transparent', borderColor: '#16a34a', color: '#22c55e' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#16a34a33' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              title="進入演出模式"
            >
              <Zap size={14} />
              演出模式
            </button>

            {/* 快捷鍵說明按鈕 */}
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
              title="快捷鍵說明（?）"
            >
              <HelpCircle size={14} style={{ color: '#475569' }} />
            </button>
          </div>
        </header>

        {/* Bank Tab 列 */}
        <BankTabBar />

        {/* 鍵盤區域 */}
        <div className="flex items-center justify-center flex-1 overflow-auto p-4" style={{ minHeight: 0 }}>
          <KeyboardLayout />
        </div>

        {/* Cue Log — 一般模式，較小 */}
        {cueLog.length > 0 && (
          <div
            className="shrink-0 px-4 py-1.5"
            style={{
              backgroundColor: 'rgba(15,15,26,0.9)',
              borderTop: '1px solid #1e1e3a',
            }}
          >
            <div className="text-xs mb-1" style={{ color: '#374151', fontFamily: 'monospace' }}>
              CUE LOG
            </div>
            <div className="flex flex-col gap-0.5">
              {recentCueLog.map((entry, i) => (
                <CueLogRow key={i} entry={entry} compact />
              ))}
            </div>
          </div>
        )}

        {/* 波形編輯面板 */}
        <EditorPanel />
      </main>
    </div>
  )
}

/* ── Cue Log 行元件 ── */
function CueLogRow({ entry, compact = false }: { entry: CueLogEntry; compact?: boolean }) {
  const actionIcon = entry.action === 'play' ? '▶' : '■'
  const actionColor = entry.action === 'play' ? '#22c55e' : '#f87171'
  const fontSize = compact ? '10px' : '11px'

  return (
    <div
      className="flex items-center gap-3"
      style={{ fontFamily: 'monospace', fontSize, color: '#6b7280', lineHeight: 1.4 }}
    >
      <span style={{ color: '#374151', minWidth: compact ? '5rem' : '5.5rem' }}>{entry.time}</span>
      <span
        style={{
          color: '#9ca3af',
          minWidth: '2rem',
          background: 'rgba(156,163,175,0.08)',
          padding: '0 4px',
          borderRadius: 2,
        }}
      >
        {entry.keyCode}
      </span>
      <span style={{ color: '#6b7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.soundFile}
      </span>
      <span style={{ color: actionColor, minWidth: '1rem', textAlign: 'center' }}>{actionIcon}</span>
    </div>
  )
}
