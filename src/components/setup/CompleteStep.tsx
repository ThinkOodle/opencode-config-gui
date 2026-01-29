import { useSetupStore } from '@/stores/setup-store'
import { Button } from '@/components/common'
import { CheckCircle, Sparkles, Plug, Terminal } from 'lucide-react'

const nextSteps = [
  {
    icon: Sparkles,
    title: 'Add Skills',
    description: 'Install agent skills to enhance OpenCode capabilities',
  },
  {
    icon: Plug,
    title: 'Connect Add-ons',
    description: 'Set up MCP servers for external integrations',
  },
  {
    icon: Terminal,
    title: 'Start Coding',
    description: 'Open a terminal and run `opencode` to begin',
  },
]

export function CompleteStep() {
  const { setSetupComplete } = useSetupStore()

  const handleFinish = () => {
    setSetupComplete(true)
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Success indicator */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-6">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">
          You're All Set!
        </h2>
        <p className="text-zinc-400">
          OpenCode is installed and configured. You can now start using AI to help with your coding projects.
        </p>
      </div>

      {/* Summary */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
        <h3 className="font-medium text-zinc-100 mb-4">What we set up:</h3>
        <ul className="space-y-3">
          <li className="flex items-center gap-3 text-sm">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-zinc-300">Installed required system dependencies</span>
          </li>
          <li className="flex items-center gap-3 text-sm">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-zinc-300">Installed OpenCode AI coding agent</span>
          </li>
          <li className="flex items-center gap-3 text-sm">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-zinc-300">Connected your AI provider</span>
          </li>
        </ul>
      </div>

      {/* Next steps */}
      <div className="mb-8">
        <h3 className="font-medium text-zinc-100 mb-4">What's next:</h3>
        <div className="grid gap-3">
          {nextSteps.map(({ icon: Icon, title, description }) => (
            <div 
              key={title}
              className="flex items-start gap-4 p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl"
            >
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <div className="font-medium text-zinc-100">{title}</div>
                <div className="text-sm text-zinc-500">{description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Finish button */}
      <div className="flex justify-center">
        <Button size="lg" onClick={handleFinish}>
          Open Dashboard
        </Button>
      </div>
    </div>
  )
}
