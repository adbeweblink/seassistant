import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import type { KeyboardConfig } from '@/lib/types'

const CONFIG_PATH = path.join(process.cwd(), 'config')
const KEYBOARD_FILE = path.join(CONFIG_PATH, 'keyboard.json')

const DEFAULT_CONFIG: KeyboardConfig = {
  version: 1,
  name: '預設配置',
  bindings: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export async function GET(): Promise<NextResponse> {
  try {
    if (!fs.existsSync(KEYBOARD_FILE)) {
      return NextResponse.json(DEFAULT_CONFIG)
    }

    const raw = fs.readFileSync(KEYBOARD_FILE, 'utf-8')
    const config: KeyboardConfig = JSON.parse(raw)
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

  // 基本欄位驗證
  if (config.version !== 1) {
    return NextResponse.json({ error: '不支援的配置版本' }, { status: 400 })
  }
  if (typeof config.name !== 'string' || !config.name.trim()) {
    return NextResponse.json({ error: '配置名稱不可為空' }, { status: 400 })
  }
  if (typeof config.bindings !== 'object' || config.bindings === null) {
    return NextResponse.json({ error: '無效的 bindings 格式' }, { status: 400 })
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
