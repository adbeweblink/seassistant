import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import type { KeyboardConfig } from '@/lib/types'

const CONFIG_PATH = path.join(process.cwd(), 'config')
const KEYBOARD_FILE = path.join(CONFIG_PATH, 'keyboard.json')

const DEFAULT_CONFIG: KeyboardConfig = {
  version: 2,
  name: '預設配置',
  banks: { A: {} },
  activeBank: 'A',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export async function GET(): Promise<NextResponse> {
  try {
    if (!fs.existsSync(KEYBOARD_FILE)) {
      return NextResponse.json(DEFAULT_CONFIG)
    }

    const raw = fs.readFileSync(KEYBOARD_FILE, 'utf-8')
    const config = JSON.parse(raw)
    // 直接回傳，loadConfig 會處理 v1/v2 相容
    return NextResponse.json(config)
  } catch (err) {
    console.error('[API /config]', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  let config: KeyboardConfig
  try {
    config = await request.json()
  } catch {
    return NextResponse.json({ error: '無效的 JSON 格式' }, { status: 400 })
  }

  if (typeof config.name !== 'string' || !config.name.trim()) {
    return NextResponse.json({ error: '配置名稱不可為空' }, { status: 400 })
  }
  if (typeof config.banks !== 'object' || config.banks === null) {
    return NextResponse.json({ error: '無效的 banks 格式' }, { status: 400 })
  }

  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.mkdirSync(CONFIG_PATH, { recursive: true })
    }

    config.updatedAt = new Date().toISOString()
    const tmpPath = KEYBOARD_FILE + '.tmp'
    fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), 'utf-8')
    fs.renameSync(tmpPath, KEYBOARD_FILE)

    return NextResponse.json(config)
  } catch (err) {
    console.error('[API /config]', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
