'use client'

import React from 'react'
import { KEYBOARD_ROWS } from '@/lib/keyboard-map'
import { useStore } from '@/store/useStore'
import KeyCap from './KeyCap'

/** 行間距（px）— F 鍵列後方的額外間距 */
const ROW_GAP = 6
const F_ROW_EXTRA_GAP = 10
/** 按鍵間距（px） */
const KEY_GAP = 4

export default function KeyboardLayout() {
  const bindings = useStore((s) => s.bindings)
  const selectedKey = useStore((s) => s.selectedKey)

  return (
    <div
      className="inline-flex flex-col items-start select-none"
      style={{
        gap: `${ROW_GAP}px`,
        padding: '20px 24px',
        backgroundColor: '#0e0e1c',
        borderRadius: '14px',
        border: '1px solid #1a1a30',
        boxShadow:
          '0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {KEYBOARD_ROWS.map((row, rowIndex) => {
        const isFRow = rowIndex === 0

        return (
          <React.Fragment key={rowIndex}>
            {/* F 鍵列後方的額外間距 */}
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
                />
              ))}
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
