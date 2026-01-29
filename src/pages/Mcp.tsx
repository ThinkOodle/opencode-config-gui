import { useState, useEffect } from 'react'
import { Card, CardHeader, Button, Alert, StatusBadge } from '@/components/common'
import { Download, Trash2, ExternalLink, Loader2, ToggleLeft, ToggleRight, Wifi } from 'lucide-react'

interface InstalledMcp {
  id: string
  name: string
  type: 'local' | 'remote'
  enabled: boolean
  url?: string
}

interface AgencyMcpServer {
  id: string
  name: string
  description: string
  type: 'remote' | 'local'
  url?: string
  command?: string[]
  category?: string
  requiresAuth?: boolean
  authType?: string
  website?: string
}

export function Mcp() {
  const [installedMcps, setInstalledMcps] = useState<InstalledMcp[]>([])
  const [catalogMcps, setCatalogMcps] = useState<AgencyMcpServer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInstalling, setIsInstalling] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState<string | null>(null)

  useEffect(() => {
    loadMcps()
  }, [])

  const loadMcps = async () => {
    setIsLoading(true)
    try {
      const [installed, catalog] = await Promise.all([
        window.api.listInstalledMcps(),
        window.api.fetchMcpCatalog().catch(() => [])
      ])
      setInstalledMcps(installed)
      setCatalogMcps(catalog)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInstall = async (server: AgencyMcpServer) => {
    setIsInstalling(server.id)
    try {
      const config = server.type === 'remote' 
        ? { type: 'remote' as const, url: server.url!, enabled: true }
        : { type: 'local' as const, command: server.command!, enabled: true }
      
      await window.api.installMcp(server.id, config)
      await loadMcps()
    } catch (error) {
      console.error('Failed to install MCP:', error)
    } finally {
      setIsInstalling(null)
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm(`Remove "${id}" add-on? This will remove it from your configuration.`)) return
    
    try {
      await window.api.removeMcp(id)
      await loadMcps()
    } catch (error) {
      console.error('Failed to remove MCP:', error)
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await window.api.toggleMcpEnabled(id, enabled)
      await loadMcps()
    } catch (error) {
      console.error('Failed to toggle MCP:', error)
    }
  }

  const handleTest = async (id: string) => {
    setIsTesting(id)
    try {
      const result = await window.api.testMcpConnection(id)
      alert(result.success ? 'Connection successful!' : `Connection failed: ${result.message}`)
    } finally {
      setIsTesting(null)
    }
  }

  // Group catalog by category
  const catalogByCategory = catalogMcps.reduce((acc, mcp) => {
    const category = mcp.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(mcp)
    return acc
  }, {} as Record<string, AgencyMcpServer[]>)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Info */}
      <Alert variant="info" title="What are Add-ons?">
        Add-ons (MCP servers) connect OpenCode to external services like documentation search, 
        issue trackers, and more. They extend what the AI can do for you.
      </Alert>

      {/* Catalog */}
      <Card>
        <CardHeader 
          title="Available Add-ons" 
          description="Curated services you can connect"
        />
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : catalogMcps.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No add-ons available in the catalog.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(catalogByCategory).map(([category, servers]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-zinc-400 mb-3">{category}</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {servers.map((server) => {
                    const isInstalled = installedMcps.some(m => m.id === server.id)
                    const isInstallingThis = isInstalling === server.id
                    
                    return (
                      <div 
                        key={server.id}
                        className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-800"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-zinc-100">{server.name}</h4>
                          {isInstalled && <StatusBadge status="success" label="Added" size="sm" />}
                        </div>
                        <p className="text-sm text-zinc-400 mb-3">{server.description}</p>
                        
                        <div className="flex items-center gap-2">
                          {!isInstalled ? (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => handleInstall(server)}
                              disabled={isInstallingThis}
                              isLoading={isInstallingThis}
                            >
                              <Download className="w-4 h-4" />
                              {server.requiresAuth ? 'Connect' : 'Add'}
                            </Button>
                          ) : null}
                          
                          {server.website && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => window.api.openExternal(server.website!)}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        
                        {server.requiresAuth && !isInstalled && (
                          <p className="text-xs text-zinc-500 mt-2">
                            Requires {server.authType === 'oauth' ? 'account connection' : 'API key'}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Installed */}
      <Card>
        <CardHeader 
          title="Your Add-ons" 
          description={`${installedMcps.length} add-on${installedMcps.length !== 1 ? 's' : ''} configured`}
        />
        
        {installedMcps.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No add-ons configured yet. Add one from the catalog above.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {installedMcps.map((mcp) => (
              <div key={mcp.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-100">{mcp.name}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">
                      {mcp.type}
                    </span>
                  </div>
                  {mcp.url && (
                    <p className="text-sm text-zinc-500 truncate">{mcp.url}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTest(mcp.id)}
                    disabled={isTesting === mcp.id}
                    className="text-zinc-400"
                  >
                    {isTesting === mcp.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wifi className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <button
                    onClick={() => handleToggle(mcp.id, !mcp.enabled)}
                    className={`${mcp.enabled ? 'text-green-400' : 'text-zinc-500'}`}
                  >
                    {mcp.enabled ? (
                      <ToggleRight className="w-6 h-6" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleRemove(mcp.id)}
                    className="text-zinc-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
