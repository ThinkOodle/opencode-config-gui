import { useSetupStore } from '@/stores/setup-store'
import { WelcomeStep } from './WelcomeStep'
import { DesktopAppStep } from './DesktopAppStep'
import { ProviderStep } from './ProviderStep'
import oodleLogo from '@/assets/oodle-logo.svg'

const steps = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'desktop', label: 'Desktop App' },
  { id: 'provider', label: 'API Key' },
]

export function SetupWizard() {
  const { currentStep } = useSetupStore()

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header with drag region */}
      <header className="h-14 flex items-center px-6 border-b border-zinc-800 drag-region">
        <div className="w-16" /> {/* Spacer for traffic lights */}
        <div className="flex items-center gap-2 no-drag">
          <img src={oodleLogo} alt="Oodle" className="h-6" />
          <span className="font-semibold text-zinc-100">Setup</span>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${index < currentStep 
                    ? 'bg-violet-600 text-white' 
                    : index === currentStep 
                      ? 'bg-violet-600 text-white ring-2 ring-violet-400 ring-offset-2 ring-offset-zinc-950'
                      : 'bg-zinc-800 text-zinc-500'
                  }
                `}
              >
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div 
                  className={`w-16 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-violet-600' : 'bg-zinc-800'
                  }`} 
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-2">
          <span className="text-sm text-zinc-400">{steps[currentStep]?.label}</span>
        </div>
      </div>

      {/* Step content */}
      <main className="flex-1 overflow-auto">
        {currentStep === 0 && <WelcomeStep />}
        {currentStep === 1 && <DesktopAppStep />}
        {currentStep === 2 && <ProviderStep />}
      </main>
    </div>
  )
}
