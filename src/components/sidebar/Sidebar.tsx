'use client'

import { useState, useRef, useCallback } from 'react'
import { Music, Youtube, Settings, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { SoundLibrary } from './SoundLibrary'
import { YouTubeDownloader } from '@/components/youtube/YouTubeDownloader'
import { ConfigPanel } from './ConfigPanel'
import { useSoundLibrary } from '@/hooks/useSoundLibrary'

type SectionId = 'sounds' | 'youtube' | 'settings'

interface Section {
  id: SectionId
  label: string
  icon: React.ReactNode
  defaultOpen: boolean
}

const SECTIONS: Section[] = [
  {
    id: 'sounds',
    label: '音效庫',
    icon: <Music size={14} />,
    defaultOpen: true,
  },
  {
    id: 'youtube',
    label: 'YouTube 下載',
    icon: <Youtube size={14} />,
    defaultOpen: true,
  },
  {
    id: 'settings',
    label: '設定',
    icon: <Settings size={14} />,
    defaultOpen: false,
  },
]

const MIN_WIDTH = 220
const MAX_WIDTH = 480
const DEFAULT_WIDTH = 300

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>(() =>
    Object.fromEntries(SECTIONS.map((s) => [s.id, s.defaultOpen])) as Record<SectionId, boolean>
  )
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH)
  const resizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(DEFAULT_WIDTH)

  // 使用音效庫 hook，供 YouTube 下載完成後觸發 refresh
  const { refresh: refreshSounds } = useSoundLibrary()

  function toggleSection(id: SectionId) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // 拖拉調整側邊欄寬度
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizing.current = true
    startX.current = e.clientX
    startWidth.current = sidebarWidth

    function onMouseMove(ev: MouseEvent) {
      if (!resizing.current) return
      const delta = ev.clientX - startX.current
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
      setSidebarWidth(newWidth)
    }

    function onMouseUp() {
      resizing.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [sidebarWidth])

  // 收合狀態 JSX
  if (collapsed) {
    return (
      <div style={{
        width: 40,
        background: '#0f0f1a',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 8,
        gap: 4,
        flexShrink: 0,
      }}>
        <button
          onClick={() => setCollapsed(false)}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 8 }}
          title="展開側邊欄"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => setCollapsed(false)}
          style={{ background: 'none', border: 'none', color: '#22d3ee', cursor: 'pointer', padding: 8 }}
          title="音效庫"
        >
          <Music size={16} />
        </button>
        <button
          onClick={() => setCollapsed(false)}
          style={{ background: 'none', border: 'none', color: '#22d3ee', cursor: 'pointer', padding: 8 }}
          title="YouTube 下載"
        >
          <Youtube size={16} />
        </button>
        <button
          onClick={() => setCollapsed(false)}
          style={{ background: 'none', border: 'none', color: '#22d3ee', cursor: 'pointer', padding: 8 }}
          title="設定"
        >
          <Settings size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width: `${sidebarWidth}px`,
        minWidth: `${MIN_WIDTH}px`,
        maxWidth: `${MAX_WIDTH}px`,
        height: '100%',
        background: '#0f0f1a',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #1e293b',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* 收合按鈕 */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '4px 8px', flexShrink: 0 }}>
        <button
          onClick={() => setCollapsed(true)}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
          title="收合側邊欄"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* 內容區域 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {SECTIONS.map((section, idx) => {
          const isOpen = openSections[section.id]

          return (
            <div
              key={section.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderBottom: idx < SECTIONS.length - 1 ? '1px solid #1e293b' : 'none',
              }}
            >
              {/* 區塊標題 */}
              <button
                onClick={() => toggleSection(section.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'background 0.12s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = '#13131f'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                }}
              >
                <span style={{ color: '#22d3ee', display: 'flex', alignItems: 'center' }}>
                  {section.icon}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {section.label}
                </span>
                <ChevronDown
                  size={13}
                  style={{
                    color: '#475569',
                    transition: 'transform 0.2s ease',
                    transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                  }}
                />
              </button>

              {/* 區塊內容（摺疊） */}
              <div
                style={{
                  display: isOpen ? 'flex' : 'none',
                  flexDirection: 'column',
                  // 音效庫給固定最大高度，允許捲動
                  ...(section.id === 'sounds'
                    ? { maxHeight: '320px', overflow: 'hidden' }
                    : {}),
                }}
              >
                {section.id === 'sounds' && <SoundLibrary />}
                {section.id === 'youtube' && (
                  <YouTubeDownloader onDownloadComplete={refreshSounds} />
                )}
                {section.id === 'settings' && <ConfigPanel />}
              </div>
            </div>
          )
        })}
      </div>

      {/* 拖拉調整寬度的把手 */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          cursor: 'col-resize',
          background: 'transparent',
          transition: 'background 0.15s',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.background = '#22d3ee44'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
        }}
      />
    </div>
  )
}
