import { ReactNode } from 'react'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: ReactNode
  onDismiss?: () => void
  className?: string
}

export function Alert({ variant = 'info', title, children, onDismiss, className = '' }: AlertProps) {
  const variants = {
    info: {
      bg: 'bg-blue-500/10 border-blue-500/20',
      icon: Info,
      iconColor: 'text-blue-400',
      titleColor: 'text-blue-300',
    },
    success: {
      bg: 'bg-green-500/10 border-green-500/20',
      icon: CheckCircle,
      iconColor: 'text-green-400',
      titleColor: 'text-green-300',
    },
    warning: {
      bg: 'bg-yellow-500/10 border-yellow-500/20',
      icon: AlertTriangle,
      iconColor: 'text-yellow-400',
      titleColor: 'text-yellow-300',
    },
    error: {
      bg: 'bg-red-500/10 border-red-500/20',
      icon: AlertCircle,
      iconColor: 'text-red-400',
      titleColor: 'text-red-300',
    },
  }

  const { bg, icon: Icon, iconColor, titleColor } = variants[variant]

  return (
    <div className={`${bg} border rounded-lg p-4 ${className}`}>
      <div className="flex gap-3">
        <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`font-medium ${titleColor} mb-1`}>{title}</h4>
          )}
          <div className="text-sm text-zinc-300">{children}</div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-zinc-400 hover:text-zinc-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
