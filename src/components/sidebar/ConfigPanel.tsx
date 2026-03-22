'use client'

import { useState, useRef } from 'react'
import { Settings, FolderOpen, Download, Upload, StopCircle, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { stopAll } from '@/lib/audio-engine'
import type { KeyboardConfig } from '@/lib/types'

export function ConfigPanel() {
  const {
    configName,
    setConfigName,
    soundsDir,
    setSoundsDir,
    exportConfig,
    loadConfig,
    bindings,
    removeBinding,
  } = useStore()

  const [editingFolder, setEditingFolder] = useState(false)
  const [folderInput, setFolderInput] = useState(soundsDir)
  const [savingFolder, setSavingFolder] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  // 匯出設定
  function handleExport() {
    const config = exportConfig()
    const json = JSON.stringify(config, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${config.name || 'config'}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 匯入設定
  function handleImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result
        if (typeof raw !== 'string') return
        const config = JSON.parse(raw) as KeyboardConfig
        if (config.version !== 1) {
          alert('不支援的配置版本')
          return
        }
        loadConfig(config)
      } catch {
        alert('無法解析設定檔，請確認格式正確')
      } finally {
        if (importRef.current) importRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  // 儲存音效資料夾路徑
  async function handleSaveFolder() {
    if (!folderInput.trim()) return
    setSavingFolder(true)
    try {
      await fetch('/api/folder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soundsDir: folderInput.trim() }),
      })
      setSoundsDir(folderInput.trim())
      setEditingFolder(false)
    } catch {
      // 失敗不 alert，只關閉編輯
    } finally {
      setSavingFolder(false)
    }
  }

  // 全部清除
  function handleClearAll() {
    if (confirmClear) {
      stopAll()
      Object.keys(bindings).forEach((key) => removeBinding(key))
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
    }
  }

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 配置名稱 */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '11px',
            color: '#64748b',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          配置名稱
        </label>
        <input
          type="text"
          value={configName}
          onChange={(e) => setConfigName(e.target.value)}
          placeholder="未命名配置"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#1a1a2e',
            border: '1px solid #2a2a3e',
            borderRadius: '6px',
            padding: '7px 10px',
            fontSize: '13px',
            color: '#e2e8f0',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = '#22d3ee')}
          onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = '#2a2a3e')}
        />
      </div>

      {/* 音效資料夾 */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '11px',
            color: '#64748b',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          音效資料夾
        </label>

        {editingFolder ? (
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveFolder()
                if (e.key === 'Escape') setEditingFolder(false)
              }}
              autoFocus
              style={{
                flex: 1,
                background: '#1a1a2e',
                border: '1px solid #22d3ee',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '12px',
                color: '#e2e8f0',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSaveFolder}
              disabled={savingFolder}
              style={{
                padding: '6px 10px',
                background: '#0e7490',
                border: 'none',
                borderRadius: '6px',
                color: '#cffafe',
                fontSize: '12px',
                cursor: savingFolder ? 'not-allowed' : 'pointer',
              }}
            >
              {savingFolder ? '儲存中…' : '儲存'}
            </button>
            <button
              onClick={() => setEditingFolder(false)}
              style={{
                padding: '6px 10px',
                background: 'transparent',
                border: '1px solid #2a2a3e',
                borderRadius: '6px',
                color: '#64748b',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div
              style={{
                flex: 1,
                padding: '6px 10px',
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#64748b',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={soundsDir}
            >
              {soundsDir}
            </div>
            <button
              onClick={() => {
                setFolderInput(soundsDir)
                setEditingFolder(true)
              }}
              title="修改路徑"
              style={{
                padding: '6px 8px',
                background: 'transparent',
                border: '1px solid #2a2a3e',
                borderRadius: '6px',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                transition: 'background 0.12s, border-color 0.12s, color 0.12s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = '#1a1a2e'
                el.style.borderColor = '#22d3ee'
                el.style.color = '#22d3ee'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = 'transparent'
                el.style.borderColor = '#2a2a3e'
                el.style.color = '#94a3b8'
              }}
            >
              <FolderOpen size={13} />
            </button>
          </div>
        )}
      </div>

      {/* 分隔線 */}
      <div style={{ height: '1px', background: '#1e293b' }} />

      {/* 匯出 / 匯入 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div
          style={{
            fontSize: '11px',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          設定備份
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <ActionButton icon={<Download size={13} />} label="匯出 JSON" onClick={handleExport} />
          <ActionButton
            icon={<Upload size={13} />}
            label="匯入 JSON"
            onClick={() => importRef.current?.click()}
          />
        </div>
      </div>

      <input
        ref={importRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportChange}
      />

      {/* 分隔線 */}
      <div style={{ height: '1px', background: '#1e293b' }} />

      {/* 控制 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div
          style={{
            fontSize: '11px',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          播放控制
        </div>

        <ActionButton
          icon={<StopCircle size={13} />}
          label="停止所有播放"
          onClick={() => stopAll()}
          fullWidth
        />

        <ActionButton
          icon={<Trash2 size={13} />}
          label={confirmClear ? '再按一次確認清除' : '全部清除 Bindings'}
          onClick={handleClearAll}
          fullWidth
          danger={confirmClear}
        />
      </div>

      {/* 統計 */}
      <div
        style={{
          padding: '8px 10px',
          background: '#0f172a',
          borderRadius: '6px',
          fontSize: '11px',
          color: '#475569',
        }}
      >
        已綁定：{Object.values(bindings).filter((b) => b.soundFile).length} 個按鍵
      </div>
    </div>
  )
}

interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  fullWidth?: boolean
  danger?: boolean
}

function ActionButton({ icon, label, onClick, fullWidth, danger }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: fullWidth ? '100%' : undefined,
        flex: fullWidth ? undefined : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        padding: '7px 10px',
        background: danger ? '#7f1d1d22' : 'transparent',
        border: `1px solid ${danger ? '#7f1d1d' : '#2a2a3e'}`,
        borderRadius: '6px',
        color: danger ? '#f87171' : '#94a3b8',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'background 0.12s, border-color 0.12s, color 0.12s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.background = danger ? '#7f1d1d44' : '#1a1a2e'
        el.style.borderColor = danger ? '#f87171' : '#22d3ee'
        el.style.color = danger ? '#fca5a5' : '#22d3ee'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.background = danger ? '#7f1d1d22' : 'transparent'
        el.style.borderColor = danger ? '#7f1d1d' : '#2a2a3e'
        el.style.color = danger ? '#f87171' : '#94a3b8'
      }}
    >
      {icon}
      {label}
    </button>
  )
}
