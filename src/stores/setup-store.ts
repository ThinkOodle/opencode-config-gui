import { create } from 'zustand'

interface DependencyStatus {
  id: string
  name: string
  description: string
  installed: boolean
  version?: string
  required: boolean
  order: number
}

interface InstallError {
  id: string
  message: string
}

interface DesktopAppError {
  message: string
  details?: string
}

interface SetupState {
  // Setup completion status
  isSetupComplete: boolean
  
  // Current wizard step
  currentStep: number
  
  // Dependencies
  dependencies: DependencyStatus[]
  isCheckingDependencies: boolean
  isInstallingDependency: string | null
  installError: InstallError | null
  
  // Desktop app
  desktopAppInstalled: boolean
  isCheckingDesktopApp: boolean
  isInstallingDesktopApp: boolean
  desktopAppError: DesktopAppError | null
  
  // Provider configuration
  selectedProvider: string | null
  isTestingProvider: boolean
  providerConfigured: boolean
  
  // Actions
  checkSetupStatus: () => Promise<void>
  setSetupComplete: (complete: boolean) => void
  setCurrentStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  
  // Dependency actions
  checkDependencies: () => Promise<void>
  installDependency: (id: string) => Promise<boolean>
  installAllDependencies: () => Promise<boolean>
  clearInstallError: () => void
  
  // Desktop app actions
  checkDesktopApp: () => Promise<void>
  installDesktopApp: () => Promise<boolean>
  clearDesktopAppError: () => void
  
  // Provider actions
  setSelectedProvider: (provider: string) => void
  testAndSaveProvider: (provider: string, apiKey: string) => Promise<boolean>
  setProviderConfigured: (configured: boolean) => void
}

export const useSetupStore = create<SetupState>((set, get) => ({
  isSetupComplete: false,
  currentStep: 0,
  dependencies: [],
  isCheckingDependencies: false,
  isInstallingDependency: null,
  installError: null,
  desktopAppInstalled: false,
  isCheckingDesktopApp: false,
  isInstallingDesktopApp: false,
  desktopAppError: null,
  selectedProvider: null,
  isTestingProvider: false,
  providerConfigured: false,

  checkSetupStatus: async () => {
    try {
      // Check if all dependencies are installed
      const deps = await window.api.checkDependencies()
      const allInstalled = deps.every(d => d.installed)
      console.log('[SetupStore] Dependencies check:', { allInstalled, count: deps.length })
      
      // Check if OpenCode Zen is configured via auth.json
      const authStatus = await window.api.checkOpenCodeAuth()
      console.log('[SetupStore] Auth status:', authStatus)
      
      const isComplete = allInstalled && authStatus.configured
      console.log('[SetupStore] Setup complete:', isComplete)
      
      set({ 
        isSetupComplete: isComplete,
        dependencies: deps,
        providerConfigured: authStatus.configured
      })
    } catch (error) {
      console.error('[SetupStore] Failed to check setup status:', error)
      set({ isSetupComplete: false })
    }
  },

  setSetupComplete: (complete) => set({ isSetupComplete: complete }),
  
  setCurrentStep: (step) => set({ currentStep: step }),
  
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  
  prevStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),

  checkDependencies: async () => {
    set({ isCheckingDependencies: true })
    try {
      const deps = await window.api.checkDependencies()
      set({ dependencies: deps })
    } catch (error) {
      console.error('Failed to check dependencies:', error)
    } finally {
      set({ isCheckingDependencies: false })
    }
  },

  installDependency: async (id) => {
    set({ isInstallingDependency: id, installError: null })
    try {
      const result = await window.api.installDependency(id)
      if (result.success) {
        // Refresh dependency status
        await get().checkDependencies()
        return true
      }
      // Capture the error message for display
      set({ installError: { id, message: result.message } })
      return false
    } catch (error) {
      console.error('Failed to install dependency:', error)
      set({ installError: { id, message: 'An unexpected error occurred' } })
      return false
    } finally {
      set({ isInstallingDependency: null })
    }
  },

  installAllDependencies: async () => {
    const { dependencies } = get()
    const toInstall = dependencies.filter(d => !d.installed).sort((a, b) => a.order - b.order)
    
    for (const dep of toInstall) {
      const success = await get().installDependency(dep.id)
      if (!success) {
        return false
      }
    }
    
    return true
  },

  clearInstallError: () => set({ installError: null }),

  checkDesktopApp: async () => {
    set({ isCheckingDesktopApp: true, desktopAppError: null })
    try {
      const result = await window.api.checkDesktopApp()
      set({ desktopAppInstalled: result.installed })
    } catch (error) {
      console.error('Failed to check desktop app:', error)
    } finally {
      set({ isCheckingDesktopApp: false })
    }
  },

  installDesktopApp: async () => {
    set({ isInstallingDesktopApp: true, desktopAppError: null })
    try {
      const result = await window.api.installDesktopApp()
      if (result.success) {
        set({ desktopAppInstalled: true })
        return true
      }
      set({ 
        desktopAppError: { 
          message: result.message, 
          details: result.error 
        } 
      })
      return false
    } catch (error) {
      console.error('Failed to install desktop app:', error)
      set({ 
        desktopAppError: { 
          message: 'An unexpected error occurred',
          details: error instanceof Error ? error.message : String(error)
        } 
      })
      return false
    } finally {
      set({ isInstallingDesktopApp: false })
    }
  },

  clearDesktopAppError: () => set({ desktopAppError: null }),

  setSelectedProvider: (provider) => set({ selectedProvider: provider }),

  testAndSaveProvider: async (provider, apiKey) => {
    set({ isTestingProvider: true })
    try {
      // Test the connection (validates format)
      const result = await window.api.testProvider(provider, apiKey)
      
      if (result.success) {
        // Save the API key to auth.json
        await window.api.saveOpenCodeAuth(apiKey)
        
        set({ providerConfigured: true })
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to test provider:', error)
      return false
    } finally {
      set({ isTestingProvider: false })
    }
  },

  setProviderConfigured: (configured) => set({ providerConfigured: configured }),
}))
