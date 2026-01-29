import { ConfigManager, McpServerConfig } from './config-manager'

export interface InstalledMcp {
  id: string
  name: string
  type: 'local' | 'remote'
  enabled: boolean
  url?: string
  command?: string[]
}

export interface McpInstallResult {
  success: boolean
  error?: string
}

export interface McpConnectionResult {
  success: boolean
  message: string
}

export class McpManager {
  private configManager = new ConfigManager()

  async install(serverId: string, serverConfig: McpServerConfig): Promise<McpInstallResult> {
    try {
      await this.configManager.addMcpServer(serverId, {
        ...serverConfig,
        enabled: true
      })
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to install MCP server' 
      }
    }
  }

  async listInstalled(): Promise<InstalledMcp[]> {
    const config = await this.configManager.readGlobal()
    const mcpServers = config.mcp || {}

    return Object.entries(mcpServers).map(([id, serverConfig]) => ({
      id,
      name: id, // We could enhance this with a display name lookup
      type: serverConfig.type,
      enabled: serverConfig.enabled !== false,
      url: serverConfig.url,
      command: serverConfig.command
    }))
  }

  async remove(serverId: string): Promise<void> {
    await this.configManager.removeMcpServer(serverId)
  }

  async toggleEnabled(serverId: string, enabled: boolean): Promise<void> {
    await this.configManager.setMcpEnabled(serverId, enabled)
  }

  async testConnection(serverId: string): Promise<McpConnectionResult> {
    const config = await this.configManager.readGlobal()
    const serverConfig = config.mcp?.[serverId]

    if (!serverConfig) {
      return { success: false, message: 'MCP server not found in configuration' }
    }

    if (serverConfig.type === 'remote' && serverConfig.url) {
      return this.testRemoteConnection(serverConfig.url)
    }

    if (serverConfig.type === 'local' && serverConfig.command) {
      return this.testLocalConnection(serverConfig.command)
    }

    return { success: false, message: 'Invalid server configuration' }
  }

  private async testRemoteConnection(url: string): Promise<McpConnectionResult> {
    try {
      // Try a simple OPTIONS or HEAD request to the MCP endpoint
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(url, {
        method: 'OPTIONS',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Any response (even 4xx for auth) means the server is reachable
      if (response.status < 500) {
        return { success: true, message: 'Server is reachable' }
      }

      return { success: false, message: `Server returned ${response.status}` }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, message: 'Connection timed out' }
      }
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      }
    }
  }

  private async testLocalConnection(command: string[]): Promise<McpConnectionResult> {
    // For local servers, we verify the command exists
    // Full connection testing would require starting the server
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    try {
      // Check if the main command/binary exists
      const mainCommand = command[0]
      
      if (mainCommand === 'npx' || mainCommand === 'bunx') {
        // For npx/bunx, just verify npm/bun is available
        const checkCmd = mainCommand === 'npx' ? 'npm --version' : 'bun --version'
        await execAsync(checkCmd)
        return { success: true, message: `${mainCommand} is available, package will be fetched on first use` }
      }

      // For other commands, check if they exist
      await execAsync(`which ${mainCommand}`)
      return { success: true, message: 'Command is available' }
    } catch {
      return { success: false, message: 'Command not found on system' }
    }
  }
}
