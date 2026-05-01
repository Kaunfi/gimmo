// ─────────────────────────────────────────────────────────────────────────────
// GIMMO — Comparateur de tous les régimes fiscaux
// Fonction centrale : compareAllRegimes(inputs) → CompareResult
//
// Logique de recommandation :
//   1. Filtrer les régimes éligibles
//   2. Vérifier si LMP est déclenché (silent check)
//   3. Recommander selon meilleur cash-flow cumulé sur la période
// ─────────────────────────────────────────────────────────────────────────────

import { LMP_SEUIL_RECETTES, LMNP_DEFAULTS, SCI_IS_DEFAULTS } from './parameters'
import { calcMicroFoncier } from './microFoncier'
import { calcReelFoncier } from './reelFoncier'
import { calcMicroBicLmnp } from './microBicLmnp'
import { calcReelBicLmnp } from './reelBicLmnp'
import { calcLmp } from './lmp'
import { calcSciIr } from './sciIr'
import { calcSciIs } from './sciIs'
import { round2 } from './utils'
import type { SimulationInputs, CompareResult, RegimeResult, RegimeKey } from './types'

// ── Vérification LMP ──────────────────────────────────────────────────────────

export interface LmpCheck {
  isTriggered: boolean
  reason?: string
}

export function checkLmpTrigger(inputs: SimulationInputs): LmpCheck {
  const annualRentBrut = inputs.monthlyRent * 12 * (1 - inputs.vacancyRate)
  const totalMeubleRevenues = round2(annualRentBrut + (inputs.existingMeubleRevenues ?? 0))

  if (inputs.locationType === 'nue') {
    return { isTriggered: false }
  }

  const cond1 = totalMeubleRevenues > LMP_SEUIL_RECETTES
  const cond2 = totalMeubleRevenues > inputs.householdIncome

  if (cond1 && cond2) {
    return {
      isTriggered: true,
      reason: `Vos recettes meublées (${totalMeubleRevenues.toLocaleString('fr-FR')} €/an) dépassent 23 000 € ET vos autres revenus professionnels. Le statut LMP s'applique obligatoirement.`,
    }
  }

  return { isTriggered: false }
}

// ── Fonction principale ───────────────────────────────────────────────────────

export function compareAllRegimes(inputs: SimulationInputs): CompareResult {
  // Inputs variants selon les contraintes de chaque régime :
  // – Micro : pas d'accountantFees ni cfeFee (abattement forfaitaire couvre tout)
  // – Réel LMNP / LMP : comptable 600€ + CFE 300€ si non spécifié par l'utilisateur
  // – SCI IS : comptable + juridique 1 500€ si non spécifié
  const microInputs: SimulationInputs = { ...inputs, accountantFees: 0, cfeFee: 0 }

  const lmnpReelInputs: SimulationInputs = {
    ...inputs,
    accountantFees: inputs.accountantFees > 0 ? inputs.accountantFees : LMNP_DEFAULTS.comptable,
    cfeFee: inputs.cfeFee > 0 ? inputs.cfeFee : LMNP_DEFAULTS.cfe,
  }

  const sciIsInputs: SimulationInputs = {
    ...inputs,
    accountantFees:
      inputs.accountantFees > 0 ? inputs.accountantFees : SCI_IS_DEFAULTS.comptableJuridique,
    cfeFee: 0,
  }

  // Calculer tous les régimes avec les inputs appropriés
  const microFoncier = calcMicroFoncier(microInputs)
  const reelFoncier = calcReelFoncier(inputs)
  const microBicLmnp = calcMicroBicLmnp(microInputs)
  const reelBicLmnp = calcReelBicLmnp(lmnpReelInputs)
  const lmp = calcLmp(lmnpReelInputs)
  const sciIr = calcSciIr(inputs)
  const sciIs = calcSciIs(sciIsInputs)

  const allRegimes: RegimeResult[] = [
    microFoncier,
    reelFoncier,
    microBicLmnp,
    reelBicLmnp,
    lmp,
    sciIr,
    sciIs,
  ]

  // Vérification LMP
  const lmpCheck = checkLmpTrigger(inputs)

  // Régimes éligibles uniquement
  const eligibleRegimes = allRegimes.filter((r) => r.isEligible)

  // ── Recommandation : meilleur retour total ────────────────────────────────
  let bestRegimeByTax: RegimeKey | null = null
  let bestRegimeByReturn: RegimeKey | null = null

  if (eligibleRegimes.length > 0) {
    // Meilleur par fiscalité (plus faible charge fiscale an 1)
    const byTax = [...eligibleRegimes].sort((a, b) => a.totalTax - b.totalTax)
    bestRegimeByTax = byTax[0]?.id ?? null

    // Meilleur par retour total (cashflows + PV nette)
    const byReturn = [...eligibleRegimes].sort((a, b) => b.totalReturn - a.totalReturn)
    bestRegimeByReturn = byReturn[0]?.id ?? null
  }

  // Recommandation principale = meilleur retour total parmi les éligibles
  // Si LMP est déclenché, on le met en avant (obligatoire)
  let recommendedRegime: RegimeKey | null = bestRegimeByReturn

  if (lmpCheck.isTriggered && lmp.isEligible) {
    recommendedRegime = 'lmp'
  }

  return {
    inputs,
    regimes: allRegimes,
    eligibleRegimes,
    recommendedRegime,
    isLmpTriggered: lmpCheck.isTriggered,
    ...(lmpCheck.reason !== undefined ? { lmpTriggerReason: lmpCheck.reason } : {}),
    bestRegimeByTax,
    bestRegimeByReturn,
  }
}
