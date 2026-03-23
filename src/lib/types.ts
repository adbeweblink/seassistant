/** 播放模式 */
export type PlayMode = 'hold' | 'oneshot' | 'toggle'

/** 單一按鍵的音效綁定設定 */
export interface KeyBinding {
  keyCode: string
  soundFile: string | null
  displayName: string
  startTime: number
  endTime: number | null
  volume: number
  loop: boolean
  color: string
  playMode: PlayMode
  fadeIn: number   // 淡入毫秒（0 = 無）
  fadeOut: number  // 淡出毫秒（0 = 無）
}

/** 完整鍵盤配置（匯出/匯入單位） */
export interface KeyboardConfig {
  version: 1
  name: string
  bindings: Record<string, KeyBinding>
  createdAt: string
  updatedAt: string
}

/** 音效檔案資訊 */
export interface SoundFile {
  filename: string
  size: number
  duration: number
  format: string
  lastModified: string
}

/** YT 下載請求 */
export interface YouTubeDownloadRequest {
  url: string
  format: 'mp3' | 'wav'
  filename?: string
}

/** 下載進度（SSE 推送） */
export interface DownloadProgress {
  status: 'downloading' | 'converting' | 'done' | 'error'
  percent: number
  filename?: string
  error?: string
}
