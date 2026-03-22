import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getSoundsDir, setSoundsDir } from '@/lib/sounds-dir'

// 專案根目錄作為安全基準
const PROJECT_ROOT = path.resolve(process.cwd())

// 危險系統路徑（blocklist）
const BLOCKED_PATHS = [
  'C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)',
  '/etc', '/sys', '/proc', '/usr', '/bin', '/sbin', '/var',
]

function isSafePath(resolvedDir: string): boolean {
  const normalized = resolvedDir.replace(/\\/g, '/')
  for (const blocked of BLOCKED_PATHS) {
    const normalizedBlocked = blocked.replace(/\\/g, '/')
    if (normalized.toLowerCase().startsWith(normalizedBlocked.toLowerCase())) {
      return false
    }
  }
  return true
}

export async function GET(): Promise<NextResponse> {
  const soundsDir = getSoundsDir()
  const exists = fs.existsSync(soundsDir)
  return NextResponse.json({ soundsDir, exists })
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  let body: { soundsDir: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '無效的 JSON 格式' }, { status: 400 })
  }

  const { soundsDir } = body

  if (!soundsDir || typeof soundsDir !== 'string') {
    return NextResponse.json({ error: '缺少 soundsDir 參數' }, { status: 400 })
  }

  const resolvedDir = path.resolve(soundsDir)

  // 安全檢查：不允許系統路徑
  if (!isSafePath(resolvedDir)) {
    return NextResponse.json({ error: '不允許使用系統路徑' }, { status: 403 })
  }

  if (!fs.existsSync(resolvedDir)) {
    return NextResponse.json({ error: '路徑不存在' }, { status: 400 })
  }

  const stat = fs.statSync(resolvedDir)
  if (!stat.isDirectory()) {
    return NextResponse.json({ error: '指定路徑不是資料夾' }, { status: 400 })
  }

  try {
    setSoundsDir(resolvedDir)
    return NextResponse.json({ soundsDir: resolvedDir, exists: true })
  } catch (err) {
    console.error('[API /folder]', err)
    return NextResponse.json({ error: '儲存設定失敗' }, { status: 500 })
  }
}
