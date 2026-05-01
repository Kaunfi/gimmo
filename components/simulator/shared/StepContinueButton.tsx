'use client'

// StepContinueButton — Bouton principal de passage à l'étape suivante
import { cn } from '@/lib/utils'

interface StepContinueButtonProps {
  label?: string
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
}

export function StepContinueButton({
  label = 'Continuer',
  loading = false,
  disabled = false,
  onClick,
  type = 'submit',
  className,
}: StepContinueButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-xl',
        'bg-[#1E3A6E] text-base font-semibold text-white',
        'transition-all duration-200 hover:bg-[#162d58] active:scale-[0.99]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A6E]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {loading ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        <>
          {label}
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </>
      )}
    </button>
  )
}
