import { ipcMain } from 'electron'
import { McpManager } from '../services/mcp-manager'
import { AgencyCatalog } from '../services/agency-catalog'
import { McpServerConfig } from '../services/config-manager'

const mcpManager = new McpManager()
const catalog = new AgencyCatalog()

export function registerMcpHandlers(): void {
  // Install MCP server
  ipcMain.handle('mcp:install', async (_, serverId: string, config: McpServerConfig) => {
    return mcpManager.install(serverId, config)
  })

  // List installed MCP servers
  ipcMain.handle('mcp:list', async () => {
    return mcpManager.listInstalled()
  })

  // Remove MCP server
  ipcMain.handle('mcp:remove', async (_, serverId: string) => {
    return mcpManager.remove(serverId)
  })

  // Toggle MCP server enabled/disabled
  ipcMain.handle('mcp:toggleEnabled', async (_, serverId: string, enabled: boolean) => {
    return mcpManager.toggleEnabled(serverId, enabled)
  })

  // Test MCP connection
  ipcMain.handle('mcp:testConnection', async (_, serverId: string) => {
    return mcpManager.testConnection(serverId)
  })

  // Fetch agency MCP catalog
  ipcMain.handle('mcp:fetchCatalog', async () => {
    return catalog.fetchMcpServers()
  })
}
