import { ipcMain } from 'electron'
import { SkillsManager } from '../services/skills-manager'
import { AgencyCatalog } from '../services/agency-catalog'

const skillsManager = new SkillsManager()
const catalog = new AgencyCatalog()

export function registerSkillsHandlers(): void {
  // Install skill from skills.sh URL
  ipcMain.handle('skills:installFromUrl', async (_, url: string) => {
    return skillsManager.installFromUrl(url)
  })

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

  // Install all skills from a repository
  ipcMain.handle('skills:installFromRepo', async (_, url: string) => {
    return skillsManager.installFromRepo(url)
  })
}
