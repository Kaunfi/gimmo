'use client'

// ChoiceCard — Tuile cliquable pour sélection d'options (radio-like)
import { cn } from '@/lib/utils'

interface ChoiceCardProps {
  label: string
  description?: string
  icon?: string
  selected: boolean
  onClick: () => void
  className?: string
  disabled?: boolean
}

export function ChoiceCard({
  label,
  description,
  icon,
  selected,
  onClick,
  className,
  disabled = false,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200',
        'focus-visible:outline-2 focus-visible:outline-[#1E3A6E]',
        selected
          ? 'border-[#1E3A6E] bg-[#1E3A6E]/5 shadow-sm'
          : 'border-[#E4E2DC] bg-white hover:border-[#1E3A6E]/40 hover:bg-[#F8F7F4]',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      aria-pressed={selected}
    >
      {/* Check indicator */}
      <div
        className={cn(
          'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all',
          selected ? 'border-[#1E3A6E] bg-[#1E3A6E]' : 'border-[#D1D5DB] bg-white'
        )}
      >
        {selected && (
          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg leading-none">{icon}</span>}
          <span
            className={cn(
              'text-[15px] leading-snug font-semibold',
              selected ? 'text-[#1E3A6E]' : 'text-[#1A1F2E]'
            )}
          >
            {label}
          </span>
        </div>
        {description && <p className="mt-1 text-sm leading-snug text-[#6B7280]">{description}</p>}
      </div>
    </button>
  )
}

// ChoiceGrid — Grille de ChoiceCards
interface ChoiceGridProps {
  children: React.ReactNode
  cols?: 1 | 2
}

export function ChoiceGrid({ children, cols = 1 }: ChoiceGridProps) {
  return (
    <div className={cn('grid gap-3', cols === 2 ? 'grid-cols-2' : 'grid-cols-1')}>{children}</div>
  )
}
