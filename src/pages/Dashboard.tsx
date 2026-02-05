import { useEffect, useState } from 'react'
import { Card, CardHeader, Button, StatusBadge, Alert } from '@/components/common'
import { RefreshCw, ExternalLink, Sparkles, Plug } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Dashboard() {
  const [version, setVersion] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    window.api.getVersion().then((ver) => {
      setVersion(ver)
    }).finally(() => {
      setIsLoading(false)
    })
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">
          Welcome to Oodle AI
        </h1>
        <p className="text-zinc-300">
          Configure OpenCode with a friendly interface. Add skills, connect services, and customize your setup.
        </p>
      </div>

      {/* Status cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader 
            title="OpenCode Status" 
            description="AI coding agent installation"
          />
          <div className="flex items-center justify-between">
            <StatusBadge status="success" label="Installed" />
            {version && (
              <span className="text-sm text-zinc-500">App v{version}</span>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader 
            title="Provider" 
            description="AI model connection"
          />
          <div className="flex items-center justify-between">
            <StatusBadge status="success" label="Connected" />
            <Link to="/settings">
              <Button variant="ghost" size="sm">
                Manage
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader 
          title="Quick Actions" 
          description="Common tasks to get you started"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Link 
            to="/skills"
            className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <div className="font-medium text-zinc-100">Add Skills</div>
              <div className="text-sm text-zinc-400">Install agent capabilities</div>
            </div>
          </Link>
          
          <Link 
            to="/mcp"
            className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
              <Plug className="w-5 h-5 text-fuchsia-400" />
            </div>
            <div>
              <div className="font-medium text-zinc-100">Connect Add-ons</div>
              <div className="text-sm text-zinc-400">Set up external services</div>
            </div>
          </Link>
        </div>
      </Card>

      {/* Tip */}
      <Alert variant="info" title="Getting Started">
        Run <code className="px-1.5 py-0.5 bg-zinc-800 rounded text-violet-300">opencode</code> in any project folder to start using AI assistance.
        Use <code className="px-1.5 py-0.5 bg-zinc-800 rounded text-violet-300">/init</code> to set up a new project.
      </Alert>
    </div>
  )
}
