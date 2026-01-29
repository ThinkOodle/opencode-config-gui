import { useLocation } from 'react-router-dom'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/skills': 'Skills',
  '/mcp': 'Add-ons',
  '/config': 'Configuration',
  '/settings': 'Settings',
}

export function Header() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Oodle AI'

  return (
    <header className="h-14 flex items-center px-6 border-b border-zinc-800 drag-region">
      {/* Spacer for traffic lights on macOS */}
      <div className="w-16" />
      
      <h1 className="text-lg font-semibold text-zinc-100 no-drag">
        {title}
      </h1>
      
      <div className="flex-1" />
    </header>
  )
}
