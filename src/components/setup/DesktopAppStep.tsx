import { useEffect, useState } from 'react'
import { useSetupStore } from '@/stores/setup-store'
import { Button, Card, StatusBadge, Alert } from '@/components/common'
import { Download, ArrowRight, ArrowLeft, Monitor, RefreshCw, Menu, Bell, Sparkles } from 'lucide-react'

export function DesktopAppStep() {
  const { 
    desktopAppInstalled,
    isCheckingDesktopApp,
    isInstallingDesktopApp,
    desktopAppError,
    checkDesktopApp,
    installDesktopApp,
    clearDesktopAppError,
    nextStep,
    prevStep
  } = useSetupStore()

  const [showErrorDetails, setShowErrorDetails] = useState(false)

  useEffect(() => {
    checkDesktopApp()
  }, [checkDesktopApp])

  const handleInstall = async () => {
    setShowErrorDetails(false)
    const success = await installDesktopApp()
    if (success) {
      // Auto-advance after a short delay
      setTimeout(() => nextStep(), 1000)
    }
  }

  const handleSkip = () => {
    clearDesktopAppError()
    nextStep()
  }

  const features = [
    { icon: Sparkles, label: 'Native macOS integration' },
    { icon: Menu, label: 'Menu bar quick access' },
    { icon: Bell, label: 'System notifications' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 mb-4">
          <Monitor className="w-8 h-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">
          OpenCode Desktop
        </h2>
        <p className="text-zinc-400">
          For a more seamless experience, install the native OpenCode desktop app.
        </p>
      </div>

      {/* Features */}
      <Card className="mb-6">
        <div className="space-y-4">
          {features.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                <Icon className="w-4 h-4 text-violet-400" />
              </div>
              <span className="text-zinc-200">{label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Status */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-zinc-400" />
            <span className="font-medium text-zinc-100">OpenCode.app</span>
          </div>
          <div className="flex items-center gap-2">
            {isCheckingDesktopApp ? (
              <StatusBadge status="loading" label="Checking..." />
            ) : isInstallingDesktopApp ? (
              <StatusBadge status="loading" label="Installing..." />
            ) : desktopAppInstalled ? (
              <StatusBadge status="success" label="Installed" />
            ) : (
              <StatusBadge status="pending" label="Not installed" />
            )}
          </div>
        </div>
      </Card>

      {/* Error message */}
      {desktopAppError && (
        <Alert variant="error" title="Installation failed" className="mb-6">
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

      {/* Success/info messages */}
      {desktopAppInstalled && !isInstallingDesktopApp && (
        <Alert variant="success" title="Desktop app installed" className="mb-6">
          OpenCode Desktop is ready to use. You can continue with setup.
        </Alert>
      )}

      {!desktopAppInstalled && !isCheckingDesktopApp && !isInstallingDesktopApp && !desktopAppError && (
        <Alert variant="info" title="Optional installation" className="mb-6">
          The desktop app is optional. You can skip this step and install it later from Settings.
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={prevStep} disabled={isInstallingDesktopApp}>
          <ArrowLeft className="w-5 h-5" />
          Back
        </Button>
        
        {desktopAppInstalled ? (
          <Button onClick={nextStep}>
            Continue
            <ArrowRight className="w-5 h-5" />
          </Button>
        ) : isCheckingDesktopApp ? (
          <Button disabled>
            <RefreshCw className="w-5 h-5 animate-spin" />
            Checking...
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              onClick={handleSkip}
              disabled={isInstallingDesktopApp}
            >
              Skip for now
            </Button>
            <Button 
              onClick={handleInstall}
              disabled={isInstallingDesktopApp}
              isLoading={isInstallingDesktopApp}
            >
              <Download className="w-5 h-5" />
              Install Desktop App
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
