import { ipcMain } from 'electron'
import { DependencyChecker } from '../services/dependency-checker'

const checker = new DependencyChecker()

export function registerDependencyHandlers(): void {
  ipcMain.handle('dependencies:checkDesktopApp', async () => {
    return checker.checkDesktopApp()
  })
}
