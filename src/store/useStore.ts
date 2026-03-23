'use client'

import { create } from 'zustand'
import type { KeyBinding, KeyboardConfig } from '@/lib/types'

interface SEAssistantState {
  // 按鍵綁定
  bindings: Record<string, KeyBinding>
  setBinding: (keyCode: string, updates: Partial<KeyBinding>) => void
  removeBinding: (keyCode: string) => void

  // UI 狀態
  selectedKey: string | null
  setSelectedKey: (key: string | null) => void
  isEditing: boolean
  setIsEditing: (editing: boolean) => void

  // 待綁定音效（點擊音效 → 點擊按鍵 → 綁定）
  pendingSound: string | null
  setPendingSound: (filename: string | null) => void

  // 播放狀態
  playingKeys: Set<string>
  addPlayingKey: (key: string) => void
  removePlayingKey: (key: string) => void

  // 音效資料夾
  soundsDir: string
  setSoundsDir: (dir: string) => void

  // 配置管理
  loadConfig: (config: KeyboardConfig) => void
  exportConfig: () => KeyboardConfig
  configName: string
  setConfigName: (name: string) => void

  // 自動存檔標記
  isDirty: boolean
  setDirty: (dirty: boolean) => void
}

export const useStore = create<SEAssistantState>((set, get) => ({
  bindings: {},
  setBinding: (keyCode, updates) =>
    set((state) => ({
      bindings: {
        ...state.bindings,
        [keyCode]: {
          ...(state.bindings[keyCode] || {
            keyCode,
            soundFile: null,
            displayName: keyCode,
            startTime: 0,
            endTime: null,
            volume: 1,
            loop: false,
            color: '',
          }),
          ...updates,
        },
      },
      isDirty: true,
    })),
  removeBinding: (keyCode) =>
    set((state) => {
      const newBindings = { ...state.bindings }
      delete newBindings[keyCode]
      return { bindings: newBindings, isDirty: true }
    }),

  selectedKey: null,
  setSelectedKey: (key) => set({ selectedKey: key }),
  isEditing: false,
  setIsEditing: (editing) => set({ isEditing: editing }),

  pendingSound: null,
  setPendingSound: (filename) => set({ pendingSound: filename }),

  playingKeys: new Set(),
  addPlayingKey: (key) =>
    set((state) => {
      const next = new Set(state.playingKeys)
      next.add(key)
      return { playingKeys: next }
    }),
  removePlayingKey: (key) =>
    set((state) => {
      const next = new Set(state.playingKeys)
      next.delete(key)
      return { playingKeys: next }
    }),

  soundsDir: './sounds',
  setSoundsDir: (dir) => set({ soundsDir: dir }),

  configName: '預設配置',
  setConfigName: (name) => set({ configName: name }),

  loadConfig: (config) =>
    set({
      bindings: config.bindings,
      configName: config.name,
      isDirty: false,
    }),
  exportConfig: () => {
    const state = get()
    return {
      version: 1,
      name: state.configName,
      bindings: state.bindings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },

  isDirty: false,
  setDirty: (dirty) => set({ isDirty: dirty }),
}))
