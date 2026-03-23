'use client'

import { useState, useRef, useEffect } from 'react'
import { Music, Upload, RefreshCw, Search, Trash2, Play, Square } from 'lucide-react'
import { useSoundLibrary } from '@/hooks/useSoundLibrary'
import { useStore } from '@/store/useStore'
import { preloadSound, playSound, stopSound, isKeyPlaying } from '@/lib/audio-engine'
import type { SoundFile } from '@/lib/types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const FORMAT_COLORS: Record<string, string> = {
  mp3: '#22d3ee',
  wav: '#a78bfa',
  ogg: '#34d399',
  flac: '#fb923c',
  m4a: '#f472b6',
  aac: '#facc15',
}

interface SoundItemProps {
  sound: SoundFile
  onDelete: (filename: string) => void
  isActive: boolean
  onSelect: (filename: string) => void
}

function SoundItem({ sound, onDelete, isActive, onSelect }: SoundItemProps) {
  const [dragging, setDragging] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const badgeColor = FORMAT_COLORS[sound.format] ?? '#94a3b8'

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData('text/plain', sound.filename)
    e.dataTransfer.effectAllowed = 'copy'
    setDragging(true)
  }

  function handleDragEnd() {
    setDragging(false)
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete(sound.filename)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 2500)
    }
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onSelect(sound.filename)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '6px',
        cursor: 'grab',
        background: isActive ? '#1e293b' : dragging ? '#0f172a' : 'transparent',
        opacity: dragging ? 0.5 : 1,
        transition: 'background 0.12s, opacity 0.12s',
        userSelect: 'none',
        borderLeft: isActive ? '3px solid #facc15' : '3px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!dragging && !isActive) (e.currentTarget as HTMLDivElement).style.background = '#1a1a2e'
      }}
      onMouseLeave={(e) => {
        if (!dragging && !isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
    >
      {/* 預聽按鈕 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          const previewKey = `preview_${sound.filename}`
          if (isKeyPlaying(previewKey)) {
            stopSound(previewKey)
          } else {
            preloadSound(sound.filename).then(() => {
              playSound(previewKey, sound.filename, { volume: 0.8 })
            }).catch(() => {})
          }
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          color: '#06b6d4',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        }}
        title="預聽"
      >
        <Play size={12} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13px',
            color: '#e2e8f0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={sound.filename}
        >
          {sound.filename}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{formatSize(sound.size)}</span>
          {sound.duration > 0 && (
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {formatDuration(sound.duration)}
            </span>
          )}
        </div>
      </div>

      <span
        style={{
          fontSize: '10px',
          fontWeight: 600,
          padding: '1px 5px',
          borderRadius: '3px',
          background: `${badgeColor}22`,
          color: badgeColor,
          border: `1px solid ${badgeColor}44`,
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {sound.format}
      </span>

      <button
        onClick={handleDeleteClick}
        title={confirmDelete ? '再按一次確認刪除' : '刪除'}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          color: confirmDelete ? '#f87171' : '#475569',
          flexShrink: 0,
          transition: 'color 0.12s',
          display: 'flex',
          alignItems: 'center',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.color = '#f87171'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.color = confirmDelete ? '#f87171' : '#475569'
        }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

interface SoundLibraryProps {
  sounds: SoundFile[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function SoundLibrary({ sounds, loading, error, refresh }: SoundLibraryProps) {
  const pendingSound = useStore((s) => s.pendingSound)
  const setPendingSound = useStore((s) => s.setPendingSound)
  const setIsEditing = useStore((s) => s.setIsEditing)
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSelectSound(filename: string) {
    setPendingSound(pendingSound === filename ? null : filename)
  }

  // Delete 鍵刪除選取的音效
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && pendingSound) {
        e.preventDefault()
        if (confirm(`確定刪除「${pendingSound}」？`)) {
          handleDelete(pendingSound)
          setPendingSound(null)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSound])

  const filtered = sounds.filter((s) =>
    s.filename.toLowerCase().includes(search.toLowerCase())
  )

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        await fetch('/api/sounds', { method: 'POST', body: formData })
      }
      await refresh()
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeBindingsBySound = useStore((s) => s.removeBindingsBySound)

  async function handleDelete(filename: string) {
    try {
      const res = await fetch(`/api/sounds/${encodeURIComponent(filename)}`, { method: 'DELETE' })
      if (!res.ok) {
        alert('刪除失敗')
        return
      }
      // 清理所有 Bank 中綁定到此音效的按鍵
      removeBindingsBySound(filename)
      await refresh()
    } catch {
      alert('刪除失敗，請重試')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 搜尋 + 工具列 */}
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#475569',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="搜尋音效…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#1a1a2e',
              border: '1px solid #2a2a3e',
              borderRadius: '6px',
              padding: '5px 8px 5px 26px',
              fontSize: '12px',
              color: '#e2e8f0',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#22d3ee'; setIsEditing(true) }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = '#2a2a3e'; setIsEditing(false) }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '5px 8px',
              background: 'transparent',
              border: '1px solid #2a2a3e',
              borderRadius: '6px',
              color: uploading ? '#475569' : '#94a3b8',
              fontSize: '12px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              transition: 'background 0.12s, border-color 0.12s, color 0.12s',
            }}
            onMouseEnter={(e) => {
              if (!uploading) {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = '#1a1a2e'
                el.style.borderColor = '#22d3ee'
                el.style.color = '#22d3ee'
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'transparent'
              el.style.borderColor = '#2a2a3e'
              el.style.color = uploading ? '#475569' : '#94a3b8'
            }}
          >
            <Upload size={12} />
            {uploading ? '上傳中…' : '上傳音效'}
          </button>

          <button
            onClick={refresh}
            disabled={loading}
            title="重新整理"
            style={{
              padding: '5px 8px',
              background: 'transparent',
              border: '1px solid #2a2a3e',
              borderRadius: '6px',
              color: '#94a3b8',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'background 0.12s, border-color 0.12s, color 0.12s',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = '#1a1a2e'
                el.style.borderColor = '#22d3ee'
                el.style.color = '#22d3ee'
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'transparent'
              el.style.borderColor = '#2a2a3e'
              el.style.color = '#94a3b8'
            }}
          >
            <RefreshCw
              size={13}
              style={{
                animation: loading ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleUpload}
      />

      {/* 音效列表 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: '8px',
        }}
      >
        {loading && !error && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', marginBottom: 8, display: 'inline-block' }} />
            <div>載入音效庫…</div>
          </div>
        )}

        {error && (
          <div
            style={{
              margin: '8px 12px',
              padding: '8px 10px',
              background: '#7f1d1d22',
              border: '1px solid #7f1d1d',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#fca5a5',
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: '#475569',
              fontSize: '12px',
              lineHeight: '1.6',
            }}
          >
            <Music size={24} style={{ marginBottom: '8px', opacity: 0.4 }} />
            <div>
              {search
                ? `找不到「${search}」相關音效`
                : '還沒有音效，上傳或從 YouTube 下載'}
            </div>
          </div>
        )}

        {filtered.map((sound) => (
          <SoundItem
            key={sound.filename}
            sound={sound}
            onDelete={handleDelete}
            isActive={pendingSound === sound.filename}
            onSelect={handleSelectSound}
          />
        ))}
      </div>

      {/* 待綁定提示 */}
      {pendingSound && (
        <div
          style={{
            padding: '8px 12px',
            background: '#facc1515',
            borderTop: '1px solid #facc1540',
            fontSize: '12px',
            color: '#facc15',
            textAlign: 'center',
          }}
        >
          🎯 點擊鍵盤上的按鍵來綁定「{pendingSound.replace(/\.[^.]+$/, '')}」
          <button
            onClick={() => setPendingSound(null)}
            style={{
              marginLeft: '8px',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '11px',
              textDecoration: 'underline',
            }}
          >
            取消
          </button>
        </div>
      )}

      {/* 底部計數 */}
      {sounds.length > 0 && (
        <div
          style={{
            padding: '4px 12px 8px',
            fontSize: '11px',
            color: '#475569',
            borderTop: '1px solid #1e293b',
          }}
        >
          {filtered.length !== sounds.length
            ? `${filtered.length} / ${sounds.length} 個音效`
            : `共 ${sounds.length} 個音效`}
        </div>
      )}

    </div>
  )
}
