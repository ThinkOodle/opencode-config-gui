import { useState, useEffect } from 'react'
import { Card, CardHeader, Button, Input, Alert } from '@/components/common'
import { Save, Loader2 } from 'lucide-react'

export function Config() {
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Form state
  const [theme, setTheme] = useState('')
  const [model, setModel] = useState('')
  const [autoupdate, setAutoupdate] = useState(true)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setIsLoading(true)
    try {
      const cfg = await window.api.readGlobalConfig()
      setConfig(cfg)
      setTheme((cfg.theme as string) || '')
      setModel((cfg.model as string) || '')
      setAutoupdate(cfg.autoupdate !== false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const newConfig = {
        ...config,
        theme: theme || undefined,
        model: model || undefined,
        autoupdate,
      }
      
      // Remove empty values
      if (!theme) delete newConfig.theme
      if (!model) delete newConfig.model
      
      await window.api.writeGlobalConfig(newConfig)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save config:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading configuration...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Alert variant="info">
        These settings apply globally to all projects. You can also create project-specific 
        settings by adding an <code className="px-1 py-0.5 bg-zinc-800 rounded">opencode.json</code> file to any project folder.
      </Alert>

      {/* Appearance */}
      <Card>
        <CardHeader 
          title="Appearance" 
          description="Customize how OpenCode looks"
        />
        
        <div className="space-y-4">
          <Input
            label="Theme"
            placeholder="e.g., opencode, catppuccin, dracula"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            hint="Leave empty for default theme"
          />
        </div>
      </Card>

      {/* Model */}
      <Card>
        <CardHeader 
          title="Default Model" 
          description="The AI model to use by default"
        />
        
        <div className="space-y-4">
          <Input
            label="Model"
            placeholder="e.g., anthropic/claude-sonnet-4-5"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            hint="Format: provider/model-name"
          />
        </div>
      </Card>

      {/* Updates */}
      <Card>
        <CardHeader 
          title="Updates" 
          description="Automatic update preferences"
        />
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoupdate}
            onChange={(e) => setAutoupdate(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500 focus:ring-offset-zinc-950"
          />
          <div>
            <div className="text-zinc-100">Auto-update OpenCode</div>
            <div className="text-sm text-zinc-400">Automatically download and install updates</div>
          </div>
        </label>
      </Card>

      {/* Save button */}
      <div className="flex items-center justify-between">
        {saveSuccess && (
          <Alert variant="success" className="flex-1 mr-4">
            Configuration saved successfully
          </Alert>
        )}
        <div className="flex-1" />
        <Button onClick={handleSave} disabled={isSaving} isLoading={isSaving}>
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
