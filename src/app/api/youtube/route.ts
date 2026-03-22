import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { getSoundsDir } from '@/lib/sounds-dir'
import type { YouTubeDownloadRequest, DownloadProgress } from '@/lib/types'

// 解析 yt-dlp stdout 百分比
// 格式：[download]  45.2% of ...
function parsePercent(line: string): number | null {
  const match = line.match(/\[download\]\s+([\d.]+)%/)
  if (match) {
    const val = parseFloat(match[1])
    return isNaN(val) ? null : val
  }
  return null
}

// 解析下載完成後的檔名
// 格式：[ExtractAudio] Destination: filename.mp3
// 或：[download] Destination: filename.mp3
function parseFilename(line: string): string | null {
  const match = line.match(/Destination:\s+(.+)$/)
  if (match) {
    const fullPath = match[1].trim()
    // 取得最後一段（檔名）
    const parts = fullPath.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] ?? null
  }
  return null
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: YouTubeDownloadRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '無效的請求格式' }, { status: 400 })
  }

  const { url, format } = body

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: '缺少 url 參數' }, { status: 400 })
  }

  // URL 格式 + scheme + domain 驗證
  const ALLOWED_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com', 'music.youtube.com']
  try {
    const parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: '只支援 http/https 連結' }, { status: 400 })
    }
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return NextResponse.json({ error: '只支援 YouTube 連結' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: '無效的 URL 格式' }, { status: 400 })
  }

  const audioFormat = format === 'wav' ? 'wav' : 'mp3'
  const soundsDir = getSoundsDir()

  // SSE 串流回應
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      function send(progress: DownloadProgress) {
        const data = `data: ${JSON.stringify(progress)}\n\n`
        controller.enqueue(encoder.encode(data))
      }

      const ytdlp = spawn(
        'yt-dlp',
        [
          '-x',
          '--audio-format', audioFormat,
          '--audio-quality', '0',
          '-o', '%(title)s.%(ext)s',
          '--newline',
          '--progress',
          url,
        ],
        { cwd: soundsDir }
      )

      let lastFilename: string | null = null
      let hasError = false

      ytdlp.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8')
        for (const line of text.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed) continue

          const percent = parsePercent(trimmed)
          if (percent !== null) {
            send({ status: 'downloading', percent })
            continue
          }

          // 偵測轉檔階段
          if (trimmed.includes('[ExtractAudio]') || trimmed.includes('[ffmpeg]')) {
            send({ status: 'converting', percent: 100 })
          }

          const filename = parseFilename(trimmed)
          if (filename) {
            lastFilename = filename
          }
        }
      })

      ytdlp.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8')
        // yt-dlp 部分資訊輸出到 stderr，非全為錯誤
        // 只偵測明確錯誤關鍵字
        if (
          text.includes('ERROR:') ||
          text.includes('Unable to download') ||
          text.includes('is not a valid URL')
        ) {
          hasError = true
          console.error('[yt-dlp stderr]', text.trim())
          send({ status: 'error', percent: 0, error: '下載失敗，請確認影片網址是否正確' })
        }
      })

      ytdlp.on('close', (code) => {
        if (hasError) {
          controller.close()
          return
        }

        if (code !== 0) {
          send({ status: 'error', percent: 0, error: `yt-dlp 退出碼：${code}` })
        } else {
          send({
            status: 'done',
            percent: 100,
            filename: lastFilename ?? undefined,
          })
        }
        controller.close()
      })

      ytdlp.on('error', (err) => {
        send({ status: 'error', percent: 0, error: `無法啟動 yt-dlp：${err.message}` })
        controller.close()
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
