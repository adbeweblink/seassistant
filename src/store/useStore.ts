'use client'

import { create } from 'zustand'
import type { KeyBinding, BankBindings, KeyboardConfig, KeyboardConfigV1 } from '@/lib/types'

export interface CueLogEntry {
  time: string
  keyCode: string
  soundFile: string
  action: 'play' | 'stop'
}

interface SEAssistantState {
  // Banks
  banks: Record<string, BankBindings>
  activeBank: string
  setActiveBank: (bank: string) => void
  addBank: (name: string) => void
  removeBank: (name: string) => void
  renameBank: (oldName: string, newName: string) => void
  duplicateBank: (source: string, newName: string) => void

  // 當前 bank 的 bindings（便捷存取）
  bindings: BankBindings
  setBinding: (keyCode: string, updates: Partial<KeyBinding>) => void
  removeBinding: (keyCode: string) => void

  // UI 狀態
  selectedKey: string | null
  setSelectedKey: (key: string | null) => void
  isEditing: boolean
  setIsEditing: (editing: boolean) => void

  // 待綁定音效
  pendingSound: string | null
  setPendingSound: (filename: string | null) => void

  // 播放狀態
  playingKeys: Set<string>
  addPlayingKey: (key: string) => void
  removePlayingKey: (key: string) => void

  // 演出模式
  performanceMode: boolean
  setPerformanceMode: (on: boolean) => void

  // 主音量
  masterVolume: number
  setMasterVolume: (vol: number) => void

  // Limiter
  limiterEnabled: boolean
  setLimiterEnabled: (on: boolean) => void

  // Cue Log
  cueLog: CueLogEntry[]
  addCueLog: (entry: Omit<CueLogEntry, 'time'>) => void
  clearCueLog: () => void

  // Clipboard（複製/貼上）
  clipboardBinding: KeyBinding | null
  copyBinding: (keyCode: string) => void
  pasteBinding: (keyCode: string) => void

  // Undo
  undoStack: Record<string, BankBindings>[]
  pushUndo: () => void
  undo: () => void

  // 音效資料夾
  soundsDir: string
  setSoundsDir: (dir: string) => void

  // 配置管理
  loadConfig: (config: KeyboardConfig | KeyboardConfigV1) => void
  exportConfig: () => KeyboardConfig
  configName: string
  setConfigName: (name: string) => void

  // 自動存檔
  isDirty: boolean
  setDirty: (dirty: boolean) => void
}

const DEFAULT_BANK = 'A'

function makeTimestamp(): string {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
}

function defaultBinding(keyCode: string): KeyBinding {
  return {
    keyCode,
    soundFile: null,
    displayName: keyCode,
    startTime: 0,
    endTime: null,
    volume: 1,
    loop: false,
    color: '',
    playMode: 'oneshot',
    fadeIn: 0,
    fadeOut: 0,
    exclusiveGroup: null,
  }
}

export const useStore = create<SEAssistantState>((set, get) => ({
  banks: { [DEFAULT_BANK]: {} },
  activeBank: DEFAULT_BANK,

  get bindings() {
    const state = get()
    return state.banks[state.activeBank] ?? {}
  },

  setActiveBank: (bank) =>
    set((state) => {
      if (!state.banks[bank]) return {}
      return { activeBank: bank }
    }),

  addBank: (name) =>
    set((state) => {
      if (state.banks[name]) return {}
      return {
        banks: { ...state.banks, [name]: {} },
        activeBank: name,
        isDirty: true,
      }
    }),

  removeBank: (name) =>
    set((state) => {
      const keys = Object.keys(state.banks)
      if (keys.length <= 1) return {}
      const newBanks = { ...state.banks }
      delete newBanks[name]
      const newActive = state.activeBank === name ? Object.keys(newBanks)[0] : state.activeBank
      return { banks: newBanks, activeBank: newActive, isDirty: true }
    }),

  renameBank: (oldName, newName) =>
    set((state) => {
      if (!state.banks[oldName] || state.banks[newName]) return {}
      const newBanks = { ...state.banks }
      newBanks[newName] = newBanks[oldName]
      delete newBanks[oldName]
      return {
        banks: newBanks,
        activeBank: state.activeBank === oldName ? newName : state.activeBank,
        isDirty: true,
      }
    }),

  duplicateBank: (source, newName) =>
    set((state) => {
      if (!state.banks[source] || state.banks[newName]) return {}
      return {
        banks: { ...state.banks, [newName]: { ...state.banks[source] } },
        activeBank: newName,
        isDirty: true,
      }
    }),

  setBinding: (keyCode, updates) =>
    set((state) => {
      const bankName = state.activeBank
      const bank = state.banks[bankName] ?? {}
      const existing = bank[keyCode] || defaultBinding(keyCode)
      const newBank = { ...bank, [keyCode]: { ...existing, ...updates } }
      return {
        undoStack: [{ ...state.banks }, ...state.undoStack].slice(0, 20),
        banks: { ...state.banks, [bankName]: newBank },
        isDirty: true,
      }
    }),

  removeBinding: (keyCode) =>
    set((state) => {
      const bankName = state.activeBank
      const bank = { ...(state.banks[bankName] ?? {}) }
      delete bank[keyCode]
      return {
        undoStack: [{ ...state.banks }, ...state.undoStack].slice(0, 20),
        banks: { ...state.banks, [bankName]: bank },
        isDirty: true,
      }
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

  performanceMode: false,
  setPerformanceMode: (on) => set({ performanceMode: on, isEditing: false, selectedKey: null, pendingSound: null }),

  masterVolume: 1,
  setMasterVolume: (vol) => set({ masterVolume: vol }),

  limiterEnabled: true,
  setLimiterEnabled: (on) => set({ limiterEnabled: on }),

  cueLog: [],
  addCueLog: (entry) =>
    set((state) => ({
      cueLog: [{ ...entry, time: makeTimestamp() }, ...state.cueLog].slice(0, 50),
    })),
  clearCueLog: () => set({ cueLog: [] }),

  clipboardBinding: null,
  copyBinding: (keyCode) =>
    set((state) => {
      const bank = state.banks[state.activeBank] ?? {}
      const binding = bank[keyCode]
      return { clipboardBinding: binding ? { ...binding } : null }
    }),
  pasteBinding: (keyCode) =>
    set((state) => {
      if (!state.clipboardBinding) return {}
      const bankName = state.activeBank
      const bank = state.banks[bankName] ?? {}
      const pasted = { ...state.clipboardBinding, keyCode }
      return {
        undoStack: [{ ...state.banks }, ...state.undoStack].slice(0, 20),
        banks: { ...state.banks, [bankName]: { ...bank, [keyCode]: pasted } },
        isDirty: true,
      }
    }),

  undoStack: [],
  pushUndo: () =>
    set((state) => ({
      undoStack: [{ ...state.banks }, ...state.undoStack].slice(0, 20),
    })),
  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return {}
      const [prev, ...rest] = state.undoStack
      return { banks: prev, undoStack: rest, isDirty: true }
    }),

  soundsDir: './sounds',
  setSoundsDir: (dir) => set({ soundsDir: dir }),

  configName: '預設配置',
  setConfigName: (name) => set({ configName: name }),

  loadConfig: (config) => {
    // v1 向下相容
    if (config.version === 1) {
      const v1 = config as KeyboardConfigV1
      set({
        banks: { [DEFAULT_BANK]: v1.bindings },
        activeBank: DEFAULT_BANK,
        configName: v1.name,
        isDirty: false,
      })
    } else {
      const v2 = config as KeyboardConfig
      set({
        banks: v2.banks,
        activeBank: v2.activeBank || Object.keys(v2.banks)[0] || DEFAULT_BANK,
        configName: v2.name,
        isDirty: false,
      })
    }
  },

  exportConfig: () => {
    const state = get()
    return {
      version: 2,
      name: state.configName,
      banks: state.banks,
      activeBank: state.activeBank,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },

  isDirty: false,
  setDirty: (dirty) => set({ isDirty: dirty }),
}))
