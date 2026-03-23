'use client'

import { Volume2, VolumeX, Repeat } from 'lucide-react'
import type { PlayMode } from '@/lib/types'

const PLAY_MODE_OPTIONS: { value: PlayMode; label: string; desc: string }[] = [
  { value: 'oneshot', label: '單次', desc: '按一下播完整段' },
  { value: 'hold', label: '按住', desc: '按住播放，放開停止' },
  { value: 'toggle', label: '切換', desc: '按一下播放，再按停止' },
]

interface VolumeControlProps {
  volume: number
  loop: boolean
  playMode: PlayMode
  fadeIn: number
  fadeOut: number
  exclusiveGroup: number | null
  onChange: (updates: {
    volume?: number
    loop?: boolean
    playMode?: PlayMode
    fadeIn?: number
    fadeOut?: number
    exclusiveGroup?: number | null
  }) => void
}

export default function VolumeControl({
  volume,
  loop,
  playMode,
  fadeIn,
  fadeOut,
  exclusiveGroup,
  onChange,
}: VolumeControlProps) {
  const volumePercent = Math.round(volume * 100)

  return (
    <div className="flex flex-col gap-3">
      {/* 第一行：音量 + Loop */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange({ volume: volume > 0 ? 0 : 1 })}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            title={volume === 0 ? '取消靜音' : '靜音'}
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={100}
            value={volumePercent}
            onChange={(e) => onChange({ volume: Number(e.target.value) / 100 })}
            className="
              w-28 h-1.5 appearance-none rounded-full
              bg-slate-700 cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3.5
              [&::-webkit-slider-thumb]:h-3.5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-cyan-400
              [&::-moz-range-thumb]:w-3.5
              [&::-moz-range-thumb]:h-3.5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-cyan-400
              [&::-moz-range-thumb]:border-0
            "
            style={{
              backgroundImage: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${volumePercent}%, #334155 ${volumePercent}%, #334155 100%)`,
            }}
            title={`音量 ${volumePercent}%`}
          />

          <span className="text-xs font-mono text-slate-400 w-8 text-right">
            {volumePercent}%
          </span>
        </div>

        <div className="h-5 w-px bg-slate-700" />

        <button
          onClick={() => onChange({ loop: !loop })}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all border',
            loop
              ? 'bg-cyan-900/50 border-cyan-600 text-cyan-300'
              : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200',
          ].join(' ')}
          title={loop ? '關閉循環' : '開啟循環'}
        >
          <Repeat className="w-3.5 h-3.5" />
          循環
        </button>
      </div>

      {/* 第二行：播放模式 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 w-14 shrink-0">模式</span>
        <div className="flex gap-1">
          {PLAY_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ playMode: opt.value })}
              className={[
                'px-2.5 py-1 rounded text-xs transition-all border',
                playMode === opt.value
                  ? 'bg-cyan-900/50 border-cyan-600 text-cyan-300'
                  : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-500',
              ].join(' ')}
              title={opt.desc}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 第三行：淡入淡出 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-14 shrink-0">淡入</span>
          <input
            type="range"
            min={0}
            max={2000}
            step={50}
            value={fadeIn}
            onChange={(e) => onChange({ fadeIn: Number(e.target.value) })}
            className="
              w-20 h-1.5 appearance-none rounded-full
              bg-slate-700 cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-emerald-400
              [&::-moz-range-thumb]:w-3
              [&::-moz-range-thumb]:h-3
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-emerald-400
              [&::-moz-range-thumb]:border-0
            "
            style={{
              backgroundImage: `linear-gradient(to right, #34d399 0%, #34d399 ${fadeIn / 20}%, #334155 ${fadeIn / 20}%, #334155 100%)`,
            }}
          />
          <span className="text-xs font-mono text-slate-400 w-12">
            {fadeIn > 0 ? `${(fadeIn / 1000).toFixed(1)}s` : '無'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-14 shrink-0">淡出</span>
          <input
            type="range"
            min={0}
            max={2000}
            step={50}
            value={fadeOut}
            onChange={(e) => onChange({ fadeOut: Number(e.target.value) })}
            className="
              w-20 h-1.5 appearance-none rounded-full
              bg-slate-700 cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-orange-400
              [&::-moz-range-thumb]:w-3
              [&::-moz-range-thumb]:h-3
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-orange-400
              [&::-moz-range-thumb]:border-0
            "
            style={{
              backgroundImage: `linear-gradient(to right, #fb923c 0%, #fb923c ${fadeOut / 20}%, #334155 ${fadeOut / 20}%, #334155 100%)`,
            }}
          />
          <span className="text-xs font-mono text-slate-400 w-12">
            {fadeOut > 0 ? `${(fadeOut / 1000).toFixed(1)}s` : '無'}
          </span>
        </div>
      </div>

      {/* 第四行：互斥群組 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 w-14 shrink-0">互斥群組</span>
        <div className="flex gap-1 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <button
              key={n}
              onClick={() => onChange({ exclusiveGroup: exclusiveGroup === n ? null : n })}
              className={[
                'w-7 h-7 rounded text-xs transition-all border font-mono',
                exclusiveGroup === n
                  ? 'bg-violet-900/60 border-violet-500 text-violet-300'
                  : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200',
              ].join(' ')}
              title={`互斥群組 ${n}`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => onChange({ exclusiveGroup: null })}
            className={[
              'px-2 h-7 rounded text-xs transition-all border',
              exclusiveGroup === null
                ? 'bg-slate-700 border-slate-400 text-slate-200'
                : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200',
            ].join(' ')}
            title="不設互斥群組"
          >
            無
          </button>
        </div>
      </div>
    </div>
  )
}
