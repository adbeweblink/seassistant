'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export function HelpOverlay() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === '?' &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        )
      ) {
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0f0f1a',
          border: '1px solid #1e1e3a',
          borderRadius: 12,
          padding: '24px 32px',
          maxWidth: 480,
          color: '#e2e8f0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#06b6d4', margin: 0 }}>快捷鍵說明</h2>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        <table style={{ width: '100%', fontSize: 13, borderSpacing: '0 8px' }}>
          <tbody>
            {[
              ['點擊音效 → 點擊按鍵', '綁定音效到按鍵'],
              ['拖曳音效到按鍵', '綁定音效（另一種方式）'],
              ['雙擊已綁定的按鍵', '預聽音效'],
              ['右鍵已綁定的按鍵', '解除綁定'],
              ['Ctrl + Z', '復原上一步'],
              ['⚡ 演出模式按鈕', '進入全螢幕演出'],
              ['Escape', '退出演出模式'],
              ['?', '顯示/關閉此說明'],
            ].map(([key, desc], i) => (
              <tr key={i}>
                <td style={{ color: '#94a3b8', paddingRight: 16, whiteSpace: 'nowrap' }}>
                  <code style={{ background: '#1a1a2e', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{key}</code>
                </td>
                <td style={{ color: '#64748b' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
