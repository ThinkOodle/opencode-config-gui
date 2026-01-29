import { useState, useEffect } from 'react'
import { useSetupStore } from '@/stores/setup-store'
import { Button, Card, Input, Alert } from '@/components/common'
import { ArrowRight, ArrowLeft, ExternalLink, Check, Loader2 } from 'lucide-react'

export function ProviderStep() {
  const { 
    isTestingProvider,
    providerConfigured,
    testAndSaveProvider,
    nextStep,
    prevStep
  } = useSetupStore()

  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [alreadyConfigured, setAlreadyConfigured] = useState(false)

  // Check for existing OpenCode Zen configuration on mount
  useEffect(() => {
    const checkExisting = async () => {
      try {
        console.log('[ProviderStep] Checking for existing OpenCode auth...')
        const authStatus = await window.api.checkOpenCodeAuth()
        console.log('[ProviderStep] Auth status:', authStatus)
        if (authStatus.configured) {
          setAlreadyConfigured(true)
          setSuccess(true)
        }
      } catch (error) {
        console.error('[ProviderStep] Failed to check auth status:', error)
      } finally {
        setIsChecking(false)
      }
    }
    checkExisting()
  }, [])

  const handleTest = async () => {
    if (!apiKey) return
    
    setError(null)
    const result = await testAndSaveProvider('opencode', apiKey)
    
    if (result) {
      setSuccess(true)
      // Auto-advance after a short delay
      setTimeout(() => nextStep(), 1500)
    } else {
      setError('Invalid API key format. Please check that it starts with sk- and try again.')
    }
  }

  const handleOpenDocs = () => {
    window.api.openExternal('https://opencode.ai/auth')
  }

  // Show loading state while checking for existing config
  if (isChecking) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center gap-3 text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Checking configuration...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">
          Connect OpenCode Zen
        </h2>
        <p className="text-zinc-400">
          {alreadyConfigured 
            ? 'OpenCode Zen is already configured and ready to use.'
            : 'Enter your OpenCode Zen API key to enable AI features.'}
        </p>
      </div>

      {/* Already configured state */}
      {alreadyConfigured ? (
        <Alert variant="success" title="OpenCode Zen Connected">
          Your API key is configured. You're ready to use OpenCode!
        </Alert>
      ) : (
        <>
          {/* API key input */}
          <Card className="mb-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-zinc-100">
                  Enter your OpenCode Zen API Key
                </h3>
                <Button variant="ghost" size="sm" onClick={handleOpenDocs}>
                  Get API Key
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setError(null)
                  setSuccess(false)
                }}
                error={error || undefined}
              />

              <p className="text-xs text-zinc-500">
                Your API key will be stored securely in ~/.local/share/opencode/auth.json
              </p>
            </div>
          </Card>

          {/* Success message */}
          {success && (
            <Alert variant="success" title="Connected successfully">
              Your API key has been saved. You're ready to use OpenCode!
            </Alert>
          )}
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={prevStep}>
          <ArrowLeft className="w-5 h-5" />
          Back
        </Button>
        
        {success || alreadyConfigured ? (
          <Button onClick={nextStep}>
            Continue
            <ArrowRight className="w-5 h-5" />
          </Button>
        ) : (
          <Button 
            onClick={handleTest}
            disabled={!apiKey || isTestingProvider}
            isLoading={isTestingProvider}
          >
            Test Connection
          </Button>
        )}
      </div>
    </div>
  )
}
