import { useSetupStore } from '@/stores/setup-store'
import { Button } from '@/components/common'
import { Sparkles, Plug, FileCode, ArrowRight } from 'lucide-react'

const features = [
  {
    icon: Sparkles,
    title: 'Install Skills',
    description: 'Add AI agent skills from skills.sh or your agency catalog'
  },
  {
    icon: Plug,
    title: 'Configure Add-ons',
    description: 'Connect to external tools and services via MCP'
  },
  {
    icon: FileCode,
    title: 'Manage Settings',
    description: 'Customize OpenCode preferences without editing config files'
  },
]

export function WelcomeStep() {
  const { nextStep } = useSetupStore()

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-zinc-100 mb-4">
          Welcome to Oodle AI
        </h1>
        <p className="text-lg text-zinc-400">
          The easiest way to configure OpenCode on your Mac.
          Let's make sure you're all set up.
        </p>
      </div>

      <div className="grid gap-4 mb-12">
        {features.map(({ icon: Icon, title, description }) => (
          <div 
            key={title}
            className="flex items-start gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl"
          >
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="font-medium text-zinc-100">{title}</h3>
              <p className="text-sm text-zinc-400">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <Button size="lg" onClick={nextStep}>
          Get Started
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
