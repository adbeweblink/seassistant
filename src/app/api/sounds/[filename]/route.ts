import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getSoundsDir } from '@/lib/sounds-dir'

const MIME_MAP: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase().slice(1)
  return MIME_MAP[ext] ?? 'audio/mpeg'
}

function resolveSoundPath(filename: string): string | null {
  const soundsDir = getSoundsDir()
  const safeName = path.basename(filename)
  const fullPath = path.join(soundsDir, safeName)

  // 防止路徑穿越：確認解析後路徑在 soundsDir 內
  const resolvedDir = path.resolve(soundsDir)
  const resolvedFile = path.resolve(fullPath)
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) return null

  return resolvedFile
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse> {
  const { filename } = await params
  const filePath = resolveSoundPath(decodeURIComponent(filename))

  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: '找不到音效檔案' }, { status: 404 })
  }

  const stat = fs.statSync(filePath)
  const mimeType = getMimeType(filename)
  const fileSize = stat.size

  const rangeHeader = request.headers.get('range')

  if (rangeHeader) {
    // 支援 Range 請求（部分載入）
    const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-')
    let start = parseInt(startStr, 10)
    let end = endStr ? parseInt(endStr, 10) : fileSize - 1

    // 邊界驗證
    if (isNaN(start) || start < 0) start = 0
    if (isNaN(end) || end >= fileSize) end = fileSize - 1
    if (start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${fileSize}` },
      })
    }

    const chunkSize = end - start + 1

    const stream = fs.createReadStream(filePath, { start, end })
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk))
        stream.on('end', () => controller.close())
        stream.on('error', (err) => controller.error(err))
      },
      cancel() {
        stream.destroy()
      },
    })

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        'Content-Type': mimeType,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
      },
    })
  }

  // 完整檔案串流
  const stream = fs.createReadStream(filePath)
  const webStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk))
      stream.on('end', () => controller.close())
      stream.on('error', (err) => controller.error(err))
    },
    cancel() {
      stream.destroy()
    },
  })

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(fileSize),
    },
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse> {
  const { filename } = await params
  const filePath = resolveSoundPath(decodeURIComponent(filename))

  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: '找不到音效檔案' }, { status: 404 })
  }

  try {
    fs.unlinkSync(filePath)
    return NextResponse.json({ success: true, filename: path.basename(filePath) })
  } catch (err) {
    console.error('[API /sounds/delete]', err)
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 })
  }
}
