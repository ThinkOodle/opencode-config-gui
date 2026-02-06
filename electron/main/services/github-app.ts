import { createSign } from 'crypto'

export interface SkillRequestResult {
  success: boolean
  prUrl?: string
  error?: string
}

interface InstallationToken {
  token: string
  expiresAt: number
}

const GITHUB_API = 'https://api.github.com'
const REPO_OWNER = 'ThinkOodle'
const REPO_NAME = 'ai-catalog'
const DEFAULT_BRANCH = 'master'

export class GitHubAppService {
  private appId: string
  private privateKey: string
  private installationId: string
  private cachedToken: InstallationToken | null = null

  constructor(appId: string, privateKey: string, installationId: string) {
    this.appId = appId
    this.privateKey = privateKey
    this.installationId = installationId
  }

  /**
   * Check whether the service has valid credentials configured.
   */
  isConfigured(): boolean {
    return !!(this.appId && this.privateKey && this.installationId)
  }

  /**
   * Generate a JWT for GitHub App authentication.
   * Uses Node.js crypto (RS256) — no external JWT library needed.
   */
  private generateJWT(): string {
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'RS256', typ: 'JWT' }
    const payload = {
      iss: this.appId,
      iat: now - 60, // 60 seconds in the past to account for clock drift
      exp: now + 600, // 10 minutes (GitHub maximum)
    }

    const encode = (obj: unknown): string =>
      Buffer.from(JSON.stringify(obj)).toString('base64url')

    const headerEncoded = encode(header)
    const payloadEncoded = encode(payload)
    const signingInput = `${headerEncoded}.${payloadEncoded}`

    const sign = createSign('RSA-SHA256')
    sign.update(signingInput)
    const signature = sign.sign(this.privateKey, 'base64url')

    return `${signingInput}.${signature}`
  }

  /**
   * Get an installation access token, using cache when possible.
   * Tokens are valid for 1 hour; we refresh 5 minutes early.
   */
  private async getInstallationToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token
    }

    const jwt = this.generateJWT()
    const response = await fetch(
      `${GITHUB_API}/app/installations/${this.installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${jwt}`,
          'User-Agent': 'Oodle-AI',
        },
      }
    )

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Failed to get installation token: ${response.status} ${body}`)
    }

    const data = await response.json()
    const expiresAt = new Date(data.expires_at).getTime() - 5 * 60 * 1000 // 5 min buffer

    this.cachedToken = { token: data.token, expiresAt }
    return data.token
  }

  /**
   * Make an authenticated GitHub API request.
   */
  private async githubRequest(
    path: string,
    options: { method?: string; body?: unknown } = {}
  ): Promise<Response> {
    const token = await this.getInstallationToken()
    const { method = 'GET', body } = options

    return fetch(`${GITHUB_API}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Oodle-AI',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  }

  /**
   * Create a pull request on ThinkOodle/ai-catalog to add a new skill.
   *
   * Steps:
   *  1. Get the latest commit SHA on the default branch
   *  2. Create a new branch
   *  3. Add the SKILL.md file
   *  4. Update skills.json with the new entry
   *  5. Create the pull request
   */
  async createSkillRequestPR(
    skillName: string,
    skillDescription: string,
    skillContent: string,
    sourceUrl: string
  ): Promise<SkillRequestResult> {
    try {
      // 1. Get the latest commit SHA on the default branch
      const refResponse = await this.githubRequest(
        `/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${DEFAULT_BRANCH}`
      )
      if (!refResponse.ok) {
        throw new Error(`Failed to get branch ref: ${refResponse.status}`)
      }
      const refData = await refResponse.json()
      const baseSha: string = refData.object.sha

      // 2. Create a new branch
      const timestamp = Date.now()
      const branchName = `skill-request/${skillName}-${timestamp}`

      const createBranchResponse = await this.githubRequest(
        `/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`,
        {
          method: 'POST',
          body: {
            ref: `refs/heads/${branchName}`,
            sha: baseSha,
          },
        }
      )
      if (!createBranchResponse.ok) {
        throw new Error(`Failed to create branch: ${createBranchResponse.status}`)
      }

      // 3. Add the SKILL.md file to the new branch
      const skillFilePath = `skills/${skillName}/SKILL.md`
      const createFileResponse = await this.githubRequest(
        `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${skillFilePath}`,
        {
          method: 'PUT',
          body: {
            message: `Add skill: ${skillName}`,
            content: Buffer.from(skillContent).toString('base64'),
            branch: branchName,
          },
        }
      )
      if (!createFileResponse.ok) {
        throw new Error(`Failed to create SKILL.md: ${createFileResponse.status}`)
      }

      // 4. Update skills.json — fetch current content, add new entry, commit update
      const catalogResponse = await this.githubRequest(
        `/repos/${REPO_OWNER}/${REPO_NAME}/contents/skills.json?ref=${branchName}`
      )
      if (!catalogResponse.ok) {
        throw new Error(`Failed to fetch skills.json: ${catalogResponse.status}`)
      }
      const catalogData = await catalogResponse.json()
      const catalogContent = JSON.parse(
        Buffer.from(catalogData.content, 'base64').toString('utf-8')
      )

      // Add the new skill entry
      const now = new Date().toISOString()
      catalogContent.lastUpdated = now
      catalogContent.skills.push({
        id: skillName,
        name: skillDescription.length > 64 ? skillDescription.slice(0, 61) + '...' : skillDescription,
        description: skillDescription.length > 200 ? skillDescription.slice(0, 197) + '...' : skillDescription,
        category: 'Requested',
        tags: ['requested'],
        path: skillFilePath,
        author: 'Skill Request',
        version: '1.0.0',
        updatedAt: now,
      })

      const updatedCatalogJson = JSON.stringify(catalogContent, null, 2) + '\n'
      const updateCatalogResponse = await this.githubRequest(
        `/repos/${REPO_OWNER}/${REPO_NAME}/contents/skills.json`,
        {
          method: 'PUT',
          body: {
            message: `Update skills.json: add ${skillName}`,
            content: Buffer.from(updatedCatalogJson).toString('base64'),
            sha: catalogData.sha,
            branch: branchName,
          },
        }
      )
      if (!updateCatalogResponse.ok) {
        throw new Error(`Failed to update skills.json: ${updateCatalogResponse.status}`)
      }

      // 5. Create the pull request
      const prBody = [
        `## Skill Request: ${skillName}`,
        '',
        `**Source:** ${sourceUrl}`,
        `**Description:** ${skillDescription}`,
        '',
        '---',
        '',
        'This skill was requested via the Oodle AI app. Please review the SKILL.md content and approve or close this PR.',
      ].join('\n')

      const prResponse = await this.githubRequest(
        `/repos/${REPO_OWNER}/${REPO_NAME}/pulls`,
        {
          method: 'POST',
          body: {
            title: `Skill Request: ${skillName}`,
            body: prBody,
            head: branchName,
            base: DEFAULT_BRANCH,
          },
        }
      )
      if (!prResponse.ok) {
        const prError = await prResponse.text()
        throw new Error(`Failed to create PR: ${prResponse.status} ${prError}`)
      }

      const prData = await prResponse.json()
      return { success: true, prUrl: prData.html_url }
    } catch (error) {
      console.error('Failed to create skill request PR:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create skill request',
      }
    }
  }
}
