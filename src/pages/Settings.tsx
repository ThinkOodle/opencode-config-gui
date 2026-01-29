import { useState, useEffect } from 'react'
import { Card, CardHeader, Button, Input, Alert, StatusBadge } from '@/components/common'
import { Key, RefreshCw, ExternalLink, Loader2, Monitor, Download } from 'lucide-react'

interface ProviderStatus {
  id: string
  name: string
  envVar: string
  isConfigured: boolean
  docsUrl: string
}

const providers: Omit<ProviderStatus, 'isConfigured'>[] = [
  { id: 'opencode', name: 'OpenCode Zen', envVar: 'OPENCODE_API_KEY', docsUrl: 'https://opencode.ai/auth' },
]

export function Settings() {
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [newApiKey, setNewApiKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  
  // Desktop app state
  const [desktopAppInstalled, setDesktopAppInstalled] = useState(false)
  const [desktopAppVersion, setDesktopAppVersion] = useState<string | undefined>()
  const [isCheckingDesktopApp, setIsCheckingDesktopApp] = useState(false)
  const [isInstallingDesktopApp, setIsInstallingDesktopApp] = useState(false)
  const [desktopAppError, setDesktopAppError] = useState<{ message: string; details?: string } | null>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [version, desktopStatus, ...keyStatuses] = await Promise.all([
        window.api.getVersion(),
        window.api.checkDesktopApp(),
        ...providers.map(async (p) => {
          // OpenCode Zen uses auth.json instead of env vars
          if (p.id === 'opencode') {
            const authStatus = await window.api.checkOpenCodeAuth()
            return { ...p, isConfigured: authStatus.configured }
          }
          const key = await window.api.getEnvVar(p.envVar)
          return { ...p, isConfigured: !!key }
        })
      ])
      setAppVersion(version)
      setDesktopAppInstalled(desktopStatus.installed)
      setDesktopAppVersion(desktopStatus.version)
      setProviderStatuses(keyStatuses)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInstallDesktopApp = async () => {
    setIsInstallingDesktopApp(true)
    setDesktopAppError(null)
    setShowErrorDetails(false)
    try {
      const result = await window.api.installDesktopApp()
      if (result.success) {
        setDesktopAppInstalled(true)
        // Refresh to get version
        const status = await window.api.checkDesktopApp()
        setDesktopAppVersion(status.version)
      } else {
        setDesktopAppError({ message: result.message, details: result.error })
      }
    } catch (error) {
      console.error('Failed to install desktop app:', error)
      setDesktopAppError({ 
        message: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setIsInstallingDesktopApp(false)
    }
  }

  const handleRefreshDesktopApp = async () => {
    setIsCheckingDesktopApp(true)
    try {
      const status = await window.api.checkDesktopApp()
      setDesktopAppInstalled(status.installed)
      setDesktopAppVersion(status.version)
      if (status.installed) {
        setDesktopAppError(null)
      }
    } finally {
      setIsCheckingDesktopApp(false)
    }
  }

  const handleSaveKey = async (provider: ProviderStatus) => {
    if (!newApiKey.trim()) return
    
    setIsSaving(true)
    try {
      // Test the key first
      const result = await window.api.testProvider(provider.id, newApiKey)
      if (result.success) {
        await window.api.setEnvVar(provider.envVar, newApiKey)
        setEditingProvider(null)
        setNewApiKey('')
        await loadData()
      } else {
        alert('Invalid API key. Please check and try again.')
      }
    } catch (error) {
      console.error('Failed to save key:', error)
      alert('Failed to save API key')
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenDocs = (url: string) => {
    window.api.openExternal(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading settings...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Providers */}
      <Card>
        <CardHeader 
          title="AI Providers" 
          description="Manage your API keys"
        />
        
        <div className="divide-y divide-zinc-800">
          {providerStatuses.map((provider) => (
            <div key={provider.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-zinc-400" />
                  <span className="font-medium text-zinc-100">{provider.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {provider.isConfigured ? (
                    <StatusBadge status="success" label="Connected" size="sm" />
                  ) : (
                    <StatusBadge status="pending" label="Not configured" size="sm" />
                  )}
                </div>
              </div>
              
              {editingProvider === provider.id ? (
                <div className="mt-3 space-y-3">
                  <Input
                    type="password"
                    placeholder={`Enter ${provider.name} API key`}
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => handleSaveKey(provider)}
                      disabled={!newApiKey.trim() || isSaving}
                      isLoading={isSaving}
                    >
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setEditingProvider(null)
                        setNewApiKey('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => setEditingProvider(provider.id)}
                  >
                    {provider.isConfigured ? 'Update Key' : 'Add Key'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleOpenDocs(provider.docsUrl)}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Get Key
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* OpenCode Desktop */}
      <Card>
        <CardHeader 
          title="OpenCode Desktop" 
          description="Native desktop app for a more seamless experience"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshDesktopApp}
              disabled={isCheckingDesktopApp || isInstallingDesktopApp}
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingDesktopApp ? 'animate-spin' : ''}`} />
            </Button>
          }
        />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-zinc-400" />
            <div>
              <span className="font-medium text-zinc-100">OpenCode.app</span>
              {desktopAppInstalled && desktopAppVersion && (
                <span className="ml-2 text-xs text-zinc-500">v{desktopAppVersion}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCheckingDesktopApp ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            ) : desktopAppInstalled ? (
              <StatusBadge status="success" label="Installed" size="sm" />
            ) : (
              <Button 
                size="sm"
                onClick={handleInstallDesktopApp}
                disabled={isInstallingDesktopApp}
                isLoading={isInstallingDesktopApp}
              >
                <Download className="w-4 h-4" />
                Install
              </Button>
            )}
          </div>
        </div>
        
        {desktopAppError && (
          <Alert variant="error" title="Installation failed" className="mt-4">
            <p>{desktopAppError.message}</p>
            {desktopAppError.details && (
              <details 
                className="mt-2" 
                open={showErrorDetails}
                onToggle={(e) => setShowErrorDetails((e.target as HTMLDetailsElement).open)}
              >
                <summary className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-300">
                  View Details
                </summary>
                <pre className="mt-2 p-2 bg-zinc-900 rounded text-xs text-zinc-400 overflow-x-auto max-h-32">
                  {desktopAppError.details}
                </pre>
              </details>
            )}
          </Alert>
        )}
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader 
          title="About Oodle AI" 
          description="Application information"
        />
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Version</span>
            <span className="text-zinc-100">{appVersion}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Configuration Location</span>
            <span className="text-zinc-100 font-mono text-xs">~/.config/opencode/</span>
          </div>
        </div>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader 
          title="Resources" 
          description="Helpful links"
        />
        
        <div className="grid gap-2 sm:grid-cols-2">
          <Button 
            variant="secondary" 
            className="justify-start"
            onClick={() => handleOpenDocs('https://opencode.ai/docs')}
          >
            <ExternalLink className="w-4 h-4" />
            OpenCode Documentation
          </Button>
          <Button 
            variant="secondary" 
            className="justify-start"
            onClick={() => handleOpenDocs('https://skills.sh')}
          >
            <ExternalLink className="w-4 h-4" />
            Browse Skills
          </Button>
          <Button 
            variant="secondary" 
            className="justify-start"
            onClick={() => handleOpenDocs('https://opencode.ai/discord')}
          >
            <ExternalLink className="w-4 h-4" />
            Discord Community
          </Button>
          <Button 
            variant="secondary" 
            className="justify-start"
            onClick={() => handleOpenDocs('https://github.com/anomalyco/opencode')}
          >
            <ExternalLink className="w-4 h-4" />
            GitHub Repository
          </Button>
        </div>
      </Card>
    </div>
  )
}
