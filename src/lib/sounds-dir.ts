import path from 'path'
import fs from 'fs'
import os from 'os'

const CONFIG_PATH = path.join(process.cwd(), 'config')
const SETTINGS_FILE = path.join(CONFIG_PATH, 'settings.json')

let _cachedDir: string | null = null

export function getSoundsDir(): string {
  if (_cachedDir) return _cachedDir

  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'))
      if (settings.soundsDir) {
        _cachedDir = path.resolve(settings.soundsDir)
        return _cachedDir
      }
    }
  } catch (e) {
    console.warn('[sounds-dir] settings.json 解析失敗', e)
  }

  const defaultDir = path.join(process.cwd(), 'uploads')
  _cachedDir = path.resolve(process.env.SOUNDS_DIR || defaultDir)
  return _cachedDir
}

export function setSoundsDir(dir: string): void {
  if (!fs.existsSync(CONFIG_PATH)) fs.mkdirSync(CONFIG_PATH, { recursive: true })
  const settings = fs.existsSync(SETTINGS_FILE)
    ? JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'))
    : {}
  settings.soundsDir = dir
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
  _cachedDir = dir
}
