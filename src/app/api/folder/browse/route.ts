import { NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function POST(): Promise<NextResponse> {
  try {
    // 用 PowerShell 開啟原生資料夾選擇視窗
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `
        Add-Type -AssemblyName System.Windows.Forms
        $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
        $dialog.Description = '選擇音效資料夾'
        $dialog.ShowNewFolderButton = $true
        $result = $dialog.ShowDialog()
        if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
          Write-Output $dialog.SelectedPath
        } else {
          Write-Output ''
        }
      `,
    ], { timeout: 60000 })

    const selectedPath = stdout.trim()
    if (!selectedPath) {
      return NextResponse.json({ cancelled: true })
    }

    return NextResponse.json({ path: selectedPath })
  } catch (err) {
    console.error('[API /folder/browse]', err)
    return NextResponse.json({ error: '無法開啟資料夾選擇視窗' }, { status: 500 })
  }
}
