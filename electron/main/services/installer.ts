import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { DependencyChecker, DependencyStatus } from './dependency-checker'

const execAsync = promisify(exec)

export interface InstallResult {
  success: boolean
  message: string
  error?: string
}

export interface InstallProgress {
  stage: string
  message: string
  percent?: number
}

export class Installer {
  private checker = new DependencyChecker()

  async installAll(): Promise<InstallResult> {
    const deps = await this.checker.checkAll()
    const notInstalled = deps.filter(d => !d.installed)

    for (const dep of notInstalled) {
      const result = await this.install(dep.id)
      if (!result.success) {
        return result
      }
    }

    return { success: true, message: 'All dependencies installed successfully' }
  }

  async install(id: string): Promise<InstallResult> {
    switch (id) {
      case 'xcode-clt':
        return this.installXcodeCLT()
      case 'homebrew':
        return this.installHomebrew()
      case 'nodejs':
        return this.installNodejs()
      case 'opencode':
        return this.installOpenCode()
      default:
        return { success: false, message: `Unknown dependency: ${id}` }
    }
  }

  private async installXcodeCLT(): Promise<InstallResult> {
    try {
      // Check if already installed
      const status = await this.checker.check('xcode-clt')
      if (status.installed) {
        return { success: true, message: 'Xcode Command Line Tools already installed' }
      }

      // Use osascript to trigger the install dialog
      // This is more reliable than direct execution for GUI dialogs on macOS,
      // especially on Intel Macs where the dialog can flash and disappear
      await execAsync('osascript -e \'do shell script "xcode-select --install"\'')

      // Note: The actual installation happens asynchronously via the system dialog
      // We return success here but the UI will poll for completion
      return { 
        success: true, 
        message: 'Xcode Command Line Tools installation started. Please complete the installation in the system dialog.' 
      }
    } catch (error) {
      // xcode-select --install returns error code 1 if already installed
      const status = await this.checker.check('xcode-clt')
      if (status.installed) {
        return { success: true, message: 'Xcode Command Line Tools already installed' }
      }
      
      return { 
        success: false, 
        message: 'Failed to start Xcode Command Line Tools installation',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async installHomebrew(): Promise<InstallResult> {
    try {
      // Check if already installed
      const status = await this.checker.check('homebrew')
      if (status.installed) {
        return { success: true, message: 'Homebrew already installed' }
      }

      // First, download the install script
      await execAsync(
        'curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh -o /tmp/homebrew-install.sh',
        { timeout: 30000 }
      )

      // Make it executable
      await execAsync('chmod +x /tmp/homebrew-install.sh')

      // Homebrew installation requires sudo on BOTH Intel and Apple Silicon:
      // - Intel: needs sudo for /usr/local
      // - Apple Silicon: needs sudo to create /opt/homebrew and set permissions
      //
      // The Homebrew installer handles sudo internally and will refuse to run as root.
      // We use osascript to pre-authenticate and cache sudo credentials, then run
      // the installer as the normal user. The installer will use the cached credentials.
      try {
        // Prompt for password and cache sudo credentials (valid for ~5 minutes)
        await execAsync(
          `osascript -e 'do shell script "sudo -v" with administrator privileges'`,
          { timeout: 60000 }
        )
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        // Check if user cancelled the password dialog
        if (errorMessage.includes('User canceled') || errorMessage.includes('-128')) {
          await execAsync('rm -f /tmp/homebrew-install.sh').catch(() => {})
          return {
            success: false,
            message: 'Administrator access is required to install Homebrew',
            error: 'You cancelled the password prompt. Please try again and enter your password when prompted.'
          }
        }
        
        await execAsync('rm -f /tmp/homebrew-install.sh').catch(() => {})
        return {
          success: false,
          message: 'Failed to get administrator access',
          error: errorMessage
        }
      }

      // Now run the Homebrew installer as the normal user
      // 
      // IMPORTANT: We do NOT set NONINTERACTIVE or CI environment variables because
      // those cause the Homebrew installer to use `sudo -n` (non-interactive sudo),
      // which doesn't work with cached credentials. Instead, we:
      // 1. Let the installer use regular `sudo` which will use the cached credentials
      // 2. Pipe a newline to stdin to auto-confirm the "Press RETURN to continue" prompt
      return new Promise((resolve) => {
        const child = spawn('/bin/bash', ['/tmp/homebrew-install.sh'], {
          env: {
            ...process.env,
            HOMEBREW_NO_ANALYTICS: '1'
            // Note: NOT setting CI or NONINTERACTIVE - see comment above
          },
          stdio: ['pipe', 'pipe', 'pipe']
        })

        // Auto-confirm the "Press RETURN to continue" prompt
        child.stdin?.write('\n')
        child.stdin?.end()

        let stdout = ''
        let stderr = ''

        child.stdout?.on('data', (data) => {
          const text = data.toString()
          stdout += text
          console.log('[Homebrew Install]', text)
        })

        child.stderr?.on('data', (data) => {
          const text = data.toString()
          stderr += text
          console.error('[Homebrew Install Error]', text)
        })

        child.on('close', async (code) => {
          console.log('[Homebrew Install] Process exited with code:', code)
          
          // Clean up the temp script
          await execAsync('rm -f /tmp/homebrew-install.sh').catch(() => {})

          if (code === 0) {
            await this.configureHomebrewPath()
            resolve({ success: true, message: 'Homebrew installed successfully' })
          } else {
            // Check if Homebrew was actually installed despite non-zero exit
            const recheckStatus = await this.checker.check('homebrew')
            if (recheckStatus.installed) {
              await this.configureHomebrewPath()
              resolve({ success: true, message: 'Homebrew installed successfully' })
            } else {
              const errorDetails = stderr || stdout || 'Unknown error'
              const truncatedError = errorDetails.length > 500 
                ? errorDetails.slice(-500) 
                : errorDetails
              resolve({ 
                success: false, 
                message: 'Homebrew installation failed',
                error: truncatedError
              })
            }
          }
        })

        child.on('error', (error) => {
          console.error('[Homebrew Install] Spawn error:', error)
          resolve({ 
            success: false, 
            message: 'Failed to start Homebrew installation',
            error: error.message
          })
        })
      })
    } catch (error) {
      console.error('[Homebrew Install] Exception:', error)
      return { 
        success: false, 
        message: 'Failed to install Homebrew',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async configureHomebrewPath(): Promise<void> {
    const { homedir } = await import('os')
    const { readFile, writeFile, access } = await import('fs/promises')
    const { join } = await import('path')

    const zshrcPath = join(homedir(), '.zshrc')

    // Detect which Homebrew path exists (Apple Silicon vs Intel)
    let brewBinary: string | null = null
    for (const path of ['/opt/homebrew/bin/brew', '/usr/local/bin/brew']) {
      try {
        await access(path)
        brewBinary = path
        break
      } catch {
        continue
      }
    }

    if (!brewBinary) return  // Homebrew not found, skip configuration

    const pathExport = `\n# Homebrew\neval "$(${brewBinary} shellenv)"\n`

    try {
      // Check if .zshrc exists
      try {
        await access(zshrcPath)
      } catch {
        // Create empty .zshrc if it doesn't exist
        await writeFile(zshrcPath, '')
      }

      const content = await readFile(zshrcPath, 'utf-8')

      // Check if any Homebrew path is already configured
      if (content.includes('/opt/homebrew') || content.includes('/usr/local/bin/brew')) {
        return
      }

      // Append Homebrew configuration
      await writeFile(zshrcPath, content + pathExport)
    } catch {
      // Silently fail - user can configure manually
    }
  }

  private async installNodejs(): Promise<InstallResult> {
    try {
      // Check if already installed
      const status = await this.checker.check('nodejs')
      if (status.installed) {
        return { success: true, message: 'Node.js already installed' }
      }

      // Ensure Homebrew is installed first
      const brewStatus = await this.checker.check('homebrew')
      if (!brewStatus.installed) {
        return { 
          success: false, 
          message: 'Homebrew must be installed first' 
        }
      }

      // Get brew path
      const brewPath = await this.getBrewPath()
      
      // Install Node.js via Homebrew
      const { stdout, stderr } = await execAsync(`${brewPath} install node`, {
        timeout: 300000 // 5 minute timeout
      })

      // Verify installation
      const newStatus = await this.checker.check('nodejs')
      if (newStatus.installed) {
        return { success: true, message: `Node.js ${newStatus.version} installed successfully` }
      }

      return { 
        success: false, 
        message: 'Node.js installation completed but verification failed',
        error: stderr || stdout
      }
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to install Node.js',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async installOpenCode(): Promise<InstallResult> {
    try {
      // Check if already installed
      const status = await this.checker.check('opencode')
      if (status.installed) {
        return { success: true, message: 'OpenCode already installed' }
      }

      // Ensure Homebrew is installed first
      const brewStatus = await this.checker.check('homebrew')
      if (!brewStatus.installed) {
        return { 
          success: false, 
          message: 'Homebrew must be installed first' 
        }
      }

      // Get brew path
      const brewPath = await this.getBrewPath()

      // Install OpenCode via Homebrew tap
      await execAsync(`${brewPath} install anomalyco/tap/opencode`, {
        timeout: 300000 // 5 minute timeout
      })

      // Verify installation
      const newStatus = await this.checker.check('opencode')
      if (newStatus.installed) {
        return { success: true, message: `OpenCode ${newStatus.version} installed successfully` }
      }

      return { 
        success: false, 
        message: 'OpenCode installation completed but verification failed'
      }
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to install OpenCode',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async getBrewPath(): Promise<string> {
    // Try Apple Silicon path first, then Intel
    const paths = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew']
    
    for (const path of paths) {
      try {
        await execAsync(`${path} --version`)
        return path
      } catch {
        continue
      }
    }
    
    // Fallback to hoping it's in PATH
    return 'brew'
  }

  async installDesktopApp(): Promise<InstallResult> {
    try {
      // Ensure Homebrew is installed first
      const brewStatus = await this.checker.check('homebrew')
      if (!brewStatus.installed) {
        return { 
          success: false, 
          message: 'Homebrew must be installed first' 
        }
      }

      const brewPath = await this.getBrewPath()
      
      // Install via brew cask
      const { stdout, stderr } = await execAsync(`${brewPath} install --cask opencode-desktop`, {
        timeout: 600000 // 10 minute timeout for larger app download
      })

      // Verify installation
      const { access } = await import('fs/promises')
      try {
        await access('/Applications/OpenCode.app')
        return { success: true, message: 'OpenCode Desktop installed successfully' }
      } catch {
        return { 
          success: false, 
          message: 'Installation completed but app not found in /Applications',
          error: stderr || stdout
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Extract stderr if available from exec error
      let details = errorMessage
      if (error && typeof error === 'object' && 'stderr' in error) {
        details = (error as { stderr: string }).stderr || errorMessage
      }
      
      return { 
        success: false, 
        message: 'Failed to install OpenCode Desktop',
        error: details
      }
    }
  }
}
