import { ipcMain } from 'electron'
import { SkillsManager } from '../services/skills-manager'
import { AgencyCatalog } from '../services/agency-catalog'
import { GitHubAppService } from '../services/github-app'

const catalog = new AgencyCatalog()
const githubApp = new GitHubAppService(
  process.env.GITHUB_APP_ID || '',
  process.env.GITHUB_APP_PRIVATE_KEY || '',
  process.env.GITHUB_APP_INSTALLATION_ID || ''
)
const skillsManager = new SkillsManager(catalog, githubApp)

export function registerSkillsHandlers(): void {
  // Install skill from agency catalog
  ipcMain.handle('skills:installFromCatalog', async (_, skillId: string) => {
    return skillsManager.installFromCatalog(skillId)
  })

  // List installed skills
  ipcMain.handle('skills:list', async () => {
    return skillsManager.listInstalled()
  })

  // Get skill content
  ipcMain.handle('skills:getContent', async (_, name: string) => {
    return skillsManager.getSkillContent(name)
  })

  // Remove skill
  ipcMain.handle('skills:remove', async (_, name: string) => {
    return skillsManager.remove(name)
  })

  // Fetch agency catalog
  ipcMain.handle('skills:fetchCatalog', async () => {
    return catalog.fetchSkills()
  })

  // Request a skill to be added to the catalog (creates a PR)
  ipcMain.handle('skills:requestSkill', async (_, url: string) => {
    return skillsManager.requestSkill(url)
  })
}
