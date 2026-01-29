export interface AgencySkill {
  id: string
  name: string
  description: string
  category?: string
  tags?: string[]
  path: string
  author?: string
  version?: string
  updatedAt?: string
}

export interface AgencyMcpServer {
  id: string
  name: string
  description: string
  type: 'remote' | 'local'
  url?: string
  command?: string[]
  category?: string
  tags?: string[]
  requiresAuth?: boolean
  authType?: 'oauth' | 'apiKey' | 'bearer'
  authConfig?: {
    envVar?: string
    headerName?: string
    instructions?: string
    obtainUrl?: string
  }
  website?: string
  docsUrl?: string
  configurable?: Record<string, ConfigurableOption>
  environment?: Record<string, string>
}

interface ConfigurableOption {
  type: 'string' | 'number' | 'boolean' | 'string[]'
  label?: string
  description?: string
  default?: unknown
  required?: boolean
  min?: number
  max?: number
}

interface SkillsCatalog {
  version: string
  lastUpdated: string
  skills: AgencySkill[]
}

interface McpCatalog {
  version: string
  lastUpdated: string
  servers: AgencyMcpServer[]
}

// Default catalog URL - can be overridden via environment variable
const DEFAULT_CATALOG_BASE_URL = 'https://raw.githubusercontent.com/ThinkOodle/ai-catalog/master'

export class AgencyCatalog {
  private baseUrl: string
  private skillsCache: AgencySkill[] | null = null
  private mcpCache: AgencyMcpServer[] | null = null
  private cacheExpiry: number = 0
  private cacheDuration = 60 * 60 * 1000 // 1 hour

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.CATALOG_BASE_URL || DEFAULT_CATALOG_BASE_URL
  }

  async fetchSkills(forceRefresh = false): Promise<AgencySkill[]> {
    if (!forceRefresh && this.skillsCache && Date.now() < this.cacheExpiry) {
      return this.skillsCache
    }

    try {
      const response = await fetch(`${this.baseUrl}/skills.json`)
      if (!response.ok) {
        throw new Error(`Failed to fetch skills catalog: ${response.status}`)
      }

      const catalog: SkillsCatalog = await response.json()
      this.skillsCache = catalog.skills
      this.cacheExpiry = Date.now() + this.cacheDuration
      
      return catalog.skills
    } catch (error) {
      // Return cached data if available, even if expired
      if (this.skillsCache) {
        return this.skillsCache
      }
      throw error
    }
  }

  async fetchMcpServers(forceRefresh = false): Promise<AgencyMcpServer[]> {
    if (!forceRefresh && this.mcpCache && Date.now() < this.cacheExpiry) {
      return this.mcpCache
    }

    try {
      const response = await fetch(`${this.baseUrl}/mcp-servers.json`)
      if (!response.ok) {
        throw new Error(`Failed to fetch MCP catalog: ${response.status}`)
      }

      const catalog: McpCatalog = await response.json()
      this.mcpCache = catalog.servers
      this.cacheExpiry = Date.now() + this.cacheDuration
      
      return catalog.servers
    } catch (error) {
      // Return cached data if available, even if expired
      if (this.mcpCache) {
        return this.mcpCache
      }
      throw error
    }
  }

  async fetchSkillContent(skillId: string): Promise<string> {
    const skills = await this.fetchSkills()
    const skill = skills.find(s => s.id === skillId)
    
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`)
    }

    const response = await fetch(`${this.baseUrl}/${skill.path}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch skill content: ${response.status}`)
    }

    return response.text()
  }

  clearCache(): void {
    this.skillsCache = null
    this.mcpCache = null
    this.cacheExpiry = 0
  }
}
