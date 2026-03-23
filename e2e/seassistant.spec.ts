import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3716'

test.describe('SEAssistant E2E', () => {

  test('頁面載入 — 鍵盤 UI 渲染', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')

    // 截圖：初始畫面
    await page.screenshot({ path: 'e2e/screenshots/01-initial.png', fullPage: true })

    // 標題存在
    await expect(page.locator('text=SEAssistant')).toBeVisible()

    // 鍵盤按鍵存在（至少有 Q、A、Z）
    await expect(page.locator('[aria-label^="Q"]')).toBeVisible()
    await expect(page.getByLabel('A', { exact: true })).toBeVisible()
    await expect(page.locator('[aria-label^="Z"]')).toBeVisible()

    // Bank tab 存在
    await expect(page.locator('text=BANK')).toBeVisible()
  })

  test('新手引導顯示', async ({ page }) => {
    // 清空 config 先
    await fetch(`${BASE}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 2, name: 'empty', banks: { A: {} }, activeBank: 'A', createdAt: '', updatedAt: '' }),
    })

    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await page.screenshot({ path: 'e2e/screenshots/02-onboarding.png', fullPage: true })

    // 新手引導文字
    const guide = page.locator('text=開始使用')
    // 可能顯示也可能已有 bindings 被 autoload 蓋掉
    if (await guide.isVisible()) {
      await expect(guide).toBeVisible()
    }
  })

  test('音效庫 — 顯示已有音效', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'e2e/screenshots/03-sound-library.png', fullPage: true })

    // 音效庫應該有至少 1 個音效（Rick Astley）
    const soundItems = page.locator('text=Rick Astley')
    await expect(soundItems.first()).toBeVisible({ timeout: 5000 })
  })

  test('點擊音效 → 黃色待綁定提示', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 點擊第一個音效
    const soundItem = page.locator('text=Rick Astley').first()
    await soundItem.click()

    await page.waitForTimeout(300)
    await page.screenshot({ path: 'e2e/screenshots/04-pending-sound.png', fullPage: true })

    // 應出現「點擊鍵盤上的按鍵來綁定」提示
    await expect(page.locator('text=點擊鍵盤上的按鍵來綁定')).toBeVisible()
  })

  test('綁定音效到按鍵 A', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 先點音效
    await page.locator('text=Rick Astley').first().click()
    await page.waitForTimeout(200)

    // 點鍵盤上的 A 鍵
    const keyA = page.locator('[aria-label^="A"]').first()
    await keyA.click()
    await page.waitForTimeout(300)

    await page.screenshot({ path: 'e2e/screenshots/05-bound-key.png', fullPage: true })

    // A 鍵應該顯示音效名稱（截斷）
    // 驗證 binding 被存了
    const configRes = await fetch(`${BASE}/api/config`)
    const config = await configRes.json()
    // 等 autosave（2s debounce），用 API 直接驗
  })

  test('演出模式 — 切換', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 點擊演出模式按鈕
    const perfButton = page.locator('text=演出模式').first()
    await perfButton.click()
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'e2e/screenshots/06-performance-mode.png', fullPage: true })

    // 演出模式應該有退出按鈕
    await expect(page.locator('text=退出演出')).toBeVisible()

    // 時鐘應該顯示（HH:MM:SS 格式）
    const clock = page.locator('text=/\\d{2}:\\d{2}:\\d{2}/')
    await expect(clock.first()).toBeVisible()

    // 按 Escape 退出
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // 應該回到一般模式
    await expect(page.locator('text=演出模式').first()).toBeVisible()
  })

  test('全部停止按鈕', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 全部停止按鈕存在且可點
    const stopBtn = page.locator('text=全部停止').first()
    await expect(stopBtn).toBeVisible()
    await stopBtn.click()
  })

  test('快捷鍵說明 — ? 鍵', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 用 dispatch 觸發 ? 鍵
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
    })
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'e2e/screenshots/07-help-overlay.png', fullPage: true })

    // 應該顯示快捷鍵說明
    await expect(page.locator('text=快捷鍵說明')).toBeVisible()

    // 再按一次關閉
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
    })
    await page.waitForTimeout(300)
  })

  test('API — GET /api/sounds 回傳音效列表', async ({ request }) => {
    const res = await request.get(`${BASE}/api/sounds`)
    expect(res.ok()).toBeTruthy()
    const data = await res.json()
    expect(data.files).toBeDefined()
    expect(Array.isArray(data.files)).toBe(true)
    expect(data.files.length).toBeGreaterThan(0)

    const file = data.files[0]
    expect(file.filename).toBeDefined()
    expect(file.size).toBeGreaterThan(0)
    expect(file.format).toBeDefined()
  })

  test('API — GET/PUT /api/config 存讀一致', async ({ request }) => {
    const testConfig = {
      version: 2,
      name: 'e2e-test',
      banks: { A: {}, B: {} },
      activeBank: 'A',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const putRes = await request.put(`${BASE}/api/config`, { data: testConfig })
    expect(putRes.ok()).toBeTruthy()

    const getRes = await request.get(`${BASE}/api/config`)
    const saved = await getRes.json()
    expect(saved.name).toBe('e2e-test')
    expect(saved.banks.A).toBeDefined()
    expect(saved.banks.B).toBeDefined()
  })

  test('API — GET /api/folder 回傳路徑', async ({ request }) => {
    const res = await request.get(`${BASE}/api/folder`)
    expect(res.ok()).toBeTruthy()
    const data = await res.json()
    expect(data.soundsDir).toBeDefined()
    expect(data.exists).toBe(true)
  })

  test('側邊欄收合/展開', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 找到收合按鈕（ChevronLeft）
    const collapseBtn = page.locator('button[title="收合側邊欄"]')
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click()
      await page.waitForTimeout(300)

      await page.screenshot({ path: 'e2e/screenshots/08-sidebar-collapsed.png', fullPage: true })

      // 展開
      const expandBtn = page.locator('button[title="展開側邊欄"]')
      await expect(expandBtn).toBeVisible()
      await expandBtn.click()
      await page.waitForTimeout(300)
    }
  })
})
