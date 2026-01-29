import { Check, X, Loader2, AlertCircle } from 'lucide-react'

type Status = 'success' | 'error' | 'loading' | 'warning' | 'pending'

interface StatusBadgeProps {
  status: Status
  label?: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const configs = {
    success: {
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      icon: Check,
      defaultLabel: 'Installed',
    },
    error: {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      icon: X,
      defaultLabel: 'Error',
    },
    loading: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      icon: Loader2,
      defaultLabel: 'Loading',
    },
    warning: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      icon: AlertCircle,
      defaultLabel: 'Warning',
    },
    pending: {
      bg: 'bg-zinc-500/10',
      text: 'text-zinc-400',
      icon: null,
      defaultLabel: 'Pending',
    },
  }

  const { bg, text, icon: Icon, defaultLabel } = configs[status]
  const displayLabel = label || defaultLabel

  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  }

  return (
    <span className={`inline-flex items-center ${sizes[size]} ${bg} ${text} rounded-full font-medium`}>
      {Icon && (
        <Icon className={`${iconSizes[size]} ${status === 'loading' ? 'animate-spin' : ''}`} />
      )}
      {displayLabel}
    </span>
  )
}
