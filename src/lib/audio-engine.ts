/** Web Audio API 引擎 — 單例模式，低延遲播放 */

let audioContext: AudioContext | null = null

const bufferCache = new Map<string, AudioBuffer>()
const inflightLoads = new Map<string, Promise<AudioBuffer>>()
const activeNodes = new Map<string, { source: AudioBufferSourceNode; gain: GainNode }>()

export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext({ latencyHint: 'interactive' })
  }
  return audioContext
}

export async function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}

/** 預載音效到 buffer cache（含去重，避免同一檔案重複 fetch） */
export async function preloadSound(filename: string): Promise<AudioBuffer> {
  if (bufferCache.has(filename)) {
    return bufferCache.get(filename)!
  }
  if (inflightLoads.has(filename)) {
    return inflightLoads.get(filename)!
  }

  const ctx = getAudioContext()
  const promise = fetch(`/api/sounds/${encodeURIComponent(filename)}`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`無法載入音效: ${filename}`)
      const arrayBuffer = await response.arrayBuffer()
      return ctx.decodeAudioData(arrayBuffer)
    })
    .then((audioBuffer) => {
      bufferCache.set(filename, audioBuffer)
      inflightLoads.delete(filename)
      return audioBuffer
    })
    .catch((err) => {
      inflightLoads.delete(filename)
      throw err
    })

  inflightLoads.set(filename, promise)
  return promise
}

/** 檢查某鍵是否正在播放 */
export function isKeyPlaying(keyCode: string): boolean {
  return activeNodes.has(keyCode)
}

/** 播放音效 */
export function playSound(
  keyCode: string,
  filename: string,
  options: {
    startTime?: number
    endTime?: number | null
    volume?: number
    loop?: boolean
    fadeIn?: number
    onEnded?: () => void
  } = {}
): void {
  const ctx = getAudioContext()
  const buffer = bufferCache.get(filename)
  if (!buffer) return

  // 如果此鍵已在播放，先停掉（無淡出，因為要立即重播）
  stopSoundImmediate(keyCode)

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const targetVolume = options.volume ?? 1
  const fadeInMs = options.fadeIn ?? 0
  const gainNode = ctx.createGain()

  // 淡入：從 0 漸增到目標音量
  if (fadeInMs > 0) {
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + fadeInMs / 1000)
  } else {
    gainNode.gain.value = targetVolume
  }

  source.connect(gainNode).connect(ctx.destination)
  source.loop = options.loop ?? false

  const start = options.startTime ?? 0
  const duration =
    options.endTime != null ? options.endTime - start : undefined

  if (source.loop && duration) {
    source.loopStart = start
    source.loopEnd = options.endTime!
  }

  source.start(0, start, source.loop ? undefined : duration)

  activeNodes.set(keyCode, { source, gain: gainNode })

  source.onended = () => {
    const node = activeNodes.get(keyCode)
    if (node) {
      node.gain.disconnect()
      activeNodes.delete(keyCode)
    }
    options.onEnded?.()
  }
}

/** 淡出停止（有淡出時間則漸弱，否則立即停止） */
export function stopSoundWithFade(keyCode: string, fadeOutMs: number = 0): void {
  const node = activeNodes.get(keyCode)
  if (!node) return

  if (fadeOutMs > 0) {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    node.gain.gain.cancelScheduledValues(now)
    node.gain.gain.setValueAtTime(node.gain.gain.value, now)
    node.gain.gain.linearRampToValueAtTime(0, now + fadeOutMs / 1000)
    // 淡出結束後真正停止
    setTimeout(() => {
      try { node.source.stop() } catch { /* 已停 */ }
      node.gain.disconnect()
      activeNodes.delete(keyCode)
    }, fadeOutMs)
  } else {
    stopSoundImmediate(keyCode)
  }
}

/** 立即停止（無淡出） */
function stopSoundImmediate(keyCode: string): void {
  const node = activeNodes.get(keyCode)
  if (node) {
    try { node.source.stop() } catch { /* 已停 */ }
    node.gain.disconnect()
    activeNodes.delete(keyCode)
  }
}

/** 停止播放（向下相容，無淡出） */
export function stopSound(keyCode: string): void {
  stopSoundImmediate(keyCode)
}

/** 停止所有播放 */
export function stopAll(): void {
  activeNodes.forEach((node) => {
    try {
      node.source.stop()
    } catch {
      // 已停止
    }
    node.gain.disconnect()
  })
  activeNodes.clear()
}

/** 從 cache 移除 */
export function unloadSound(filename: string): void {
  bufferCache.delete(filename)
}

/** 取得 buffer 時長 */
export function getBufferDuration(filename: string): number | null {
  const buffer = bufferCache.get(filename)
  return buffer ? buffer.duration : null
}
