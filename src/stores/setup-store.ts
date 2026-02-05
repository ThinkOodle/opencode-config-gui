import { create } from 'zustand'

interface SetupState {
  // Setup completion status
  isSetupComplete: boolean
  
  // Current wizard step
  currentStep: number
  
  // Desktop app
  desktopAppInstalled: boolean
  desktopAppVersion: string | undefined
  isCheckingDesktopApp: boolean
  
  // Provider configuration
  isTestingProvider: boolean
  providerConfigured: boolean
  
  // Actions
  checkSetupStatus: () => Promise<void>
  setSetupComplete: (complete: boolean) => void
  setCurrentStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  
  // Desktop app actions
  checkDesktopApp: () => Promise<void>
  
  // Provider actions
  testAndSaveProvider: (provider: string, apiKey: string) => Promise<boolean>
  setProviderConfigured: (configured: boolean) => void
}

export const useSetupStore = create<SetupState>((set, get) => ({
  isSetupComplete: false,
  currentStep: 0,
  desktopAppInstalled: false,
  desktopAppVersion: undefined,
  isCheckingDesktopApp: false,
  isTestingProvider: false,
  providerConfigured: false,

  checkSetupStatus: async () => {
    try {
      // Check if OpenCode Desktop is installed
      const desktopStatus = await window.api.checkDesktopApp()
      console.log('[SetupStore] Desktop app status:', desktopStatus)
      
      // Setup is complete if desktop app is installed
      // API key is optional
      const isComplete = desktopStatus.installed
      console.log('[SetupStore] Setup complete:', isComplete)
      
      // Also check auth status for UI purposes
      const authStatus = await window.api.checkOpenCodeAuth()
      
      set({ 
        isSetupComplete: isComplete,
        desktopAppInstalled: desktopStatus.installed,
        desktopAppVersion: desktopStatus.version,
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

  checkDesktopApp: async () => {
    set({ isCheckingDesktopApp: true })
    try {
      const result = await window.api.checkDesktopApp()
      set({ 
        desktopAppInstalled: result.installed,
        desktopAppVersion: result.version
      })
    } catch (error) {
      console.error('Failed to check desktop app:', error)
    } finally {
      set({ isCheckingDesktopApp: false })
    }
  },

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
