'use client'

// NumericField — Input numérique avec préfixe/suffixe (€, %, ans)
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface NumericFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  prefix?: string | undefined
  suffix?: string | undefined
  hint?: string | undefined
  error?: string | undefined // string | undefined requis pour exactOptionalPropertyTypes
}

export const NumericField = forwardRef<HTMLInputElement, NumericFieldProps>(
  ({ label, prefix, suffix, hint, error, className, id, ...props }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-[#374151]">
          {label}
        </label>

        <div
          className={cn(
            'flex items-center rounded-xl border bg-white transition-colors',
            error
              ? 'border-red-400 focus-within:ring-2 focus-within:ring-red-400/20'
              : 'border-[#E4E2DC] focus-within:border-[#1E3A6E] focus-within:ring-2 focus-within:ring-[#1E3A6E]/10'
          )}
        >
          {prefix && (
            <span className="pr-1 pl-3.5 text-sm font-medium text-[#9CA3AF] select-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={fieldId}
            type="number"
            inputMode="decimal"
            className={cn(
              'w-full bg-transparent py-3 text-sm font-medium text-[#1A1F2E] outline-none',
              prefix ? 'pl-1' : 'pl-3.5',
              suffix ? 'pr-1' : 'pr-3.5',
              '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="pr-3.5 pl-1 text-sm font-medium text-[#9CA3AF] select-none">
              {suffix}
            </span>
          )}
        </div>

        {hint && !error && <p className="mt-1.5 text-xs text-[#9CA3AF]">{hint}</p>}
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
NumericField.displayName = 'NumericField'
