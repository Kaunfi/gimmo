'use client'

// SimulateurFlow — Orchestrateur du parcours 5 étapes → email gate → résultats
// State global via SimulateurContext + persistance sessionStorage

import { useEffect } from 'react'
import { SimulateurProvider, useSimulateur } from '@/lib/simulateur/SimulateurContext'
import { trackEvent } from '@/components/analytics/PostHogProvider'
import { GimmoLogo } from '@/components/shared/GimmoLogo'
import { SimulateurProgressBar } from '@/components/simulator/ProgressBar'
import { Step1Projet } from '@/components/simulator/Step1Projet'
import { Step2Situation } from '@/components/simulator/Step2Situation'
import { Step3Bien } from '@/components/simulator/Step3Bien'
import { Step4Financement } from '@/components/simulator/Step4Financement'
import { Step5Exploitation } from '@/components/simulator/Step5Exploitation'
import { EmailGate } from '@/components/simulator/EmailGate'
import { ResultatsPage } from '@/components/simulator/ResultatsPage'
import Link from 'next/link'

// ── Titres par étape ──────────────────────────────────────────────────────────

const STEP_LABELS: Record<number, string> = {
  1: 'Projet',
  2: 'Situation',
  3: 'Le bien',
  4: 'Financement',
  5: 'Exploitation',
}

// ── Inner component (accède au context) ──────────────────────────────────────

function SimulateurInner() {
  const { step, goPrev, isHydrated } = useSimulateur()

  // Tracking — step change
  useEffect(() => {
    if (!isHydrated) return
    if (step >= 1 && step <= 5) {
      trackEvent('simulator_step_viewed', { step, step_label: STEP_LABELS[step] ?? '' })
    } else if (step === 6) {
      trackEvent('email_gate_viewed')
    } else if (step === 7) {
      trackEvent('results_viewed')
    }
  }, [step, isHydrated])

  // Étapes 1–5 : header + progress bar
  const showHeader = step >= 1 && step <= 5
  // Étape 6 (email gate) : layout full-page géré dans EmailGate lui-même
  const isEmailGate = step === 6
  // Étape 7 : résultats dans le layout standard
  const isResults = step === 7

  // Attendre l'hydration pour éviter les flash de contenu
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7F4]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E3A6E]/20 border-t-[#1E3A6E]" />
      </div>
    )
  }

  // Email gate — layout propre sans header de progression
  if (isEmailGate) {
    return <EmailGate />
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F4]">
      {/* ── Header sticky ──────────────────────────────────────────────── */}
      {showHeader && (
        <header className="sticky top-0 z-50 border-b border-[#E4E2DC]/0 bg-[rgba(248,247,244,0.94)] backdrop-blur-[12px]">
          <div className="mx-auto flex max-w-[640px] items-center justify-between px-6 py-[14px]">
            <GimmoLogo size="md" />

            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-[#6B7280] sm:block">Étape</span>
              {/* Dots de progression */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-300"
                    style={{
                      height: '7px',
                      width: i === step ? '20px' : '7px',
                      background: i < step ? '#0B7A56' : i === step ? '#1E3A6E' : '#E4E2DC',
                    }}
                    aria-hidden
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-[#1A1F2E]">{step} / 5</span>
            </div>

            {step > 1 ? (
              <button
                onClick={goPrev}
                className="rounded-xl px-3 py-2 text-sm text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#1A1F2E] focus-visible:outline-2 focus-visible:outline-[#1E3A6E]"
                aria-label="Revenir à l'étape précédente"
              >
                ← Retour
              </button>
            ) : (
              <Link
                href="/"
                className="rounded-xl px-3 py-2 text-sm text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#1A1F2E]"
              >
                ✕
              </Link>
            )}
          </div>

          {/* Barre de progression */}
          <SimulateurProgressBar currentStep={step} totalSteps={5} />
        </header>
      )}

      {/* ── Header résultats ─────────────────────────────────────────────── */}
      {isResults && (
        <header className="sticky top-0 z-50 border-b border-[#E4E2DC] bg-[rgba(248,247,244,0.94)] backdrop-blur-[12px]">
          <div className="mx-auto flex max-w-[640px] items-center justify-between px-6 py-[14px]">
            <GimmoLogo size="md" />
            <span className="text-sm font-semibold text-[#0B7A56]">✅ Analyse complète</span>
          </div>
        </header>
      )}

      {/* ── Contenu principal ──────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-[640px] flex-1 px-6 py-8">
        {step === 1 && <Step1Projet />}
        {step === 2 && <Step2Situation />}
        {step === 3 && <Step3Bien />}
        {step === 4 && <Step4Financement />}
        {step === 5 && <Step5Exploitation />}
        {step === 7 && <ResultatsPage />}
      </main>
    </div>
  )
}

// ── Export avec Provider ──────────────────────────────────────────────────────

interface SimulateurFlowProps {
  initialStep?: number
}

export function SimulateurFlow({ initialStep = 1 }: SimulateurFlowProps) {
  return (
    <SimulateurProvider initialStep={initialStep}>
      <SimulateurInner />
    </SimulateurProvider>
  )
}
