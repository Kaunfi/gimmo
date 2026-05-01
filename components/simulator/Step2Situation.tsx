'use client'

// Étape 2 — Votre situation personnelle
// Questions : situation familiale, enfants, revenus, biens meublés existants

import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSimulateur } from '@/lib/simulateur/SimulateurContext'
import type { FamilySituation } from '@/lib/simulateur/types'
import { StepHeader } from './shared/StepHeader'
import { ChoiceCard, ChoiceGrid } from './shared/ChoiceCard'
import { NumericField } from './shared/NumericField'
import { StepContinueButton } from './shared/StepContinueButton'
import { useState } from 'react'

// ── Schéma Zod ────────────────────────────────────────────────────────────────

const schema = z.object({
  householdIncome: z.coerce
    .number()
    .min(0, 'Le revenu doit être positif')
    .max(1_000_000, 'Valeur trop élevée'),
  childrenCount: z.coerce.number().int().min(0).max(10),
  existingMeubleRevenues: z.coerce.number().min(0).max(500_000),
})

type FormValues = z.infer<typeof schema>

// ── Options familiales ────────────────────────────────────────────────────────

const FAMILY_OPTIONS: {
  value: FamilySituation
  label: string
  description: string
  icon: string
}[] = [
  { value: 'celibataire', label: 'Célibataire', description: 'Ou divorcé(e)', icon: '👤' },
  { value: 'couple', label: 'En couple', description: 'Marié(e) ou pacsé(e)', icon: '👫' },
]

const CHILDREN_OPTIONS = [
  { value: 0, label: 'Aucun' },
  { value: 1, label: '1 enfant' },
  { value: 2, label: '2 enfants' },
  { value: 3, label: '3 enfants ou plus' },
]

// ── Composant ─────────────────────────────────────────────────────────────────

export function Step2Situation() {
  const { state, update, goNext } = useSimulateur()

  const [familySituation, setFamilySituation] = useState<FamilySituation>(state.familySituation)
  const [childrenCount, setChildrenCount] = useState<number>(state.childrenCount)

  // Afficher le champ revenus meublés uniquement si location meublée
  const isMeuble = state.locationType !== 'nue'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      householdIncome: state.householdIncome,
      childrenCount: state.childrenCount,
      existingMeubleRevenues: state.existingMeubleRevenues,
    },
  })

  function onSubmit(values: FormValues) {
    update({
      familySituation,
      childrenCount,
      householdIncome: values.householdIncome,
      existingMeubleRevenues: isMeuble ? values.existingMeubleRevenues : 0,
    })
    goNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="fade-in-up" noValidate>
      <StepHeader
        title="Votre situation"
        subtitle="Ces informations permettent de calculer votre imposition personnelle."
      />

      {/* Situation familiale */}
      <section className="mb-8">
        <h3 className="mb-3 text-[15px] font-semibold text-[#1A1F2E]">Situation familiale</h3>
        <ChoiceGrid cols={2}>
          {FAMILY_OPTIONS.map((opt) => (
            <ChoiceCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              description={opt.description}
              selected={familySituation === opt.value}
              onClick={() => setFamilySituation(opt.value)}
            />
          ))}
        </ChoiceGrid>
      </section>

      {/* Nombre d'enfants */}
      <section className="mb-8">
        <h3 className="mb-3 text-[15px] font-semibold text-[#1A1F2E]">Enfants à charge</h3>
        <ChoiceGrid cols={2}>
          {CHILDREN_OPTIONS.map((opt) => (
            <ChoiceCard
              key={opt.value}
              label={opt.label}
              selected={childrenCount === opt.value}
              onClick={() => setChildrenCount(opt.value)}
            />
          ))}
        </ChoiceGrid>
      </section>

      {/* Revenu annuel */}
      <section className="mb-6">
        <h3 className="mb-3 text-[15px] font-semibold text-[#1A1F2E]">
          Revenus du foyer (hors immobilier)
        </h3>
        <NumericField
          label="Revenu net imposable annuel"
          prefix="€"
          hint="Salaires, dividendes, BIC/BNC — avant déclaration des revenus immobiliers"
          error={errors.householdIncome?.message}
          {...register('householdIncome')}
        />
      </section>

      {/* Revenus meublés existants — uniquement si location meublée */}
      {isMeuble && (
        <section className="fade-in-up mb-6">
          <h3 className="mb-3 text-[15px] font-semibold text-[#1A1F2E]">
            Recettes meublées d'autres biens{' '}
            <span className="font-normal text-[#6B7280]">(optionnel)</span>
          </h3>
          <NumericField
            label="Loyers meublés annuels de vos autres biens"
            prefix="€"
            hint="Sert à vérifier si vous dépassez le seuil LMP de 23 000 €/an. Laissez 0 si premier bien."
            error={errors.existingMeubleRevenues?.message}
            {...register('existingMeubleRevenues')}
          />
        </section>
      )}

      {/* Encart TMI informatif */}
      <div className="mb-2 rounded-xl bg-[#F0F4FF] px-4 py-3">
        <p className="text-[13px] leading-relaxed text-[#1E3A6E]">
          💡 Votre <strong>Taux Marginal d'Imposition (TMI)</strong> sera calculé automatiquement et
          appliqué à chaque régime.
        </p>
      </div>

      <StepContinueButton />
    </form>
  )
}
