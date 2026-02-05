import { ipcMain } from 'electron'
import { AgentsManager } from '../services/agents-manager'
import { AgencyCatalog } from '../services/agency-catalog'

const catalog = new AgencyCatalog()
const agentsManager = new AgentsManager(catalog)

export function registerAgentsHandlers(): void {
  // Install agent from agency catalog
  ipcMain.handle('agents:installFromCatalog', async (_, agentId: string) => {
    return agentsManager.installFromCatalog(agentId)
  })

  // Save agent (create or update)
  ipcMain.handle('agents:save', async (_, name: string, content: string) => {
    return agentsManager.saveAgent(name, content)
  })

  // List installed agents
  ipcMain.handle('agents:list', async () => {
    return agentsManager.listInstalled()
  })

  // Get agent content
  ipcMain.handle('agents:getContent', async (_, name: string) => {
    return agentsManager.getAgentContent(name)
  })

  // Remove agent
  ipcMain.handle('agents:remove', async (_, name: string) => {
    return agentsManager.remove(name)
  })

  // Fetch agency catalog
  ipcMain.handle('agents:fetchCatalog', async () => {
    return catalog.fetchAgents()
  })

  // Validate agent content
  ipcMain.handle('agents:validate', async (_, content: string) => {
    return agentsManager.validateAgentContent(content)
  })
}
