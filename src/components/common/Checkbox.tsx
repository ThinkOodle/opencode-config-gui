import { forwardRef, InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, onChange, label, disabled, className = '', ...props }, ref) => {
    return (
      <label 
        className={`inline-flex items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
      >
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          <div 
            className={`
              w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
              ${checked 
                ? 'bg-violet-600 border-violet-600' 
                : 'bg-transparent border-zinc-600 hover:border-zinc-500'
              }
              ${disabled ? '' : 'cursor-pointer'}
            `}
          >
            {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
          </div>
        </div>
        {label && (
          <span className="text-sm text-zinc-100">{label}</span>
        )}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'
