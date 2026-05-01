'use client'

// Étape 4 — Financement
// Questions : emprunt ou cash, puis si emprunt : apport, durée, taux, assurance

import { useForm, useWatch } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSimulateur } from '@/lib/simulateur/SimulateurContext'
import type { FinancingMode } from '@/lib/simulateur/types'
import { StepHeader } from './shared/StepHeader'
import { ChoiceCard, ChoiceGrid } from './shared/ChoiceCard'
import { NumericField } from './shared/NumericField'
import { StepContinueButton } from './shared/StepContinueButton'
import { pmt } from '@/lib/fiscal/utils'
import { useEffect, useState } from 'react'

// ── Schéma Zod ────────────────────────────────────────────────────────────────

const schemaLoan = z.object({
  downPayment: z.coerce.number().min(0),
  loanDuration: z.coerce
    .number()
    .int()
    .min(5, 'Durée minimum 5 ans')
    .max(30, 'Durée maximum 30 ans'),
  interestRate: z.coerce.number().min(0.1, 'Taux minimum 0,1%').max(10, 'Taux maximum 10%'),
  insuranceRate: z.coerce.number().min(0).max(2),
})

type LoanValues = z.infer<typeof schemaLoan>

// ── Composant ─────────────────────────────────────────────────────────────────

export function Step4Financement() {
  const { state, update, goNext } = useSimulateur()

  const [financingMode, setFinancingMode] = useState<FinancingMode>(state.financingMode)

  const totalCost = state.purchasePrice + state.notaryFees + state.renovationWork

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoanValues>({
    resolver: zodResolver(schemaLoan) as unknown as Resolver<LoanValues>,
    defaultValues: {
      downPayment: state.downPayment,
      loanDuration: state.loanDuration,
      interestRate: state.interestRate,
      insuranceRate: state.insuranceRate,
    },
  })

  // Preview mensualité en temps réel
  const watchedDown = useWatch({ control, name: 'downPayment' }) ?? state.downPayment
  const watchedDuration = useWatch({ control, name: 'loanDuration' }) ?? state.loanDuration
  const watchedRate = useWatch({ control, name: 'interestRate' }) ?? state.interestRate
  const watchedInsurance = useWatch({ control, name: 'insuranceRate' }) ?? state.insuranceRate

  const loanAmount = Math.max(0, totalCost - (watchedDown ?? 0))
  const monthlyPayment =
    financingMode === 'loan' && loanAmount > 0
      ? pmt(loanAmount, (watchedRate ?? 4) / 100, watchedDuration ?? 20) +
        (loanAmount * (watchedInsurance ?? 0.36)) / 100 / 12
      : 0

  function onSubmit(values: LoanValues) {
    if (financingMode === 'loan') {
      update({
        financingMode: 'loan',
        downPayment: values.downPayment,
        loanDuration: values.loanDuration,
        interestRate: values.interestRate,
        insuranceRate: values.insuranceRate,
      })
    } else {
      update({ financingMode: 'cash' })
    }
    goNext()
  }

  function handleCashSubmit() {
    update({ financingMode: 'cash' })
    goNext()
  }

  return (
    <div className="fade-in-up">
      <StepHeader title="Financement" subtitle="Comment financez-vous cette acquisition ?" />

      {/* Mode de financement */}
      <section className="mb-8">
        <ChoiceGrid cols={2}>
          <ChoiceCard
            icon="🏦"
            label="Crédit immobilier"
            description="Effet de levier avec emprunt bancaire"
            selected={financingMode === 'loan'}
            onClick={() => setFinancingMode('loan')}
          />
          <ChoiceCard
            icon="💰"
            label="Comptant"
            description="Achat sans emprunt"
            selected={financingMode === 'cash'}
            onClick={() => setFinancingMode('cash')}
          />
        </ChoiceGrid>
      </section>

      {/* Infos emprunt */}
      {financingMode === 'loan' ? (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Récap coût total */}
          <div className="mb-6 rounded-xl bg-[#F8F7F4] px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B7280]">Coût total (prix + notaire + travaux)</span>
              <span className="font-bold text-[#1A1F2E]">
                {totalCost.toLocaleString('fr-FR')} €
              </span>
            </div>
            {loanAmount > 0 && (
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-[#6B7280]">Montant emprunté</span>
                <span className="font-semibold text-[#1E3A6E]">
                  {Math.round(loanAmount).toLocaleString('fr-FR')} €
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <NumericField
              label="Apport personnel"
              prefix="€"
              hint="Capital disponible hors emprunt"
              error={errors.downPayment?.message}
              {...register('downPayment')}
            />
            <NumericField
              label="Durée du prêt"
              suffix="ans"
              error={errors.loanDuration?.message}
              {...register('loanDuration')}
            />
            <NumericField
              label="Taux d'intérêt"
              suffix="%"
              hint="Taux nominal annuel"
              error={errors.interestRate?.message}
              step="0.1"
              {...register('interestRate')}
            />
            <NumericField
              label="Taux assurance"
              suffix="% / an"
              hint="Du capital initial (ex : 0,36%)"
              error={errors.insuranceRate?.message}
              step="0.01"
              {...register('insuranceRate')}
            />
          </div>

          {/* Preview mensualité */}
          {monthlyPayment > 0 && (
            <div className="mt-6 rounded-xl border border-[#1E3A6E]/20 bg-[#F0F4FF] px-4 py-4">
              <p className="text-[13px] text-[#1E3A6E]">Mensualité estimée</p>
              <p className="mt-0.5 text-2xl font-bold text-[#1E3A6E]">
                {Math.round(monthlyPayment).toLocaleString('fr-FR')} €{' '}
                <span className="text-base font-normal">/mois</span>
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">Capital + intérêts + assurance</p>
            </div>
          )}

          <StepContinueButton />
        </form>
      ) : (
        <div>
          <div className="rounded-xl bg-[#F0FAF5] px-4 py-4">
            <p className="text-sm text-[#0B7A56]">
              ✅ Achat comptant — les régimes sans emprunt seront calculés sans déduction
              d'intérêts.
            </p>
          </div>
          <StepContinueButton type="button" onClick={handleCashSubmit} />
        </div>
      )}
    </div>
  )
}
