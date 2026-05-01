'use client'

// Étape 3 — Le bien immobilier
// Questions : prix, type, frais notaire, travaux, mobilier

import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSimulateur } from '@/lib/simulateur/SimulateurContext'
import type { PropertyType } from '@/lib/simulateur/types'
import { StepHeader } from './shared/StepHeader'
import { ChoiceCard, ChoiceGrid } from './shared/ChoiceCard'
import { NumericField } from './shared/NumericField'
import { StepContinueButton } from './shared/StepContinueButton'

// ── Frais de notaire par défaut selon type de bien ───────────────────────────

const NOTARY_RATES: Record<PropertyType, number> = {
  ancien: 0.075, // 7,5% pour l'ancien
  neuf: 0.025, // 2,5% pour le neuf
  vefa: 0.025, // 2,5% pour VEFA
}

const PROPERTY_TYPES: { value: PropertyType; label: string; description: string; icon: string }[] =
  [
    { value: 'ancien', label: 'Ancien', description: 'Frais de notaire ~7,5%', icon: '🏚️' },
    { value: 'neuf', label: 'Neuf', description: 'Frais de notaire ~2,5%', icon: '🏗️' },
    { value: 'vefa', label: 'VEFA', description: "Vente en état futur d'achèvement", icon: '📐' },
  ]

// ── Schéma Zod ────────────────────────────────────────────────────────────────

const schema = z.object({
  purchasePrice: z.coerce
    .number()
    .min(10_000, 'Prix minimum 10 000 €')
    .max(10_000_000, 'Prix trop élevé'),
  notaryFees: z.coerce.number().min(0),
  renovationWork: z.coerce.number().min(0).max(2_000_000),
  furnitureBudget: z.coerce.number().min(0).max(200_000),
  propertyType: z.enum(['ancien', 'neuf', 'vefa']),
})

type FormValues = z.infer<typeof schema>

// ── Composant ─────────────────────────────────────────────────────────────────

export function Step3Bien() {
  const { state, update, goNext } = useSimulateur()
  const isMeuble = state.locationType !== 'nue'

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      purchasePrice: state.purchasePrice,
      propertyType: state.propertyType,
      notaryFees: state.notaryFees,
      renovationWork: state.renovationWork,
      furnitureBudget: state.furnitureBudget,
    },
  })

  // Auto-calculer les frais de notaire quand prix ou type change
  const watchedPrice = useWatch({ control, name: 'purchasePrice' })
  const watchedType = useWatch({ control, name: 'propertyType' })

  useEffect(() => {
    if (watchedPrice && watchedType) {
      const calculated = Math.round(watchedPrice * NOTARY_RATES[watchedType])
      setValue('notaryFees', calculated)
    }
  }, [watchedPrice, watchedType, setValue])

  function onSubmit(values: FormValues) {
    update({
      purchasePrice: values.purchasePrice,
      propertyType: values.propertyType,
      notaryFees: values.notaryFees,
      renovationWork: values.renovationWork,
      furnitureBudget: isMeuble ? values.furnitureBudget : 0,
    })
    goNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="fade-in-up" noValidate>
      <StepHeader
        title="Le bien immobilier"
        subtitle="Renseignez les caractéristiques de votre acquisition."
      />

      {/* Type de bien */}
      <section className="mb-8">
        <h3 className="mb-3 text-[15px] font-semibold text-[#1A1F2E]">Type de bien</h3>
        <input type="hidden" {...register('propertyType')} />
        <ChoiceGrid cols={2}>
          {PROPERTY_TYPES.map((opt) => (
            <ChoiceCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              description={opt.description}
              selected={watchedType === opt.value}
              onClick={() => setValue('propertyType', opt.value)}
            />
          ))}
        </ChoiceGrid>
      </section>

      {/* Prix d'acquisition */}
      <section className="mb-6">
        <h3 className="mb-3 text-[15px] font-semibold text-[#1A1F2E]">Prix d'acquisition</h3>
        <NumericField
          label="Prix FAI (frais d'agence inclus)"
          prefix="€"
          error={errors.purchasePrice?.message}
          {...register('purchasePrice')}
        />
      </section>

      {/* Frais de notaire */}
      <section className="mb-6">
        <h3 className="mb-1 text-[15px] font-semibold text-[#1A1F2E]">Frais de notaire</h3>
        <p className="mb-3 text-sm text-[#6B7280]">
          Calculés automatiquement ({watchedType === 'ancien' ? '7,5%' : '2,5%'}). Modifiable si
          connu.
        </p>
        <NumericField
          label="Frais de notaire"
          prefix="€"
          error={errors.notaryFees?.message}
          {...register('notaryFees')}
        />
      </section>

      {/* Travaux */}
      <section className="mb-6">
        <h3 className="mb-1 text-[15px] font-semibold text-[#1A1F2E]">
          Travaux de rénovation <span className="font-normal text-[#6B7280]">(optionnel)</span>
        </h3>
        <p className="mb-3 text-sm text-[#6B7280]">
          Amortis sur 10 ans en régime réel. Laissez 0 si aucun travaux.
        </p>
        <NumericField
          label="Montant des travaux"
          prefix="€"
          error={errors.renovationWork?.message}
          {...register('renovationWork')}
        />
      </section>

      {/* Budget mobilier — uniquement si meublé */}
      {isMeuble && (
        <section className="fade-in-up mb-6">
          <h3 className="mb-1 text-[15px] font-semibold text-[#1A1F2E]">Budget mobilier</h3>
          <p className="mb-3 text-sm text-[#6B7280]">
            Amorti sur 7 ans en régime réel LMNP. Comptez 3 000–10 000 € selon le logement.
          </p>
          <NumericField
            label="Mobilier et équipements"
            prefix="€"
            error={errors.furnitureBudget?.message}
            {...register('furnitureBudget')}
          />
        </section>
      )}

      <StepContinueButton />
    </form>
  )
}
