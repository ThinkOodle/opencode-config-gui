import { useState, useEffect } from 'react'
import { Card, CardHeader, Button, Input, Alert, StatusBadge } from '@/components/common'
import { Download, Trash2, ExternalLink, Loader2 } from 'lucide-react'

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
  const [skillUrl, setSkillUrl] = useState('')
  const [isInstalling, setIsInstalling] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)
  const [installSuccess, setInstallSuccess] = useState<string | null>(null)
  
  const [installedSkills, setInstalledSkills] = useState<Skill[]>([])
  const [catalogSkills, setCatalogSkills] = useState<AgencySkill[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  const handleInstallFromUrl = async () => {
    const url = skillUrl.trim()
    if (!url) return
    
    setInstallError(null)
    setInstallSuccess(null)
    setIsInstalling(true)

    try {
      // Check if it's a repo URL (2-part path: org/repo)
      const parsed = new URL(url)
      if (parsed.hostname === 'skills.sh') {
        const pathParts = parsed.pathname.split('/').filter(Boolean)
        
        if (pathParts.length === 2) {
          // It's a repo URL - install all skills from the repo
          const result = await window.api.installSkillsFromRepo(url)
          
          if (result.success && result.installed.length > 0) {
            const names = result.installed.map(s => s.name).join(', ')
            setInstallSuccess(`Installed ${result.installed.length} skill${result.installed.length > 1 ? 's' : ''}: ${names}`)
            setSkillUrl('')
            await loadSkills()
          } else if (result.error) {
            setInstallError(result.error)
          } else if (result.failed.length > 0) {
            const failedNames = result.failed.map(f => `${f.name} (${f.error})`).join(', ')
            setInstallError(`Failed to install: ${failedNames}`)
          } else {
            setInstallError('No skills found in this repository')
          }
          
          setIsInstalling(false)
          return
        }
      }
    } catch {
      // Invalid URL, fall through to single skill install
    }

    // Single skill install (existing logic)
    try {
      const result = await window.api.installSkillFromUrl(url)
      if (result.success && result.skill) {
        setInstallSuccess(`Installed "${result.skill.name}" successfully`)
        setSkillUrl('')
        await loadSkills()
      } else {
        setInstallError(result.error || 'Failed to install skill')
      }
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : 'Failed to install skill')
    } finally {
      setIsInstalling(false)
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

  const handleOpenSkillsSh = () => {
    window.api.openExternal('https://skills.sh')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Install from URL */}
      <Card>
        <CardHeader 
          title="Install from URL" 
          description="Paste a skills.sh link to install a skill or entire repository"
          action={
            <Button variant="ghost" size="sm" onClick={handleOpenSkillsSh}>
              Browse skills.sh
              <ExternalLink className="w-4 h-4" />
            </Button>
          }
        />
        
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="https://skills.sh/org/repo or https://skills.sh/org/repo/skill"
              value={skillUrl}
              onChange={(e) => {
                setSkillUrl(e.target.value)
                setInstallError(null)
                setInstallSuccess(null)
              }}
              error={installError || undefined}
            />
          </div>
          <Button 
            onClick={handleInstallFromUrl}
            disabled={!skillUrl.trim() || isInstalling}
            isLoading={isInstalling}
          >
            <Download className="w-4 h-4" />
            Install
          </Button>
        </div>

        {installSuccess && (
          <Alert variant="success" className="mt-4">
            {installSuccess}
          </Alert>
        )}
      </Card>

      {/* Agency catalog */}
      {catalogSkills.length > 0 && (
        <Card>
          <CardHeader 
            title="Agency Skills" 
            description="Curated skills from your organization"
          />
          
          <div className="grid gap-3 sm:grid-cols-2">
            {catalogSkills.map((skill) => {
              const isInstalled = installedSkills.some(s => s.name === skill.id)
              
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
                  {!isInstalled && (
                    <Button size="sm" variant="secondary">
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
            No skills installed yet. Install one from the URL field above or browse skills.sh.
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
    </div>
  )
}
