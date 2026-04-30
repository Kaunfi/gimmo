'use client'

// SimulateurFlow — Orchestrateur du parcours 5 étapes + email gate
// Gère le state global via Context + persistance sessionStorage
// Phase 3 implémentera les étapes réelles ; en Phase 1 on pose le squelette

import { SimulateurProvider, useSimulateur } from '@/lib/simulateur/SimulateurContext'
import { GimmoLogo } from '@/components/shared/GimmoLogo'
import { SimulateurProgressBar } from '@/components/simulator/ProgressBar'
import Link from 'next/link'

interface SimulateurFlowProps {
  initialStep?: number
}

function SimulateurInner() {
  const { step, goPrev } = useSimulateur()

  const showHeader = step >= 1 && step <= 5
  const showProgress = step >= 1 && step <= 5

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F4]">
      {/* ── Header sticky ──────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b border-[#E4E2DC] bg-[rgba(248,247,244,0.94)] backdrop-blur-[12px]"
        style={{ borderBottomColor: showProgress ? 'transparent' : undefined }}
      >
        <div className="mx-auto flex max-w-[640px] items-center justify-between px-6 py-[14px]">
          <GimmoLogo size="md" />

          {showHeader && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#6B7280]">Étape</span>
              {/* Indicateur de progression dots */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-[7px] rounded-full transition-all duration-300"
                    style={{
                      width: i === step ? '20px' : '7px',
                      background: i < step ? '#0B7A56' : i === step ? '#1E3A6E' : '#E4E2DC',
                    }}
                    aria-hidden
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-[#1A1F2E]">{step} / 5</span>
            </div>
          )}

          {/* Bouton retour discret si pas étape 1 */}
          {step > 1 && step <= 5 && (
            <button
              onClick={goPrev}
              className="rounded-xl px-3 py-2 text-sm text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#1A1F2E] focus-visible:outline-2 focus-visible:outline-[#1E3A6E]"
              aria-label="Revenir à l'étape précédente"
            >
              ← Retour
            </button>
          )}
        </div>

        {/* Progress bar sous le header */}
        {showProgress && <SimulateurProgressBar currentStep={step} totalSteps={5} />}
      </header>

      {/* ── Contenu principal ──────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-[640px] flex-1 px-6 py-8">
        {/* Placeholder Phase 1 — remplacé en Phase 3 */}
        <div className="rounded-2xl border border-[#E4E2DC] bg-white p-8 text-center">
          <div className="mb-4 text-4xl">🏗️</div>
          <h2 className="mb-2 text-xl font-bold text-[#1A1F2E]">Étape {step} — En construction</h2>
          <p className="mb-6 text-[#6B7280]">
            Les étapes du simulateur seront implémentées en Phase 3.
          </p>
          <p className="text-sm text-[#6B7280]">Phase 1 ✅ | Phase 2 (module fiscal) en cours...</p>
          <div className="mt-6">
            <Link
              href="/"
              className="text-sm font-semibold text-[#1E3A6E] underline underline-offset-2"
            >
              ← Retour à l'accueil
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export function SimulateurFlow({ initialStep = 1 }: SimulateurFlowProps) {
  return (
    <SimulateurProvider initialStep={initialStep}>
      <SimulateurInner />
    </SimulateurProvider>
  )
}
