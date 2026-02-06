import { homedir } from 'os'
import { join } from 'path'
import { readFile, writeFile, mkdir, readdir, rm, stat } from 'fs/promises'
import type { AgencyCatalog } from './agency-catalog'
import type { GitHubAppService, SkillRequestResult } from './github-app'

export interface Skill {
  name: string
  description: string
  path: string
  isGlobal: boolean
  metadata?: Record<string, string>
}

export interface SkillInstallResult {
  success: boolean
  skill?: Skill
  error?: string
}

export class SkillsManager {
  private globalSkillsDir = join(homedir(), '.config', 'opencode', 'skills')
  private catalog: AgencyCatalog
  private githubApp: GitHubAppService

  constructor(catalog: AgencyCatalog, githubApp: GitHubAppService) {
    this.catalog = catalog
    this.githubApp = githubApp
  }

  /**
   * Install a skill from the agency catalog by its ID.
   * Fetches the SKILL.md content from the catalog and writes it to disk.
   */
  async installFromCatalog(skillId: string): Promise<SkillInstallResult> {
    try {
      // Validate skill ID format
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skillId)) {
        return { success: false, error: 'Invalid skill ID format' }
      }

      // Fetch skill content from the catalog
      const content = await this.catalog.fetchSkillContent(skillId)

      // Parse and validate frontmatter
      const skill = this.parseSkillContent(content, skillId)
      if (!skill) {
        return { success: false, error: 'Invalid SKILL.md format: missing required frontmatter' }
      }

      // Write skill to disk
      const skillDir = join(this.globalSkillsDir, skillId)
      await mkdir(skillDir, { recursive: true })
      await writeFile(join(skillDir, 'SKILL.md'), content, 'utf-8')

      return {
        success: true,
        skill: { ...skill, path: skillDir, isGlobal: true },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to install skill from catalog',
      }
    }
  }

  /**
   * Request a skill to be added to the agency catalog.
   * Fetches the skill content from skills.sh, then creates a PR on ai-catalog.
   */
  async requestSkill(url: string): Promise<SkillRequestResult> {
    try {
      if (!this.githubApp.isConfigured()) {
        return { success: false, error: 'Skill requests are not configured. Contact your administrator.' }
      }

      // Validate URL
      const parsed = new URL(url)
      if (parsed.hostname !== 'skills.sh') {
        return { success: false, error: 'URL must be from skills.sh' }
      }

      // Parse skill path
      const pathParts = parsed.pathname.split('/').filter(Boolean)
      if (pathParts.length < 2) {
        return { success: false, error: 'Invalid skills.sh URL format. Expected: skills.sh/org/repo/skill' }
      }

      // Extract the skill name from the URL
      const skillName = pathParts[pathParts.length - 1]

      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skillName)) {
        return { success: false, error: 'Invalid skill name format in URL' }
      }

      // Fetch skill content from skills.sh
      const content = await this.fetchSkillFromSkillsSh(url, pathParts)
      if (!content) {
        return { success: false, error: 'Failed to fetch skill content from skills.sh' }
      }

      // Parse frontmatter to get name and description
      const skill = this.parseSkillContent(content, skillName)
      if (!skill) {
        return { success: false, error: 'Invalid SKILL.md format: missing required frontmatter (name, description)' }
      }

      // Create a PR on the ai-catalog repo
      return await this.githubApp.createSkillRequestPR(
        skillName,
        skill.description,
        content,
        url
      )
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit skill request',
      }
    }
  }

  async listInstalled(): Promise<Skill[]> {
    const skills: Skill[] = []

    try {
      const entries = await readdir(this.globalSkillsDir, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = join(this.globalSkillsDir, entry.name)
          const skillMdPath = join(skillPath, 'SKILL.md')
          
          try {
            const content = await readFile(skillMdPath, 'utf-8')
            const skill = this.parseSkillContent(content, entry.name)
            if (skill) {
              skills.push({ ...skill, path: skillPath, isGlobal: true })
            }
          } catch {
            // Skip directories without valid SKILL.md
          }
        }
      }
    } catch {
      // Skills directory doesn't exist yet
    }

    return skills
  }

  async getSkillContent(name: string): Promise<string | null> {
    try {
      const skillMdPath = join(this.globalSkillsDir, name, 'SKILL.md')
      return await readFile(skillMdPath, 'utf-8')
    } catch {
      return null
    }
  }

  async remove(name: string): Promise<void> {
    // Validate name to prevent path traversal
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
      throw new Error('Invalid skill name')
    }

    const skillDir = join(this.globalSkillsDir, name)
    
    // Verify it's actually a skill directory
    try {
      const skillMdPath = join(skillDir, 'SKILL.md')
      await stat(skillMdPath)
    } catch {
      throw new Error('Skill not found')
    }

    await rm(skillDir, { recursive: true })
  }

  /**
   * Fetch skill content from skills.sh.
   * Tries direct fetch first, then falls back to GitHub raw URL patterns.
   */
  private async fetchSkillFromSkillsSh(url: string, pathParts: string[]): Promise<string | null> {
    try {
      // Try direct fetch from skills.sh
      const response = await fetch(url, {
        headers: { Accept: 'text/plain, text/markdown' },
      })

      if (response.ok) {
        const content = await response.text()
        if (content.includes('---') && (content.includes('name:') || content.includes('description:'))) {
          return content
        }
      }

      // Fall back to GitHub raw URL patterns
      if (pathParts.length >= 3) {
        const [org, repo, ...rest] = pathParts
        const skillPath = rest.join('/')

        const githubUrls = [
          `https://raw.githubusercontent.com/${org}/${repo}/main/skills/${skillPath}/SKILL.md`,
          `https://raw.githubusercontent.com/${org}/${repo}/main/${skillPath}/SKILL.md`,
          `https://raw.githubusercontent.com/${org}/${repo}/master/skills/${skillPath}/SKILL.md`,
        ]

        for (const ghUrl of githubUrls) {
          try {
            const ghResponse = await fetch(ghUrl)
            if (ghResponse.ok) {
              return await ghResponse.text()
            }
          } catch {
            continue
          }
        }
      }

      return null
    } catch {
      return null
    }
  }

  private parseSkillContent(content: string, expectedName: string): Omit<Skill, 'path' | 'isGlobal'> | null {
    // Parse YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) {
      return null
    }

    const frontmatter = frontmatterMatch[1]
    
    // Extract required fields
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m)

    if (!nameMatch || !descMatch) {
      return null
    }

    const name = nameMatch[1].trim()
    const description = descMatch[1].trim()

    // Validate name matches expected (directory name)
    if (name !== expectedName) {
      // Allow the install but use the frontmatter name
    }

    // Extract optional metadata
    const metadata: Record<string, string> = {}
    const metadataMatch = frontmatter.match(/^metadata:\n((?:  .+\n?)+)/m)
    if (metadataMatch) {
      const metadataLines = metadataMatch[1].split('\n')
      for (const line of metadataLines) {
        const kvMatch = line.match(/^\s+(\w+):\s*(.+)$/)
        if (kvMatch) {
          metadata[kvMatch[1]] = kvMatch[2].trim()
        }
      }
    }

    return {
      name,
      description,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    }
  }
}
