'use client'

import { Volume2, VolumeX, Repeat } from 'lucide-react'

interface VolumeControlProps {
  volume: number        // 0–1
  loop: boolean
  onChange: (updates: { volume?: number; loop?: boolean }) => void
}

export default function VolumeControl({
  volume,
  loop,
  onChange,
}: VolumeControlProps) {
  const volumePercent = Math.round(volume * 100)

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ volume: Number(e.target.value) / 100 })
  }

  const handleMuteToggle = () => {
    onChange({ volume: volume > 0 ? 0 : 1 })
  }

  const handleLoopToggle = () => {
    onChange({ loop: !loop })
  }

  return (
    <div className="flex items-center gap-4">
      {/* 音量區塊 */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleMuteToggle}
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
          onChange={handleVolumeChange}
          className="
            w-28 h-1.5 appearance-none rounded-full
            bg-slate-700 cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-cyan-400
            [&::-webkit-slider-thumb]:hover:bg-cyan-300
            [&::-webkit-slider-thumb]:transition-colors
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

      {/* 分隔線 */}
      <div className="h-5 w-px bg-slate-700" />

      {/* Loop 開關 */}
      <button
        onClick={handleLoopToggle}
        className={[
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all border',
          loop
            ? 'bg-cyan-900/50 border-cyan-600 text-cyan-300'
            : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200',
        ].join(' ')}
        title={loop ? '關閉循環播放' : '開啟循環播放'}
      >
        <Repeat className="w-3.5 h-3.5" />
        循環播放
        {loop && (
          <span className="ml-1 w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
        )}
      </button>
    </div>
  )
}
