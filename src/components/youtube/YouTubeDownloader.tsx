'use client'

import { useState, useRef } from 'react'
import { Youtube, Download, Loader2 } from 'lucide-react'
import type { DownloadProgress } from '@/lib/types'
import { useStore } from '@/store/useStore'

const STATUS_LABELS: Record<DownloadProgress['status'], string> = {
  downloading: '下載中',
  converting: '轉換中',
  done: '完成',
  error: '錯誤',
}

interface YouTubeDownloaderProps {
  onDownloadComplete?: () => void
}

export function YouTubeDownloader({ onDownloadComplete }: YouTubeDownloaderProps) {
  const setIsEditing = useStore((s) => s.setIsEditing)
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState<'mp3' | 'wav'>('mp3')
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  async function handleDownload() {
    const trimmed = url.trim()
    if (!trimmed || isDownloading) return

    // 先送 POST 觸發 yt-dlp，回應是 SSE 串流
    setIsDownloading(true)
    setProgress({ status: 'downloading', percent: 0 })

    // 關掉舊的
    eventSourceRef.current?.close()

    try {
      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, format }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        setProgress({ status: 'error', percent: 0, error: data.error ?? '請求失敗' })
        setIsDownloading(false)
        return
      }

      // 手動讀取 SSE 串流（fetch 回傳的 ReadableStream）
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // 解析 SSE data: ... 行
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine.startsWith('data:')) continue
          const jsonStr = trimmedLine.slice(5).trim()
          if (!jsonStr) continue

          try {
            const event = JSON.parse(jsonStr) as DownloadProgress
            setProgress(event)

            if (event.status === 'done') {
              onDownloadComplete?.()
            }
          } catch {
            // JSON 解析失敗忽略
          }
        }
      }
    } catch (err) {
      setProgress({
        status: 'error',
        percent: 0,
        error: err instanceof Error ? err.message : '網路錯誤',
      })
    } finally {
      setIsDownloading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleDownload()
  }

  const isDone = progress?.status === 'done'
  const isError = progress?.status === 'error'
  const showProgress = progress !== null

  const progressPercent = progress?.percent ?? 0
  const progressColor =
    isError ? '#f87171' : isDone ? '#34d399' : '#22d3ee'

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* URL 輸入 */}
      <div style={{ position: 'relative' }}>
        <Youtube
          size={14}
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#ff4444',
            pointerEvents: 'none',
          }}
        />
        <input
          type="url"
          placeholder="貼上 YouTube 連結…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDownloading}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#1a1a2e',
            border: '1px solid #2a2a3e',
            borderRadius: '6px',
            padding: '7px 10px 7px 30px',
            fontSize: '12px',
            color: '#e2e8f0',
            outline: 'none',
            transition: 'border-color 0.15s',
            opacity: isDownloading ? 0.6 : 1,
          }}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#22d3ee'; setIsEditing(true) }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = '#2a2a3e'; setIsEditing(false) }}
        />
      </div>

      {/* 格式選擇 + 下載按鈕 */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as 'mp3' | 'wav')}
          disabled={isDownloading}
          onFocus={() => setIsEditing(true)}
          onBlur={() => setIsEditing(false)}
          style={{
            background: '#1a1a2e',
            border: '1px solid #2a2a3e',
            borderRadius: '6px',
            padding: '6px 8px',
            fontSize: '12px',
            color: '#94a3b8',
            cursor: 'pointer',
            outline: 'none',
            flexShrink: 0,
          }}
        >
          <option value="mp3">MP3</option>
          <option value="wav">WAV</option>
        </select>

        <button
          onClick={handleDownload}
          disabled={isDownloading || !url.trim()}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: isDownloading ? '#0e7490' : 'transparent',
            border: `1px solid ${isDownloading ? '#0e7490' : '#2a2a3e'}`,
            borderRadius: '6px',
            color: isDownloading ? '#cffafe' : !url.trim() ? '#475569' : '#94a3b8',
            fontSize: '13px',
            cursor: isDownloading || !url.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.12s, border-color 0.12s, color 0.12s',
          }}
          onMouseEnter={(e) => {
            if (!isDownloading && url.trim()) {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = '#1a1a2e'
              el.style.borderColor = '#22d3ee'
              el.style.color = '#22d3ee'
            }
          }}
          onMouseLeave={(e) => {
            if (!isDownloading) {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'transparent'
              el.style.borderColor = '#2a2a3e'
              el.style.color = url.trim() ? '#94a3b8' : '#475569'
            }
          }}
        >
          {isDownloading ? (
            <>
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              {STATUS_LABELS[progress?.status ?? 'downloading']}…
            </>
          ) : (
            <>
              <Download size={13} />
              下載
            </>
          )}
        </button>
      </div>

      {/* 進度條 */}
      {showProgress && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            style={{
              height: '4px',
              background: '#1e293b',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: progressColor,
                borderRadius: '2px',
                transition: 'width 0.3s ease, background 0.3s ease',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
            }}
          >
            <span style={{ color: isError ? '#f87171' : isDone ? '#34d399' : '#64748b' }}>
              {isError
                ? `錯誤：${progress?.error ?? '未知錯誤'}`
                : isDone
                  ? `✓ 完成${progress?.filename ? `：${progress.filename}` : ''}`
                  : STATUS_LABELS[progress?.status ?? 'downloading']}
            </span>
            {!isError && (
              <span style={{ color: '#475569' }}>{progressPercent.toFixed(0)}%</span>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
