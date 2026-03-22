'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, Square } from 'lucide-react'

interface WaveformEditorProps {
  soundFile: string
  startTime: number
  endTime: number | null
  volume: number
  loop: boolean
  onUpdate: (updates: { startTime?: number; endTime?: number | null }) => void
}

interface WaveSurferInstance {
  destroy: () => void
  load: (url: string) => void
  play: (start?: number) => void
  pause: () => void
  stop: () => void
  setVolume: (volume: number) => void
  getDuration: () => number
  getCurrentTime: () => number
  isPlaying: () => boolean
  on: (event: string, callback: (...args: unknown[]) => void) => void
  off: (event: string, callback: (...args: unknown[]) => void) => void
  seekTo: (progress: number) => void
}

interface RegionsPluginInstance {
  addRegion: (opts: {
    start: number
    end: number
    color: string
    drag: boolean
    resize: boolean
  }) => RegionInstance
  on: (event: string, callback: (region: RegionInstance) => void) => void
  getRegions: () => RegionInstance[]
  clearRegions: () => void
}

interface RegionInstance {
  start: number
  end: number
  remove: () => void
  setOptions: (opts: { start?: number; end?: number; color?: string }) => void
}

export default function WaveformEditor({
  soundFile,
  startTime,
  endTime,
  volume,
  loop,
  onUpdate,
}: WaveformEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurferInstance | null>(null)
  const regionsRef = useRef<RegionsPluginInstance | null>(null)
  const regionRef = useRef<RegionInstance | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastStartRef = useRef(startTime)
  const lastEndRef = useRef(endTime)

  // 格式化時間 mm:ss.ms
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  // 更新 region 邊界
  const updateRegion = useCallback(
    (start: number, end: number) => {
      if (!regionRef.current) return
      regionRef.current.setOptions({ start, end })
    },
    []
  )

  // 初始化 WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return

    let ws: WaveSurferInstance | null = null
    let regions: RegionsPluginInstance | null = null
    let destroyed = false

    const init = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setIsReady(false)

        const WaveSurfer = (await import('wavesurfer.js')).default
        const RegionsPlugin = (
          await import('wavesurfer.js/dist/plugins/regions.js')
        ).default

        if (destroyed || !containerRef.current) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const regionsInstance = (RegionsPlugin.create() as any) as RegionsPluginInstance
        regions = regionsInstance
        regionsRef.current = regionsInstance

        ws = WaveSurfer.create({
          container: containerRef.current,
          waveColor: '#06b6d4',
          progressColor: '#0891b2',
          cursorColor: '#67e8f9',
          height: 80,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          normalize: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          plugins: [regionsInstance as any],
        }) as unknown as WaveSurferInstance

        wavesurferRef.current = ws

        ws.on('ready', () => {
          if (destroyed) return
          const dur = ws!.getDuration()
          setDuration(dur)
          setIsReady(true)
          setIsLoading(false)

          // 建立 region
          const regionEnd = lastEndRef.current ?? dur
          const region = regions!.addRegion({
            start: lastStartRef.current,
            end: regionEnd,
            color: 'rgba(6, 182, 212, 0.25)',
            drag: true,
            resize: true,
          })
          regionRef.current = region
        })

        ws.on('audioprocess', () => {
          if (destroyed) return
          setCurrentTime(ws!.getCurrentTime())
        })

        ws.on('play', () => {
          if (destroyed) return
          setIsPlaying(true)
        })

        ws.on('pause', () => {
          if (destroyed) return
          setIsPlaying(false)
        })

        ws.on('finish', () => {
          if (destroyed) return
          setIsPlaying(false)
          setCurrentTime(0)
        })

        ws.on('error', (err: unknown) => {
          if (destroyed) return
          setError(String(err))
          setIsLoading(false)
        })

        // Region 拖拉/縮放事件
        regions!.on('region-updated', (region: RegionInstance) => {
          if (destroyed) return
          const newStart = Math.max(0, region.start)
          const newEnd = region.end
          lastStartRef.current = newStart
          lastEndRef.current = newEnd
          onUpdate({ startTime: newStart, endTime: newEnd })
        })

        ws.load(`/api/sounds/${encodeURIComponent(soundFile)}`)
      } catch (err) {
        if (!destroyed) {
          setError('載入 WaveSurfer 失敗')
          setIsLoading(false)
          console.error(err)
        }
      }
    }

    init()

    return () => {
      destroyed = true
      if (ws) {
        try {
          ws.destroy()
        } catch {
          // 忽略
        }
      }
      wavesurferRef.current = null
      regionsRef.current = null
      regionRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundFile])

  // 同步音量
  useEffect(() => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.setVolume(volume)
    }
  }, [volume, isReady])

  // 同步 startTime / endTime（外部更新 → 更新 region）
  useEffect(() => {
    if (!isReady || !regionRef.current) return
    // 只有外部值跟 ref 不同才更新，避免 region-updated 迴圈
    const sameStart = Math.abs(lastStartRef.current - startTime) < 0.01
    const sameEnd =
      endTime === null
        ? false
        : Math.abs((lastEndRef.current ?? 0) - endTime) < 0.01
    if (!sameStart || !sameEnd) {
      lastStartRef.current = startTime
      lastEndRef.current = endTime
      updateRegion(startTime, endTime ?? duration)
    }
  }, [startTime, endTime, isReady, duration, updateRegion])

  // 播放/暫停
  const handlePlayPause = useCallback(() => {
    if (!wavesurferRef.current || !isReady) return
    if (isPlaying) {
      wavesurferRef.current.pause()
    } else {
      wavesurferRef.current.play(startTime)
    }
  }, [isPlaying, isReady, startTime])

  // 停止
  const handleStop = useCallback(() => {
    if (!wavesurferRef.current || !isReady) return
    wavesurferRef.current.stop()
    setIsPlaying(false)
    setCurrentTime(0)
  }, [isReady])

  // 預聽選中區間
  const handlePreview = useCallback(() => {
    if (!wavesurferRef.current || !isReady) return
    if (isPlaying) {
      wavesurferRef.current.pause()
      return
    }
    wavesurferRef.current.play(startTime)
  }, [isReady, isPlaying, startTime])

  return (
    <div className="flex flex-col gap-2">
      {/* 波形容器 */}
      <div className="relative rounded-lg overflow-hidden border border-cyan-900/50 bg-[#1a1a2e]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#1a1a2e]">
            <div className="flex items-center gap-2 text-cyan-400 text-sm">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              載入波形中…
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#1a1a2e]">
            <span className="text-red-400 text-sm">⚠ {error}</span>
          </div>
        )}
        <div
          ref={containerRef}
          className="w-full"
          style={{ minHeight: 80 }}
        />
      </div>

      {/* 時間顯示 + 控制按鈕 */}
      <div className="flex items-center gap-3">
        {/* 播放控制 */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePlayPause}
            disabled={!isReady}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title={isPlaying ? '暫停' : '播放選中區間'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white" />
            )}
          </button>
          <button
            onClick={handleStop}
            disabled={!isReady}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="停止"
          >
            <Square className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* 時間資訊 */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="text-cyan-300">{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* 預聽按鈕 */}
        <button
          onClick={handlePreview}
          disabled={!isReady}
          className="ml-auto text-xs px-3 py-1.5 rounded-md border border-cyan-700 text-cyan-400 hover:bg-cyan-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPlaying ? '⏸ 停止預聽' : '▶ 預聽區間'}
        </button>

        {loop && (
          <span className="text-xs px-2 py-1 rounded bg-cyan-900/40 text-cyan-400 border border-cyan-800">
            LOOP
          </span>
        )}
      </div>
    </div>
  )
}
