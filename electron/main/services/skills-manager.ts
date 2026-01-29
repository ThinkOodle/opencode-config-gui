import { homedir } from 'os'
import { join, basename } from 'path'
import { readFile, writeFile, mkdir, readdir, rm, stat } from 'fs/promises'

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

export interface RepoInstallResult {
  success: boolean
  installed: Skill[]
  failed: { name: string; error: string }[]
  error?: string
}

export class SkillsManager {
  private globalSkillsDir = join(homedir(), '.config', 'opencode', 'skills')

  async installFromUrl(url: string): Promise<SkillInstallResult> {
    try {
      // Validate URL
      const parsed = new URL(url)
      if (parsed.hostname !== 'skills.sh') {
        return { success: false, error: 'URL must be from skills.sh' }
      }

      // Parse skill path: /org/repo/skill-name (3+ parts) or /org/skill-name (2 parts for repo)
      const pathParts = parsed.pathname.split('/').filter(Boolean)
      if (pathParts.length < 2) {
        return { success: false, error: 'Invalid skills.sh URL format' }
      }

      // Check if this is a repository URL (only 2 parts = org/repo)
      if (pathParts.length === 2) {
        return { 
          success: false, 
          error: 'This looks like a repository URL. The app will fetch the skill list automatically.' 
        }
      }

      const skillName = pathParts[pathParts.length - 1]

      // Validate skill name format
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skillName)) {
        return { success: false, error: 'Invalid skill name format' }
      }

      // Fetch skill content
      // skills.sh URLs typically map to GitHub raw content
      // Format: https://skills.sh/org/repo/skill-name -> raw GitHub content
      const content = await this.fetchSkillContent(url, pathParts)
      
      if (!content) {
        return { success: false, error: 'Failed to fetch skill content' }
      }

      // Parse and validate frontmatter
      const skill = this.parseSkillContent(content, skillName)
      if (!skill) {
        return { success: false, error: 'Invalid SKILL.md format: missing required frontmatter' }
      }

      // Write skill to disk
      const skillDir = join(this.globalSkillsDir, skillName)
      await mkdir(skillDir, { recursive: true })
      await writeFile(join(skillDir, 'SKILL.md'), content, 'utf-8')

      return { 
        success: true, 
        skill: { ...skill, path: skillDir, isGlobal: true } 
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to install skill' 
      }
    }
  }

  async installFromCatalog(skillId: string): Promise<SkillInstallResult> {
    // This will be implemented to fetch from the agency catalog
    // For now, return a placeholder
    return { success: false, error: 'Catalog installation not yet implemented' }
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

  async installFromRepo(url: string): Promise<RepoInstallResult> {
    try {
      // Validate URL
      const parsed = new URL(url)
      if (parsed.hostname !== 'skills.sh') {
        return { success: false, installed: [], failed: [], error: 'URL must be from skills.sh' }
      }

      // Parse path - should be exactly 2 parts: org/repo
      const pathParts = parsed.pathname.split('/').filter(Boolean)
      if (pathParts.length !== 2) {
        return { success: false, installed: [], failed: [], error: 'Invalid repository URL format. Expected: skills.sh/org/repo' }
      }

      const [org, repo] = pathParts

      // Use GitHub API to find all SKILL.md files in the repo
      const skillPaths = await this.findSkillsInRepo(org, repo)
      
      if (skillPaths.length === 0) {
        return { success: false, installed: [], failed: [], error: 'No skills found in this repository' }
      }

      // Install each skill
      const installed: Skill[] = []
      const failed: { name: string; error: string }[] = []

      for (const skillPath of skillPaths) {
        // Extract skill name from path (e.g., "skills/my-skill/SKILL.md" -> "my-skill")
        const pathSegments = skillPath.split('/')
        const skillDirIndex = pathSegments.findIndex(s => s.toUpperCase() === 'SKILL.MD') - 1
        const skillName = skillDirIndex >= 0 ? pathSegments[skillDirIndex] : pathSegments[pathSegments.length - 2]

        // Validate skill name format
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skillName)) {
          failed.push({ name: skillName, error: 'Invalid skill name format' })
          continue
        }

        try {
          // Fetch the SKILL.md content
          const content = await this.fetchRawGitHubFile(org, repo, skillPath)
          
          if (!content) {
            failed.push({ name: skillName, error: 'Failed to fetch skill content' })
            continue
          }

          // Parse and validate
          const skill = this.parseSkillContent(content, skillName)
          if (!skill) {
            failed.push({ name: skillName, error: 'Invalid SKILL.md format' })
            continue
          }

          // Write to disk
          const skillDir = join(this.globalSkillsDir, skillName)
          await mkdir(skillDir, { recursive: true })
          await writeFile(join(skillDir, 'SKILL.md'), content, 'utf-8')

          installed.push({ ...skill, path: skillDir, isGlobal: true })
        } catch (error) {
          failed.push({ 
            name: skillName, 
            error: error instanceof Error ? error.message : 'Installation failed' 
          })
        }
      }

      return {
        success: installed.length > 0,
        installed,
        failed
      }
    } catch (error) {
      return { 
        success: false, 
        installed: [],
        failed: [],
        error: error instanceof Error ? error.message : 'Failed to install from repository' 
      }
    }
  }

  private async findSkillsInRepo(org: string, repo: string): Promise<string[]> {
    // Use GitHub API to get repo tree and find all SKILL.md files
    const branches = ['main', 'master']
    
    for (const branch of branches) {
      try {
        const apiUrl = `https://api.github.com/repos/${org}/${repo}/git/trees/${branch}?recursive=1`
        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Oodle-AI'
          }
        })

        if (response.ok) {
          const data = await response.json()
          const tree = data.tree as { path: string; type: string }[]
          
          // Find all SKILL.md files (case-insensitive)
          const skillFiles = tree
            .filter(item => item.type === 'blob' && item.path.toUpperCase().endsWith('/SKILL.MD'))
            .map(item => item.path)

          if (skillFiles.length > 0) {
            return skillFiles
          }
        }
      } catch {
        // Try next branch
        continue
      }
    }

    return []
  }

  private async fetchRawGitHubFile(org: string, repo: string, path: string): Promise<string | null> {
    const branches = ['main', 'master']
    
    for (const branch of branches) {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${org}/${repo}/${branch}/${path}`
        const response = await fetch(rawUrl)
        if (response.ok) {
          return await response.text()
        }
      } catch {
        continue
      }
    }
    
    return null
  }

  private async fetchSkillContent(url: string, pathParts: string[]): Promise<string | null> {
    try {
      // Try to fetch directly from skills.sh first
      // skills.sh may serve raw content or redirect to GitHub
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/plain, text/markdown'
        }
      })

      if (response.ok) {
        const content = await response.text()
        // Check if it looks like a SKILL.md
        if (content.includes('---') && (content.includes('name:') || content.includes('description:'))) {
          return content
        }
      }

      // If direct fetch didn't work, try constructing GitHub raw URL
      // Typical mapping: skills.sh/org/repo/skill -> github.com/org/repo/.../skill/SKILL.md
      if (pathParts.length >= 3) {
        const [org, repo, ...rest] = pathParts
        const skillPath = rest.join('/')
        
        // Try common GitHub raw URL patterns
        const githubUrls = [
          `https://raw.githubusercontent.com/${org}/${repo}/main/skills/${skillPath}/SKILL.md`,
          `https://raw.githubusercontent.com/${org}/${repo}/main/${skillPath}/SKILL.md`,
          `https://raw.githubusercontent.com/${org}/${repo}/master/skills/${skillPath}/SKILL.md`
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
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined
    }
  }
}
