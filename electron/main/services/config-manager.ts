import { homedir } from 'os'
import { join } from 'path'
import { readFile, writeFile, mkdir, access } from 'fs/promises'

export interface OpenCodeConfig {
  $schema?: string
  theme?: string
  model?: string
  small_model?: string
  autoupdate?: boolean
  provider?: Record<string, ProviderConfig>
  mcp?: Record<string, McpServerConfig>
  tools?: Record<string, boolean>
  permission?: Record<string, string | Record<string, string>>
  instructions?: string[]
  [key: string]: unknown
}

export interface ProviderConfig {
  models?: Record<string, unknown>
  options?: {
    apiKey?: string
    baseURL?: string
    timeout?: number
    [key: string]: unknown
  }
}

export interface McpServerConfig {
  type: 'local' | 'remote'
  command?: string[]
  url?: string
  enabled?: boolean
  environment?: Record<string, string>
  headers?: Record<string, string>
  oauth?: object | false
}

export class ConfigManager {
  private globalConfigDir = join(homedir(), '.config', 'opencode')
  private globalConfigPath = join(this.globalConfigDir, 'opencode.json')

  async readGlobal(): Promise<OpenCodeConfig> {
    try {
      const content = await readFile(this.globalConfigPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      // Return default config if file doesn't exist
      return {
        $schema: 'https://opencode.ai/config.json'
      }
    }
  }

  async writeGlobal(config: OpenCodeConfig): Promise<void> {
    // Ensure directory exists
    await mkdir(this.globalConfigDir, { recursive: true })
    
    // Ensure schema is set
    const configWithSchema = {
      $schema: 'https://opencode.ai/config.json',
      ...config
    }
    
    await writeFile(
      this.globalConfigPath,
      JSON.stringify(configWithSchema, null, 2),
      'utf-8'
    )
  }

  async updateGlobal(partial: Partial<OpenCodeConfig>): Promise<OpenCodeConfig> {
    const current = await this.readGlobal()
    const updated = this.deepMerge(current, partial)
    await this.writeGlobal(updated)
    return updated
  }

  async readProject(projectPath: string): Promise<OpenCodeConfig | null> {
    const configPath = join(projectPath, 'opencode.json')
    try {
      const content = await readFile(configPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  async writeProject(projectPath: string, config: OpenCodeConfig): Promise<void> {
    const configPath = join(projectPath, 'opencode.json')
    
    // Ensure schema is set
    const configWithSchema = {
      $schema: 'https://opencode.ai/config.json',
      ...config
    }
    
    await writeFile(
      configPath,
      JSON.stringify(configWithSchema, null, 2),
      'utf-8'
    )
  }

  async addMcpServer(name: string, serverConfig: McpServerConfig): Promise<void> {
    const config = await this.readGlobal()
    config.mcp = config.mcp || {}
    config.mcp[name] = serverConfig
    await this.writeGlobal(config)
  }

  async removeMcpServer(name: string): Promise<void> {
    const config = await this.readGlobal()
    if (config.mcp && config.mcp[name]) {
      delete config.mcp[name]
      await this.writeGlobal(config)
    }
  }

  async setMcpEnabled(name: string, enabled: boolean): Promise<void> {
    const config = await this.readGlobal()
    if (config.mcp && config.mcp[name]) {
      config.mcp[name].enabled = enabled
      await this.writeGlobal(config)
    }
  }

  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target }
    
    for (const key of Object.keys(source)) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
          result[key] = this.deepMerge(
            target[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>
          )
        } else {
          result[key] = source[key]
        }
      } else {
        result[key] = source[key]
      }
    }
    
    return result
  }
}
