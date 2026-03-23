'use client'

import { useEffect } from 'react'
import KeyboardLayout from '@/components/keyboard/KeyboardLayout'
import EditorPanel from '@/components/editor/EditorPanel'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { useKeyboardBinding } from '@/hooks/useKeyboardBinding'
import { useAutoSave } from '@/hooks/useAutoSave'
import { resumeAudioContext, stopAll } from '@/lib/audio-engine'
import { useInitialLoad } from '@/hooks/useInitialLoad'
import { StopCircle } from 'lucide-react'

export default function Home() {
  // 啟用鍵盤綁定和自動儲存
  useKeyboardBinding()
  useAutoSave()
  useInitialLoad()

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

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
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
          <button
            onClick={() => stopAll()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all border"
            style={{
              background: 'transparent',
              borderColor: '#7f1d1d',
              color: '#f87171',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#7f1d1d33'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
            title="停止所有播放（Panic）"
          >
            <StopCircle size={14} />
            全部停止
          </button>
        </header>

        {/* 鍵盤區域 */}
        <div className="flex items-center justify-center flex-1 overflow-auto p-4" style={{ minHeight: 0 }}>
          <KeyboardLayout />
        </div>

        {/* 波形編輯面板 */}
        <EditorPanel />
      </main>
    </div>
  )
}
