import { homedir } from 'os'
import { join, dirname } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ProviderTestResult {
  success: boolean
  message: string
  provider: string
}

// Map provider names to their environment variable names
const PROVIDER_ENV_VARS: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  'google-genai': 'GOOGLE_GENERATIVE_AI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  xai: 'XAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  groq: 'GROQ_API_KEY',
  together: 'TOGETHER_API_KEY',
  fireworks: 'FIREWORKS_API_KEY',
  opencode: 'OPENCODE_API_KEY'
}

export class EnvManager {
  private profilePath = join(homedir(), '.zshrc')
  private authJsonPath = join(homedir(), '.local', 'share', 'opencode', 'auth.json')

  async setEnvVar(key: string, value: string): Promise<void> {
    // Validate key format (alphanumeric and underscores only)
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
      throw new Error(`Invalid environment variable name: ${key}`)
    }

    // Read current profile
    let content = ''
    try {
      content = await readFile(this.profilePath, 'utf-8')
    } catch {
      // File doesn't exist, start fresh
    }

    // Escape special characters in value
    const escapedValue = value.replace(/"/g, '\\"')

    // Remove existing entry for this key
    const lines = content.split('\n')
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim()
      return !trimmed.startsWith(`export ${key}=`)
    })

    // Add new entry
    const newContent = filteredLines.join('\n').trimEnd() + `\nexport ${key}="${escapedValue}"\n`

    await writeFile(this.profilePath, newContent, 'utf-8')
  }

  async getEnvVar(key: string): Promise<string | null> {
    // First check process environment
    if (process.env[key]) {
      return process.env[key]!
    }

    // Then check shell profile
    try {
      const content = await readFile(this.profilePath, 'utf-8')
      const regex = new RegExp(`export ${key}="([^"]*)"`)
      const match = content.match(regex)
      return match ? match[1] : null
    } catch {
      return null
    }
  }

  async getProviderEnvVar(provider: string): Promise<string> {
    const envVar = PROVIDER_ENV_VARS[provider.toLowerCase()]
    if (!envVar) {
      throw new Error(`Unknown provider: ${provider}`)
    }
    return envVar
  }

  async setProviderApiKey(provider: string, apiKey: string): Promise<void> {
    const envVar = await this.getProviderEnvVar(provider)
    await this.setEnvVar(envVar, apiKey)
  }

  async testProviderConnection(provider: string, apiKey: string): Promise<ProviderTestResult> {
    const normalizedProvider = provider.toLowerCase()

    try {
      switch (normalizedProvider) {
        case 'anthropic':
          return await this.testAnthropicConnection(apiKey)
        case 'openai':
          return await this.testOpenAIConnection(apiKey)
        case 'opencode':
          return await this.testOpenCodeConnection(apiKey)
        default:
          // For other providers, we just validate the key format
          return {
            success: apiKey.length > 10,
            message: apiKey.length > 10 
              ? 'API key format looks valid' 
              : 'API key appears too short',
            provider
          }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        provider
      }
    }
  }

  private async testAnthropicConnection(apiKey: string): Promise<ProviderTestResult> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      })

      if (response.ok) {
        return { success: true, message: 'Connected to Anthropic successfully', provider: 'anthropic' }
      }

      const error = await response.json().catch(() => ({})) as { error?: { message?: string } }
      if (response.status === 401) {
        return { success: false, message: 'Invalid API key', provider: 'anthropic' }
      }
      
      return { 
        success: false, 
        message: error.error?.message || `API error: ${response.status}`, 
        provider: 'anthropic' 
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
        provider: 'anthropic'
      }
    }
  }

  private async testOpenAIConnection(apiKey: string): Promise<ProviderTestResult> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })

      if (response.ok) {
        return { success: true, message: 'Connected to OpenAI successfully', provider: 'openai' }
      }

      if (response.status === 401) {
        return { success: false, message: 'Invalid API key', provider: 'openai' }
      }

      return { 
        success: false, 
        message: `API error: ${response.status}`, 
        provider: 'openai' 
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
        provider: 'openai'
      }
    }
  }

  private async testOpenCodeConnection(apiKey: string): Promise<ProviderTestResult> {
    // OpenCode Zen keys start with sk-
    if (apiKey.startsWith('sk-') && apiKey.length > 20) {
      return { success: true, message: 'OpenCode Zen API key format is valid', provider: 'opencode' }
    }
    return { success: false, message: 'Invalid OpenCode Zen API key format (expected sk-...)', provider: 'opencode' }
  }

  async checkOpenCodeAuth(): Promise<{ configured: boolean }> {
    try {
      console.log('[EnvManager] Checking auth.json at:', this.authJsonPath)
      const content = await readFile(this.authJsonPath, 'utf-8')
      const auth = JSON.parse(content) as Record<string, { type?: string; key?: string }>
      console.log('[EnvManager] Found auth.json, opencode entry exists:', !!auth.opencode)
      
      if (auth.opencode && auth.opencode.key) {
        console.log('[EnvManager] OpenCode Zen is configured')
        return { configured: true }
      }
      console.log('[EnvManager] OpenCode entry exists but no key found')
      return { configured: false }
    } catch (error) {
      console.log('[EnvManager] Failed to read auth.json:', error)
      return { configured: false }
    }
  }

  async saveOpenCodeAuth(apiKey: string): Promise<void> {
    // Ensure directory exists
    await mkdir(dirname(this.authJsonPath), { recursive: true })

    // Read existing auth.json or start with empty object
    let auth: Record<string, unknown> = {}
    try {
      const content = await readFile(this.authJsonPath, 'utf-8')
      auth = JSON.parse(content)
    } catch {
      // File doesn't exist, start fresh
    }

    // Add/update opencode entry
    auth.opencode = {
      type: 'api',
      key: apiKey
    }

    await writeFile(this.authJsonPath, JSON.stringify(auth, null, 2), 'utf-8')
  }
}
