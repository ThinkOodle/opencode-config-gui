import { ipcMain } from 'electron'
import { ConfigManager, OpenCodeConfig } from '../services/config-manager'
import { EnvManager } from '../services/env-manager'

const configManager = new ConfigManager()
const envManager = new EnvManager()

export function registerConfigHandlers(): void {
  // OpenCode config management
  ipcMain.handle('config:readGlobal', async () => {
    return configManager.readGlobal()
  })

  ipcMain.handle('config:writeGlobal', async (_, config: OpenCodeConfig) => {
    return configManager.writeGlobal(config)
  })

  ipcMain.handle('config:readProject', async (_, projectPath: string) => {
    return configManager.readProject(projectPath)
  })

  ipcMain.handle('config:writeProject', async (_, projectPath: string, config: OpenCodeConfig) => {
    return configManager.writeProject(projectPath, config)
  })

  // Environment variable management (for API keys)
  ipcMain.handle('env:set', async (_, key: string, value: string) => {
    return envManager.setEnvVar(key, value)
  })

  ipcMain.handle('env:get', async (_, key: string) => {
    return envManager.getEnvVar(key)
  })

  ipcMain.handle('env:testProvider', async (_, provider: string, apiKey: string) => {
    return envManager.testProviderConnection(provider, apiKey)
  })

  // OpenCode Zen auth.json management
  ipcMain.handle('env:checkOpenCodeAuth', async () => {
    return envManager.checkOpenCodeAuth()
  })

  ipcMain.handle('env:saveOpenCodeAuth', async (_, apiKey: string) => {
    return envManager.saveOpenCodeAuth(apiKey)
  })
}
