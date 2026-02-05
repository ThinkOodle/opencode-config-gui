import { homedir } from 'os'
import { join } from 'path'
import { readFile, writeFile, mkdir, readdir, rm, stat } from 'fs/promises'
import { AgencyCatalog } from './agency-catalog'

export interface Agent {
  name: string
  description: string
  mode?: 'primary' | 'subagent' | 'all'
  model?: string
  path: string
  isGlobal: boolean
}

export interface AgentInstallResult {
  success: boolean
  agent?: Agent
  error?: string
}

export interface AgentValidationError {
  field: string
  message: string
}

export class AgentsManager {
  private globalAgentsDir = join(homedir(), '.config', 'opencode', 'agents')
  private catalog: AgencyCatalog

  constructor(catalog?: AgencyCatalog) {
    this.catalog = catalog || new AgencyCatalog()
  }

  async installFromCatalog(agentId: string): Promise<AgentInstallResult> {
    try {
      // Fetch agent content from catalog
      const content = await this.catalog.fetchAgentContent(agentId)
      
      if (!content) {
        return { success: false, error: 'Failed to fetch agent content from catalog' }
      }

      // Validate content
      const errors = this.validateAgentContent(content)
      if (errors.length > 0) {
        return { success: false, error: errors[0].message }
      }

      // Parse agent to get metadata
      const agent = this.parseAgentContent(content, agentId)
      if (!agent) {
        return { success: false, error: 'Invalid agent format' }
      }

      // Write to disk
      await mkdir(this.globalAgentsDir, { recursive: true })
      const agentPath = join(this.globalAgentsDir, `${agentId}.md`)
      await writeFile(agentPath, content, 'utf-8')

      return {
        success: true,
        agent: { ...agent, name: agentId, path: agentPath, isGlobal: true }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to install agent'
      }
    }
  }

  async saveAgent(name: string, content: string): Promise<AgentInstallResult> {
    try {
      // Validate name format
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
        return { 
          success: false, 
          error: 'Invalid agent name. Use lowercase letters, numbers, and hyphens only.' 
        }
      }

      // Validate content
      const errors = this.validateAgentContent(content)
      if (errors.length > 0) {
        return { success: false, error: errors[0].message }
      }

      // Parse to verify and extract metadata
      const agent = this.parseAgentContent(content, name)
      if (!agent) {
        return { success: false, error: 'Invalid agent format' }
      }

      // Write to disk
      await mkdir(this.globalAgentsDir, { recursive: true })
      const agentPath = join(this.globalAgentsDir, `${name}.md`)
      await writeFile(agentPath, content, 'utf-8')

      return {
        success: true,
        agent: { ...agent, name, path: agentPath, isGlobal: true }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save agent'
      }
    }
  }

  async listInstalled(): Promise<Agent[]> {
    const agents: Agent[] = []

    try {
      const entries = await readdir(this.globalAgentsDir, { withFileTypes: true })

      for (const entry of entries) {
        // Agents are stored as flat .md files (not directories like skills)
        if (entry.isFile() && entry.name.endsWith('.md')) {
          const agentPath = join(this.globalAgentsDir, entry.name)
          const agentName = entry.name.replace(/\.md$/, '')

          try {
            const content = await readFile(agentPath, 'utf-8')
            const agent = this.parseAgentContent(content, agentName)
            if (agent) {
              agents.push({ ...agent, name: agentName, path: agentPath, isGlobal: true })
            }
          } catch {
            // Skip files that can't be read or parsed
          }
        }
      }
    } catch {
      // Agents directory doesn't exist yet
    }

    return agents
  }

  async getAgentContent(name: string): Promise<string | null> {
    try {
      // Validate name to prevent path traversal
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
        return null
      }

      const agentPath = join(this.globalAgentsDir, `${name}.md`)
      return await readFile(agentPath, 'utf-8')
    } catch {
      return null
    }
  }

  async remove(name: string): Promise<void> {
    // Validate name to prevent path traversal
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
      throw new Error('Invalid agent name')
    }

    const agentPath = join(this.globalAgentsDir, `${name}.md`)

    // Verify it exists
    try {
      await stat(agentPath)
    } catch {
      throw new Error('Agent not found')
    }

    await rm(agentPath)
  }

  validateAgentContent(content: string): AgentValidationError[] {
    const errors: AgentValidationError[] = []

    // Check for YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) {
      errors.push({
        field: 'frontmatter',
        message: 'Agent must have YAML frontmatter (content between --- markers)'
      })
      return errors
    }

    const frontmatter = frontmatterMatch[1]

    // Check for required description field
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m)
    if (!descMatch || !descMatch[1].trim()) {
      errors.push({
        field: 'description',
        message: 'Description is required'
      })
    } else {
      const description = descMatch[1].trim()
      if (description.length > 200) {
        errors.push({
          field: 'description',
          message: 'Description must be 200 characters or less'
        })
      }
    }

    // Validate mode if present
    const modeMatch = frontmatter.match(/^mode:\s*(.+)$/m)
    if (modeMatch) {
      const mode = modeMatch[1].trim()
      if (!['primary', 'subagent', 'all'].includes(mode)) {
        errors.push({
          field: 'mode',
          message: 'Mode must be "primary", "subagent", or "all"'
        })
      }
    }

    // Validate model format if present
    const modelMatch = frontmatter.match(/^model:\s*(.+)$/m)
    if (modelMatch) {
      const model = modelMatch[1].trim()
      if (model && !model.includes('/')) {
        errors.push({
          field: 'model',
          message: 'Model should be in format "provider/model-id"'
        })
      }
    }

    // Validate temperature if present
    const tempMatch = frontmatter.match(/^temperature:\s*(.+)$/m)
    if (tempMatch) {
      const temp = parseFloat(tempMatch[1].trim())
      if (isNaN(temp) || temp < 0 || temp > 1) {
        errors.push({
          field: 'temperature',
          message: 'Temperature must be a number between 0.0 and 1.0'
        })
      }
    }

    return errors
  }

  private parseAgentContent(content: string, expectedName: string): Omit<Agent, 'path' | 'isGlobal' | 'name'> | null {
    // Parse YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) {
      return null
    }

    const frontmatter = frontmatterMatch[1]

    // Extract required description
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m)
    if (!descMatch) {
      return null
    }

    const description = descMatch[1].trim()

    // Extract optional mode
    const modeMatch = frontmatter.match(/^mode:\s*(.+)$/m)
    const mode = modeMatch ? modeMatch[1].trim() as 'primary' | 'subagent' | 'all' : undefined

    // Extract optional model
    const modelMatch = frontmatter.match(/^model:\s*(.+)$/m)
    const model = modelMatch ? modelMatch[1].trim() : undefined

    return {
      description,
      mode,
      model
    }
  }
}
