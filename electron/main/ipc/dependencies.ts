import { ipcMain } from 'electron'
import { DependencyChecker } from '../services/dependency-checker'
import { Installer } from '../services/installer'

const checker = new DependencyChecker()
const installer = new Installer()

export function registerDependencyHandlers(): void {
  ipcMain.handle('dependencies:check', async () => {
    return checker.checkAll()
  })

  ipcMain.handle('dependencies:checkOne', async (_, id: string) => {
    return checker.check(id)
  })

  ipcMain.handle('dependencies:install', async (_, id: string) => {
    return installer.install(id)
  })

  ipcMain.handle('dependencies:installAll', async () => {
    return installer.installAll()
  })

  ipcMain.handle('dependencies:checkDesktopApp', async () => {
    return checker.checkDesktopApp()
  })

  ipcMain.handle('dependencies:installDesktopApp', async () => {
    return installer.installDesktopApp()
  })
}
