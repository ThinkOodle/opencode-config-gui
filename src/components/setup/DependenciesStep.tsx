import { useEffect } from 'react'
import { useSetupStore } from '@/stores/setup-store'
import { Button, Card, StatusBadge, Alert } from '@/components/common'
import { Check, Download, Loader2, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react'

export function DependenciesStep() {
  const { 
    dependencies, 
    isCheckingDependencies,
    isInstallingDependency,
    isWaitingForXcodeCLT,
    installError,
    checkDependencies,
    installDependency,
    installAllDependencies,
    clearInstallError,
    setWaitingForXcodeCLT,
    nextStep,
    prevStep
  } = useSetupStore()

  useEffect(() => {
    checkDependencies()
  }, [checkDependencies])

  // Poll for Xcode CLT installation completion
  useEffect(() => {
    if (!isWaitingForXcodeCLT) return

    const pollInterval = setInterval(async () => {
      await checkDependencies()

      // Check if xcode-clt is now installed
      const xcodeDep = useSetupStore.getState().dependencies.find(d => d.id === 'xcode-clt')
      if (xcodeDep?.installed) {
        setWaitingForXcodeCLT(false)
      }
    }, 3000)  // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [isWaitingForXcodeCLT, checkDependencies, setWaitingForXcodeCLT])

  const allInstalled = dependencies.every(d => d.installed)
  const notInstalled = dependencies.filter(d => !d.installed)

  const handleInstallAll = async () => {
    const success = await installAllDependencies()
    if (success) {
      // Auto-advance after a short delay
      setTimeout(() => nextStep(), 1000)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">
          System Dependencies
        </h2>
        <p className="text-zinc-400">
          OpenCode requires a few tools to be installed on your Mac.
          We'll check what you have and install anything that's missing.
        </p>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end mb-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={checkDependencies}
          disabled={isCheckingDependencies}
        >
          <RefreshCw className={`w-4 h-4 ${isCheckingDependencies ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Dependency list */}
      <Card className="mb-6">
        <div className="divide-y divide-zinc-800">
          {dependencies.map((dep) => (
            <div key={dep.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-100">{dep.name}</span>
                  {dep.installed && dep.version && (
                    <span className="text-xs text-zinc-500">v{dep.version}</span>
                  )}
                </div>
                <p className="text-sm text-zinc-500">{dep.description}</p>
              </div>
              <div className="ml-4 flex items-center gap-2">
                {isInstallingDependency === dep.id ? (
                  <StatusBadge status="loading" label="Installing..." />
                ) : dep.installed ? (
                  <StatusBadge status="success" label="Installed" />
                ) : (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => installDependency(dep.id)}
                    disabled={!!isInstallingDependency}
                  >
                    <Download className="w-4 h-4" />
                    Install
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Error message */}
      {installError && (
        <Alert variant="error" title="Installation failed" className="mb-4">
          {installError.message}
        </Alert>
      )}

      {/* Status message */}
      {allInstalled ? (
        <Alert variant="success" title="All dependencies installed">
          Your system is ready. Continue to set up your AI provider.
        </Alert>
      ) : (
        <Alert variant="info" title={`${notInstalled.length} ${notInstalled.length === 1 ? 'dependency' : 'dependencies'} to install`}>
          Click "Install All" to automatically install the missing dependencies, or install them individually.
        </Alert>
      )}

      {/* Xcode CLT special note - show while installing OR waiting for completion */}
      {(isInstallingDependency === 'xcode-clt' || isWaitingForXcodeCLT) && (
        <Alert variant="warning" title="System dialog required" className="mt-4">
          A system dialog should appear asking you to install Xcode Command Line Tools.
          Please click "Install" in that dialog. This page will automatically update when installation completes.
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={prevStep}>
          <ArrowLeft className="w-5 h-5" />
          Back
        </Button>
        
        {allInstalled ? (
          <Button onClick={nextStep}>
            Continue
            <ArrowRight className="w-5 h-5" />
          </Button>
        ) : (
          <Button 
            onClick={handleInstallAll}
            disabled={!!isInstallingDependency}
            isLoading={!!isInstallingDependency}
          >
            Install All
            <Download className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  )
}
