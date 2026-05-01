'use client'

// Étape 1 — Votre projet
// Questions : type de location + classé? (si saisonnière) + stade + objectif

import { useState } from 'react'
import { useSimulateur } from '@/lib/simulateur/SimulateurContext'
import type { LocationType, ProjectStage, MainGoal } from '@/lib/simulateur/types'
import { StepHeader } from './shared/StepHeader'
import { ChoiceCard, ChoiceGrid } from './shared/ChoiceCard'
import { StepContinueButton } from './shared/StepContinueButton'

// ── Données des options ───────────────────────────────────────────────────────

const LOCATION_TYPES: { value: LocationType; label: string; description: string; icon: string }[] =
  [
    {
      value: 'nue',
      label: 'Location nue',
      description: 'Bail 3 ans, locataire non meublé',
      icon: '🏠',
    },
    {
      value: 'meublee_ld',
      label: 'Meublé longue durée',
      description: 'Bail 1 an, appartement équipé',
      icon: '🛋️',
    },
    {
      value: 'meublee_tourisme_nc',
      label: 'Location saisonnière',
      description: 'Airbnb / courte durée',
      icon: '🏖️',
    },
  ]

const PROJECT_STAGES: { value: ProjectStage; label: string; icon: string }[] = [
  { value: 'thinking', label: 'Je réfléchis encore', icon: '💭' },
  { value: 'identified', label: "J'ai un bien en vue", icon: '🎯' },
  { value: 'owner', label: 'Je suis déjà propriétaire', icon: '🔑' },
  { value: 'restructure', label: 'Je veux optimiser', icon: '⚡' },
]

const MAIN_GOALS: { value: MainGoal; label: string; icon: string }[] = [
  { value: 'cashflow', label: 'Cash-flow mensuel', icon: '💸' },
  { value: 'impots', label: 'Réduire mes impôts', icon: '📉' },
  { value: 'patrimoine', label: 'Construire un patrimoine', icon: '🏛️' },
  { value: 'retraite', label: 'Préparer ma retraite', icon: '🌅' },
  { value: 'transmission', label: 'Transmettre à mes enfants', icon: '👨‍👩‍👧' },
]

// ── Composant ─────────────────────────────────────────────────────────────────

export function Step1Projet() {
  const { state, update, goNext } = useSimulateur()

  const [localLocationType, setLocalLocationType] = useState<LocationType | null>(
    state.locationType
  )
  const [localIsTourismeClasse, setLocalIsTourismeClasse] = useState<boolean | null>(
    state.isTourismeClasse
  )
  const [localStage, setLocalStage] = useState<ProjectStage | null>(state.projectStage)
  const [localGoal, setLocalGoal] = useState<MainGoal | null>(state.mainGoal)

  // Saisonnière → demander si classé
  const showClasseQuestion = localLocationType === 'meublee_tourisme_nc'

  // La question sur le classé est résolue si non applicable ou si réponse donnée
  const classeResolved = !showClasseQuestion || localIsTourismeClasse !== null

  // Formulaire valide
  const isValid =
    localLocationType !== null && classeResolved && localStage !== null && localGoal !== null

  function handleContinue() {
    if (!isValid) return

    // Résoudre le type de location final
    let finalLocationType: LocationType = localLocationType!
    if (localLocationType === 'meublee_tourisme_nc' && localIsTourismeClasse === true) {
      finalLocationType = 'meublee_tourisme_classe'
    }

    update({
      locationType: finalLocationType,
      isTourismeClasse: localIsTourismeClasse,
      projectStage: localStage,
      mainGoal: localGoal,
    })
    goNext()
  }

  // Réinitialiser le choix classé quand on change de type
  function handleLocationChange(value: LocationType) {
    setLocalLocationType(value)
    if (value !== 'meublee_tourisme_nc') {
      setLocalIsTourismeClasse(null)
    }
  }

  return (
    <div className="fade-in-up">
      <StepHeader title="Votre projet locatif" subtitle="Quel type de location envisagez-vous ?" />

      {/* Type de location */}
      <section className="mb-8">
        <ChoiceGrid cols={1}>
          {LOCATION_TYPES.map((opt) => (
            <ChoiceCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              description={opt.description}
              selected={localLocationType === opt.value}
              onClick={() => handleLocationChange(opt.value)}
            />
          ))}
        </ChoiceGrid>
      </section>

      {/* Sub-question : meublé de tourisme classé ? */}
      {showClasseQuestion && (
        <section className="fade-in-up mb-8">
          <h3 className="mb-3 text-[15px] font-semibold text-[#1A1F2E]">
            Votre logement est-il classé (1–5 étoiles) ?
          </h3>
          <ChoiceGrid cols={2}>
            <ChoiceCard
              label="Oui, classé ⭐"
              description="Label officiel Atout France"
              selected={localIsTourismeClasse === true}
              onClick={() => setLocalIsTourismeClasse(true)}
            />
            <ChoiceCard
              label="Non, non classé"
              description="Sans label officiel"
              selected={localIsTourismeClasse === false}
              onClick={() => setLocalIsTourismeClasse(false)}
            />
          </ChoiceGrid>
        </section>
      )}

      {/* Stade du projet */}
      <section className="mb-8">
        <h3 className="mb-3 text-[15px] font-semibold text-[#1A1F2E]">
          Où en êtes-vous dans votre projet ?
        </h3>
        <ChoiceGrid cols={2}>
          {PROJECT_STAGES.map((opt) => (
            <ChoiceCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              selected={localStage === opt.value}
              onClick={() => setLocalStage(opt.value)}
            />
          ))}
        </ChoiceGrid>
      </section>

      {/* Objectif principal */}
      <section className="mb-2">
        <h3 className="mb-3 text-[15px] font-semibold text-[#1A1F2E]">
          Votre objectif principal ?
        </h3>
        <ChoiceGrid cols={2}>
          {MAIN_GOALS.map((opt) => (
            <ChoiceCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              selected={localGoal === opt.value}
              onClick={() => setLocalGoal(opt.value)}
            />
          ))}
        </ChoiceGrid>
      </section>

      <StepContinueButton disabled={!isValid} onClick={handleContinue} type="button" />
    </div>
  )
}
