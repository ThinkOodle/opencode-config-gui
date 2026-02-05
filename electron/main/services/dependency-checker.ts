import { access, readFile } from 'fs/promises'

export interface DesktopAppStatus {
  installed: boolean
  version?: string
}

export class DependencyChecker {
  async checkDesktopApp(): Promise<DesktopAppStatus> {
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
