import { useState, useEffect } from 'react'
import { Card, CardHeader, Button, Input, Textarea, Alert, StatusBadge, Modal } from '@/components/common'
import { Plus, Download, Trash2, Pencil, Loader2 } from 'lucide-react'

interface Agent {
  name: string
  description: string
  mode?: 'primary' | 'subagent' | 'all'
  model?: string
  path: string
  isGlobal: boolean
}

interface AgencyAgent {
  id: string
  name: string
  description: string
  mode?: 'primary' | 'subagent' | 'all'
  category?: string
}

// Popular models for the dropdown
const MODEL_OPTIONS = [
  { value: '', label: 'Use default model' },
  { value: 'anthropic/claude-opus-4-5', label: 'Claude Opus 4.5' },
  { value: 'anthropic/claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
  { value: 'openai/gpt-5.2', label: 'GPT 5.2' },
  { value: 'openai/gpt-5.1-codex', label: 'GPT 5.1 Codex' },
  { value: 'google/gemini-3-pro', label: 'Gemini 3 Pro' },
  { value: 'custom', label: 'Custom model...' },
]

// Mode options with descriptions
const MODE_OPTIONS = [
  { 
    value: 'subagent', 
    label: 'Subagent',
    description: 'Invoked by other agents or via @ mention'
  },
  { 
    value: 'primary', 
    label: 'Primary',
    description: 'Main agent you interact with directly (Tab to switch)'
  },
  { 
    value: 'all', 
    label: 'Both',
    description: 'Can be used as primary or subagent'
  },
]

export function Agents() {
  // List state
  const [installedAgents, setInstalledAgents] = useState<Agent[]>([])
  const [catalogAgents, setCatalogAgents] = useState<AgencyAgent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Editor modal state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  // Editor form state
  const [agentName, setAgentName] = useState('')
  const [agentDescription, setAgentDescription] = useState('')
  const [agentMode, setAgentMode] = useState<string>('subagent')
  const [agentModel, setAgentModel] = useState('')
  const [customModel, setCustomModel] = useState('')
  const [agentPrompt, setAgentPrompt] = useState('')
  
  // Delete confirmation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Install state
  const [installingId, setInstallingId] = useState<string | null>(null)

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    setIsLoading(true)
    try {
      const [installed, catalog] = await Promise.all([
        window.api.listInstalledAgents(),
        window.api.fetchAgentsCatalog().catch(() => [])
      ])
      setInstalledAgents(installed)
      setCatalogAgents(catalog)
    } finally {
      setIsLoading(false)
    }
  }

  const resetEditorForm = () => {
    setAgentName('')
    setAgentDescription('')
    setAgentMode('subagent')
    setAgentModel('')
    setCustomModel('')
    setAgentPrompt('')
    setSaveError(null)
  }

  const handleCreate = () => {
    setEditingAgent(null)
    resetEditorForm()
    setEditorOpen(true)
  }

  const handleEdit = async (agentName: string) => {
    const content = await window.api.getAgentContent(agentName)
    if (content) {
      setEditingAgent(agentName)
      populateFormFromContent(content)
      setEditorOpen(true)
    }
  }

  const populateFormFromContent = (content: string) => {
    setSaveError(null)
    
    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) return

    const frontmatter = frontmatterMatch[1]
    const body = content.slice(frontmatterMatch[0].length).trim()

    // Extract fields from frontmatter
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m)
    const modeMatch = frontmatter.match(/^mode:\s*(.+)$/m)
    const modelMatch = frontmatter.match(/^model:\s*(.+)$/m)

    setAgentDescription(descMatch ? descMatch[1].trim() : '')
    setAgentMode(modeMatch ? modeMatch[1].trim() : 'subagent')
    
    // Handle model - check if it's in our predefined list
    const modelValue = modelMatch ? modelMatch[1].trim() : ''
    if (modelValue && !MODEL_OPTIONS.some(opt => opt.value === modelValue)) {
      setAgentModel('custom')
      setCustomModel(modelValue)
    } else {
      setAgentModel(modelValue)
      setCustomModel('')
    }
    
    setAgentPrompt(body)
  }

  const buildAgentContent = (): string => {
    const lines: string[] = ['---']
    
    lines.push(`description: ${agentDescription}`)
    
    if (agentMode) {
      lines.push(`mode: ${agentMode}`)
    }
    
    const finalModel = agentModel === 'custom' ? customModel : agentModel
    if (finalModel) {
      lines.push(`model: ${finalModel}`)
    }
    
    lines.push('---')
    
    if (agentPrompt.trim()) {
      lines.push('')
      lines.push(agentPrompt.trim())
    }
    
    return lines.join('\n')
  }

  const handleSave = async () => {
    // Validation
    if (!editingAgent && !agentName.trim()) {
      setSaveError('Name is required')
      return
    }
    
    if (!agentDescription.trim()) {
      setSaveError('Description is required')
      return
    }
    
    // Validate name format for new agents
    if (!editingAgent && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(agentName.trim())) {
      setSaveError('Name must be lowercase letters, numbers, and hyphens only')
      return
    }

    const content = buildAgentContent()
    const name = editingAgent || agentName.trim()

    setIsSaving(true)
    setSaveError(null)

    try {
      const result = await window.api.saveAgent(name, content)
      if (result.success) {
        setEditorOpen(false)
        resetEditorForm()
        await loadAgents()
      } else {
        setSaveError(result.error || 'Failed to save agent')
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save agent')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = (name: string) => {
    setAgentToDelete(name)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!agentToDelete) return

    setIsDeleting(true)
    try {
      await window.api.removeAgent(agentToDelete)
      setDeleteConfirmOpen(false)
      setAgentToDelete(null)
      await loadAgents()
    } catch (error) {
      console.error('Failed to delete agent:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleInstallFromCatalog = async (agentId: string) => {
    setInstallingId(agentId)
    try {
      const result = await window.api.installAgentFromCatalog(agentId)
      if (result.success) {
        await loadAgents()
      }
    } catch (error) {
      console.error('Failed to install agent:', error)
    } finally {
      setInstallingId(null)
    }
  }

  const getModeDescription = (mode: string): string => {
    const option = MODE_OPTIONS.find(opt => opt.value === mode)
    return option?.description || ''
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Agents</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Specialized AI assistants for specific tasks and workflows
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4" />
          Create Agent
        </Button>
      </div>

      {/* Agency catalog */}
      {catalogAgents.length > 0 && (
        <Card>
          <CardHeader 
            title="Agency Agents" 
            description="Curated agents from your organization"
          />
          
          <div className="grid gap-3 sm:grid-cols-2">
            {catalogAgents.map((agent) => {
              const isInstalled = installedAgents.some(a => a.name === agent.id)
              const isInstalling = installingId === agent.id
              
              return (
                <div 
                  key={agent.id}
                  className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-800"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-zinc-100">{agent.name}</h4>
                    {isInstalled && <StatusBadge status="success" label="Installed" size="sm" />}
                  </div>
                  <p className="text-sm text-zinc-400 mb-2">{agent.description}</p>
                  {agent.mode && (
                    <p className="text-xs text-zinc-500 mb-3">
                      Mode: {agent.mode}
                    </p>
                  )}
                  {!isInstalled && (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => handleInstallFromCatalog(agent.id)}
                      disabled={isInstalling}
                      isLoading={isInstalling}
                    >
                      <Download className="w-4 h-4" />
                      Install
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Installed agents */}
      <Card>
        <CardHeader 
          title="Installed Agents" 
          description={`${installedAgents.length} agent${installedAgents.length !== 1 ? 's' : ''} installed`}
        />
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : installedAgents.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No agents installed yet. Create one or install from the catalog above.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {installedAgents.map((agent) => (
              <div key={agent.name} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-100">{agent.name}</span>
                    {agent.mode && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        agent.mode === 'primary' 
                          ? 'bg-violet-500/20 text-violet-300' 
                          : agent.mode === 'subagent'
                          ? 'bg-zinc-700 text-zinc-300'
                          : 'bg-fuchsia-500/20 text-fuchsia-300'
                      }`}>
                        {agent.mode}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 truncate">{agent.description}</p>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEdit(agent.name)}
                    className="text-zinc-400 hover:text-zinc-100"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteClick(agent.name)}
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

      {/* Editor Modal */}
      <Modal
        isOpen={editorOpen}
        onClose={() => {
          setEditorOpen(false)
          resetEditorForm()
        }}
        title={editingAgent ? 'Edit Agent' : 'Create Agent'}
        description={editingAgent ? `Editing ${editingAgent}` : 'Create a new custom agent'}
        footer={
          <>
            <Button 
              variant="ghost" 
              onClick={() => {
                setEditorOpen(false)
                resetEditorForm()
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              isLoading={isSaving}
            >
              {editingAgent ? 'Save Changes' : 'Create Agent'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {saveError && (
            <Alert variant="error">
              {saveError}
            </Alert>
          )}
          
          {/* Name field - disabled when editing */}
          {editingAgent ? (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-300">
                Name
              </label>
              <div className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400">
                {editingAgent}
              </div>
            </div>
          ) : (
            <Input
              label="Name"
              placeholder="my-custom-agent"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              hint="Lowercase letters, numbers, and hyphens only"
            />
          )}

          {/* Description field */}
          <Input
            label="Description"
            placeholder="Brief description of what this agent does"
            value={agentDescription}
            onChange={(e) => setAgentDescription(e.target.value)}
            error={!agentDescription.trim() && saveError ? 'Required' : undefined}
          />

          {/* Mode selector */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">
              Mode
            </label>
            <select
              value={agentMode}
              onChange={(e) => setAgentMode(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">
              {getModeDescription(agentMode)}
            </p>
          </div>

          {/* Model selector */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">
              Model
            </label>
            <select
              value={agentModel}
              onChange={(e) => {
                setAgentModel(e.target.value)
                if (e.target.value !== 'custom') {
                  setCustomModel('')
                }
              }}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {agentModel === 'custom' && (
              <Input
                placeholder="provider/model-id (e.g., anthropic/claude-sonnet-4)"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* System prompt */}
          <Textarea
            label="System Prompt"
            placeholder="You are a specialized assistant that..."
            value={agentPrompt}
            onChange={(e) => setAgentPrompt(e.target.value)}
            rows={8}
            hint="Instructions and context for the agent"
          />
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setAgentToDelete(null)
        }}
        title="Delete Agent"
        description={`Are you sure you want to delete "${agentToDelete}"? This cannot be undone.`}
        footer={
          <>
            <Button 
              variant="ghost" 
              onClick={() => {
                setDeleteConfirmOpen(false)
                setAgentToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="danger"
              onClick={confirmDelete}
              disabled={isDeleting}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-zinc-400">
          This will permanently remove the agent from your system. OpenCode will no longer be able to use this agent.
        </p>
      </Modal>
    </div>
  )
}
