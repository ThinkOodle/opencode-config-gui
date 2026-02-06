import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopAppStatus } from '../main/services/dependency-checker'
import type { OpenCodeConfig, McpServerConfig } from '../main/services/config-manager'
import type { ProviderTestResult } from '../main/services/env-manager'
import type { Skill, SkillInstallResult } from '../main/services/skills-manager'
import type { SkillRequestResult } from '../main/services/github-app'
import type { InstalledMcp, McpInstallResult, McpConnectionResult } from '../main/services/mcp-manager'
import type { AgencySkill, AgencyMcpServer, AgencyAgent } from '../main/services/agency-catalog'
import type { Agent, AgentInstallResult, AgentValidationError } from '../main/services/agents-manager'

// Define the API interface
export interface OodleAPI {
  // App
  getVersion: () => Promise<string>
  openExternal: (url: string) => Promise<boolean>
  
  // Desktop app
  checkDesktopApp: () => Promise<DesktopAppStatus>
  
  // Config
  readGlobalConfig: () => Promise<OpenCodeConfig>
  writeGlobalConfig: (config: OpenCodeConfig) => Promise<void>
  readProjectConfig: (projectPath: string) => Promise<OpenCodeConfig | null>
  writeProjectConfig: (projectPath: string, config: OpenCodeConfig) => Promise<void>
  
  // Environment / API Keys
  setEnvVar: (key: string, value: string) => Promise<void>
  getEnvVar: (key: string) => Promise<string | null>
  testProvider: (provider: string, apiKey: string) => Promise<ProviderTestResult>
  checkOpenCodeAuth: () => Promise<{ configured: boolean }>
  saveOpenCodeAuth: (apiKey: string) => Promise<void>
  
  // Skills
  installSkillFromCatalog: (skillId: string) => Promise<SkillInstallResult>
  listInstalledSkills: () => Promise<Skill[]>
  getSkillContent: (name: string) => Promise<string | null>
  removeSkill: (name: string) => Promise<void>
  fetchSkillsCatalog: () => Promise<AgencySkill[]>
  requestSkill: (url: string) => Promise<SkillRequestResult>
  
  // MCP
  installMcp: (serverId: string, config: McpServerConfig) => Promise<McpInstallResult>
  listInstalledMcps: () => Promise<InstalledMcp[]>
  removeMcp: (serverId: string) => Promise<void>
  toggleMcpEnabled: (serverId: string, enabled: boolean) => Promise<void>
  testMcpConnection: (serverId: string) => Promise<McpConnectionResult>
  fetchMcpCatalog: () => Promise<AgencyMcpServer[]>
  
  // Agents
  installAgentFromCatalog: (agentId: string) => Promise<AgentInstallResult>
  saveAgent: (name: string, content: string) => Promise<AgentInstallResult>
  listInstalledAgents: () => Promise<Agent[]>
  getAgentContent: (name: string) => Promise<string | null>
  removeAgent: (name: string) => Promise<void>
  fetchAgentsCatalog: () => Promise<AgencyAgent[]>
  validateAgent: (content: string) => Promise<AgentValidationError[]>
  
  // Updater
  onUpdaterStatus: (callback: (status: { status: string; data?: unknown }) => void) => () => void
  checkForUpdates: () => Promise<unknown>
  installUpdate: () => Promise<void>
  
  // Navigation from main process (menu)
  onNavigate: (callback: (path: string) => void) => () => void
  onCheckForUpdates: (callback: () => void) => () => void
}

// Expose the API to the renderer
const api: OodleAPI = {
  // App
  getVersion: () => ipcRenderer.invoke('app:version'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  
  // Desktop app
  checkDesktopApp: () => ipcRenderer.invoke('dependencies:checkDesktopApp'),
  
  // Config
  readGlobalConfig: () => ipcRenderer.invoke('config:readGlobal'),
  writeGlobalConfig: (config) => ipcRenderer.invoke('config:writeGlobal', config),
  readProjectConfig: (projectPath) => ipcRenderer.invoke('config:readProject', projectPath),
  writeProjectConfig: (projectPath, config) => ipcRenderer.invoke('config:writeProject', projectPath, config),
  
  // Environment / API Keys
  setEnvVar: (key, value) => ipcRenderer.invoke('env:set', key, value),
  getEnvVar: (key) => ipcRenderer.invoke('env:get', key),
  testProvider: (provider, apiKey) => ipcRenderer.invoke('env:testProvider', provider, apiKey),
  checkOpenCodeAuth: () => ipcRenderer.invoke('env:checkOpenCodeAuth'),
  saveOpenCodeAuth: (apiKey) => ipcRenderer.invoke('env:saveOpenCodeAuth', apiKey),
  
  // Skills
  installSkillFromCatalog: (skillId) => ipcRenderer.invoke('skills:installFromCatalog', skillId),
  listInstalledSkills: () => ipcRenderer.invoke('skills:list'),
  getSkillContent: (name) => ipcRenderer.invoke('skills:getContent', name),
  removeSkill: (name) => ipcRenderer.invoke('skills:remove', name),
  fetchSkillsCatalog: () => ipcRenderer.invoke('skills:fetchCatalog'),
  requestSkill: (url) => ipcRenderer.invoke('skills:requestSkill', url),
  
  // MCP
  installMcp: (serverId, config) => ipcRenderer.invoke('mcp:install', serverId, config),
  listInstalledMcps: () => ipcRenderer.invoke('mcp:list'),
  removeMcp: (serverId) => ipcRenderer.invoke('mcp:remove', serverId),
  toggleMcpEnabled: (serverId, enabled) => ipcRenderer.invoke('mcp:toggleEnabled', serverId, enabled),
  testMcpConnection: (serverId) => ipcRenderer.invoke('mcp:testConnection', serverId),
  fetchMcpCatalog: () => ipcRenderer.invoke('mcp:fetchCatalog'),
  
  // Agents
  installAgentFromCatalog: (agentId) => ipcRenderer.invoke('agents:installFromCatalog', agentId),
  saveAgent: (name, content) => ipcRenderer.invoke('agents:save', name, content),
  listInstalledAgents: () => ipcRenderer.invoke('agents:list'),
  getAgentContent: (name) => ipcRenderer.invoke('agents:getContent', name),
  removeAgent: (name) => ipcRenderer.invoke('agents:remove', name),
  fetchAgentsCatalog: () => ipcRenderer.invoke('agents:fetchCatalog'),
  validateAgent: (content) => ipcRenderer.invoke('agents:validate', content),
  
  // Updater
  onUpdaterStatus: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { status: string; data?: unknown }) => {
      callback(data)
    }
    ipcRenderer.on('updater:status', handler)
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('updater:status', handler)
    }
  },
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  
  // Navigation from main process (menu)
  onNavigate: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, path: string) => {
      callback(path)
    }
    ipcRenderer.on('app:navigate', handler)
    return () => {
      ipcRenderer.removeListener('app:navigate', handler)
    }
  },
  onCheckForUpdates: (callback) => {
    const handler = () => {
      callback()
    }
    ipcRenderer.on('app:checkForUpdates', handler)
    return () => {
      ipcRenderer.removeListener('app:checkForUpdates', handler)
    }
  },
}

contextBridge.exposeInMainWorld('api', api)

// Type declaration for the renderer
declare global {
  interface Window {
    api: OodleAPI
  }
}
