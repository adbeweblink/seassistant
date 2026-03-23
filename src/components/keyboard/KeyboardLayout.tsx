'use client'

import React, { useState, useRef, useEffect } from 'react'
import { KEYBOARD_ROWS } from '@/lib/keyboard-map'
import { useStore } from '@/store/useStore'
import KeyCap from './KeyCap'

const ROW_GAP = 6
const F_ROW_EXTRA_GAP = 10
const KEY_GAP = 4

// 計算最寬那行的 total width units
const MAX_ROW_UNITS = Math.max(
  ...KEYBOARD_ROWS.map((row) =>
    row.reduce((sum, k) => sum + (k.width ?? 1), 0)
  )
)

export default function KeyboardLayout() {
  const bindings = useStore((s) => s.banks[s.activeBank] ?? {})
  const selectedKey = useStore((s) => s.selectedKey)
  const performanceMode = useStore((s) => s.performanceMode)
  const [guideDismissed, setGuideDismissed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [unitWidth, setUnitWidth] = useState(48)

  const showGuide = Object.keys(bindings).length === 0 && !guideDismissed

  // 自適應寬度計算
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const calc = () => {
      const padding = 48 // 左右 padding 24*2
      const totalGaps = (MAX_ROW_UNITS) * KEY_GAP // 按鍵間距
      const available = el.clientWidth - padding - totalGaps
      const unit = Math.round(Math.max(32, Math.min(72, available / MAX_ROW_UNITS)))
      setUnitWidth((prev) => prev === unit ? prev : unit)
    }

    calc()
    const observer = new ResizeObserver(calc)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 演出模式下最小 unit 提高
  const effectiveUnit = performanceMode ? Math.max(unitWidth, 56) : unitWidth

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-start select-none w-full"
      style={{
        gap: `${ROW_GAP}px`,
        padding: '20px 24px',
        backgroundColor: '#0e0e1c',
        borderRadius: '14px',
        border: '1px solid #1a1a30',
        boxShadow: '0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)',
        position: 'relative',
      }}
    >
      {/* 新手引導 overlay */}
      {showGuide && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '14px',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(10,10,15,0.85)',
              borderRadius: '12px',
              border: '1px solid rgba(6,182,212,0.3)',
              padding: '24px 28px',
              maxWidth: '340px',
              pointerEvents: 'auto',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div style={{ marginBottom: '12px', fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>
              🎯 開始使用
            </div>
            <ol style={{ margin: 0, padding: '0 0 0 20px', color: '#94a3b8', fontSize: '0.875rem', lineHeight: 2 }}>
              <li>左側下載或上傳音效</li>
              <li>點選音效（出現黃色標記）</li>
              <li>點擊鍵盤按鍵完成綁定</li>
              <li>按下實體鍵盤播放！</li>
            </ol>
            <div style={{ marginTop: '12px', color: '#64748b', fontSize: '0.8rem', lineHeight: 1.8 }}>
              💡 也可以直接拖曳音效到按鍵上<br />
              💡 右鍵按鍵可解綁 · Ctrl+Z 可復原
            </div>
            <button
              onClick={() => setGuideDismissed(true)}
              style={{
                marginTop: '16px',
                padding: '6px 20px',
                background: 'rgba(6,182,212,0.15)',
                border: '1px solid rgba(6,182,212,0.4)',
                borderRadius: '6px',
                color: '#06b6d4',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              知道了
            </button>
          </div>
        </div>
      )}

      {/* 鍵盤列 */}
      {KEYBOARD_ROWS.map((row, rowIndex) => {
        const isFRow = rowIndex === 0

        return (
          <React.Fragment key={rowIndex}>
            {isFRow && (
              <div style={{ height: `${F_ROW_EXTRA_GAP}px`, width: '100%' }} />
            )}

            <div
              className="flex items-center"
              style={{ gap: `${KEY_GAP}px` }}
            >
              {row.map((keyDef) => (
                <KeyCap
                  key={keyDef.code}
                  keyDef={keyDef}
                  binding={bindings[keyDef.code]}
                  isSelected={selectedKey === keyDef.code}
                  unitWidth={effectiveUnit}
                />
              ))}
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
