import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { BrowserWindow, ipcMain } from 'electron'

let mainWindow: BrowserWindow | null = null
let isDev = false

// Register IPC handlers - call this early so handlers exist in both dev and prod
export function registerUpdaterHandlers(devMode: boolean): void {
  isDev = devMode

  ipcMain.handle('updater:check', async () => {
    if (isDev) {
      // In dev mode, simulate "no update available" after a brief delay
      sendStatusToWindow('checking-for-update')
      setTimeout(() => {
        sendStatusToWindow('update-not-available', { version: 'dev' })
      }, 1000)
      return null
    }
    return autoUpdater.checkForUpdatesAndNotify()
  })

  ipcMain.handle('updater:install', () => {
    if (isDev) {
      return
    }
    autoUpdater.quitAndInstall()
  })
}

export function initAutoUpdater(window: BrowserWindow | null): void {
  mainWindow = window

  // Configure auto-updater
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('checking-for-update')
  })

  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('update-available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('update-not-available', info)
  })

  autoUpdater.on('error', (err) => {
    sendStatusToWindow('update-error', err.message)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindow('download-progress', {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('update-downloaded', info)
  })

  // Check for updates on startup
  autoUpdater.checkForUpdatesAndNotify()

  // Check periodically (every 4 hours)
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify()
  }, 4 * 60 * 60 * 1000)
}

function sendStatusToWindow(status: string, data?: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', { status, data })
  }
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall()
}
