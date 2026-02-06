import { useState, useEffect } from 'react'
import { Card, CardHeader, Button, Input, Alert, StatusBadge } from '@/components/common'
import { Download, Trash2, Loader2, Send, ExternalLink } from 'lucide-react'

interface Skill {
  name: string
  description: string
  path: string
  isGlobal: boolean
}

interface AgencySkill {
  id: string
  name: string
  description: string
  category?: string
}

export function Skills() {
  const [installedSkills, setInstalledSkills] = useState<Skill[]>([])
  const [catalogSkills, setCatalogSkills] = useState<AgencySkill[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Catalog install state
  const [installingSkillId, setInstallingSkillId] = useState<string | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogSuccess, setCatalogSuccess] = useState<string | null>(null)

  // Skill request state
  const [requestUrl, setRequestUrl] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [requestPrUrl, setRequestPrUrl] = useState<string | null>(null)

  useEffect(() => {
    loadSkills()
  }, [])

  const loadSkills = async () => {
    setIsLoading(true)
    try {
      const [installed, catalog] = await Promise.all([
        window.api.listInstalledSkills(),
        window.api.fetchSkillsCatalog().catch(() => [])
      ])
      setInstalledSkills(installed)
      setCatalogSkills(catalog)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInstallFromCatalog = async (skillId: string) => {
    setCatalogError(null)
    setCatalogSuccess(null)
    setInstallingSkillId(skillId)

    try {
      const result = await window.api.installSkillFromCatalog(skillId)
      if (result.success && result.skill) {
        setCatalogSuccess(`Installed "${result.skill.name}" successfully`)
        await loadSkills()
      } else {
        setCatalogError(result.error || 'Failed to install skill')
      }
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Failed to install skill')
    } finally {
      setInstallingSkillId(null)
    }
  }

  const handleRemove = async (name: string) => {
    if (!confirm(`Remove skill "${name}"? This cannot be undone.`)) return
    
    try {
      await window.api.removeSkill(name)
      await loadSkills()
    } catch (error) {
      console.error('Failed to remove skill:', error)
    }
  }

  const handleRequestSkill = async () => {
    const url = requestUrl.trim()
    if (!url) return

    setRequestError(null)
    setRequestPrUrl(null)
    setIsRequesting(true)

    try {
      const result = await window.api.requestSkill(url)
      if (result.success && result.prUrl) {
        setRequestPrUrl(result.prUrl)
        setRequestUrl('')
      } else {
        setRequestError(result.error || 'Failed to submit skill request')
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Failed to submit skill request')
    } finally {
      setIsRequesting(false)
    }
  }

  const handleOpenPrUrl = () => {
    if (requestPrUrl) {
      window.api.openExternal(requestPrUrl)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Agency catalog */}
      <Card>
        <CardHeader 
          title="Agency Skills" 
          description="Curated skills from your organization"
        />

        {catalogError && (
          <Alert variant="error" className="mb-4">
            {catalogError}
          </Alert>
        )}
        {catalogSuccess && (
          <Alert variant="success" className="mb-4">
            {catalogSuccess}
          </Alert>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading catalog...
          </div>
        ) : catalogSkills.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No skills available in the catalog yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {catalogSkills.map((skill) => {
              const isInstalled = installedSkills.some(s => s.name === skill.id)
              const isInstalling = installingSkillId === skill.id
              
              return (
                <div 
                  key={skill.id}
                  className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-800"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-zinc-100">{skill.name}</h4>
                    {isInstalled && <StatusBadge status="success" label="Installed" size="sm" />}
                  </div>
                  <p className="text-sm text-zinc-400 mb-3">{skill.description}</p>
                  {skill.category && (
                    <div className="mb-3">
                      <span className="inline-block text-xs px-2 py-0.5 rounded bg-zinc-700/50 text-zinc-400">
                        {skill.category}
                      </span>
                    </div>
                  )}
                  {!isInstalled && (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => handleInstallFromCatalog(skill.id)}
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
        )}
      </Card>

      {/* Installed skills */}
      <Card>
        <CardHeader 
          title="Installed Skills" 
          description={`${installedSkills.length} skill${installedSkills.length !== 1 ? 's' : ''} installed`}
        />
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : installedSkills.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No skills installed yet. Install one from the catalog above.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {installedSkills.map((skill) => (
              <div key={skill.name} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-zinc-100">{skill.name}</div>
                  <p className="text-sm text-zinc-400 truncate">{skill.description}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleRemove(skill.name)}
                  className="text-zinc-400 hover:text-red-400 ml-4"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Request a skill */}
      <Card>
        <CardHeader 
          title="Request a Skill" 
          description="Can't find what you need? Submit a skills.sh URL for review by the team."
        />
        
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="https://skills.sh/org/repo/skill-name"
              value={requestUrl}
              onChange={(e) => {
                setRequestUrl(e.target.value)
                setRequestError(null)
                setRequestPrUrl(null)
              }}
              error={requestError || undefined}
            />
          </div>
          <Button 
            onClick={handleRequestSkill}
            disabled={!requestUrl.trim() || isRequesting}
            isLoading={isRequesting}
            variant="secondary"
          >
            <Send className="w-4 h-4" />
            Submit Request
          </Button>
        </div>

        {requestPrUrl && (
          <Alert variant="success" className="mt-4">
            <div className="flex items-center justify-between">
              <span>Request submitted! Your skill is pending review.</span>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleOpenPrUrl}
                className="ml-3 shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                View PR
              </Button>
            </div>
          </Alert>
        )}

        <p className="text-xs text-zinc-500 mt-3">
          The skill content will be fetched and submitted as a pull request to the agency catalog for review.
        </p>
      </Card>
    </div>
  )
}
