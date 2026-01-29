import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Sparkles, 
  Plug, 
  FileCode, 
  Settings
} from 'lucide-react'
import oodleLogo from '@/assets/oodle-logo.svg'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/skills', label: 'Skills', icon: Sparkles },
  { path: '/mcp', label: 'Add-ons', icon: Plug },
  { path: '/config', label: 'Configuration', icon: FileCode },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="w-56 bg-zinc-900/50 border-r border-zinc-800 flex flex-col">
      {/* Logo area with drag region */}
      <div className="h-14 flex items-center pl-24 pr-4 border-b border-zinc-800 drag-region">
        <div className="flex items-center no-drag">
          <img src={oodleLogo} alt="Oodle" className="h-6" />
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <div className="text-xs text-zinc-500">
          Powered by OpenCode
        </div>
      </div>
    </aside>
  )
}
