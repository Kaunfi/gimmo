// StepHeader — Titre + sous-titre d'une étape du simulateur
interface StepHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

export function StepHeader({ title, subtitle, className = '' }: StepHeaderProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <h2 className="text-2xl leading-tight font-bold text-[#1A1F2E]">{title}</h2>
      {subtitle && <p className="mt-2 text-base text-[#6B7280]">{subtitle}</p>}
    </div>
  )
}
