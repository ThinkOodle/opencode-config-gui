interface ProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
}

export function Progress({ 
  value, 
  max = 100, 
  size = 'md', 
  showLabel = false,
  label 
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  
  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className="space-y-1.5">
      {(showLabel || label) && (
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">{label || 'Progress'}</span>
          <span className="text-zinc-300">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`${heights[size]} bg-zinc-800 rounded-full overflow-hidden`}>
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
