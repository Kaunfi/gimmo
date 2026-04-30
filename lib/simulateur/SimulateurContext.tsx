'use client'

// Context React + persistance sessionStorage pour le simulateur GIMMO
// Toutes les étapes lisent/écrivent via ce context

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { SIMULATEUR_INITIAL_STATE, SESSION_STORAGE_KEY, type SimulateurState } from './types'

// ── Types du context ──────────────────────────────────────────────────────────

interface SimulateurContextValue {
  state: SimulateurState
  step: number
  update: (updates: Partial<SimulateurState>) => void
  goNext: () => void
  goPrev: () => void
  goToStep: (step: number) => void
  reset: () => void
  isHydrated: boolean
}

// ── Context ───────────────────────────────────────────────────────────────────

const SimulateurContext = createContext<SimulateurContextValue | null>(null)

// ── Hook d'accès ──────────────────────────────────────────────────────────────

export function useSimulateur(): SimulateurContextValue {
  const ctx = useContext(SimulateurContext)
  if (!ctx) {
    throw new Error("useSimulateur doit être utilisé à l'intérieur de <SimulateurProvider>")
  }
  return ctx
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface SimulateurProviderProps {
  children: React.ReactNode
  initialStep?: number
}

export function SimulateurProvider({ children, initialStep = 1 }: SimulateurProviderProps) {
  const [state, setState] = useState<SimulateurState>({
    ...SIMULATEUR_INITIAL_STATE,
    currentStep: initialStep,
  })
  const [isHydrated, setIsHydrated] = useState(false)

  // ── Hydration depuis sessionStorage (côté client uniquement) ─────────────
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SimulateurState>
        setState((prev) => ({ ...prev, ...parsed }))
      }
    } catch {
      // sessionStorage peut être bloqué (mode privé strict) — on ignore
    }
    setIsHydrated(true)
  }, [])

  // ── Persistance dans sessionStorage à chaque update ──────────────────────
  useEffect(() => {
    if (!isHydrated) return
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignore les erreurs de quota
    }
  }, [state, isHydrated])

  // ── Actions ──────────────────────────────────────────────────────────────

  const update = useCallback((updates: Partial<SimulateurState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  const goNext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 7), // max step 7 (résultats)
    }))
  }, [])

  const goPrev = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }))
  }, [])

  const goToStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, currentStep: step }))
  }, [])

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      // Ignore
    }
    setState({ ...SIMULATEUR_INITIAL_STATE, currentStep: 1 })
  }, [])

  return (
    <SimulateurContext.Provider
      value={{
        state,
        step: state.currentStep,
        update,
        goNext,
        goPrev,
        goToStep,
        reset,
        isHydrated,
      }}
    >
      {children}
    </SimulateurContext.Provider>
  )
}
