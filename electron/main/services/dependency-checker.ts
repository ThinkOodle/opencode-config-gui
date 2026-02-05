import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface DependencyStatus {
  id: string
  name: string
  description: string
  installed: boolean
  version?: string
  required: boolean
  order: number
}

const DEPENDENCIES: Omit<DependencyStatus, 'installed' | 'version'>[] = [
  {
    id: 'xcode-clt',
    name: 'Xcode Command Line Tools',
    description: 'Required build tools for macOS development',
    required: true,
    order: 1
  },
  {
    id: 'homebrew',
    name: 'Homebrew',
    description: 'Package manager for macOS',
    required: true,
    order: 2
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    description: 'JavaScript runtime (v18 or later)',
    required: true,
    order: 3
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    description: 'AI coding agent',
    required: true,
    order: 4
  }
]

export class DependencyChecker {
  async checkAll(): Promise<DependencyStatus[]> {
    const results = await Promise.all(
      DEPENDENCIES.map(dep => this.check(dep.id))
    )
    return results.sort((a, b) => a.order - b.order)
  }

  async check(id: string): Promise<DependencyStatus> {
    const dep = DEPENDENCIES.find(d => d.id === id)
    if (!dep) {
      throw new Error(`Unknown dependency: ${id}`)
    }

    const result: DependencyStatus = {
      ...dep,
      installed: false,
      version: undefined
    }

    try {
      switch (id) {
        case 'xcode-clt':
          result.installed = await this.checkXcodeCLT()
          break
        case 'homebrew':
          const brewVersion = await this.checkHomebrew()
          result.installed = !!brewVersion
          result.version = brewVersion
          break
        case 'nodejs':
          const nodeVersion = await this.checkNodejs()
          result.installed = !!nodeVersion
          result.version = nodeVersion
          break
        case 'opencode':
          const ocVersion = await this.checkOpenCode()
          result.installed = !!ocVersion
          result.version = ocVersion
          break
      }
    } catch {
      result.installed = false
    }

    return result
  }

  private async checkXcodeCLT(): Promise<boolean> {
    try {
      await execAsync('xcode-select -p')
      return true
    } catch {
      return false
    }
  }

  private async checkHomebrew(): Promise<string | undefined> {
    try {
      // Check both Intel and Apple Silicon paths
      const paths = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew']
      
      for (const brewPath of paths) {
        try {
          const { stdout } = await execAsync(`${brewPath} --version`)
          const match = stdout.match(/Homebrew ([\d.]+)/)
          return match ? match[1] : stdout.trim().split('\n')[0]
        } catch {
          continue
        }
      }
      
      // Try without path (in case it's in PATH)
      const { stdout } = await execAsync('brew --version')
      const match = stdout.match(/Homebrew ([\d.]+)/)
      return match ? match[1] : stdout.trim().split('\n')[0]
    } catch {
      return undefined
    }
  }

  private async checkNodejs(): Promise<string | undefined> {
    // Check explicit Homebrew paths first (Apple Silicon, then Intel)
    // Electron apps launched from Finder don't inherit shell PATH
    const paths = ['/opt/homebrew/bin/node', '/usr/local/bin/node']

    for (const nodePath of paths) {
      try {
        const { stdout } = await execAsync(`${nodePath} --version`)
        const version = stdout.trim()
        const match = version.match(/v(\d+)/)
        if (match && parseInt(match[1]) >= 18) {
          return version
        }
      } catch {
        continue
      }
    }

    // Fallback to PATH (for custom installations)
    try {
      const { stdout } = await execAsync('node --version')
      const version = stdout.trim()
      const match = version.match(/v(\d+)/)
      if (match && parseInt(match[1]) >= 18) {
        return version
      }
    } catch {
      // Not found
    }

    return undefined
  }

  private async checkOpenCode(): Promise<string | undefined> {
    const { homedir } = await import('os')
    const { join } = await import('path')

    // Check explicit paths: Homebrew (Apple Silicon, Intel) and manual install
    // Electron apps launched from Finder don't inherit shell PATH
    const paths = [
      '/opt/homebrew/bin/opencode',                     // Homebrew Apple Silicon
      '/usr/local/bin/opencode',                        // Homebrew Intel
      join(homedir(), '.opencode', 'bin', 'opencode')   // Manual install
    ]

    for (const ocPath of paths) {
      try {
        const { stdout } = await execAsync(`${ocPath} --version`)
        return stdout.trim()
      } catch {
        continue
      }
    }

    // Try 'which' to find in PATH (may work in some contexts)
    try {
      const { stdout: whichOutput } = await execAsync('which opencode')
      const ocPath = whichOutput.trim()
      if (ocPath) {
        const { stdout } = await execAsync(`${ocPath} --version`)
        return stdout.trim()
      }
    } catch {
      // which failed or opencode not in PATH
    }

    // Final fallback: try direct execution (in case it's in system PATH)
    try {
      const { stdout } = await execAsync('opencode --version')
      return stdout.trim()
    } catch {
      return undefined
    }
  }

  async checkDesktopApp(): Promise<{ installed: boolean; version?: string }> {
    const { access, readFile } = await import('fs/promises')
    const appPath = '/Applications/OpenCode.app'
    
    try {
      // Check if the app bundle exists
      await access(appPath)
      
      // Try to get version from Info.plist
      const plistPath = `${appPath}/Contents/Info.plist`
      try {
        const plist = await readFile(plistPath, 'utf-8')
        const versionMatch = plist.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/)
        return { installed: true, version: versionMatch?.[1] }
      } catch {
        // App exists but couldn't read version
        return { installed: true }
      }
    } catch {
      return { installed: false }
    }
  }
}
