import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

export function initAutoUpdater(window: BrowserWindow | null): void {
  mainWindow = window

  // Configure auto-updater
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Don't check in development
  if (process.env.NODE_ENV === 'development') {
    return
  }

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
