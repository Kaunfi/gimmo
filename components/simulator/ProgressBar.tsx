'use client'

// ProgressBar — barre de progression du simulateur (fidèle à la maquette)
// Affichée sous le header sticky pendant les étapes 1→5

interface SimulateurProgressBarProps {
  currentStep: number
  totalSteps: number
}

export function SimulateurProgressBar({ currentStep, totalSteps }: SimulateurProgressBarProps) {
  const pct = Math.round((currentStep / totalSteps) * 100)

  return (
    <div
      className="h-[3px] w-full bg-[#E4E2DC]"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progression : étape ${currentStep} sur ${totalSteps}`}
    >
      <div
        className="h-full rounded-full bg-[#1E3A6E] transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
