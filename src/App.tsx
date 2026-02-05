import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Shell } from './components/layout/Shell'
import { Dashboard } from './pages/Dashboard'
import { Skills } from './pages/Skills'
import { Agents } from './pages/Agents'
import { Mcp } from './pages/Mcp'
import { Config } from './pages/Config'
import { Settings } from './pages/Settings'
import { SetupWizard } from './components/setup/SetupWizard'
import { ErrorBoundary } from './components/common'
import { useSetupStore } from './stores/setup-store'
import { Loader2 } from 'lucide-react'

// Listens for navigation events from main process (menu bar)
function NavigationListener() {
  const navigate = useNavigate()
  
  useEffect(() => {
    const unsubscribeNavigate = window.api.onNavigate((path) => {
      navigate(path)
    })
    
    const unsubscribeUpdate = window.api.onCheckForUpdates(() => {
      // Trigger update check - the Settings page will handle displaying status
      window.api.checkForUpdates()
    })
    
    return () => {
      unsubscribeNavigate()
      unsubscribeUpdate()
    }
  }, [navigate])
  
  return null
}

export default function App() {
  const { isSetupComplete, checkSetupStatus } = useSetupStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkSetupStatus().finally(() => setIsLoading(false))
  }, [checkSetupStatus])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  // Show setup wizard if setup is not complete
  if (!isSetupComplete) {
    return (
      <ErrorBoundary>
        <SetupWizard />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <Shell>
        <NavigationListener />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/mcp" element={<Mcp />} />
          <Route path="/config" element={<Config />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </ErrorBoundary>
  )
}
