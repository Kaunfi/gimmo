// ─────────────────────────────────────────────────────────────────────────────
// GIMMO — Conversion SimulateurState → SimulationInputs
// Pont entre le state UI multi-étapes et le moteur fiscal
// ─────────────────────────────────────────────────────────────────────────────

import type { SimulateurState } from './types'
import type { SimulationInputs } from '@/lib/fiscal/types'
import { PROJECTION_DEFAULTS } from '@/lib/fiscal/parameters'

/**
 * Convertit le state du simulateur en inputs pour le moteur fiscal.
 * Gère les mappings de types, les calculs dérivés (montant emprunt, etc.)
 * et les valeurs par défaut.
 */
export function mapStateToInputs(state: SimulateurState): SimulationInputs {
  // ── Résolution du type de location ───────────────────────────────────────
  // Si saisonnière et classé → tourisme classé
  let locationType = state.locationType ?? 'nue'
  if (locationType === 'saisonniere' && state.isTourismeClasse === true) {
    locationType = 'meublee_tourisme_classe'
  }

  // ── Montant emprunté ──────────────────────────────────────────────────────
  // Capital emprunté = prix + frais notaire + travaux − apport
  const totalCost = state.purchasePrice + state.notaryFees + state.renovationWork
  const loanAmount = state.financingMode === 'loan' ? Math.max(0, totalCost - state.downPayment) : 0

  // ── Provision travaux ─────────────────────────────────────────────────────
  // maintenancePct est un % du loyer brut annuel
  const maintenanceProvision = state.monthlyRent * 12 * state.maintenancePct

  return {
    // Situation personnelle
    familySituation: state.familySituation,
    childrenCount: state.childrenCount,
    householdIncome: state.householdIncome,
    existingMeubleRevenues: state.existingMeubleRevenues,

    // Bien immobilier
    purchasePrice: state.purchasePrice,
    propertyType: state.propertyType,
    notaryFees: state.notaryFees,
    renovationWork: state.renovationWork,
    furnitureBudget: state.furnitureBudget,
    terrainShare: 0.15, // Valeur par défaut — configurable en V2

    // Financement
    financingMode: state.financingMode,
    loanAmount,
    loanDurationYears: state.loanDuration,
    interestRatePct: state.interestRate,
    insuranceRatePct: state.insuranceRate,

    // Exploitation
    locationType,
    monthlyRent: state.monthlyRent,
    vacancyRate: state.vacancyRate,
    condoFees: state.condoFees,
    propertyTax: state.propertyTax,
    pnoInsurance: state.pnoInsurance,
    managementFees: state.managementFees,
    maintenanceProvision,
    accountantFees: 0, // Surchargé par régime dans compareAllRegimes
    cfeFee: 0, // Surchargé par régime dans compareAllRegimes

    // Horizon
    holdingPeriodYears: state.holdingPeriod,

    // Hypothèses de projection (valeurs par défaut — V2 = sliders résultats)
    propertyAppreciationPct: PROJECTION_DEFAULTS.propertyAppreciationPct,
    rentIndexationPct: PROJECTION_DEFAULTS.rentIndexationPct,
    chargesIndexationPct: PROJECTION_DEFAULTS.chargesIndexationPct,
  }
}
