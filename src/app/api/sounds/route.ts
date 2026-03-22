import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)
import { getSoundsDir } from '@/lib/sounds-dir'
import type { SoundFile } from '@/lib/types'

const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'])

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024 // 100MB

async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ], { timeout: 5000 })
    const dur = parseFloat((stdout ?? '').trim())
    return isNaN(dur) ? 0 : dur
  } catch {
    return 0
  }
}

export async function GET(): Promise<NextResponse> {
  const soundsDir = getSoundsDir()

  fs.mkdirSync(soundsDir, { recursive: true })

  try {
    const entries = fs.readdirSync(soundsDir)
    const audioEntries = entries.filter((name) => AUDIO_EXTS.has(path.extname(name).toLowerCase()))

    const files: SoundFile[] = await Promise.all(
      audioEntries.map(async (name) => {
        const ext = path.extname(name).toLowerCase()
        const fullPath = path.join(soundsDir, name)
        const stat = fs.statSync(fullPath)
        return {
          filename: name,
          size: stat.size,
          duration: await getAudioDuration(fullPath),
          format: ext.slice(1),
          lastModified: stat.mtime.toISOString(),
        }
      })
    )

    return NextResponse.json({ files })
  } catch (err) {
    console.error('[API /sounds]', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const soundsDir = getSoundsDir()

  fs.mkdirSync(soundsDir, { recursive: true })

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: '未提供音效檔案' }, { status: 400 })
    }

    const ext = path.extname(file.name).toLowerCase()
    if (!AUDIO_EXTS.has(ext)) {
      return NextResponse.json({ error: '不支援的音效格式' }, { status: 400 })
    }

    // 防止路徑穿越
    const safeName = path.basename(file.name)
    const destPath = path.join(soundsDir, safeName)

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: '檔案過大，上限 100MB' }, { status: 413 })
    }

    const arrayBuffer = await file.arrayBuffer()
    fs.writeFileSync(destPath, Buffer.from(arrayBuffer))

    const stat = fs.statSync(destPath)
    const soundFile: SoundFile = {
      filename: safeName,
      size: stat.size,
      duration: await getAudioDuration(destPath),
      format: ext.slice(1),
      lastModified: stat.mtime.toISOString(),
    }

    return NextResponse.json(soundFile, { status: 201 })
  } catch (err) {
    console.error('[API /sounds]', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
