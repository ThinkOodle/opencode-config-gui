import { useEffect } from 'react'
import { useSetupStore } from '@/stores/setup-store'
import { Button, Card, StatusBadge } from '@/components/common'
import { ArrowRight, ArrowLeft, Monitor, RefreshCw, Menu, Bell, Sparkles, ExternalLink } from 'lucide-react'

const DOWNLOAD_URL = 'https://opencode.ai/download'

export function DesktopAppStep() {
  const { 
    desktopAppInstalled,
    desktopAppVersion,
    isCheckingDesktopApp,
    checkDesktopApp,
    nextStep,
    prevStep
  } = useSetupStore()

  useEffect(() => {
    checkDesktopApp()
  }, [checkDesktopApp])

  const handleDownload = () => {
    window.api.openExternal(DOWNLOAD_URL)
  }

  const handleCheckAgain = () => {
    checkDesktopApp()
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
          OpenCode Desktop is required to use Oodle AI.
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
            <div>
              <span className="font-medium text-zinc-100">OpenCode.app</span>
              {desktopAppInstalled && desktopAppVersion && (
                <span className="ml-2 text-xs text-zinc-500">v{desktopAppVersion}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCheckingDesktopApp ? (
              <StatusBadge status="loading" label="Checking..." />
            ) : desktopAppInstalled ? (
              <StatusBadge status="success" label="Installed" />
            ) : (
              <StatusBadge status="error" label="Not installed" />
            )}
          </div>
        </div>
      </Card>

      {/* Download instructions */}
      {!desktopAppInstalled && !isCheckingDesktopApp && (
        <Card className="mb-6 border-violet-500/30 bg-violet-500/5">
          <div className="text-center space-y-4">
            <p className="text-zinc-300">
              Please download and install OpenCode Desktop to continue.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={handleDownload}>
                <ExternalLink className="w-5 h-5" />
                Download OpenCode
              </Button>
              <Button variant="secondary" onClick={handleCheckAgain}>
                <RefreshCw className="w-5 h-5" />
                Check Again
              </Button>
            </div>
            <p className="text-xs text-zinc-500">
              After installing, click "Check Again" to continue setup.
            </p>
          </div>
        </Card>
      )}

      {/* Success message */}
      {desktopAppInstalled && !isCheckingDesktopApp && (
        <Card className="mb-6 border-emerald-500/30 bg-emerald-500/5">
          <div className="text-center">
            <p className="text-emerald-400">
              OpenCode Desktop is installed and ready to use!
            </p>
          </div>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={prevStep}>
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
          <Button disabled variant="secondary">
            Install to Continue
          </Button>
        )}
      </div>
    </div>
  )
}
