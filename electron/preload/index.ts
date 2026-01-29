import { contextBridge, ipcRenderer } from 'electron'
import type { DependencyStatus } from '../main/services/dependency-checker'
import type { InstallResult } from '../main/services/installer'
import type { OpenCodeConfig, McpServerConfig } from '../main/services/config-manager'
import type { ProviderTestResult } from '../main/services/env-manager'
import type { Skill, SkillInstallResult, RepoInstallResult } from '../main/services/skills-manager'
import type { InstalledMcp, McpInstallResult, McpConnectionResult } from '../main/services/mcp-manager'
import type { AgencySkill, AgencyMcpServer } from '../main/services/agency-catalog'

// Define the API interface
export interface OodleAPI {
  // App
  getVersion: () => Promise<string>
  openExternal: (url: string) => Promise<boolean>
  
  // Dependencies
  checkDependencies: () => Promise<DependencyStatus[]>
  checkDependency: (id: string) => Promise<DependencyStatus>
  installDependency: (id: string) => Promise<InstallResult>
  installAllDependencies: () => Promise<InstallResult>
  
  // Desktop app
  checkDesktopApp: () => Promise<{ installed: boolean; version?: string }>
  installDesktopApp: () => Promise<InstallResult>
  
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
  installSkillFromUrl: (url: string) => Promise<SkillInstallResult>
  installSkillFromCatalog: (skillId: string) => Promise<SkillInstallResult>
  listInstalledSkills: () => Promise<Skill[]>
  getSkillContent: (name: string) => Promise<string | null>
  removeSkill: (name: string) => Promise<void>
  fetchSkillsCatalog: () => Promise<AgencySkill[]>
  installSkillsFromRepo: (url: string) => Promise<RepoInstallResult>
  
  // MCP
  installMcp: (serverId: string, config: McpServerConfig) => Promise<McpInstallResult>
  listInstalledMcps: () => Promise<InstalledMcp[]>
  removeMcp: (serverId: string) => Promise<void>
  toggleMcpEnabled: (serverId: string, enabled: boolean) => Promise<void>
  testMcpConnection: (serverId: string) => Promise<McpConnectionResult>
  fetchMcpCatalog: () => Promise<AgencyMcpServer[]>
  
  // Updater events
  onUpdaterStatus: (callback: (status: { status: string; data?: unknown }) => void) => () => void
}

// Expose the API to the renderer
const api: OodleAPI = {
  // App
  getVersion: () => ipcRenderer.invoke('app:version'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  
  // Dependencies
  checkDependencies: () => ipcRenderer.invoke('dependencies:check'),
  checkDependency: (id) => ipcRenderer.invoke('dependencies:checkOne', id),
  installDependency: (id) => ipcRenderer.invoke('dependencies:install', id),
  installAllDependencies: () => ipcRenderer.invoke('dependencies:installAll'),
  
  // Desktop app
  checkDesktopApp: () => ipcRenderer.invoke('dependencies:checkDesktopApp'),
  installDesktopApp: () => ipcRenderer.invoke('dependencies:installDesktopApp'),
  
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
  installSkillFromUrl: (url) => ipcRenderer.invoke('skills:installFromUrl', url),
  installSkillFromCatalog: (skillId) => ipcRenderer.invoke('skills:installFromCatalog', skillId),
  listInstalledSkills: () => ipcRenderer.invoke('skills:list'),
  getSkillContent: (name) => ipcRenderer.invoke('skills:getContent', name),
  removeSkill: (name) => ipcRenderer.invoke('skills:remove', name),
  fetchSkillsCatalog: () => ipcRenderer.invoke('skills:fetchCatalog'),
  installSkillsFromRepo: (url) => ipcRenderer.invoke('skills:installFromRepo', url),
  
  // MCP
  installMcp: (serverId, config) => ipcRenderer.invoke('mcp:install', serverId, config),
  listInstalledMcps: () => ipcRenderer.invoke('mcp:list'),
  removeMcp: (serverId) => ipcRenderer.invoke('mcp:remove', serverId),
  toggleMcpEnabled: (serverId, enabled) => ipcRenderer.invoke('mcp:toggleEnabled', serverId, enabled),
  testMcpConnection: (serverId) => ipcRenderer.invoke('mcp:testConnection', serverId),
  fetchMcpCatalog: () => ipcRenderer.invoke('mcp:fetchCatalog'),
  
  // Updater events
  onUpdaterStatus: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { status: string; data?: unknown }) => {
      callback(data)
    }
    ipcRenderer.on('updater:status', handler)
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('updater:status', handler)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

// Type declaration for the renderer
declare global {
  interface Window {
    api: OodleAPI
  }
}
