'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ChevronDown, ChevronUp, Sliders } from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { KeyBinding } from '@/lib/types'
import { getBufferDuration, preloadSound } from '@/lib/audio-engine'
import TimeRangeControl from './TimeRangeControl'
import VolumeControl from './VolumeControl'

// WaveformEditor 必須用 dynamic import（SSR: false），因為 WaveSurfer 依賴 window
const WaveformEditor = dynamic(() => import('./WaveformEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-24 rounded-lg border border-cyan-900/30 bg-[#1a1a2e] text-cyan-400/60 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-cyan-400/60 border-t-transparent rounded-full animate-spin" />
        載入波形編輯器…
      </div>
    </div>
  ),
})

export default function EditorPanel() {
  const selectedKey = useStore((s) => s.selectedKey)
  const bindings = useStore((s) => s.banks[s.activeBank] ?? {})
  const setBinding = useStore((s) => s.setBinding)
  const [isOpen, setIsOpen] = useState(true)
  const [duration, setDuration] = useState(0)

  const binding = selectedKey ? bindings[selectedKey] ?? null : null
  const hasSound = binding?.soundFile != null

  // 取得 buffer duration（音效需先 preload）
  useEffect(() => {
    if (!binding?.soundFile) {
      setDuration(0)
      return
    }
    const cached = getBufferDuration(binding.soundFile)
    if (cached !== null) {
      setDuration(cached)
      return
    }
    // 未 preload 時先載入
    preloadSound(binding.soundFile)
      .then(() => {
        const dur = getBufferDuration(binding.soundFile!)
        setDuration(dur ?? 0)
      })
      .catch(() => setDuration(0))
  }, [binding?.soundFile])

  // 更新 startTime / endTime
  const handleWaveformUpdate = (
    updates: { startTime?: number; endTime?: number | null }
  ) => {
    if (!selectedKey) return
    setBinding(selectedKey, updates)
  }

  // 更新 volume / loop / playMode / fadeIn / fadeOut / exclusiveGroup
  const handleParamUpdate = (
    updates: Partial<Pick<KeyBinding, 'volume' | 'loop' | 'playMode' | 'fadeIn' | 'fadeOut' | 'exclusiveGroup'>>
  ) => {
    if (!selectedKey) return
    setBinding(selectedKey, updates)
  }

  // 面板標題
  const panelTitle = (() => {
    if (!selectedKey) return '音效編輯器'
    if (!binding?.soundFile) return `編輯：${selectedKey}`
    const filename = binding.soundFile.split('/').pop() ?? binding.soundFile
    return `編輯：${selectedKey} — ${filename}`
  })()

  return (
    <div
      className={[
        'border-t border-slate-700/60 bg-slate-900/80 backdrop-blur-sm',
        'transition-all duration-300 ease-in-out',
      ].join(' ')}
    >
      {/* 標題列 */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/50 transition-colors group"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300 group-hover:text-slate-100">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span className="truncate max-w-xs">{panelTitle}</span>
          {hasSound && binding?.soundFile && (
            <span className="text-xs text-cyan-500/70 font-normal hidden sm:inline">
              {duration > 0 ? `${duration.toFixed(2)}s` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* 展開內容 */}
      <div
        className={[
          'overflow-hidden transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0',
        ].join(' ')}
      >
        <div className="px-4 pb-4 pt-1">
          {/* 未選中按鍵 */}
          {!selectedKey && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-sm gap-2">
              <Sliders className="w-8 h-8 text-slate-600" />
              <p>點選鍵盤上的按鍵以編輯音效</p>
            </div>
          )}

          {/* 選中按鍵但無音效綁定 */}
          {selectedKey && !hasSound && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-sm gap-2">
              <p>
                按鍵{' '}
                <span className="font-mono px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                  {selectedKey}
                </span>{' '}
                尚未綁定音效
              </p>
              <p className="text-xs text-slate-600">從左側音效庫拖曳音效到按鍵，或點選音效再點按鍵</p>
            </div>
          )}

          {/* 有綁定 → 顯示編輯器 */}
          {selectedKey && hasSound && binding && (
            <div className="flex flex-col gap-4">
              {/* 波形編輯器 */}
              <WaveformEditor
                soundFile={binding.soundFile!}
                startTime={binding.startTime}
                endTime={binding.endTime}
                volume={binding.volume}
                loop={binding.loop}
                onUpdate={handleWaveformUpdate}
              />

              {/* 時間範圍控制 */}
              <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <h3 className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">
                  播放區間
                </h3>
                <TimeRangeControl
                  startTime={binding.startTime}
                  endTime={binding.endTime}
                  duration={duration}
                  onChange={handleWaveformUpdate}
                />
              </div>

              {/* 音量 + 模式 + 淡入淡出 */}
              <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <h3 className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">
                  播放設定
                </h3>
                <VolumeControl
                  volume={binding.volume}
                  loop={binding.loop}
                  playMode={binding.playMode || 'oneshot'}
                  fadeIn={binding.fadeIn || 0}
                  fadeOut={binding.fadeOut || 0}
                  exclusiveGroup={binding.exclusiveGroup ?? null}
                  onChange={handleParamUpdate}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
